# SekolaPro scroll book implementation

Goal: Implement the approved feature-book mockup and the user's explicit execution instruction. One persistent physical 3D book, with reversible zoom-in, browse, zoom-out, then sheet turn driven only by scroll.

Scope: Landing presentation only; retain existing feature catalogue, pricing, auth links and themes. No backend or permission changes.

Architecture: `lib/landing-scroll.ts` derives bounded continuous book state from scroll. `components/SekolaBook.tsx` owns a Canvas2D renderer with Three camera/projection math, page geometry, textures and lifecycle. `SekolaLanding.tsx` owns native short copy, scroll progress, navigation and dialogs. Generated top-down 1536×1024 spreads become texture maps on deforming 3D sheets, not screenshots of the site.

Plan:
- [x] Write a regression for zoom returning before each sheet turn, continuity at chapter boundaries, reversibility and bounds. Watch it fail, implement the scroll state.
- [x] Create physically bending paper and consistent book cover/page stack; render only during scroll, resize or texture updates. Cap mobile pixel ratio; dispose resources on route unmount; static fallback if the canvas or textures fail.
- [x] Replace terraced school presentation with a sticky viewport and four long chapters (480svh each). Keep copy beside book on desktop and below it on phone. Text enters/exits with scroll; no snapping or autoplay. Provide accessible chapter navigation and normal reading layout for reduced motion.
- [x] Inspect approved image against browser screenshot, check forward/reverse page turns, zoom, small phones, light theme, dialog and CTA. Fix visible issues. Run full tests, TypeScript and production build.
- [x] Atomically commit to existing GitHub main and verify matching Vercel READY deployment and live behavior (publication verification follows the implementation checks).

Review focus: no division by zero at the final progress endpoint; no stale textures on reverse scroll; all assets decode before active view; touch stays native; Canvas/texture failure keeps readable content and working CTA. Small 320px screens must not crop native controls or overlap book with text.
