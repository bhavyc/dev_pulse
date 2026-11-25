# DevPulse — Zero-Budget Developer Monitoring SaaS

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-darkblue)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![Budget](https://img.shields.io/badge/Initial_Budget-₹0-brightgreen)](#zero-budget-architecture)

> **DevPulse** is an enterprise-grade website and REST API monitoring platform designed for developers, engineering teams, and indie hackers. DevPulse continuously tracks uptime, measures latency percentiles, manages incident lifecycles, and publishes branded public status pages — built, tested, and deployed with an initial budget of **absolutely ₹0**.

---

## 🌟 Key Features

- **Autonomous Monitoring Engine**:
  - In-memory interval scheduler (5m, 10m, 15m, 30m intervals) requiring zero Redis or BullMQ.
  - Microsecond latency telemetry (`process.hrtime.bigint()`) tracking DNS, TCP, TLS, TTFB, and total response time.
  - Consecutive failure damping (2-failure threshold) to prevent false alerts from transient network noise.
- **SSL/TLS Certificate Expiration & Health Telemetry**:
  - Automatically inspects peer certificates on all HTTPS endpoints.
  - Tracks certificate issuer, subject CN, valid period, and countdown of days remaining.
  - Visual status badges and proactive alert buffers before certificates expire.
- **Interactive Live Diagnostic Prober**:
  - On-demand instant endpoint diagnostic execution directly from the dashboard.
  - Detailed latency waterfall breakdown (DNS, TCP handshake, TLS negotiation, TTFB, Total).
  - Live inspection of response headers and SSL status.
- **Enterprise-Grade SSRF Protection**:
  - Blocks loopback (`127.0.0.1`, `::1`), RFC 1918 private subnets, link-local addresses, and cloud metadata (`169.254.169.254`).
  - Pre-flight DNS resolution with socket pinning to prevent DNS rebinding attacks.
  - Strict redirect inspection (max 3) validating every `Location` header destination.
- **Incident Lifecycle Management**:
  - Automatically opens incidents upon confirmed downtime (`INVESTIGATING`).
  - Allows manual investigation updates (`IDENTIFIED`, `MONITORING`).
  - Automatically detects service recovery and resolves incidents with duration metrics.
- **Multi-Channel Alert Dispatching (Email & Discord Webhooks)**:
  - Transactional email alerts via Resend Free tier (3,000 emails/month).
  - Rich embedded Discord Webhook notifications for instant DevOps chat alerts.
  - 30-minute deduplication buffer to eliminate alert storms.
  - Graceful fallback mock logger if no email API key is configured.
- **Telemetry Analytics**:
  - 24-hour, 7-day, and 30-day uptime availability calculations from actual database records.
  - Interactive response time trends and check distribution charts powered by Recharts.
- **Public Branded Status Pages**:
  - Unauthenticated, publicly shareable status pages (`/status/:slug`).
  - Displays real-time operational state, active incident notices, and 90-day history.
- **Team Management & Multi-Tenancy**:
  - Default personal teams created automatically on signup.
  - Invite teammates via email with role permissions (`OWNER`, `ADMIN`, `MEMBER`).

---

## 💰 Zero-Budget Architecture (₹0 Spend Breakdown)

| Component | Free Provider | Quota / Limits | Strategy |
|---|---|---|---|
| **Frontend** | [Vercel Free](https://vercel.com) | 100 GB bandwidth, unlimited invocations | Next.js 15 SSR / SSG deployment |
| **Backend** | [Render Free](https://render.com) | 750 free instance hours/month | Express.js REST API + in-memory scheduler |
| **Database** | [Supabase Free](https://supabase.com) | 500 MB PostgreSQL 15, 200 pooled connections | Prisma ORM with 30-day rolling log retention |
| **Alerts** | [Resend Free](https://resend.com) | 3,000 emails/month (100 emails/day) | Transactional alert dispatch + mock fallback |
| **Keep-Alive** | [Cron-job.org](https://cron-job.org) | 100% Free recurring cron pings | Pings `/api/health` every 10m to prevent Render sleep |

---

## 🏗 Monorepo Architecture

```
devpulse/
├── backend/                  # Node.js + Express + Prisma REST API
│   ├── src/
│   │   ├── config/           # Database singleton & Zod environment
│   │   ├── controllers/      # API controllers (Auth, Monitors, Incidents, etc.)
│   │   ├── engine/           # Scheduler, SSRF Guard, Prober & Worker Pool
│   │   ├── middleware/       # Auth, RBAC, Rate-Limiting, Error Handling
│   │   ├── routes/           # REST endpoints
│   │   ├── services/         # Business logic layer
│   │   ├── validators/       # Zod validation schemas
│   │   └── server.ts         # Server entry point
│   ├── tests/                # Jest integration and unit test suite
│   ├── prisma/schema.prisma  # PostgreSQL schema definition
│   └── Dockerfile
├── frontend/                 # Next.js 15 (App Router) + Tailwind CSS + Shadcn
│   ├── app/
│   │   ├── (auth)/           # Login, Register, Forgot Password, Reset
│   │   ├── (dashboard)/      # Overview, Monitors, Incidents, Analytics, Settings
│   │   └── status/[slug]/    # Unauthenticated public status page
│   ├── components/ui/        # Reusable UI primitives
│   ├── context/              # Auth state context & session manager
│   ├── lib/                  # ApiClient & formatting utilities
│   └── Dockerfile
├── shared/                   # Shared TypeScript contracts, enums, DTOs
├── docker-compose.yml        # Local orchestration (PostgreSQL + Backend + Frontend)
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+ installed
- PostgreSQL running locally on port 5432 (or run via Docker)

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/devpulse.git
cd devpulse
npm install
```

### 2. Configure Environment Variables
Create `.env` in root (and in `backend/.env`):
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/devpulse?schema=public"
JWT_SECRET="devpulse-super-secret-jwt-key-minimum-32-chars-long-zero-budget"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
RESEND_API_KEY=""
RESEND_FROM_EMAIL="onboarding@resend.dev"
```

In `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

### 3. Build Shared & Sync Database
```bash
# Build shared types
npm --workspace=shared run build

# Apply Prisma schema to PostgreSQL
npx prisma db push --schema backend/prisma/schema.prisma
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend API (port 5000)
npm run dev:backend

# Terminal 2: Frontend App (port 3000)
npm run dev:frontend
```

Visit **http://localhost:3000** to register and create your first monitor!

---

## 🐳 Docker Compose (One-Command Startup)

To run the entire stack containerized (PostgreSQL + Backend + Frontend):
```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api/health`

---

## 🧪 Automated Testing

DevPulse includes 8 test suites covering 45 automated unit and integration tests:

```bash
# Run all backend tests
npm --workspace=backend test
```

### Test Coverage Highlights:
- **Authentication**: Registration, Login, Token generation, Password hashing, Reset token flow.
- **Monitors**: CRUD, Pause/Resume toggle, Expected HTTP codes validation, Interval constraints.
- **SSRF Protection**: Verification of blocked subnets (RFC 1918, Loopback, Cloud Metadata, Carrier-grade NAT, IPv6, non-HTTP protocols).
- **Prober Engine**: Microsecond latency measurement, timeout detection, SSRF rejection.
- **Live Diagnostics & SSL**: On-demand probe execution, timing waterfall, peer certificate extraction.
- **Incident Lifecycle**: Automated incident creation on 2 consecutive failures, manual investigation updates, automatic resolution on recovery.
- **Alert Channels & Discord**: Multi-channel notification dispatching, Discord webhooks embed payload generation.
- **Status Pages**: Public unauthenticated retrieval, slug uniqueness.
- **Teams**: Default team creation, member listing, email invitations.

---

## 🌐 Production Deployment Guide (₹0 Cost)

See the comprehensive step-by-step guide in **[DEPLOYMENT.md](file:///e:/projects/devpulse/DEPLOYMENT.md)**.

### Brief Summary:
1. **Database**: Create a free PostgreSQL database on [Supabase](https://supabase.com). Copy the connection URI.
2. **Backend**: Deploy `backend/` to [Render](https://render.com) as a Web Service. Set environment variables.
3. **Frontend**: Deploy `frontend/` to [Vercel](https://vercel.com). Set `NEXT_PUBLIC_API_URL`.
4. **Keep-Alive**: Set up a free recurring ping on [Cron-job.org](https://cron-job.org) pinging `https://<render-backend>/api/health` every 10 minutes to keep the worker active 24/7.

---

## 🛡️ License
Licensed under the [MIT License](LICENSE).
