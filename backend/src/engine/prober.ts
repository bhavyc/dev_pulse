import http from 'http';
import https from 'https';
import net from 'net';
import tls from 'tls';
import { SSRFGuard } from './ssrf-guard';
import { SslDetails } from '@devpulse/shared';
import { logger } from '../utils/logger';

export interface ProbeOptions {
  url: string;
  httpMethod: string;
  timeoutSeconds: number;
  expectedStatusCodes: number[];
  requestHeaders?: Record<string, string> | null;
  requestBody?: string | null;
  maxRedirects?: number;
}

export interface ProbeResult {
  isSuccess: boolean;
  statusCode?: number;
  responseTimeMs: number;
  errorMessage?: string;
  timingDetails?: {
    dns?: number;
    tcp?: number;
    tls?: number;
    ttfb?: number;
    total?: number;
  };
  sslDetails?: SslDetails;
  responseHeaders?: Record<string, string>;
}

export class Prober {
  static async executeProbe(
    options: ProbeOptions,
    currentRedirectCount = 0
  ): Promise<ProbeResult> {
    const maxRedirects = options.maxRedirects ?? 3;

    // 1. SSRF and DNS Pre-Resolution validation
    const ssrfCheck = await SSRFGuard.validateSafeUrl(options.url);
    if (!ssrfCheck.isSafe || !ssrfCheck.resolvedIp || !ssrfCheck.parsedUrl) {
      return {
        isSuccess: false,
        responseTimeMs: 0,
        errorMessage: `SSRF Blocked: ${ssrfCheck.reason || 'Forbidden destination'}`,
      };
    }

    const parsedUrl = ssrfCheck.parsedUrl;
    const pinnedIp = ssrfCheck.resolvedIp;
    const isHttps = parsedUrl.protocol === 'https:';
    const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : isHttps ? 443 : 80;

    const startTime = process.hrtime.bigint();
    let connectDoneTime = startTime;
    let tlsDoneTime = startTime;
    let firstByteTime = startTime;

    return new Promise<ProbeResult>((resolve) => {
      const timeoutMs = Math.min(options.timeoutSeconds || 10, 30) * 1000;
      let isSettled = false;

      const safeResolve = (result: ProbeResult) => {
        if (!isSettled) {
          isSettled = true;
          resolve(result);
        }
      };

      // Custom socket connection pinning to pre-validated IP to defeat DNS rebinding
      const createCustomConnection = (opts: any, oncreate: any) => {
        const socket = net.createConnection({
          host: pinnedIp, // Direct socket connect to verified safe IP!
          port,
        });

        socket.on('connect', () => {
          connectDoneTime = process.hrtime.bigint();
        });

        if (isHttps) {
          // Wrap with TLS
          const secureSocket = tls.connect({
            socket,
            servername: parsedUrl.hostname, // Preserves SNI
            rejectUnauthorized: true,
          });

          secureSocket.on('secureConnect', () => {
            tlsDoneTime = process.hrtime.bigint();
          });

          return secureSocket;
        }

        return socket;
      };

      const requestHeaders: Record<string, string> = {
        'User-Agent': 'DevPulse-Monitor/1.0 (+https://devpulse.io)',
        Accept: '*/*',
        Host: parsedUrl.host,
        ...(options.requestHeaders || {}),
      };

      if (options.requestBody) {
        requestHeaders['Content-Length'] = Buffer.byteLength(options.requestBody).toString();
      }

      const client = isHttps ? https : http;

      const req = client.request(
        {
          hostname: parsedUrl.hostname,
          port,
          path: `${parsedUrl.pathname}${parsedUrl.search}`,
          method: options.httpMethod || 'GET',
          headers: requestHeaders,
          createConnection: createCustomConnection as any,
          timeout: timeoutMs,
        },
        async (res) => {
          firstByteTime = process.hrtime.bigint();

          // Extract SSL Certificate Details for HTTPS targets
          let sslDetails: SslDetails | undefined;
          if (isHttps && res.socket && 'getPeerCertificate' in res.socket) {
            try {
              const cert = (res.socket as tls.TLSSocket).getPeerCertificate(true);
              if (cert && cert.valid_to) {
                const validToDate = new Date(cert.valid_to);
                const now = new Date();
                const daysRemaining = Math.max(
                  0,
                  Math.ceil((validToDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                );
                sslDetails = {
                  issuer:
                    (cert.issuer as any)?.O ||
                    (cert.issuer as any)?.CN ||
                    'Trusted Certificate Authority',
                  subject: (cert.subject as any)?.CN || parsedUrl.hostname,
                  validFrom: cert.valid_from,
                  validTo: cert.valid_to,
                  daysRemaining,
                  isValid: validToDate > now,
                };
              }
            } catch (err) {
              logger.debug('Failed to inspect peer certificate:', err);
            }
          }

          // Format response headers preview
          const responseHeaders: Record<string, string> = {};
          for (const [key, val] of Object.entries(res.headers)) {
            if (val !== undefined) {
              responseHeaders[key] = Array.isArray(val) ? val.join(', ') : val;
            }
          }

          // Check for Redirects (301, 302, 303, 307, 308)
          const statusCode = res.statusCode || 0;
          if (
            [301, 302, 303, 307, 308].includes(statusCode) &&
            res.headers.location
          ) {
            res.resume(); // Consume stream

            if (currentRedirectCount >= maxRedirects) {
              const totalMs = Number((process.hrtime.bigint() - startTime) / BigInt(1e6));
              return safeResolve({
                isSuccess: false,
                statusCode,
                responseTimeMs: totalMs,
                errorMessage: `Exceeded maximum redirect limit of ${maxRedirects}`,
                sslDetails,
                responseHeaders,
              });
            }

            // Resolve target URL relative to original URL
            const redirectUrl = new URL(res.headers.location, options.url).toString();

            // Recursively follow redirect with SSRF inspection
            const redirectResult = await Prober.executeProbe(
              {
                ...options,
                url: redirectUrl,
              },
              currentRedirectCount + 1
            );
            return safeResolve(redirectResult);
          }

          // Consume response body to measure end
          res.on('data', () => {});
          res.on('end', () => {
            const endTime = process.hrtime.bigint();
            const totalMs = Number((endTime - startTime) / BigInt(1e6));
            const ttfbMs = Number((firstByteTime - startTime) / BigInt(1e6));
            const tcpMs = Number((connectDoneTime - startTime) / BigInt(1e6));
            const tlsMs = isHttps ? Number((tlsDoneTime - connectDoneTime) / BigInt(1e6)) : 0;

            const expectedCodes =
              options.expectedStatusCodes.length > 0
                ? options.expectedStatusCodes
                : [200];
            const isSuccess = expectedCodes.includes(statusCode);

            safeResolve({
              isSuccess,
              statusCode,
              responseTimeMs: Math.max(1, totalMs),
              errorMessage: isSuccess
                ? undefined
                : `HTTP status code ${statusCode} does not match expected [${expectedCodes.join(', ')}]`,
              timingDetails: {
                total: totalMs,
                ttfb: ttfbMs,
                tcp: Math.max(0, tcpMs),
                tls: Math.max(0, tlsMs),
              },
              sslDetails,
              responseHeaders,
            });
          });
        }
      );

      // Handle timeout
      req.on('timeout', () => {
        req.destroy();
        const totalMs = Number((process.hrtime.bigint() - startTime) / BigInt(1e6));
        safeResolve({
          isSuccess: false,
          responseTimeMs: totalMs,
          errorMessage: `Request timed out after ${options.timeoutSeconds} seconds`,
        });
      });

      // Handle network errors
      req.on('error', (err: any) => {
        const totalMs = Number((process.hrtime.bigint() - startTime) / BigInt(1e6));
        safeResolve({
          isSuccess: false,
          responseTimeMs: totalMs,
          errorMessage: err.message || 'Connection failed',
        });
      });

      // Send payload if present
      if (options.requestBody && ['POST', 'PUT', 'PATCH'].includes(options.httpMethod)) {
        req.write(options.requestBody);
      }

      req.end();
    });
  }
}
