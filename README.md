# SekolaPro

**Satu Sistem, Semua Urusan Sekolah.** Modular school SaaS. One school = one owner account + one subscription; invite members with separate logins. admin-provisioned monthly access.

## Status

Source code is an **initial integrated foundation**, not the completed feature parity of every existing Bantu Beres product. See [product scope and acceptance checklist](docs/PRODUCT_SCOPE.md). Existing production repositories and databases remain untouched.

## Stack

Next.js 15 / React 19 / TypeScript; Supabase Auth/PostgreSQL/RLS; Gemini server API for reviewed AI drafts; Midtrans Snap + signed webhook; Vercel host.

## Setup

1. SekolaPro is bound to the pre-provisioned EMPTY Supabase project `sfzaexzpbcvynkhglndi`; do not attach other products' databases.
2. The current database migrations have been applied in timestamp order. Configure Supabase Auth Site URL / Redirect URL for your Vercel domain. Public signup is not part of the customer flow; Super Admin creates accounts with confirmed emails.
3. Public Supabase URL and publishable key are already present in `.env.production` (safe browser-visible identifiers). Set the private server-only keys in Vercel Environment Variables; never commit secrets.
4. Run `npm install`, `npm test`, `npm run lint`, `npm run build` before deploying.
5. Import `hudbrother62-coder/School-Control-Pro` into Vercel. The landing page is `/`, login `/masuk`, workspace `/app`, and Super Admin `/admin`. `/daftar` redirects to login.
6. Payment plans default to Rp79,000/30 days or Rp790,000/365 days, configurable by `SCHOOL_CONTROL_MONTHLY_PRICE_IDR` and `SCHOOL_CONTROL_YEARLY_PRICE_IDR`. To accept real money, enter `MIDTRANS_SERVER_KEY` and `SUPABASE_SERVICE_ROLE_KEY` as private Vercel environment variables, use sandbox first, set notification URL `https://YOUR_DOMAIN/api/billing/midtrans`, and set `MIDTRANS_IS_PRODUCTION=true` only after sandbox test passes.
7. Log in as Super Admin, create a customer school/owner in **Kelola Akun**, confirm 1-month access, test login, account suspension, manual payment confirmation, data isolation, and expiration before production.

## Features in source

Responsive role-aware shell, Auth, multi-school onboarding/invites, staff directory, server-time self-attendance, manual correction RPC, shift scheduling, leave approvals, evidence verification, factual performance counts, school classes/students/attendance/assessments/journals, discipline and assigned BK records, initial program/finance/payroll forms, secure AI draft endpoint with per-school monthly budget, and recorded Midtrans events without automatic activation. Renewal is confirmed explicitly by Super Admin. A generic record list currently acts as an operational starter for the remaining module screens, **not** as the full implementation of those source products.

## Required environment variables

See `.env.example`. Payment and AI keys are strictly server-side. The app displays a clear unconfigured state rather than fabricated sample data.

## Customer account lifecycle (October 2026)

- Super Admin alone creates a school owner or an additional school account. Newly provisioned schools receive **one calendar month**; there is no public signup or trial.
- Super Admin can pause an entire school or block an individual account. PostgreSQL row-level access checks block suspended and expired accounts; stored school data is retained.
- The Super Admin dashboard shows accounts within 7 days of renewal; the school stops being accessible when its server-side deadline is reached.
- Payment confirmation requires a unique payment reference and renews one calendar month, carrying forward remaining paid time. Reusing a reference is idempotent and audited.
- Admin actions are routed through the JWT-protected `manage-school-customers` Supabase Edge Function. No service-role key is exposed to the browser or required by Vercel.
- The former public `register-school-account` Edge Function has been disabled, and direct checkout is unavailable. Gateway callbacks may record receipts without extending access.
