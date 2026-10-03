# Integrated dashboard, journals and workflows

Dashboard: role-authorized database aggregates for student/staff attendance, finance, tasks, normalized grades and journals. Month/class filters, per-user chart preference and accessible numeric export. Empty data never implies absence.

Workspaces link existing canonical teaching, student support, finance, HR and program modules without deleting features. Journals support daily/student entries, agenda/task references, draft/submission/revision/review, archive/restore and permanent deletion with reason. Monthly and optional daily reports use the existing school report identity/templates. Teacher journals remain in their original canonical module. Viewers cannot write journals.

AI receives authorized aggregate operational context plus curated school memory. No private journal prose, student identities, counseling, salaries or private messages enter operational context. Counts are descriptive, not quality rankings.

## Verification

- 15 default test suites passed; production build and lint passed.
- Full browser run: 183 menu screens plus functional flows and mobile widths 320/390/768, desktop 1366; result in qa/workspace-browser-results.json.
- Latest focused browser run passed after daily report filter and date/display adjustments.
- Transactional production-database tests passed: cross-school/class guards, author/manager privileges, state transitions, anonymous denial, archive deletion, report privacy, normalized grades, void finance exclusion, more than 1000 rows and aggregate AI scope. Fixtures rolled back.
- Real Auth/database/browser test passed: linked journals, live review without refresh, canonical student selection, colleague privacy, Word report and role-aware graphs. Isolated fixtures cleaned after production verification.

## Practical limits

Live Gemini output quality was not measured: no provider credential was used in this verification. Mocked provider contract checks verify context, error handling and output standards, not external model accuracy. Payment charging was not exercised. Menu smoke coverage does not claim that every possible business scenario or external service was exhaustively tested.

Production verification: canonical deployment ecb66586904c51482a458e59c0c5bd547687de14 READY. All ten real Auth/database/browser assertions passed (qa/journal-production-results.json). Landing annual pricing contrast and mobile widths passed. QA school, users, journals, reports and change signals verified absent after cleanup. Final numbered reports still resist direct deletion; parent school cascade guard permits school removal.
