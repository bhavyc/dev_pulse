import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';

describe('Monitors & Analytics API Integration Tests', () => {
  const testEmail = `monitor_test_${Date.now()}@example.com`;
  let authToken = '';
  let teamId = '';
  let createdMonitorId = '';

  beforeAll(async () => {
    // Register user & create default team
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        name: 'Monitor QA Tester',
        teamName: 'Infra Testing Corp',
      });

    authToken = regRes.body.data.token;
    teamId = regRes.body.data.team.id;
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
    await prisma.$disconnect();
  });

  describe('POST /api/monitors', () => {
    it('should create a new HTTP monitor', async () => {
      const res = await request(app)
        .post('/api/monitors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Production Gateway',
          url: 'https://example.com/health',
          httpMethod: 'GET',
          checkIntervalSeconds: 300,
          timeoutSeconds: 10,
          expectedStatusCodes: [200, 204],
          requestHeaders: { 'X-Test-Probe': 'DevPulse' },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Production Gateway');
      expect(res.body.data.url).toBe('https://example.com/health');
      expect(res.body.data.currentStatus).toBe('PENDING');

      createdMonitorId = res.body.data.id;
    });

    it('should reject monitor creation with invalid interval', async () => {
      const res = await request(app)
        .post('/api/monitors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Interval Monitor',
          url: 'https://example.com',
          checkIntervalSeconds: 60, // Not allowed in 0-budget free MVP (min 300s)
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/monitors', () => {
    it('should list all monitors for the team', async () => {
      const res = await request(app)
        .get('/api/monitors')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].id).toBe(createdMonitorId);
    });
  });

  describe('PUT /api/monitors/:id', () => {
    it('should update monitor details', async () => {
      const res = await request(app)
        .put(`/api/monitors/${createdMonitorId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Production Gateway - Renamed',
          checkIntervalSeconds: 600,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Production Gateway - Renamed');
      expect(res.body.data.checkIntervalSeconds).toBe(600);
    });
  });

  describe('POST /api/monitors/:id/pause and /resume', () => {
    it('should pause and resume monitor', async () => {
      const pauseRes = await request(app)
        .post(`/api/monitors/${createdMonitorId}/pause`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(pauseRes.status).toBe(200);
      expect(pauseRes.body.data.isPaused).toBe(true);

      const resumeRes = await request(app)
        .post(`/api/monitors/${createdMonitorId}/resume`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.data.isPaused).toBe(false);
    });
  });

  describe('GET /api/analytics/overview', () => {
    it('should return aggregated metrics from actual DB records', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalMonitors).toBeGreaterThanOrEqual(1);
      expect(typeof res.body.data.overallUptimePercentage).toBe('number');
      expect(typeof res.body.data.averageResponseTimeMs).toBe('number');
    });
  });

  describe('DELETE /api/monitors/:id', () => {
    it('should delete the monitor', async () => {
      const res = await request(app)
        .delete(`/api/monitors/${createdMonitorId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it no longer exists
      const getRes = await request(app)
        .get(`/api/monitors/${createdMonitorId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(404);
    });
  });
});
