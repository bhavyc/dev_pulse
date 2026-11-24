import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';
import { IncidentStatus } from '@devpulse/shared';

describe('Incident & Notification API Integration Tests', () => {
  const testEmail = `incident_tester_${Date.now()}@example.com`;
  let authToken = '';
  let teamId = '';
  let monitorId = '';
  let incidentId = '';

  beforeAll(async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        name: 'Incident QA Specialist',
        teamName: 'Site Reliability Engineering',
      });

    authToken = regRes.body.data.token;
    teamId = regRes.body.data.team.id;

    // Create monitor
    const monitorRes = await request(app)
      .post('/api/monitors')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Billing API',
        url: 'https://example.com/billing',
        checkIntervalSeconds: 300,
      });

    monitorId = monitorRes.body.data.id;

    // Create a test incident
    const incident = await prisma.incident.create({
      data: {
        monitorId,
        title: 'Billing API Outage',
        failureReason: 'HTTP 500 Internal Server Error',
        status: IncidentStatus.INVESTIGATING,
        startedAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      },
    });

    incidentId = incident.id;
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

  describe('GET /api/incidents', () => {
    it('should list all team incidents', async () => {
      const res = await request(app)
        .get('/api/incidents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].id).toBe(incidentId);
    });
  });

  describe('GET /api/incidents/:id', () => {
    it('should fetch single incident details with updates', async () => {
      const res = await request(app)
        .get(`/api/incidents/${incidentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(incidentId);
      expect(res.body.data.status).toBe(IncidentStatus.INVESTIGATING);
    });
  });

  describe('POST /api/incidents/:id/updates', () => {
    it('should post an investigation status update', async () => {
      const res = await request(app)
        .post(`/api/incidents/${incidentId}/updates`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: IncidentStatus.IDENTIFIED,
          message: 'Identified root cause: upstream payment processor latency.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.incident.status).toBe(IncidentStatus.IDENTIFIED);
      expect(res.body.data.update.message).toContain('payment processor');
    });

    it('should mark incident as RESOLVED and compute duration', async () => {
      const res = await request(app)
        .post(`/api/incidents/${incidentId}/updates`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: IncidentStatus.RESOLVED,
          message: 'Service is back online and all queues drained.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.incident.status).toBe(IncidentStatus.RESOLVED);
      expect(res.body.data.incident.resolvedAt).toBeDefined();
      expect(res.body.data.incident.durationSeconds).toBeGreaterThan(0);
    });
  });

  describe('Notification Channels API', () => {
    it('should list default notification channel created during registration', async () => {
      const res = await request(app)
        .get('/api/notifications/channels')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow adding an additional email alert channel', async () => {
      const newEmail = `devops_${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/notifications/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          destination: newEmail,
          notifyOnDown: true,
          notifyOnRecovery: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.destination).toBe(newEmail);
    });
  });
});
