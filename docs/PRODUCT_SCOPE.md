# School Control — product scope and implementation status

**Product promise:** one school, one owner account and subscription, private staff accounts with role-based access; three-day trial; mobile-first and light/dark UI. School Control is a new product, not a copy of the databases of other applications.

## Source modules and target behavior
| Source | Target modules | Required behavior |
|---|---|---|
| Bantu Beres Kepsek AI | Kepsek AI | School profile/memory, PBD, KSP/KOSP, RKJM/RKT/RKAS assistant, agendas, supervision, document editor and reviewed exports |
| Guru AI | Guru AI | Lesson planning, learning materials, assessment assistance, editable content and revision history |
| Buku Kerja Digital | Akademik | Master classes/subjects/students, student attendance, grade book, teacher journals, monthly recap, import/export |
| Disiplin Pro | Disiplin | Daily attendance history, violations, achievements, restorative follow-up, class/year filters and reports |
| BK Pro | Counseling | Student needs, assigned caseworker, confidential notes, RPL, case follow-up, aggregates only for principals |
| Sekolah Command Pro | Programs | School-year planning, PIC, meetings, tasks, deadlines, evidence, verification and risks |
| SIKAS Pro | Finance | Accounts/cash, categorized transactions, RKAS/BOSP checks, reconciliation and printable reports |
| Gajian Pro | Staff & payroll | Staff directory, shifts, self attendance check-in/out, leave/overtime, approval, locked payroll and payslips |
| New customer request 2026-09-29 | Teacher performance | Real attendance, participation in school programs, documented training, supervisory evidence, authorized evaluation and response |

The owner can manage membership, principal accesses school operation and aggregated counseling statistics, teachers access their own work, counselors only their assigned confidential cases, finance and payroll have distinct roles. A viewer cannot write data.

## Delivered in current repository
- Next.js + TypeScript responsive shell, light/dark, desktop sidebar and mobile bottom bar, role-aware navigation.
- Email/password Auth binding; school creation RPC and three-day trial; invite code to join with a personal account.
- School-scoped database schema and RLS, student/class/staff core entities, records, tasks, case, finance/payroll tables.
- Staff self-attendance RPC using server time and school timezone; manager-only manual attendance with reason/audit; configurable staff shift; factual member-specific performance counts and evidence verification.
- Leave requests with management/HR approvals; school classes and students, student attendance, assessment entries and teacher journals.
- Initial structured UI for disciplinary events, counselor-assigned cases, school programs, finance transactions and monthly payroll drafts.
- Limited school-scoped AI draft endpoint for Guru AI and Kepsek AI with per-school request quota.
- Midtrans Snap checkout API and signature-checked idempotent subscription activation webhook (requires private server env and testing).

## Not yet production-ready
This is a functioning **foundation once a dedicated Supabase project is connected and the migrations are applied**. Complete domain-specific workflows, bulk imports/exports, comprehensive student grade reports, complete counseling workflows, cross-module evidence and approval chain, payroll calculation/slips, report generation, school memory AI pipeline, automated legacy data migration, billing portal and operational QA are NOT complete. The generic module notes do not claim to replace original product functions. Do not advertise as a complete school ERP before the acceptance tests below pass.

## Integration strategy
1. Freeze an explicit mapping of school, user, employee, student, class, academic year, subject and legacy source IDs. Preserve source IDs in a mapping table when migration is authorized.
2. Extract per-source schemas and API behavior, migrate into School Control domain tables via controlled idempotent jobs, and check record counts plus sampled reports.
3. Do not connect an old production Supabase database directly to a new school workspace. Never mix data between projects/tenants.
4. Use one shared student and staff master. Permissions follow the destination domain; BK confidential notes never feed generalized AI or principal data grids.
5. Release module by module behind role/feature flags, with regression tests and reversible rollout.
6. Audit mobile navigation, forms, monthly historical reports, file private URLs, exports, security boundaries and AI budgets.

## Acceptance tests before launch
- School A cannot read/write school B data even with forged IDs, including student-linked cases and payroll.
- Viewer cannot write, and principal cannot read identifying confidential counseling notes.
- Check-in and check-out use server time; repeating an action cannot create a second daily attendance record; manual correction requires a reason and actor.
- The attendance result is a factual indicator, not an automatic competency verdict.
- Trial expires after three days; expired schools cannot write or consume AI; billing cannot be activated by a client-side button.
- Midtrans notification has a valid signature, order ID, amount and idempotent server reconciliation; duplicate notifications cannot extend the subscription twice.
- Permissions revoke promptly when membership is removed; secrets stay server-only; uploaded evidence is privately stored.
- Original applications remain operational throughout migration.
