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
