# Source-first integration — NO imported customer data

All features are rebuilt in the standalone School Control codebase against \`sc_*\` tables, with one school and one shared master of students, classes, teachers and academic year. **Existing source products retain their own databases and user records. There is no legacy credential, production endpoint, runtime connector, ETL job, or data-copy script.** Instrument wording and procedural behavior are the only reused assets.

| Source system | Adapted workflow inside School Control | Further parity work |
|---|---|---|
| Bantu Beres Kepsek AI | school profile/memory, PBD/KSP/KOSP/RKJM/RKT/RKAS/SOP AI drafts, document versioning/approval, academic supervision instruments | source-specific multi-stage audit, validated regulation registry, formatted docx/xlsx exports and full school-year planning |
| Guru AI | lesson/module/LKPD/assessment generators, private editable AI history | full product template library and teaching-media integrations; source repo contains no full app code |
| Buku Kerja Digital | shared students/classes/subjects, homeroom/subject assignment, individual + bulk attendance, grades, journals, monthly class recap, CSV | advanced per-assessment analytics, Excel workbook formats, lesson schedule UI |
| Disiplin Pro | violation/achievement/coaching entries, follow-up owner and status, class filter, CSV report, archive-preserving student master | detailed print report templates and optional automations |
| BK Pro | counselor-only cases, 12 service types, student history and follow-up; aggregate-only management report | richer need-mapping and RPL forms, referrals and private file attachments |
| Sekolah Command Pro | programs/PIC/tasks/deadlines, minutes, calendar, private evidence, verification workflow | meeting attendee/task dependency and school-year Gantt |
| SIKAS Pro | cash/bank/e-wallet, transactions, budget lines, student bills, atomic payment receipts, summary and export | payment reconciliation and official-report templates |
| Gajian Pro | own server-time attendance, shifts, manual corrections and audit, leave approval, performance evidence, compensation, draft-review-approve-lock-paid, private slip | detailed allowances, payroll withholding and bank payout integration |
| Universal Orchestrator | intent-to-module router with role gate + AI generation of reviewed teacher/principal drafts | cross-module approval-powered AI actions, optional provider abstraction, safety/quality evaluations |

## Security invariants

- Each tenant row carries \`school_id\`; privileged workflows use a per-school membership check in database RPCs. No frontend-only permission model.
- Student/teacher master references are reused. Status changes and archives keep historical records.
- Private counselor records never become general AI context or principal user-level views.
- Payroll values are only visible to owner/HR, with individual slips returned only to their owner.
- Midtrans payment activation is server-only with verified signature and idempotent reconciliation.
- AI quotas apply per school; model credentials remain server-side. School memory contains manually curated general facts only.
- Uploaded evidence uses private tenant-prefixed paths and time-limited signed links.
- New source test blocks old Supabase production refs/hardcoded publishable keys and verifies role routing.

## Deployment gate

A successful GitHub TypeScript/build check verifies compileability, NOT database runtime security or payment correctness. Before retail release: provision a dedicated database, apply every migration in order, verify schema with non-sensitive seeded test tenants, run tenant/role penetration tests and full responsive UI E2E, test sandbox payment notifications including duplicates, test exports and backups, complete privacy/terms and price configuration, configure Vercel and switch to production gateway only after confirmation.
