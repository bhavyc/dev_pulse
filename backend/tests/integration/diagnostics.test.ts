import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';
import { AlertChannelType } from '@devpulse/shared';

describe('Live Diagnostics & Discord Webhooks Integration Tests', () => {
  const testEmail = `diag_tester_${Date.now()}@example.com`;
  let authToken = '';
  let monitorId = '';

  beforeAll(async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        name: 'Diagnostics Tester',
        teamName: 'SRE Diagnostics Corp',
      });

    authToken = regRes.body.data.token;

    const monRes = await request(app)
      .post('/api/monitors')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Public Target Gateway',
        url: 'https://example.com',
        checkIntervalSeconds: 300,
      });

    monitorId = monRes.body.data.id;
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

  describe('POST /api/monitors/:id/test (On-Demand Live Diagnostic Probe)', () => {
    it('should execute an immediate live diagnostic probe on existing monitor', async () => {
      const res = await request(app)
        .post(`/api/monitors/${monitorId}/test`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isSuccess).toBe(true);
      expect(res.body.data.statusCode).toBe(200);
      expect(res.body.data.responseTimeMs).toBeGreaterThan(0);
      expect(res.body.data.timingDetails).toBeDefined();
      expect(res.body.data.testedAt).toBeDefined();

      // Verify monitor record updated with lastCheckedAt
      const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } });
      expect(monitor?.lastCheckedAt).toBeDefined();
    }, 15000);
  });

  describe('POST /api/monitors/test-url (Safe Arbitrary URL Diagnostic Probe)', () => {
    it('should execute a safe live probe against public URL', async () => {
      const res = await request(app)
        .post('/api/monitors/test-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          httpMethod: 'GET',
          timeoutSeconds: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.statusCode).toBe(200);
      expect(res.body.data.responseHeaders).toBeDefined();
    }, 15000);

    it('should block arbitrary loopback probe via SSRF guard', async () => {
      const res = await request(app)
        .post('/api/monitors/test-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'http://127.0.0.1:8080/internal',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isSuccess).toBe(false);
      expect(res.body.data.errorMessage).toContain('SSRF Blocked');
    });
  });

  describe('Discord Webhook Channel Configuration', () => {
    it('should allow adding a Discord Webhook notification channel', async () => {
      const res = await request(app)
        .post('/api/notifications/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: AlertChannelType.DISCORD_WEBHOOK,
          destination: 'https://discord.com/api/webhooks/123456789/abcdefgh',
          notifyOnDown: true,
          notifyOnRecovery: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe(AlertChannelType.DISCORD_WEBHOOK);
      expect(res.body.data.destination).toContain('discord.com');
    });
  });
});
