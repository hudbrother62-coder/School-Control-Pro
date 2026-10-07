# SekolaPro cinematic landing QA — 2026-10-07

## Reference and implementation
Approved six-scene miniature-school storyboard: hero, learning, students, administration, facilities, roles. Purple/blue graduation-cap brand retained. Implemented one sticky viewport over native scrolling, with continuous background, three matching generated room artworks, GSAP camera movement and a lazy Three.js cap. This is hybrid 3D: miniature rooms are rendered artwork, not navigable WebGL geometry. Demo cards contain illustrative data labelled as such.

## Review and corrections
- Reviewed desktop hero and scenes, dark/light theme, feature catalogue and prices beside the approved visual direction.
- Verified sticky stage top remains 0 while scrolling; no horizontal overflow.
- Verified 390×844 and 320×640 portrait layouts. Adjusted cap placement and hid demo cards on short portrait screens to prevent overlap with tour navigation.
- Reviewed 667×375 and 844×390 landscape layouts. Stage now equals viewport height; all tour controls remain inside it.
- Feature search “sarpras” returns facilities catalogue; privacy copy follows existing role restrictions.
- Native dialog Escape closes, restores opener focus, and restores body scrolling.
- Facilities copy was updated after incorporating concurrent main commit 13aaffe, which added the Sarpras module. No photo-upload claim: current module stores facilities without photos.
- Price and trial copy follows current repository source: Rp199,000/30 days, Rp1,990,000/365 days, seven-day trial. Registration chooses billing later; both pricing CTAs use the existing registration route.
- Reviewer found short-landscape clipping and reduced-motion cap resize redraw; both corrected.

## Verification limits
Cloud-browser GPU reports disabled WebGL. The image fallback and scroll transitions were inspected; actual GPU-rendered cap is not visually verified in this browser. School/database workflows are preserved and covered by existing regression scripts; no live account was created and Sarpras database migrations were not executed by this landing-page task.

## Validation
TypeScript lint and all 17 verification scripts passed after the concurrent main update. Final `npm run build` passed with 14 routes generated and landing first-load JavaScript 163 kB; Three.js is a separate lazy chunk. Temporary responsive QA route removed before build.
