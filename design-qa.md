# SekolaPro connected school — design QA

Final result: passed

## Target and approach
Approved image: exec-868e57f0-378c-4e97-b42d-f16f72cc8666.png, 1024 × 1536. One connected terraced school with warm learning rooms, real-looking school activities, lush gardens, purple illuminated stairs and a twilight blue environment. Native HTML retains the approved short headlines, feature chips, application preview and CTA. Two clean 1024 × 1536 WebP backgrounds preserve the same geometry in evening/daylight; no raster UI or wall slogans. The illustration is a rendered 3D visual, with continuous image framing rather than a live 3D mesh.

## Full composition and focused comparison
Browser desktop: 1363 × 936, native full story approximately 2044 px tall. Captured full-page implementation at /workspace/scratch/sekolapro-terraces-desktop.jpg, normalized the 2:3 story area to the reference 1024 × 1536 for a side-by-side comparison at /workspace/scratch/352384837b93/sekolapro-design-comparison.jpg. Focused hero comparison also inspected. Subsequent browser viewport inspection covered the final hero, learning, students, management and application preview after alignment fixes.

Findings and fixes: initially dim reveal text was raised to 85% before entry; local soft shades keep copy readable without covering the central staircase or people. Hero top spacing reduced from 11vw to 8vw and display type from 5.8vw to 5.4vw. Removed an unnecessary paragraph line break. Students and management moved upward to align with their rooms; the four-tile preview moved from below the management area to the right terrace beside it. Daylight shading was softened to avoid large white patches.

Typography: self-hosted Plus Jakarta Sans, bold display hierarchy, short two-line headings, compact body copy. Consistent Lucide stroke icons, readable native feature chips and purple-to-blue CTAs. Brand mark retained. Image compression visually inspected at desktop and mobile sizes; room activity remains sharp. No placeholder avatars or procedural/CSS school substitutions.

## Viewport resilience
Inspected 390 × 844 portrait, 320 × 640 small portrait and 667 × 375 landscape via temporary iframe QA route. Route removed before publishing. Mobile shows an unobstructed sticky school view above native-flow information, panning through the same image as scrolling progresses. Reduced blank section spacing from 55svh to 38svh. No horizontal clipping or unusable navigation observed at 320 px; shorter landscape image window keeps native text reachable. Desktop copy occupies outer margins and the main staircase remains visible.

## States, functionality and accessibility
- Mobile menu opens a native dialog; close and Escape work. Focus returns without intentional scrolling.
- Sarpras search displays facility inventory, borrowing, maintenance, procurement and stock checks. Nonsense searches show a clear empty state.
- Data siswa chip opens matching school/student features instead of an empty search. Other chips use contextual search.
- Pricing shows the existing monthly/yearly plans and current 7-day trial. FAQ expansion checked for facility management.
- Theme toggles display matching day/evening assets, not a recolored night illustration. Light modal and small-screen contrast inspected.
- Native links keep existing /masuk and /daftar routes. No registration, payment, permissions or backend behavior changed.
- Semantic headings/buttons/landmarks, visible focus indicators, labeled search/theme/menu/close controls, dialog focus handling, decorative image hidden from assistive technology.
- Reduced-motion CSS removes transforms/entrance transitions; JS removes reveal animation and zoom. Scrolling remains native, without snapping, input interception or per-chapter image/camera resets.

## Verification
Camera regression first failed before implementation and now passes 1000 progress samples, endpoint clamping, monotonic pan and continuous zoom. npm test: all 17 regression scripts passed. TypeScript/lint passed. Production build passed; final build rerun after removal of the temporary QA route.

Browser full-page screenshots intermittently timed out; full composition was captured successfully once and compared, with final adjustments verified in focused native viewport screenshots. Browser proof images: /workspace/scratch/sekolapro-terraces-top.jpg and /workspace/scratch/sekolapro-terraces-mobile.jpg.
