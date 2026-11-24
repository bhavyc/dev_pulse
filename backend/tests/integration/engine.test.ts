import http from 'http';
import { Prober } from '../../src/engine/prober';
import { MonitoringScheduler } from '../../src/engine/scheduler';
import { prisma } from '../../src/config/database';
import { MonitorStatus, IncidentStatus } from '@devpulse/shared';

describe('Monitoring Engine & Prober Integration Tests', () => {
  let mockServer: http.Server;
  let mockServerPort = 0;
  let shouldReturnError = false;
  let delayMs = 0;

  beforeAll((done) => {
    mockServer = http.createServer((req, res) => {
      if (delayMs > 0) {
        setTimeout(() => {
          if (shouldReturnError) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
          }
        }, delayMs);
      } else {
        if (shouldReturnError) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        }
      }
    });

    mockServer.listen(0, '127.0.0.1', () => {
      const addr = mockServer.address() as any;
      mockServerPort = addr.port;
      done();
    });
  });

  afterAll((done) => {
    mockServer.close(() => {
      prisma.$disconnect().then(() => done());
    });
  });

  describe('Prober Direct Execution', () => {
    it('should block probing loopback server directly via SSRF protection', async () => {
      const res = await Prober.executeProbe({
        url: `http://127.0.0.1:${mockServerPort}/health`,
        httpMethod: 'GET',
        timeoutSeconds: 5,
        expectedStatusCodes: [200],
      });

      expect(res.isSuccess).toBe(false);
      expect(res.errorMessage).toContain('SSRF Blocked');
    });

    it('should execute a probe against public domain and measure latency', async () => {
      const res = await Prober.executeProbe({
        url: 'https://example.com',
        httpMethod: 'GET',
        timeoutSeconds: 10,
        expectedStatusCodes: [200],
      });

      expect(res.isSuccess).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.responseTimeMs).toBeGreaterThan(0);
      expect(res.timingDetails).toBeDefined();
      expect(res.timingDetails?.total).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Scheduler Lifecycle & Incident Auto-Resolution', () => {
    const testEmail = `engine_test_${Date.now()}@example.com`;
    let monitorId = '';

    beforeAll(async () => {
      // Create user, team and test monitor
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          passwordHash: 'hash',
          name: 'Engine Tester',
        },
      });

      const team = await prisma.team.create({
        data: {
          name: 'Engine Test Team',
          slug: `engine-team-${Date.now()}`,
          ownerId: user.id,
        },
      });

      const monitor = await prisma.monitor.create({
        data: {
          teamId: team.id,
          name: 'Example Public Monitor',
          url: 'https://example.com',
          httpMethod: 'GET',
          checkIntervalSeconds: 300,
          timeoutSeconds: 10,
          expectedStatusCodes: [200],
          currentStatus: MonitorStatus.PENDING,
          consecutiveFailures: 0,
        },
      });

      monitorId = monitor.id;
    });

    afterAll(async () => {
      try {
        const user = await prisma.user.findUnique({ where: { email: testEmail } });
        if (user) {
          await prisma.user.delete({ where: { id: user.id } });
        }
      } catch (e) {
        // ignore
      }
    });

    it('should process monitor check and update lastCheckedAt and history', async () => {
      const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } });
      expect(monitor).toBeDefined();

      await MonitoringScheduler.processMonitor(monitor);

      // Verify check record created
      const checks = await prisma.monitorCheck.findMany({
        where: { monitorId },
      });
      expect(checks.length).toBeGreaterThanOrEqual(1);
      expect(checks[0].isSuccess).toBe(true);
      expect(checks[0].statusCode).toBe(200);

      // Verify monitor status updated
      const updated = await prisma.monitor.findUnique({ where: { id: monitorId } });
      expect(updated?.lastCheckedAt).toBeDefined();
      expect(updated?.uptimePercentage).toBe(100.0);
    }, 15000);
  });
});
