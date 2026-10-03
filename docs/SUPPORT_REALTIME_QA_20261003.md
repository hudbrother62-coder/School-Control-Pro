# Support chat, customer timelines and automatic updates

## Scope delivered

- Customer school list: all schools, name/ID search, trial/active/inactive status filters, 25 rows per page.
- Exact subscription deadline, trial days remaining, renewal days remaining, hours/days until operational access ends, and elapsed inactive days. Existing server expiry rules are preserved; no invented grace period or automatic deletion policy.
- School details include contact/identity fields, owner, every member, role, registration/membership dates, verified email, restrictions, last login, operational summaries, payments and audit activity. Personal counseling and individual payroll records are not exposed to the platform dashboard.
- A floating phone button opens an internal private support room on all user roles, the expired-subscription screen and the account setup screen.
- Super admin has searchable contacts for every school account and unassigned account, including accounts that have never started a chat. Contacts are paged by 50.
- Text, private voice-note storage, playback, microphone permission errors, recording preview/discard, 120-second/5-MB limits, unread/read cursors, older message pages and mobile contact/room navigation.
- Conversations are per user and school. Another user at the same school cannot read the conversation. Super admin identity is checked against the protected platform-admin table; no editable auth metadata grants access.
- Supabase Postgres Changes deliver support events. A minimal school revision table delivers data invalidation for 76 existing school tables; no private record content is broadcast to other roles. Account signup/login changes also invalidate the platform dashboard.
- Shared subscriptions debounce refreshes, remove listeners on unmount, reconcile after reconnect/visibility changes and check safe revision metadata every 30 seconds. Chat also reconciles every 15 seconds. No browser reload is used.
- Data refresh hooks cover 35 data screens plus profile/configuration editors and the shell. Navigation, searches, filters and open entry forms remain mounted. Unsaved profile, attendance, class-year and AI project fields are protected from background reads.
- Updated public usage guide.

## Verification

- Production build and TypeScript pass.
- 14 automated regression suites pass, including exact deadline boundaries and suspended/missing-date cases.
- Existing browser suite passes 175 module screens and 320/390/768/1366 layouts, navigation, overlays, Excel ordering, filters, pagination, partial bulk actions and typed class creation.
- Live integration uses five temporary isolated QA identities and two temporary schools, with real Auth, REST, private storage and WebSocket delivery. No customer data or credentials are used.
- Live assertions cover idempotent concurrent room creation; impersonation rejection; cross-school and same-school privacy in REST and realtime; empty/oversized text; authorized unread cursors; support after expired trials for viewer accounts; support before school creation; real audio upload/download; unauthorized audio signing; missing/oversized-duration audio; anonymous restrictions; and safe school-change signals after an actual authorized RPC.
- Real browser user/admin sessions verify text delivery without reload; actual MediaRecorder recording, upload, realtime receipt and audio playback; four responsive widths; a student update from an independent client appearing in the mounted list; and preservation of an unsaved student form.
- Real browser admin checks include school countdowns, all account details, verified email, inactive filtering and mobile contact/room navigation.
- QA fixtures and their audio assets are removed after final production verification.

## Reproduction

`npm test`, `npm run build`, and `node scripts/verify-workspace-browser.cjs` (requires Chromium path).

Live tests are explicitly opt-in: supply `SC_QA_FIXTURE_FILE` pointing outside the repository to isolated temporary users/schools; never use customer credentials. `verify-support-live.cjs` also requires a valid WebM fixture through `SC_QA_AUDIO_FILE`. `verify-support-browser.cjs` accepts `SC_QA_SITE_URL` for the deployed site, and a valid `CHROMIUM_EXECUTABLE_PATH`. The browser uses a fake microphone, while encoding/upload/playback remain real.

Screenshots and generated QA documents are excluded from git. Live result files contain assertions only, not tokens or passwords.

## Production release verification

- Commit `30dc1b18b002812c6bbfc1a18fdfff3c733fced4` deployed READY to the canonical site.
- All eight live browser checks also passed on `https://school-control-pro.vercel.app`, including actual voice recording/playback and cross-session student updates.
- Removed all five QA audio objects and all five temporary users, two schools, four conversations and two school-change rows. Verified zero matching fixtures remain.
- Cleanup exposed a pre-existing audit trigger bug that blocked school deletion during child cascades. Added a parent-deletion guard; verified ordinary student deletion still creates its audit entry, and school deletion cascades cleanly. The extra audit regression transaction was rolled back.
