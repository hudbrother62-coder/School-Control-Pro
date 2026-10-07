# SekolaPro landing design QA

Result: passed (2026-10-07).

Reference: user six-scene design board, 864 × 1536. Compared the classroom reference crop and rendered desktop screenshot side by side in `/workspace/scratch/352384837b93/compare.png`. Inspected full hero, classroom, counseling, administration, facilities, access, and both themes in the browser.

The implementation follows the reference's vivid indigo/violet palette, warm room lighting, bold rounded typography, colorful feature tiles, and blue glass panels with pale data cells. Desktop uses a full viewport rather than the reference board's condensed strips; mobile stacks copy and preview cards.

Viewports checked: desktop 1363 × 936; embedded mobile 390 × 844, 320 × 640, and landscape 667 × 375. Fixed compact access-scene actions overlapping bottom navigation. Mobile scroll label and mouse icon are hidden; arrow controls remain available.

Motion: native forward/backward scrolling changes scenes while stage top remains at zero. Scene artwork uses complementary smooth blend weights; only one copy pane is visible, eliminating stopped-scroll ghost text. Copy and panels enter with restrained CSS motion. Reduced-motion CSS disables entrance animations and scene artwork uses direct selection.

Functional checks: all six navigation targets, theme switch, feature catalogue, Escape dismissal, registration/login links retained. Plus Jakarta Sans loaded from bundled fonts. Facilities remain presented according to the existing catalogue and access follows application roles.

No unresolved P0/P1/P2 visual issues. Illustration panels represent sample UI; room illustrations are generated artwork. This is a responsive interpretation rather than a pixel-identical reproduction of the composite reference board.

## Day theme and lens-motion revision

2026-10-07: Removed the hero's “Satu data / Beragam tanggung jawab” card. Light theme now uses four matching daytime illustration assets, dark ink, white glass panels, pastel metrics, and restrained copy/footer veils. Night artwork and original dark palette remain available.

Built-in imagegen prompt: lighting-weather edit of each existing campus/classroom/counseling/office illustration; preserve composition, architecture, people and signage; change to pale blue morning sky, natural warm sunlight, white walls and green foliage, retain violet brand accents, no UI or added text. Project assets: `public/landing/{campus,classroom,counseling,office}-day.webp`. Generated assets inspected before conversion and browser use.

Idle movement uses a separate 18-second CSS perspective orbit layer. Scroll lens zoom ranges from 1.04 to 1.16 around each scene boundary and reverses continuously. Actual WebGL cap also rotates gently while idle; fallback cap uses CSS motion. Reduced-motion rules disable orbit/zoom and retain direct scene selection. School images use simulated depth, not a full geometric building orbit.

Browser evidence: idle matrix changed while document scroll remained stationary; zoom reached approximately 1.14 during a boundary scroll versus 1.04 at rest; reverse scrolling restored hero while stage top remained zero. All day assets loaded. Inspected daytime hero, classroom, counseling, administration, facilities, access; desktop 1363 × 936 and mobile 390 × 844 / 320 × 640. Compacted mobile metric preview to avoid clipped values.

Also reproduced focus-induced scrolling inside `overflow:hidden` stage (internal scrollTop 57, header top -58). Changed stage overflow to clip, removing the internal scroll container; navigation now leaves internal scrollTop 0 and header top 0. Artwork remains clipped. No application console errors observed.

## Mobile cap and scene typography revision
- Hide decorative graduation cap below 760px; preserve the brand logo.
- All scene copy and preview text enter and leave with reversible scroll progress, staggered by element. Reduced motion remains static.
- Mobile browser verified: cap display none, stage scrollTop zero, resting heading opacity 1, outgoing heading opacity 0.073 and translateY -14.831px. Light and dark hero remain readable.
- TypeScript and pure motion bounds tests passed.

## Continuous school journey (2026-10-07)
- Replace mutually hidden slide sections with six chapters in native document flow. No snap, wheel interception, scene swapping, or inactive content.
- One persistent school model: open classrooms with students and teacher, counseling, administration, library garden, playground and entrance. Native scroll follows a single smooth camera arc.
- Static geometry and people are instanced; one walking figure, capped 30fps and device pixel ratio, pause outside viewport and hidden tabs, full renderer cleanup. Reduced motion retains static camera and readable copy.
- One matching campus image remains visible if WebGL is unavailable, with continuous reversible tilt/lift/zoom. Browser here has no WebGL; fallback path verified, GPU rendering remains unverified in this environment.
- Desktop: model column between copy and preview, copy right 413.55px, model left 417.88px, model right 984.05px, preview left 984.03px (rounding boundary); preview padding keeps visible content apart.
- Mobile: sticky school occupies its own upper area. 390x844, 320x640, 667x375 tested; no horizontal overflow, chapter starts below model, mobile floating nav removed.
- Native scroll forward/back, chapter jump, theme toggle, searchable facilities catalogue and Escape dismissal verified. Camera fallback tilt +3.38 degrees after scrolling, with same image source; resting heading opacity 1.
- Application regression suite and TypeScript checks passed. Production build recorded separately after preview route removal.
- Production build passed (14 routes), no QA route shipped. Landing initial JavaScript 163 kB. Webpack rebuilt after recoverable development-cache warnings.
