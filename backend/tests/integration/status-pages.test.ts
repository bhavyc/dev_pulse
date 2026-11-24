import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';

describe('Status Pages API Integration Tests', () => {
  const testEmail = `sp_tester_${Date.now()}@example.com`;
  let authToken = '';
  let monitorId = '';
  const testSlug = `status-page-slug-${Date.now()}`;

  beforeAll(async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        name: 'Status Page Tester',
        teamName: 'Status Page Testing Org',
      });

    authToken = regRes.body.data.token;

    // Create a monitor to attach
    const monRes = await request(app)
      .post('/api/monitors')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Core Auth Service',
        url: 'https://example.com/auth',
        checkIntervalSeconds: 300,
      });

    expect(monRes.status).toBe(201);
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

  describe('POST /api/status-pages', () => {
    it('should create a public status page linked to monitors', async () => {
      const res = await request(app)
        .post('/api/status-pages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Core Public Status',
          slug: testSlug,
          description: 'Official status of our systems',
          isPublic: true,
          monitorIds: [monitorId],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe(testSlug);
    });

    it('should reject duplicate slug creation', async () => {
      const res = await request(app)
        .post('/api/status-pages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Duplicate Status Page',
          slug: testSlug,
          monitorIds: [monitorId],
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/status-pages/public/:slug (Unauthenticated)', () => {
    it('should allow public unauthenticated visitors to view the status page', async () => {
      const res = await request(app).get(`/api/status-pages/public/${testSlug}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Core Public Status');
      expect(res.body.data.systemStatus).toBe('ALL_OPERATIONAL');
      expect(res.body.data.services.length).toBe(1);
      expect(res.body.data.services[0].name).toBe('Core Auth Service');
    });

    it('should return 404 for nonexistent status page slug', async () => {
      const res = await request(app).get('/api/status-pages/public/nonexistent-slug-xyz');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
