# School Control — AES checkpoint 2026-10-02

Overall state: BLOCKED for authenticated browser verification and merchant configuration; NOT VERIFIED_DONE. Continue all unfinished work below. Do not treat successful builds as feature completeness.

## User requirements, preserved in full

1. menu demo kamu jadikan menu sekolah yang daftar, untuk terdaftar sekolah harapan 2 jaya, untuk akses seperti sekolah, data boleh kamu kosongi semuanya, jadi bukan demo dan update bisa masuk ke akun itu juga
2. perbaiki menu login dan daftar karena banyak gagalnnya
3. untuk pembayaran siapkan pakai pihak ketiga yaitu mistra
4. siapkan isi dari akun admin super, semua isi rekapan dan yang paling detail
5. banyak kutemui update semua nya sama, bahkan isi datannya sama cuman ganti judul, ini ga boleh kamu harusrubah sesuai panduan dan aturan
6. pastikan semua fitur pas, isi datannya lengkap dan pastikan semua fitur bisa import exel dan ada tamplatennya
7. bisa edit dan hapus, masuk draft dan buang permanen jika dibutuhkan kalau tidak bisa hapus permanen
8. berikan absen guru supaya bisa absen sesuai agenda di jam dan lokasi yang sudah ditentukan
9. pastikan semua validasi ada
10. pastikan semua fitur ga ada yang kelewat kita itu butuh kelengkapan jadi jangan kamu simpulkan, cukup kamu masukan tinggal copas terus coppy di sini
11. analisa dan jalankan lagi dan katakan selesainkalo bener bener semuannya selesai

Payment clarification: user explicitly selected Midtrans on 2026-10-02.

## Requirement status

| Point | Evidence / current state | Remaining acceptance work |
|---|---|---|
| 1 | Database has one ordinary school named Sekolah Harapan 2 Jaya, is_internal_test=false, active subscription. Operational tables were empty. /demo redirects to /app. | Verify owner account opens the normal workspace in browser and persists its own changes. |
| 2 | Existing server-confirmed Edge Function registration and password login passed against an isolated disposable test account; account then removed. No unconfirmed users remained. Plain-object error messages repaired across forms. | Browser login/signup/session/logout/recovery flows; existing school-owner session. Password recovery currently redirects to /masuk and needs separate verification of password update UI. |
| 3 | Snap checkout, SHA-512 signature verification, amount checks, server-only reconciliation and idempotent subscription activation exist. | Production checkout returns 503: gateway configuration incomplete. Configure MIDTRANS_SERVER_KEY, SUPABASE_SERVICE_ROLE_KEY, server public DB env, base URL, merchant notification URL. Validate sandbox checkout and duplicate webhook before production activation. Never put secrets in chat/repository/browser bundles. |
| 4 | sc_platform_summary and sc_platform_school_detail executed as authenticated platform admin; school, subscription, roles, attendance, academic, BK aggregates, programs, finance, HR, documents, calendar, payments and audit returned successfully. | Browser verification of overview, school drill-down, searches, transaction history, empty/loading/error states. |
| 5 | /demo no longer serves the local-storage simulation with duplicated generic views. Normal app uses domain components. | Full source-by-source audit of form inputs, outputs and reports against Guru AI, Buku Kerja Digital, Disiplin Pro, BK Pro, Command Pro, SIKAS, Kepsek AI, Gajian Pro. Distinct headings alone do not count. |
| 6 | Existing templates/imports found in master, academic, journal, grades, discipline, BK, programs/tasks/meetings, finance, HR, calendar, supervision. Shared Excel parser now handles actual date/time cells and numeric serials while preserving scores, money and coordinates. Tests pass in UTC and Asia/Jakarta. | Complete per-submenu inventory and actual template/import/export round trips. Several components have no direct importer. Large import loops need partial-failure/retry/duplicate handling verification. |
| 7 | Many entities already expose edit/delete RPCs; students, documents and payroll have archive/draft workflows. | HR schedules/locations/components lack complete edit/archive/purge UI. Many operational deletes are permanent; verify safe archive/restore before destructive deletion where history matters. Several editors still use browser prompt/confirm. ReportArchive has no complete archive-management actions. |
| 8 | Runtime SQL tests passed for valid agenda check-in/out, outside-radius rejection, missing-GPS rejection, future-time rejection and duplicate check-in idempotency. Additional regression found and fixed: a selected agenda location must have valid coordinates; disabled/missing location at checkout fails; viewer attendance writes rejected. All test writes rolled back. | Authenticated teacher UI with configured location/schedule; actual browser permission-denied states and responsive behavior. |
| 9 | Supabase object errors now display their actual message. HR location/schedule inputs enforce names, coordinates, time order, integer tolerance/radius. Empty imported GPS coordinates are no longer converted to 0,0. | Full field-by-field validation and consistent accessible error/success/empty/loading states across all domain forms. |
| 10 | All eleven original instructions preserved above; module navigation and existing regression checks examined. | Complete feature-parity inventory with every original feature explicitly mapped and tested. No claim of 100% parity. |
| 11 | QCL performed for error rendering, Excel dates, agenda geofence and production deployment. | Overall verifier cannot approve until remaining must-haves and merchant tests pass. |

## Verified checkpoints

- Repository: hudbrother62-coder/School-Control-Pro, branch main.
- First verified production commit this turn: dc726458cb7f71ea656f05cedef148869fa0ede1.
- Deployment: dpl_HVWZAR1n9Q3AKXutVFXUfsg7j4Kw, READY, production. Live home visibly shows seven-day trial.
- Applied database migration: 20261002064940_reject_unconfigured_agenda_geofence.sql.
- npm run lint, npm test, npm run build passed after Excel and geofence-related client changes.
- npm test includes existing isolation/navigation/report checks, plain-object error regressions and actual XLSX date/time workbook regression.
- Security advisors checked after DDL. Existing notices remain: intentionally callable authenticated SECURITY DEFINER RPCs require continued authorization review; sequence table has no public policies by design; leaked-password protection disabled. No blanket claim of clean security audit.

## Next work

## Continuation implemented after “langsung atasi semuannya”

- Added /pulihkan recovery form with password confirmation, 8–128-character validation, updateUser and sign-out. Reset emails now target that route. Email delivery/redirect allowlist and browser recovery still require verification.
- HR schedule/location/payroll masters: edit, archive, restore, guarded permanent delete; weekday selection and assignment effective dates/history.
- HR requests: distinct Lembur/Kasbon/Reimburse filters and explanations, positive monetary request validation, pending edit/cancel, own-account Excel templates/imports.
- HR import: row failure capture/download and recruitment opening cache. Partial successes remain visible; duplicate/retry convergence across every module is still pending.
- Recruitment: separate opening/candidate forms, draft/open/closed openings, candidate stage/interview/contact editing, candidate archive/restore/purge. Used openings cannot be deleted.
- Report archive: status filter, reason, archive/restore RPC. Final snapshots, document number, period and original status cannot be mutated or purged.
- Command: form editors replace prompt chains for program/task/meeting/agenda, program/task/meeting archive/restore, dependency-preserving purge guards, atomic task edit/status transaction, deadline clearing.
- Closed confirmed database privilege bug: ordinary teachers could write HR masters directly. Restricted master writes to HR managers; limited candidate/payroll/tracking visibility; denied own-request approval and cross-school references.
- SQL rollback tests passed: actual seeded private row visibility, teacher write denial, self-approval denial, own cancellation, HR dependency deletion, cross-school references, recruitment history protection, report archive/restore/immutability, command archive and atomic rollback.
- npm lint/test/build passed during implementation; rerun required for final published changes. Added executable HR field validation tests and replayable scripts/verify-hr-runtime.sql.
- First continuation production commit f1da36d2f5e3ae9cbc26a8c84f9deebc992f9ae7, deployment dpl_34QVRJcRiKNU85aSwjKRY5FJAmmd READY. Public browser /pulihkan without a recovery session renders the correct expired/missing-link message.
- Added docs/FEATURE_COVERAGE.md: every one of 180 submenu entries across 18 modules, explicit router component and source-level Excel indication. It deliberately does not certify E2E or direct import coverage for every entry.
- Subsequent continuation adds distinct PIC assignment metrics, deadline ordering/overdue indication, per-program progress and problem filtering; distinct leave/permission and performance event filters/forms.
- StaffWorkflows now has kind-specific templates/imports for shifts, manual attendance corrections, performance evidence and own leave requests; row errors downloadable. Exports explicitly identify loaded-data scope. New parser tests cover actual calendar dates, duplicate-name rejection, stable staff IDs, category/time/range validation.
- Midtrans notification validation extracted without changing reconciliation behavior; signed tampering, invalid payload types, fraud capture gating and status mapping tests pass. Merchant sandbox checkout still blocked by configuration.
- Second continuation production commit e771ec00a36c8da191e1c03a23c2f7e8d7d08490, deployment dpl_F2u4ka9x4WuSdsCGkWr6LwCWVLbg READY. Public /masuk, /daftar, /pulihkan return 200; unauthenticated checkout correctly returns 401.
- Additional runtime tests passed for imported staff update/evidence payloads, duplicate/future manual attendance rejection, payment amount mismatch and exactly-once entitlement extension under repeated/late notifications. Payment SQL tests ran with service-role claims inside a rolled-back transaction; this is not merchant sandbox E2E.
- Added Excel templates/imports for evaluation drafts and own responses. Draft import does not submit or finalize evaluation. Response editor now uses a modal. Fixed ignored draft employee changes and denied finalization for expired subscriptions; rollback tests passed.
- Management library/source/head-performance/workflow templates/imports now available, with row failure downloads. School templates and sources gain edit/archive/restore/purge, preserving linked document sources. Workflow metadata UI/imports restrict modifications to draft/review documents.
- Executable URL schemes, credential-bearing URLs, wrong-school file prefixes and cross-school source-document references are rejected. Management SQL runtime script is saved at scripts/verify-management-runtime.sql.

Overall remains NOT VERIFIED_DONE: full feature parity, all per-menu Excel round trips, authenticated responsive browser flows, merchant credentials and sandbox payment E2E are outstanding. Do not reduce remaining work to credentials alone.

1. Browser sign-in was declined earlier. Do not retry the secure handoff unless the user asks to sign in; do not request passwords in chat. Authenticated UI verification remains blocked.
2. Verify normal account experience, then execute per-menu template/CRUD/archive/report checks against disposable school data.
3. Finish missing HR edit/archive/purge flows and other gaps identified in the inventory.
4. Verify recovery and invite/account edge cases.
5. Obtain merchant configuration through supported secure settings; configure and test Midtrans sandbox.
6. Repeat complete requirement coverage, mobile/desktop and production checks; mark VERIFIED_DONE only after all relevant must-haves pass.
