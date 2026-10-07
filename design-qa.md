# SekolaPro scroll book — design QA

Implementation reviewed against the approved 1024×1536 book storyboard (exec-ff32fbbd-d1fb-4944-a92b-9c49f393644f.png). The hero reference and actual 1280×430 viewport were normalized and viewed together at /workspace/scratch/sekolapro-book-comparison.jpg.

## Composition
Short native headings and CTA remain beside the ivory book; feature textures use the purple/blue brand. The implementation intentionally uses clean generated feature spreads rather than the reference desk scenery. Light mode has a pale continuous background and dark readable copy. Book contents are 1536×1024 lossless texture assets; camera projection and bending sheets are drawn into one persistent canvas. No WebGL dependency, so the test browser with GPU disabled still displays the moving book.

## Motion and interaction
Each chapter has 480svh (4.8 viewport heights) of scroll divided across approach, zoom, feature browsing, retreat and a physical page turn. Text enters and exits with scroll. Forward/reverse traversal, zoom before/after page turns, the final CTA, chapter navigation, student feature dialog, theme and registration destination were inspected. Native touch scrolling remains enabled. Reduced motion uses ordinary reading sections and a static book. No account form submitted.

## Viewports and corrections
Desktop 1363×936; compact desktop 1280×430; phones 390×844 and 320×640; landscape 667×375 and 844×390. Native information stays outside the central book. Fixed triangle seams with overlapping texture clipping, adjusted headline width, and removed minimum stage height for short landscape screens so navigation remains visible. Actual final 844×390 and 1280×430 layouts inspected after that correction.

## Validation
Pure scroll regression covers endpoints, 10,000 bounded continuity samples, chapter boundaries and reversal. Full existing test suite passed. TypeScript and production build passed before publication. Independent review found one landscape navigation issue, now corrected and visually verified. Browser app-error inspection was clean after replacing the unsupported WebGL prototype.

## Full-book focus revision
The initial frame now starts focused with no exterior text. Desktop canvas expands across the stage during focus, and projected cover bounds fit within its edges. Exterior copy is gated to the final portion of retreat (zoom below 0.3). Portrait cameras show a whole selected page and travel between left and right before retreat rather than fitting a tiny two-page spread in an empty tall viewport. Desktop initial and retreat states and 390×844 portrait framing were visually checked. Regression asserts no exterior copy during focused frames.
