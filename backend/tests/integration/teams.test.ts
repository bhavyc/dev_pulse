import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';
import { UserRole } from '@devpulse/shared';

describe('Teams & Collaboration API Integration Tests', () => {
  const ownerEmail = `team_owner_${Date.now()}@example.com`;
  let authToken = '';

  beforeAll(async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: ownerEmail,
        password: 'Password123!',
        name: 'Team Lead Owner',
        teamName: 'Platform SRE Team',
      });

    authToken = regRes.body.data.token;
  });

  afterAll(async () => {
    try {
      const user = await prisma.user.findUnique({ where: { email: ownerEmail } });
      if (user) {
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch (e) {
      // ignore
    }
    await prisma.$disconnect();
  });

  describe('GET /api/teams/members', () => {
    it('should fetch current team details and members', async () => {
      const res = await request(app)
        .get('/api/teams/members')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Platform SRE Team');
      expect(res.body.data.members.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.members[0].role).toBe(UserRole.OWNER);
    });
  });

  describe('POST /api/teams/invitations', () => {
    it('should invite a new teammate via email', async () => {
      const inviteeEmail = `invitee_${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/teams/invitations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: inviteeEmail,
          role: UserRole.MEMBER,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(inviteeEmail);
      expect(res.body.data.token).toBeDefined();
    });
  });
});
