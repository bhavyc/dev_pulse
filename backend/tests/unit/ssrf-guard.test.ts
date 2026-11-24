import { SSRFGuard } from '../../src/engine/ssrf-guard';

describe('SSRF Guard Unit Tests', () => {
  describe('Forbidden IP Detection', () => {
    it('should block IPv4 loopback (127.0.0.1)', () => {
      expect(SSRFGuard.isIpForbidden('127.0.0.1')).toBe(true);
      expect(SSRFGuard.isIpForbidden('127.0.1.10')).toBe(true);
    });

    it('should block 0.0.0.0', () => {
      expect(SSRFGuard.isIpForbidden('0.0.0.0')).toBe(true);
    });

    it('should block RFC 1918 private subnets', () => {
      expect(SSRFGuard.isIpForbidden('10.0.0.1')).toBe(true);
      expect(SSRFGuard.isIpForbidden('10.255.255.255')).toBe(true);
      expect(SSRFGuard.isIpForbidden('172.16.0.1')).toBe(true);
      expect(SSRFGuard.isIpForbidden('172.31.255.255')).toBe(true);
      expect(SSRFGuard.isIpForbidden('192.168.0.1')).toBe(true);
      expect(SSRFGuard.isIpForbidden('192.168.1.100')).toBe(true);
    });

    it('should block AWS/GCP/Azure cloud metadata IP (169.254.169.254)', () => {
      expect(SSRFGuard.isIpForbidden('169.254.169.254')).toBe(true);
      expect(SSRFGuard.isIpForbidden('169.254.1.1')).toBe(true);
    });

    it('should block Carrier-Grade NAT (100.64.0.0/10)', () => {
      expect(SSRFGuard.isIpForbidden('100.64.0.1')).toBe(true);
      expect(SSRFGuard.isIpForbidden('100.127.255.255')).toBe(true);
    });

    it('should block IPv6 loopback and private ranges', () => {
      expect(SSRFGuard.isIpForbidden('::1')).toBe(true);
      expect(SSRFGuard.isIpForbidden('::')).toBe(true);
      expect(SSRFGuard.isIpForbidden('fc00::1')).toBe(true);
      expect(SSRFGuard.isIpForbidden('fd12:3456:789a:1::1')).toBe(true);
      expect(SSRFGuard.isIpForbidden('fe80::1')).toBe(true);
    });

    it('should allow genuine public IPv4 addresses', () => {
      expect(SSRFGuard.isIpForbidden('8.8.8.8')).toBe(false); // Google DNS
      expect(SSRFGuard.isIpForbidden('1.1.1.1')).toBe(false); // Cloudflare DNS
      expect(SSRFGuard.isIpForbidden('142.250.190.46')).toBe(false); // Google
    });
  });

  describe('Full URL Validation', () => {
    it('should reject non-HTTP protocols', async () => {
      const fileRes = await SSRFGuard.validateSafeUrl('file:///etc/passwd');
      expect(fileRes.isSafe).toBe(false);

      const gopherRes = await SSRFGuard.validateSafeUrl('gopher://127.0.0.1:70');
      expect(gopherRes.isSafe).toBe(false);

      const ftpRes = await SSRFGuard.validateSafeUrl('ftp://example.com');
      expect(ftpRes.isSafe).toBe(false);
    });

    it('should reject localhost hostname variants', async () => {
      const res1 = await SSRFGuard.validateSafeUrl('http://localhost:8080');
      expect(res1.isSafe).toBe(false);

      const res2 = await SSRFGuard.validateSafeUrl('http://sub.localhost/api');
      expect(res2.isSafe).toBe(false);
    });

    it('should reject cloud metadata hostname', async () => {
      const res = await SSRFGuard.validateSafeUrl('http://metadata.google.internal/computeMetadata/v1/');
      expect(res.isSafe).toBe(false);
    });

    it('should allow valid public HTTPS URL', async () => {
      const res = await SSRFGuard.validateSafeUrl('https://example.com');
      expect(res.isSafe).toBe(true);
      expect(res.resolvedIp).toBeDefined();
    });
  });
});
