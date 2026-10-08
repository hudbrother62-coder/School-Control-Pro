# Sekolapro mobile and integration QA — 8 October 2026

## Fixed behavior

- At 320px, the fixed-height column header wrapped its actions into another column and widened the page to 575px. A later icon rule also made the hidden menu button visible. The header now grows with its content, uses one vertical column on phones, retains six 44px quick actions, and keeps menu access in the bottom navigation. Tablet wrapped headers also grow rather than clipping actions.
- The Sarpras component was imported but missing from the application renderer. All five Sarpras workspaces now render their actual component.

## Verification

- `npm run lint`, all 18 suites in `npm test`, `npm run test:finance`, and production `npm run build`: PASS.
- Browser UI integration: 204 owner/counselor menu screens, with no JavaScript errors. Search, class filtering, paging, partial archive failures, class creation, HR destination tables, journals/review/archive, agenda visibility, notifications, DOCX template upload/export, landing information dialogs and admin detail dialogs passed.
- Phone interactions: menu drawer, Escape, body portals, short 520px-high student forms and school communication at 320/390px passed.
- Layout audit: 4,008 route/role/viewport/theme checks passed. Owner widths: 320, 360, 390, 430, 768, 1024px. Other roles: 390px. Light/dark at widths up to 390px. Roles: owner, principal, vice_principal, teacher, counselor, treasurer, finance_staff, hr, supervisor, staff, viewer.
- An additional 752 phone layout checks passed after correcting fixture loan/maintenance statuses to the actual schema values.
- Browser datasets include 61 students and three representative records per notes, library collections/loans/visits/acquisitions, Sarpras inventory/rooms/requests/maintenance/procurement/opname, programs/tasks, finance transactions and budgets.

## Direct database verification

`verify-isolated-runtime.sql` executed successfully on the connected Supabase project. It creates three temporary identities and an internal test school, runs its lifecycle checks as `authenticated`, and rolls back the entire transaction. Foreign schools use explicitly selected temporary identities.

Three iterations each verified student/class data and attendance, library checkout/return and three-copy procurement receipt, duplicate receipt rejection, Sarpras borrowing/return/room movement and procurement receipt, and partial/full student bill payments with overpayment rejection. Note and group/private chat visibility were checked for teacher and principal roles. Legacy management checks covered source/template archive and tenant references; HR checks covered referenced record preservation, recruitment/payroll privacy, denied teacher master writes, self-approval rejection and cancellation.

Post-test queries confirmed zero retained QA accounts/schools. All `sc_` tables have RLS enabled. No schema migration was needed.

## Reproduction

The browser runner needs Playwright and a Chromium executable. It can resolve Playwright from `CODEX_PRIMARY_RUNTIME_NODE_MODULES` or the normal Node module path.

```bash
CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node scripts/verify-workspace-browser.cjs
CHROMIUM_EXECUTABLE_PATH=/path/to/chromium WORKSPACE_MOBILE_AUDIT=1 node scripts/verify-workspace-browser.cjs
```

`WORKSPACE_AUDIT_ROLES` and `WORKSPACE_AUDIT_WIDTHS` accept comma-separated subsets. `WORKSPACE_TEST_URL` can target the deployed frontend. Its Supabase/AI traffic remains intercepted for synthetic UI QA; it is not a live authenticated end-to-end test. `WORKSPACE_AUDIT_RESULT_FILE` can keep production frontend results separate from local audit results.

## Scope limits

The layout audit checks rendered screens, page overflow, header bounds and header touch targets. It does not certify every CRUD action in every module. Database lifecycle tests complement it for the specified workflows and roles. Other roles do not receive the full width matrix.

Live paid AI-provider responses, real merchant settlement, realtime delivery across physical devices, voice capture/playback, real GPS/geofence accuracy, and every module's live authenticated CRUD flow remain outside this verification. Browser APIs and sockets are intercepted. The visual frontend and selected database lifecycle/security checks must not be described as universal production E2E certification.

Evidence: `workspace-browser-results.json`, `mobile-audit-results.json`, and the reproducible SQL/browser scripts. Deployment readiness and commit identity are verified separately after the main-branch push.
