# School report templates and pricing — 3 October 2026

## Delivered scope

- Pusat Laporan → Template Laporan Sekolah: private DOCX upload, logo/signature/stamp upload, font and size, sample DOCX, test export, active templates and detach action.
- Template priority: exact document type → module → school default → built-in formal layout. Word styles, margins, fixed images, header/footer and school text placeholders survive templating. Official reports and narrative documents use the shared export engine. Archived reports refresh private asset links while retaining their snapshot identity/template version.
- Word data blocks contain the actual module sections/tables. Raw Word image placeholders use embedded media and relationships in document, header and footer. No macros, embedded objects or oversized uncompressed packages accepted.
- Excel remains a separate analytical workbook: summary and per-section sheets, automatic column widths, autofilter, safe sheet names and duplicate names. Formula-like text is escaped; numeric cells stay numeric.
- One subscription tier: School Control Pro, IDR199,000 per 30 days / IDR1,990,000 per 365 days. Central source used by landing, plans API, billing/paywall and Midtrans order calculation. Existing orders retain their recorded amount. No AI-unlimited claim.
- New schools: seven-day trial (existing live function verified). Paid generator allowance is 200 requests per calendar month UTC; trial total is 15 requests, including a fix preventing allowance renewal on month boundaries.
- AI: 16 tool-specific standards injected on the server, unknown generator types rejected, structural check returned with draft, truncated outputs rejected, personal key header now used. Teacher/manager review remains required.

## Pricing judgement

This is an initial product price, not a claim that the market guarantees this value. It includes a broad internal operational suite and school template customization with a bounded AI allowance. Official comparator Lentra lists IDR650,000/year for its scope; Sakola lists IDR5 million for its 100-student full-module/support offering and says annual payments are available (the card does not label its term explicitly). School Control is priced above the low-cost entry offering but remains below many service-assisted school implementations. The yearly discount equals two monthly payments. Review support burden and actual conversion after early paid customers.

Google's published Gemini 2.5 Flash standard text prices are USD0.30 per million input tokens and USD2.50 per million output tokens, including thinking. With 200 requests and an 8,192-token cap per request, maximum output alone is approximately USD4.096; input, infrastructure, payment fees and support add costs. A planning exchange rate of IDR17,000/USD is an assumption, not a retrieved spot rate. Do not price unlimited AI at this rate. Default thinking budget is bounded at 1,024 tokens. Actual provider/model environment may differ.

Sources checked 3 October 2026:
- https://lentra.id/harga
- https://sakola.id/harga/
- https://ai.google.dev/gemini-api/docs/pricing
- https://docxtemplater.com/docs/tag-types/
- https://supabase.com/docs/guides/storage/security/access-control

## Verification and limits

- Thirteen automated suites pass, including a real DOCX ZIP roundtrip and simulated provider contract tests for all 16 configured document generators.
- DOCX checks: split Word runs, preserved margins/header/footer, table data, three distinct embedded images, header and document image relationships, escaped school text, two separate school identities, invalid/macro/oversized upload rejection. All XML/rels parse. Generated fixture renders as one page in LibreOffice; inspected at full-page resolution, with no overlap/clipping and all three asset labels visible.
- Build and TypeScript checks pass. 175 menu screens, four viewports (320/390/768/1366), sample download → real browser DOCX upload → school-format download, and mobile navigation checks pass. Full browser checks recorded separately in docs/qa/workspace-browser-results.json; these use synthetic identity and intercepted APIs, not production data.
- Live Supabase metadata verifies private bucket, size limit, tenant/manager policies, anonymous RPC denial, seven-day trial and total trial quota logic. Configuration migration and trial-quota migration applied to the connected project.
- **Live Gemini output not verified:** local environment has only publishable database configuration and no Gemini key; the live application browser has no signed-in session. Simulated outputs establish API/format contracts, not semantic accuracy. Do not report this as a passed live AI test.
- Uploaded DOCX layout applies to Word. Browser preview/PDF uses the existing formal application layout with school assets; users can export Word to PDF to retain the exact uploaded Word layout. Arbitrary Word-template-to-PDF conversion is not deployed.
- Template files are immutable paths. Detaching or replacing a template keeps the old object for archived snapshots. No permanent storage purge is exposed.
- Signature/stamp images are rendered as school-provided artwork; the app does not treat them as cryptographic signatures or proof of approval.
