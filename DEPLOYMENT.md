# DevPulse — Production Deployment Guide (₹0 Cost)

This guide walks you through deploying DevPulse to production with **zero budget (₹0)** using permanently free-tier cloud infrastructure.

---

## Architecture Overview

- **Database**: Supabase Free PostgreSQL (500 MB storage, connection pooler)
- **Backend API & Scheduler**: Render Free Web Service (750 free instance hours/month)
- **Frontend App**: Vercel Free (Unlimited serverless deployments, automatic HTTPS)
- **Email Notifications**: Resend Free (3,000 emails/month)
- **Keep-Alive Automation**: Cron-job.org (Free 10-minute HTTP ping to avoid Render sleeping)

---

## Step 1: Set Up Free PostgreSQL on Supabase

1. Go to [Supabase](https://supabase.com) and create a free account (no credit card required).
2. Click **New Project** and name it `devpulse`.
3. Set a strong database password and choose your nearest region.
4. Once the project is created, navigate to **Project Settings** -> **Database**.
5. Under **Connection string**, select **NodeJS / URI** and copy the URI:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
6. Run migrations from your local terminal to initialize the tables:
   ```bash
   DATABASE_URL="<your-supabase-uri>" npx prisma db push --schema backend/prisma/schema.prisma
   ```

---

## Step 2: Deploy Backend to Render Free Tier

1. Push your repository to GitHub.
2. Go to [Render](https://render.com) and create a free account.
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository.
5. Configure the service:
   - **Name**: `devpulse-api`
   - **Region**: Choose closest to your Supabase region
   - **Branch**: `main`
   - **Root Directory**: `backend` (or leave root with workspace commands)
   - **Runtime**: `Node`
   - **Build Command**: `npm --workspace=shared run build && npx prisma generate --schema backend/prisma/schema.prisma && npm --workspace=backend run build`
   - **Start Command**: `node backend/dist/server.js`
   - **Plan**: `Free` ($0/month)
6. Add the following **Environment Variables**:
   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `5000` |
   | `DATABASE_URL` | `<Your Supabase Connection URI>` |
   | `JWT_SECRET` | `<Generate 32+ character random secret>` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `FRONTEND_URL` | `https://devpulse-frontend.vercel.app` (update once Vercel is deployed) |
   | `RESEND_API_KEY` | `<Optional: Your Resend API key>` |
   | `RESEND_FROM_EMAIL` | `onboarding@resend.dev` |
7. Click **Create Web Service**.
8. Once deployed, note your Render URL (e.g. `https://devpulse-api.onrender.com`). Verify by visiting `https://devpulse-api.onrender.com/api/health`.

---

## Step 3: Prevent Render Sleep Mode with 100% Free Keep-Alive

Render free web services sleep after 15 minutes of inactivity. To ensure the autonomous monitoring engine runs continuously:

1. Sign up for a free account on [Cron-job.org](https://cron-job.org).
2. Click **Create Cronjob**.
3. **Title**: `DevPulse Keep-Alive Ping`
4. **Address**: `https://devpulse-api.onrender.com/api/health`
5. **Schedule**: User-defined -> Every 10 minutes (`*/10 * * * *`).
6. Save the job.

This simple keep-alive keeps the Render container warm and ensures continuous 24/7 background probe execution without spending a single rupee.

---

## Step 4: Deploy Frontend to Vercel Free Tier

1. Go to [Vercel](https://vercel.com) and sign in with GitHub.
2. Click **Add New** -> **Project** and select your `devpulse` repository.
3. Configure the project:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Select `frontend`
   - **Build Command**: `npm --workspace=shared run build && next build`
4. Under **Environment Variables**, add:
   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://devpulse-api.onrender.com/api` |
5. Click **Deploy**.
6. Once deployment finishes, Vercel gives you a public domain (e.g. `https://devpulse.vercel.app`).
7. Update `FRONTEND_URL` in your Render backend settings to match your new Vercel domain.

---

## Step 5: Verification & End-to-End Checklist

- [ ] Visit `https://devpulse.vercel.app` -> Register a new account.
- [ ] Add a new monitor targeting `https://httpbin.org/status/200` with 5-minute interval.
- [ ] Verify that the monitor appears in your dashboard with `UP` status.
- [ ] Create a public status page at `/status-pages/new` with slug `system-status`.
- [ ] Open an incognito browser tab and visit `https://devpulse.vercel.app/status/system-status` to verify that unauthenticated visitors can view your live status.
- [ ] Check `/analytics` to confirm latency percentiles and uptime graphs reflect real database records.

---

**Congratulations! Your DevPulse monitoring SaaS is now live in production at ₹0 initial budget!**
