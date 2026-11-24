import dns from 'dns/promises';
import net from 'net';
import { URL } from 'url';

// CIDR checking utilities
interface Subnet {
  base: number;
  mask: number;
}

function ipv4ToInt(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

function createSubnet(cidr: string): Subnet {
  const [ip, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  const base = (ipv4ToInt(ip) & mask) >>> 0;
  return { base, mask };
}

function isInSubnet(ipInt: number, subnet: Subnet): boolean {
  return (ipInt & subnet.mask) >>> 0 === subnet.base;
}

// Blocked IPv4 Subnets
const BLOCKED_IPV4_SUBNETS: Subnet[] = [
  createSubnet('0.0.0.0/8'), // Current network
  createSubnet('10.0.0.0/8'), // Private RFC 1918
  createSubnet('100.64.0.0/10'), // Carrier-grade NAT
  createSubnet('127.0.0.0/8'), // Loopback
  createSubnet('169.254.0.0/16'), // Link-local & Cloud Metadata (169.254.169.254)
  createSubnet('172.16.0.0/12'), // Private RFC 1918
  createSubnet('192.0.0.0/24'), // IETF Protocol Assignments
  createSubnet('192.0.2.0/24'), // TEST-NET-1
  createSubnet('192.168.0.0/16'), // Private RFC 1918
  createSubnet('198.18.0.0/15'), // Benchmark testing
  createSubnet('198.51.100.0/24'), // TEST-NET-2
  createSubnet('203.0.113.0/24'), // TEST-NET-3
  createSubnet('224.0.0.0/4'), // Multicast
  createSubnet('240.0.0.0/4'), // Reserved
  createSubnet('255.255.255.255/32'), // Broadcast
];

// Blocked hostname patterns
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'instance-data',
  '169.254.169.254',
];

export class SSRFGuard {
  static isIpForbidden(ip: string): boolean {
    const family = net.isIP(ip);
    if (family === 0) return true; // Invalid IP format

    // IPv4 Checks
    if (family === 4) {
      const ipInt = ipv4ToInt(ip);
      return BLOCKED_IPV4_SUBNETS.some((subnet) => isInSubnet(ipInt, subnet));
    }

    // IPv6 Checks
    if (family === 6) {
      const normalized = ip.toLowerCase();

      // Loopback
      if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
      // Unspecified
      if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
      // Unique Local Addresses (fc00::/7)
      if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
      // Link-Local Addresses (fe80::/10)
      if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
      // IPv4-mapped IPv6 (::ffff:192.168.1.1 or ::ffff:c0a8:0101)
      if (normalized.includes('::ffff:')) {
        const parts = normalized.split('::ffff:');
        const v4Part = parts[1];
        if (net.isIPv4(v4Part)) {
          return this.isIpForbidden(v4Part);
        }
      }
    }

    return false;
  }

  static async validateSafeUrl(urlString: string): Promise<{
    isSafe: boolean;
    resolvedIp?: string;
    parsedUrl?: URL;
    reason?: string;
  }> {
    let parsed: URL;

    try {
      parsed = new URL(urlString);
    } catch {
      return { isSafe: false, reason: 'Malformed URL' };
    }

    // 1. Protocol check
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        isSafe: false,
        reason: `Forbidden protocol "${parsed.protocol}". Only http: and https: are allowed.`,
      };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Blacklisted hostnames
    if (BLOCKED_HOSTNAMES.includes(hostname) || hostname.endsWith('.localhost')) {
      return {
        isSafe: false,
        reason: `Target host "${hostname}" is blocked for security reasons.`,
      };
    }

    // 3. Direct IP check
    if (net.isIP(hostname)) {
      if (this.isIpForbidden(hostname)) {
        return {
          isSafe: false,
          reason: `Access to private or reserved IP address "${hostname}" is forbidden.`,
        };
      }
      return { isSafe: true, resolvedIp: hostname, parsedUrl: parsed };
    }

    // 4. DNS Pre-Resolution Check (lookup all addresses)
    try {
      const addresses = await dns.lookup(hostname, { all: true });

      if (!addresses || addresses.length === 0) {
        return { isSafe: false, reason: `Could not resolve hostname "${hostname}".` };
      }

      for (const record of addresses) {
        if (this.isIpForbidden(record.address)) {
          return {
            isSafe: false,
            reason: `Hostname "${hostname}" resolved to forbidden IP address "${record.address}".`,
          };
        }
      }

      // Safe public IP
      return {
        isSafe: true,
        resolvedIp: addresses[0].address,
        parsedUrl: parsed,
      };
    } catch (err: any) {
      return {
        isSafe: false,
        reason: `DNS resolution failed for "${hostname}": ${err.message}`,
      };
    }
  }
}
