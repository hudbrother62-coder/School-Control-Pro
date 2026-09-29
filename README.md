# School Control

**Satu Sistem, Semua Urusan Sekolah.** Modular school SaaS. One school = one owner account + one subscription; invite members with separate logins. 3-day trial.

## Status

Source code is an **initial integrated foundation**, not the completed feature parity of every existing Bantu Beres product. See [product scope and acceptance checklist](docs/PRODUCT_SCOPE.md). Existing production repositories and databases remain untouched.

## Stack

Next.js 15 / React 19 / TypeScript; Supabase Auth/PostgreSQL/RLS; Gemini server API for reviewed AI drafts; Midtrans Snap + signed webhook; Vercel host.

## Setup

1. Provision a NEW Supabase project solely for School Control (not BK Pro, Disiplin Pro or WiFi Pro).
2. Apply migrations in `supabase/migrations/` in timestamp order. Disable email confirmation only if account-registration and invite-code controls are configured for your intended security model.
3. Copy `.env.example` to `.env.local`; set public URL/publishable key and private server keys. Do not commit .env.
4. Run `npm install`, `npm run lint`, `npm run build`, and `npm run dev`.
5. Import `hudbrother62-coder/School-Control-Pro` into a new Vercel project and set environment variables. Do not point the new app at another product's database.
6. Set Midtrans notification URL to `https://YOUR_DOMAIN/api/billing/midtrans`. Supply `SCHOOL_CONTROL_MONTHLY_PRICE_IDR` from the chosen commercial pricing; the value is intentionally not invented. Start with sandbox mode.
7. Login, create school, confirm 3-day trial, make staff profile, test check-in/out, invite member, and test tenant isolation before production.

## Features in source

Responsive role-aware shell, Auth, multi-school onboarding/invites, staff directory, server-time self-attendance, manual correction RPC, shift scheduling, leave approvals, evidence verification, factual performance counts, school classes/students/attendance/assessments/journals, discipline and assigned BK records, initial program/finance/payroll forms, secure AI draft endpoint with per-school monthly budget, and Midtrans checkout/idempotent reconciliation. A generic record list currently acts as an operational starter for the remaining module screens, **not** as the full implementation of those source products.

## Required environment variables

See `.env.example`. Payment and AI keys are strictly server-side. The app displays a clear unconfigured state rather than fabricated sample data.
