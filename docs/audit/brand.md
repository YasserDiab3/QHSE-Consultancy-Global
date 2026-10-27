# QHSSE Consultant — Brand Audit & Compact Guidelines

**Date:** 27 October 2026  
**Scope:** Public site, client/training portal, PDF visit reports, training certificates, EN/AR copy.  
**Mode:** Read-only audit. No application files were modified.  
**Sources reviewed:** `components/BrandLogo.tsx`, `Header.tsx`, `Footer.tsx`; `app/globals.css`, `layout.tsx`, `page.tsx`, `about/page.tsx`, `services/page.tsx`, `login/page.tsx`, `register/page.tsx`, `dashboard/*`, `training/*`; `tailwind.config.js`; `lib/report-pdf.ts`, `lib/certificate-pdf.ts`, `lib/colors.ts`, `lib/service-cards.ts`; `public/brand/*`; `public/locales/en.json`, `ar.json`.

---

## 0. Verdict

**Working well**
- A recognisable brand idea exists: the tree/person mark (growth, people, environment) plus a bilingual, field-oriented consultancy proposition.
- The public site has a consistent navy-led layout language: dark hero bands, white content sections, rounded cards, Lucide icons, and documentary-style field photography.
- The client portal inherits the same `primary` tokens and header, so it broadly feels part of the same product.
- QR verification is already built into reports and certificates — a strong trust asset that is under-promoted.

**Core problem**
The identity is split into **four visual systems**:
1. **Logo system:** organic green/brown tree, opaque white square, raster inside SVG.
2. **Website:** navy `#1E40AF` + bright green `#22C55E`, soft SaaS-style cards.
3. **Auth/training/certificate pages:** royal blue `#3A4FC4` + brown `#8B4D00` + dark green `#163D2D`.
4. **PDFs:** grey/black report with `#95D14C`/`#F4E51F`, and a dark-green/brown certificate.

The result reads as a capable consultancy using several unrelated templates, not one assured QHSSE authority. Fixing the logo system, the palette ramp, and the PDF/certificate identity will deliver most of the brand uplift.

---

## 1. Brand foundation (recommended, to ratify)

**Purpose**  
Make safety and compliance practical, measurable, and durable for organisations operating in Egypt and the wider region.

**Vision**  
A region where safe operations are designed in, not audited in.

**Mission**  
We help organisations see risk clearly, prioritise what matters, and close the gap between an audit finding and everyday practice.

**Values**
1. **Integrity** — we report what we find, including what is inconvenient.
2. **Rigour** — evidence, standards, and traceability before opinion.
3. **Practicality** — recommendations a site team can actually execute.
4. **Stewardship** — people, environment, and long-term capability, not quick fixes.
5. **Partnership** — we stay through corrective action and closure.

**Personality**  
Assuring · Precise · Fieldwise · Plainspoken · Respectful.  
Not alarmist, bureaucratic, salesy, or academic.

**Promise**  
**Clear findings. Prioritised action. Measurable closure.**  
AR: **نتائج واضحة. أولويات عملية. إغلاق قابل للقياس.**

**Positioning statement**  
For food, industrial, and healthcare organisations in Egypt that need credible QHSSE assurance, **QHSSE Consultant** delivers field-tested audits, practical corrective-action plans, and bilingual reporting that stand up to regulators and customers — since 2022.

**Brand architecture**
- **Master brand:** QHSSE Consultant.
- **Descriptor:** Quality, Health, Safety, Security & Environment consultancy.
- **Service lines:** QHSE Consulting · Food Safety · Risk Assessment · Audits & Inspections · Training.
- **Products:** Client Portal · Training Portal.
- **Legal entity:** use a footer line such as “QHSSE Consultant is a trading name of [registered entity]” only if legally accurate. Do not present “QHSE Consultancy Global” as a second consumer brand.

**Tagline options**
- EN: **Practical safety. Measurable compliance.**
- AR: **سلامة عملية. امتثال قابل للقياس.**

---

## 2. Palette with roles

### Core palette

| Token | Hex | Role | Rules |
|---|---|---|---|
| `primary-950` | `#0B1220` | Deepest surface; hero overlays, footer edge | **Missing today**; must be added before use |
| `primary-900` | `#0F172A` | Dark sections, footer, primary text on light | White text 17.9:1 |
| `primary-800` | `#172554` | Hero gradients, dark panels | White text 14.6:1 |
| `primary-700` | `#1E3068` | Secondary dark surfaces, headings on tinted panels | White text 11.7:1 |
| `primary-600` | `#1E3A8A` | Hover/pressed navy; links on light | White text 10.4:1 |
| `primary-500` | `#1E40AF` | **Core brand navy**; primary buttons, active nav | White text 8.7:1 (AAA) |
| `primary-100` | `#DBEAFE` | Tinted panels, borders | Use with `primary-700` text |
| `primary-50` | `#EFF6FF` | Section wash, icon tiles | Use with `primary-700` text |

### Accent palette

| Token | Hex | Role | Rules |
|---|---|---|---|
| `accent-500` | `#22C55E` | Signal green: graphic accents, indicators on navy | **Never white text on it** (2.28:1) |
| `accent-700` | `#15803D` | Accessible green text/icons on white; success | 5.02:1 on white (AA) |
| `accent-300` | `#86EFAC` | Icons and fine rules on navy | 6.21:1 on `primary-500` |
| `accent-50` | `#F0FDF4` | Success/positive backgrounds | Pair with `accent-700` |
| **Logo green** | `#8FCF00` | Inside the original logo only | 1.89:1 on white — mark only |
| **Logo brown** | `#714101` | Inside the original logo only | 8.54:1 on white |
| **Bronze** | `#8B4D00` | Certificate seal / print signature only | 6.65:1 on white; do not use for web CTAs |

### Neutrals

| Token | Hex | Role |
|---|---|---|
| `slate-900` | `#0F172A` | Body headings; same value as `primary-900` |
| `slate-700` | `#334155` | Body copy on light |
| `slate-500` | `#64748B` | Secondary/meta text |
| `slate-300` | `#CBD5E1` | Disabled, dividers on dark |
| `slate-200` | `#E2E8F0` | Borders |
| `slate-100` | `#F1F5F9` | Section background |
| `slate-50` | `#F8FAFC` | Page background |

### Semantic palette (status/risk only)

| Meaning | Hex | Usage |
|---|---|---|
| Critical | `#DC2626` | Critical risk, destructive action |
| High | `#EA580C` | High risk |
| Medium | `#D97706` | Medium risk |
| Low / closed | `#15803D` | Low risk, resolved |
| Info / open | `#1E40AF` | Neutral information, open status |

**Rules**
- **Navy is the brand.** Green is a signal, not a surface. No large green sections, no green body text, no green primary buttons with white labels.
- **One green at a time.** Do not mix `#22C55E`, `#4ADE80`, `#95D14C`, `#8FCF00`, `#1E4031`, and `#163D2D` in the same journey.
- **Bronze/brown is ceremonial.** Certificate seals, print signatures, and the original logo only.
- **Risk colour is never the only cue.** Always pair with the words “Critical / High / Medium / Low” and an icon.
- **Use tokens, not hex.** Every raw `#` in a component is a future inconsistency.

### Contrast findings

| Pair | Ratio | Verdict |
|---|---|---|
| White on `#1E40AF` | 8.72:1 | Pass AAA |
| White on `#1E3A8A` | 10.36:1 | Pass AAA |
| White on `#22C55E` | 2.28:1 | **Fail** — current homepage CTA |
| `#22C55E` on white | 2.28:1 | **Fail** — current service check icons |
| `#15803D` on white | 5.02:1 | Pass AA |
| White on `#8B4D00` | 6.65:1 | Pass AA |
| `#95D14C` on white | 1.83:1 | **Fail** — report accent bar (graphic only) |

---

## 3. Typography

### Stack
- **Latin:** Inter, weights 400 / 500 / 600 / 700; 800 for display only.
- **Arabic:** Cairo, weights 400 / 600 / 700 / 800.
- **Fallback:** `system-ui, -apple-system, "Segoe UI", Arial, sans-serif`.
- **Numbers:** tabular numerals in tables, scores, report IDs, and certificate codes.

### Type scale

| Token | Latin size / line-height | Arabic size / line-height | Weight | Use |
|---|---|---|---|---|
| Display | 56 / 1.05, `-0.02em` | 48 / 1.25 | 700 | Homepage hero only |
| H1 | 40 / 1.15 | 36 / 1.30 | 700 | Page titles |
| H2 | 32 / 1.20 | 30 / 1.35 | 700 | Section titles |
| H3 | 24 / 1.30 | 24 / 1.45 | 600–700 | Card and service titles |
| H4 | 20 / 1.40 | 20 / 1.50 | 600 | Sub-sections |
| Body L | 18 / 1.65 | 18 / 1.80 | 400 | Hero subtitle, lead paragraphs |
| Body | 16 / 1.60 | 16 / 1.75 | 400 | Default |
| Small | 14 / 1.50 | 14 / 1.65 | 400–500 | Meta, labels |
| Caption | 12 / 1.40 | 12 / 1.50 | 500 | Footnotes, table notes |
| Overline | 12 / 1.20, `0.14em`, uppercase | 12 / 1.50, no tracking, no uppercase | 600 | Eyebrows, labels |

**Arabic typesetting rules**
- No uppercase, no letter-spacing, no italics.
- Increase line-height by ~0.15 over Latin.
- Keep Latin acronyms (QHSSE, ISO 45001, HACCP) in Latin; do not transliterate.
- Use Western digits for scores, codes, ISO references, and dates in tables; be consistent within a document.
- Maximum line length: 68 characters Latin, 55 characters Arabic.

**Current issues**
- `tracking-[0.55em]` on auth eyebrows is fashion/beauty styling, not QHSSE. Cap overline tracking at `0.14em`.
- `text-6xl` hero + `font-bold` is acceptable, but Arabic at 60px overflows; cap Arabic display at 48px.
- The font pipeline is duplicated: Google `@import` in `globals.css:1` plus `next/font` in `layout.tsx:8-18`; the Tailwind families point at literal `'Inter'`/`'Cairo'`, not the generated variables. Consolidate (see Fix 5).
- PDFs ask for `Cairo, Arial`, but jsPDF certificate output uses Helvetica. Arabic names in the certificate PDF will not shape correctly.

---

## 4. Logo system and rules

### Current asset reality
- `public/brand/qhsse-logo-header.svg`, `qhsse-logo-stacked.svg`, and `qhsse-logo-mark.svg` are **byte-identical** (same SHA-256, 926,632 bytes each).
- Each is a 1024 × 1024 SVG wrapping an **opaque white PNG**. There is no true horizontal lockup, no mark-only file, and no transparent/reverse variant.
- The wordmark occupies roughly 5% of the canvas height. At the header size of 52–64px, the wordmark renders at **~2.5–3px**; at footer 120–140px it is **~6–7px**. It is not legible.
- On the navy header, the opaque white square reads as a white tile with a tiny tree — not a deliberate brand lockup.
- `BrandLogo.tsx:10-26` maps three variant names to the same square composition; `BrandLogo.tsx:36-45` forces `object-contain` inside a square. The component cannot enforce clear space.

### Required logo variants

| Variant | Construction | Use |
|---|---|---|
| Primary horizontal | Mark + “QHSSE CONSULTANT” + optional “Since 2022” | Header ≥160px, footer, letterhead |
| Stacked | Mark above wordmark | Login, certificate, signage |
| Mark | Tree/person symbol only | Favicon, app icon, small spaces |
| Mono navy | Single-colour `primary-900` | One-colour print, fax, embossing |
| Mono white / reverse | Single-colour white, transparent | Navy header, footer, photography |
| One-colour black | Solid black | Legal/registration documents |

### Clear space
- **X = 25% of the logo height**, minimum 8px digital / 3mm print, on all four sides.
- The current asset bakes in only ~6% padding. Do not rely on it; produce a trimmed vector with measured clear space.
- No text, rule, button, or image edge may enter the clear-space zone.

### Minimum sizes
- Horizontal lockup: **160px wide / 40mm**.
- Stacked lockup: **96px wide / 30mm**.
- Mark: **24px / 8mm**.
- Never reproduce the full lockup below 96px; use the mark plus live text instead.

### Placement
- **Header:** mark at 36–40px + live wordmark at 16–18px semibold, or horizontal lockup at 160 × 40px. Do not use the square 52px lockup.
- **Footer:** reverse horizontal lockup at 180 × 44px; if the footer stays navy, use the white mono variant, not the full-colour white tile.
- **Login/register:** stacked lockup at 140–170px is appropriate; the current 170–190px is close but the asset must be transparent.
- **PDF letterhead:** horizontal lockup at 30–35mm wide, top-left; report title top-right or centred.
- **Certificate:** horizontal lockup at 35mm or mark + typeset name; do not place the square raster at 24mm and expect the wordmark to read.
- **Favicon/app icon:** mark only, 32px and 512px PNG exports.

### Logo colour rules
- Full-colour logo on **white or very light neutral** only.
- Mono white on navy, dark photography, or dark green.
- Mono navy on light backgrounds when colour reproduction is limited.
- **Recommended transition:** redraw the mark as vector and retint the canopy to `#22C55E` / `#15803D`, trunk and wordmark to `#1E3A8A`, with a white mono variant. This resolves the green/brown-versus-navy clash without losing the tree/person idea. Until approved, keep the original full-colour logo on white surfaces only and use a mono white variant on dark surfaces.

### Logo don'ts
- Do not stretch, rotate, outline, add shadows/glows, or apply gradients.
- Do not recolour individual leaves or the trunk.
- Do not retype the wordmark in Inter or Cairo; the wordmark is part of the mark.
- Do not crop the canopy or place the logo over a busy photo without a scrim.
- Do not place the opaque white square on navy without an intentional rounded tile and padding.
- Do not use the header/stacked/mark files interchangeably; they are currently the same file.

---

## 5. Photography and illustration

### What the current imagery does well
- The three hero images form a coherent documentary set: food-safety review, industrial inspection, training session. Same cool-neutral grade, same regional casting, same eye-level viewpoint.
- They show real work situations rather than handshakes or generic labs.

### Risks
- The images read as AI-generated. For a consultancy selling **verified field competence**, implied fake staff is a trust liability. Prefer real consultants, real sites, real PPE. If AI is used as interim art, do not caption it as “our team” and replace it before major sales use.
- The food-safety image shows a keffiyeh worn under/through a hairnet in a cleanroom. A food-safety client will notice. PPE and hygiene must be technically correct in every image.
- Files are 1672 × 941 PNG at **1.75–2.1 MB** each, displayed at ~580px. Convert to AVIF/WebP at ≤250KB with `next/image` `sizes`.
- Service detail pages use empty coloured gradient rectangles (`services/page.tsx:178-180`) instead of photography or explanatory diagrams.

### Photography principles
- **Documentary, not stock:** audits, HACCP walkthroughs, environmental sampling, corrective-action reviews, training with real materials.
- **People:** Egyptian/MENA workforce, mixed gender, correct hijab/PPE combinations, natural expressions, no forced smiles.
- **Technical accuracy:** hard hats, hairnets, gloves, eye protection, high-vis, and footwear must match the site. No loose hair, jewellery, or wrong PPE in food areas.
- **Light and grade:** natural/available light, neutral-cool grade, navy shadows, no teal-orange filter, no heavy vignette.
- **Composition:** 4:3 and 16:9; leave negative space for headlines; never place text over faces or critical PPE.
- **Captions:** describe the work and the standard, not “team meeting”. Example: “HACCP verification walk, cold-store receiving area.”

### Illustration
- Use only for **process and data**: methodology diagrams, risk matrices, report anatomy, timeline.
- Style: 1.5–2px line icons (Lucide), navy strokes, green for one highlighted step, no 3D blobs, no isometric people, no gradient meshes.
- Client logos: monochrome navy or approved full colour on white, equal optical size, consistent tile, named alt text, written permission.

---

## 6. Voice and tone

### Voice characteristics
- **Assuring:** calm, in control, never alarmist.
- **Precise:** standards, evidence, dates, and scope.
- **Fieldwise:** speaks like a practitioner, not a brochure.
- **Plainspoken:** short sentences; technical terms explained once.
- **Respectful:** culturally fluent in Arabic and English; never condescending.

### English principles
1. **Evidence before adjectives.** Replace “premier”, “world-class”, “decades” with dates, sectors, counts, and outcomes.
2. **Say what we do, for whom, with what result.** “We audit food sites against ISO 22000 and leave a prioritised corrective-action plan.”
3. **Use the client’s language, then the standard.** “Observation (a gap against the standard)” on first use.
4. **Active voice, short sentences.** One idea per sentence.
5. **Confident, not absolute.** “Supports compliance” / “prepares you for certification” — never “guarantees certification”.
6. **Specific CTAs.** “Request a site visit”, “Download a sample report”, “Book a 30-minute scoping call”.

**Rewrite examples**
- ❌ “Premier consultancy firm specializing in world-class QHSE solutions.”  
  ✅ “QHSSE consultancy for food, industrial, and healthcare operations in Egypt. Since 2022, we have delivered 200+ visit reports.”
- ❌ “Certified professionals with decades of industry experience.”  
  ✅ “Lead auditors and food-safety specialists with field experience across [sectors].” (Only if substantiated.)
- ❌ “Get Started Today”  
  ✅ “Book a scoping call” / “Request a site visit”.

### Arabic principles
1. **Formal Modern Standard Arabic**, B2B plural address: أنتم / ـكم / مؤسستكم.
2. **Mirror meaning, not syntax.** Avoid literal calques such as “حلول الخبراء”; use “استشارات متخصصة” or “حلول يقدمها خبراء”.
3. **Keep QHSSE in Latin**, with the Arabic descriptor on first mention: “الجودة والصحة والسلامة والأمن والبيئة (QHSSE)”.
4. **One glossary.** Observation = ملاحظة; corrective action = إجراء تصحيحي; compliance score = درجة التوافق; risk level = مستوى الخطورة; site visit = زيارة ميدانية; audit = تدقيق; inspection = تفتيش; close-out = إغلاق الملاحظة.
5. **No dialect, no hype.** Avoid “الأفضل” / “الأول” without proof; avoid “ثورة” / “الحل السحري”.
6. **RTL-native typography.** No letter-spacing, no uppercase, no italics; line-height 1.75–1.8 for body.
7. **Numbers:** Western digits for scores, codes, ISO references, and tables; Arabic-Indic only if the whole document uses them consistently.

**Rewrite examples**
- ❌ “الوصول إلى تقاريرنا وسجلات الزيارات” (access **our** reports)  
  ✅ “الوصول إلى تقاريرك وسجلات زياراتك” (access **your** reports).
- ❌ “محترفون معتمدون بعقود من الخبرة”  
  ✅ “مستشارون معتمدون بخبرة ميدانية منذ 2022” (or the actual, defensible number).
- ❌ “طلب زيارة”  
  ✅ “اطلب زيارة ميدانية”.

### CTA hierarchy
- **Primary:** Request a site visit / اطلب زيارة ميدانية.
- **Secondary:** Explore services / استكشف الخدمات.
- **Portal:** Client portal sign in / تسجيل الدخول إلى بوابة العملاء.
- **Training:** Start training / ابدأ التدريب.
- **Proof:** Download a sample report / حمّل نموذج تقرير.
Do not use “Get Started Today”, “Contact Us”, and “Request a Visit” for the same action in the same journey.

### Naming and acronym
- **QHSSE Consultant** is the master brand.
- **QHSSE** = Quality, Health, Safety, **Security** & Environment. If Security is not a service, say so explicitly; do not silently drop it.
- **QHSE** may be used only as a category label (“QHSE consulting”), never as the company name.
- Define the acronym on first use on every page: “Quality, Health, Safety, Security & Environment (QHSSE)”.

---

## 7. Do / Don't

| Do | Don't |
|---|---|
| Lead with evidence, dates, sectors, and outcomes | Use “premier”, “world-class”, “decades” without proof |
| Use navy for primary actions | Put white text on `#22C55E` (2.28:1) |
| Use mono white logo on navy | Place the opaque white logo square on navy |
| Use the full QHSSE descriptor consistently | Switch between QHSE, QHSSE, and “QHSE Consultancy Global” |
| Use one signal green and one semantic risk palette | Give every service a different rainbow gradient |
| Use real field photography with correct PPE | Use AI/staged images that imply real staff |
| Use Cairo for Arabic and Inter for Latin | Letter-space, uppercase, or italicise Arabic |
| Address the client as “you/كم” | Say “our reports” when you mean the client’s |
| Label risks with text + icon + colour | Rely on colour alone |
| Keep 25% logo clear space | Crowd the logo or crop the canopy |

---

## 8. Eight concrete consistency fixes

### Fix 1 — Rebuild the logo asset system and usage (P0)
**Evidence**
- `public/brand/qhsse-logo-header.svg`, `qhsse-logo-stacked.svg`, `qhsse-logo-mark.svg` are identical: 926,632 bytes, same SHA-256.
- All are 1024² SVGs wrapping an opaque white raster; no horizontal, mark-only, transparent, or reverse variants.
- `components/BrandLogo.tsx:10-26` maps all three variants to the same square; `components/Header.tsx:66-74` renders it at 52–64px; `components/Footer.tsx:21` at 120–140px.
- Wordmark ≈5% of canvas height → ~2.5px in header, ~7px in footer: illegible.
- White background creates a white tile on the navy header.

**Fix**
- Commission a vector redraw: horizontal (primary), stacked, mark, mono navy, mono white, one-colour black; transparent background; trimmed with measured clear space.
- Header: mark 36–40px + live wordmark 16–18px, or horizontal lockup 160 × 40px.
- Footer: reverse horizontal 180 × 44px on navy.
- Login/register/certificate: stacked 140–170px, transparent.
- PDF letterhead: horizontal 30–35mm; certificate 35mm.
- Set `alt="QHSSE Consultant"`; expose `logo-alt` from `BrandLogo` rather than hardcoding.
- Enforce clear space (25% height) and minimum sizes in the component API, not by eyeballing Tailwind classes.

---

### Fix 2 — Add `primary-950` and repair the navy ramp (P0)
**Evidence**
- `tailwind.config.js:11-22` defines `primary` 50–900 only.
- `components/Header.tsx:56` uses `from-primary-950/85`.
- `app/page.tsx:202` uses `bg-primary-950`; `:225` uses `from-primary-950/70`; `:259` uses `shadow-primary-950/10`.
- These classes generate no CSS. The hero image loses its background, bottom gradient, and shadow — exactly where text legibility depends on them.
- The ramp jumps from `primary-400 #60A5FA` to `primary-500 #1E40AF`, skipping the mid-tones needed for hover/border states.

**Fix**
- Add `950: '#0B1220'` (and optionally `25: '#F7FAFF'`).
- Document roles in the config comment: 50–100 surfaces, 200–300 borders, 400 muted, **500 brand**, 600 hover, 700–800 dark panels, 900–950 deep surfaces.
- Replace `bg-primary-950` in the hero with `bg-primary-900` only if the new token is not shipped in the same release.
- Add semantic aliases: `brand.navy`, `brand.green`, `brand.green-ink`, `surface`, `ink`, `line` so future components do not guess.
- Run a one-off grep for `primary-950` and confirm each has a rendered colour.

---

### Fix 3 — Remove the off-brand “second palette” in auth, training, and certificate pages (P0)
**Evidence**
- `app/login/page.tsx:113-205`: background `#F7F9FC`, brown `#8B4D00`, royal blue button `#3A4FC4`, hover `#3147BD`, brown hover `#6B3900`; eyebrow `tracking-[0.55em]`.
- `app/register/page.tsx:143-259`: same brown/royal-blue system.
- `app/training/page.tsx:89`: gradient ends in `#163D2D`.
- `app/dashboard/training-profile.tsx:113`: `#103F31` → `#1E5B46`.
- `app/training/certificate/[code]/page.tsx:150-161`: amber border, brown name, emerald badge, navy headings.

**Fix**
- Replace every raw hex with `primary-*`, `accent-*`, and `slate-*` tokens.
- Delete `#3A4FC4` entirely; primary auth button = `bg-primary-500 hover:bg-primary-600` with white text (8.7:1).
- Keep bronze `#8B4D00` only for the certificate seal/signature and the original logo; do not use it for login links, inputs, or eyebrows.
- Auth background: `bg-slate-50` with a `primary-50` radial; no separate blue.
- Training hero: `from-primary-900 via-primary-800 to-primary-700`; the green signal belongs in the icon/indicator, not a green gradient endpoint.
- Certificate screen: navy headings, one green validation badge, bronze seal; no amber border.
- Cap eyebrow tracking at `0.14em`.

---

### Fix 4 — Unify PDF reports and certificates with the web identity, and fix the name (P0/P1)
**Evidence**
- `lib/report-pdf.ts:143-162`: grey `#666666` title, `#A3A3A3` rule, `#777777` subtitle; no navy, no green brand rule.
- `lib/report-pdf.ts:196-198`: score bars `#95D14C`, `#E8B941`, `#DB6B5E`; `:215` food-safety table header `#F4E51F`; table headers `#BDBDBD`.
- `lib/report-pdf.ts:297`: footer says **“QHSE Consultant • Safety • Quality • Environment”** — wrong acronym and omits Health and Security.
- `lib/certificate-pdf.ts:47,82-91,101-109`: dark green `#1E4031` + brown `#8B4D00`, Helvetica text; the on-screen certificate uses navy/brown/emerald and a different layout.
- `lib/report-pdf.ts:259`: observations that overflow `maxRowsY` are silently skipped — a report can omit findings with no continuation page.

**Fix**
- Create `lib/pdf-brand.ts` with shared tokens: navy `#1E40AF`, deep navy `#0F172A`, green `#22C55E`, green ink `#15803D`, bronze `#8B4D00`, slate rules.
- Report letterhead: navy band or wordmark top-left, “QHSSE Consultant” + full descriptor, report title, client/site, report ID, page `n / N`, “Confidential”.
- Use Inter for English and Cairo for Arabic; embed fonts or render text through the existing canvas pipeline so Arabic shapes correctly.
- Match the on-screen certificate and the PDF: same border, logo, typography, colour roles, and verification block.
- Replace “QHSE” with “QHSSE” everywhere; footer descriptor: “Quality • Health • Safety • Security • Environment”.
- **Paginate** observations; never drop rows. Add reviewer name/role, signature line, revision, and “continued on page”.
- Keep QR verification; add the verification URL in text, not only the QR.

---

### Fix 5 — Consolidate the font pipeline (P1)
**Evidence**
- `app/globals.css:1` imports Inter + Cairo from Google Fonts.
- `app/layout.tsx:8-18` also loads both with `next/font/google`; `:33` only puts `--font-inter` and `--font-cairo` on `<body>`.
- `tailwind.config.js:36-39` points `sans` at literal `'Inter'` and `arabic` at literal `'Cairo'`, not at the generated variables.
- Result: the `next/font` files are not used by the Tailwind families; the browser loads the Google `@import` instead. Duplicate requests, render-blocking CSS, and a privacy/consent issue.
- PDFs request `"Cairo, Arial"`, but the certificate PDF renders with Helvetica.

**Fix**
- Remove the `@import` from `globals.css`.
- In `tailwind.config.js`: `sans: ['var(--font-inter)', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif']`, `arabic: ['var(--font-cairo)', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif']`.
- Keep `display: 'swap'`; preload only the Latin subset for Inter and Arabic for Cairo.
- Use `font-sans` for Latin and `html[dir="rtl"] body { font-family: var(--font-cairo); }` (or the `font-arabic` token) consistently.
- In PDFs, embed Inter/Cairo or render text with the canvas using the loaded webfonts; do not fall back to Helvetica for a brand document.
- Remove unused weights (900) from the loaded set; keep 400/500/600/700/800 only if used.

---

### Fix 6 — Resolve the green mismatch and CTA contrast (P1)
**Evidence**
- `tailwind.config.js:23-34`: `accent-500 #22C55E`; `accent-700 #15803D`.
- `app/page.tsx:424`: `bg-accent-500` with white text — **2.28:1**, fails AA.
- `app/services/page.tsx:166`: `text-accent-500` check icons on white — **2.28:1**, fails non-text contrast.
- Logo greens are `#8FCF00` / `#3D9000` / brown `#714101`; PDF uses `#95D14C`; certificate uses `#1E4031`; training uses `#163D2D`; web uses `#22C55E`. Six greens, no rule.
- `app/page.tsx:172,226-227` uses `accent-400/15`, `accent-200/70`, `accent-300`; these are fine on navy but not interchangeable with the CTA green.

**Fix**
- Approve **one digital green**: `accent-500 #22C55E` for decorative fills/indicators on navy; `accent-700 #15803D` for text/icons on white and for success.
- Primary CTA: navy `primary-500` with white; secondary CTA: white with navy border. Green CTA only as `accent-700` with white (5.02:1), never `accent-500`.
- Service check icons: `text-accent-700`.
- Logo greens become `brand.legacy` tokens, used only inside the original logo. Do not use `#8FCF00` for UI.
- PDF/certificate: use `#22C55E` for a thin keyline/indicator only; use `#15803D` for accessible green text. Drop `#95D14C`, `#F4E51F`, and `#1E4031` from the system.
- Add a contrast check to the design review checklist.

---

### Fix 7 — Replace the rainbow service/value/category system and placeholder imagery (P1)
**Evidence**
- `lib/service-cards.ts:33-153`: 12 services, 12 different gradients (blue, amber, rose, teal, violet, orange, emerald, cyan).
- `app/about/page.tsx:16-35`: values use blue, amber, rose, violet gradients.
- `lib/colors.ts:51-58`: category chips use blue, amber, indigo, rose, teal, violet.
- `app/services/page.tsx:178-180`: service detail “image” is an empty `bg-gradient-to-br` block at 20% opacity.
- `app/page.tsx:100-119`: 18 client logos with random filenames and mixed `.jpeg/.jpg/.png/.webp`; `:394-397` `alt="Client logo N"`; fixed 240 × 128 tiles without optical normalisation.
- Hero PNGs are 1.75–2.1MB at 1672 × 941, displayed at ~580px.

**Fix**
- One service icon treatment: `bg-primary-50`, `text-primary-700`, 1px `primary-100` border, optional 3px `accent-500` top rule. No per-service gradients.
- Category chips: neutral `slate-100` + `slate-700` text by default; use semantic colour only for risk/status. If categories must be colour-coded, use a maximum of three approved hues and always include the label.
- Replace empty gradient blocks with approved field photography or a process diagram; every service needs one visual that explains the work.
- Client logos: request transparent SVG/PNG, convert to mono navy, equalise optical size, name the alt text (`alt="Zomoroda"`), and add permission notes. Prefer 12 strong logos over 18 uneven ones.
- Convert hero and service images to AVIF/WebP, target ≤250KB, add `sizes`, `width`, `height`, and blur placeholders.
- Prefer real team/site photography over AI; if AI is retained, do not present it as staff and fix PPE accuracy (especially the food-safety hairnet/keffiyeh image).

---

### Fix 8 — Align bilingual voice, naming, and trust copy (P1)
**Evidence**
- `public/locales/en.json:64`: “QHSE Consultancy Global” — a second brand name; the logo and header say “QHSSE Consultant”.
- `public/locales/en.json:50`: “decades of industry experience”; `:74-78` says “4+ Years Experience” and “99% Safety Rating”. Contradiction and an undefined metric.
- `public/locales/ar.json:50`: “بعقود من الخبرة” (decades); `:117`: “الوصول إلى تقاريرنا” (access our reports) — wrong pronoun for the client portal; `:3` app name “مستشار الصحة والسلامة” (Health & Safety Consultant) omits Quality, Security, and Environment.
- `app/about/page.tsx:121`: hardcoded English “Our Commitment” appears in the Arabic interface; `:122-124` is also English-only.
- `components/Footer.tsx:114-119`: “Privacy Policy” and “Terms of Service” are English-only and link to `#` (dead).
- `app/layout.tsx:21-23`: metadata uses “QHSE” in the description while the brand is QHSSE.

**Fix**
- Ratify **QHSSE Consultant** as the master brand; use “QHSE” only as a service category. Add a footer legal line only if the registered entity differs.
- Replace “decades” with a defensible date/sector statement (“field experience since 2022” or the actual consultant years). Define “99% Safety Rating” or replace it with a real metric (“% of observations closed within agreed timeline”).
- Fix Arabic pronouns and register: “تقاريرك وسجلات زياراتك”; “مؤسستكم”; “اطلب زيارة ميدانية”.
- Move “Our Commitment” and all footer legal copy into `en.json`/`ar.json`; no hardcoded English in Arabic pages.
- Create real Privacy Policy and Terms pages, linked in the footer and login; include data handling/confidentiality and Egyptian PDPL considerations.
- Add the tagline and descriptor to the footer lockup: “QHSSE Consultant — Quality, Health, Safety, Security & Environment.”
- Add a glossary file or comments so future copy uses one term per concept.

---

## 9. Trust and credibility elements aligned with the brand

| Element | Why it fits the brand | Where |
|---|---|---|
| **Verified credentials strip** | Proves “fieldwise” without adjectives. Show issuer + year: ISO 9001/45001/14001/22000 lead auditor, HACCP, NEBOSH/IOSH, OSHA, etc. Only claim what is held. | Home under hero; About; report footer |
| **“Verify” in the main navigation/footer** | QR verification already exists in reports and certificates but is hidden. Verification is a powerful trust signal for regulators and clients. | Header/footer: “Verify a report or certificate”; `/training/verify` |
| **Case studies with baseline → outcome** | Replaces “premier/world-class” with evidence: sector, scope, findings, closure rate, time to close, audit result. | Services and About; linked from client logos |
| **Redacted sample report + “report anatomy”** | Shows rigour before purchase: observation standard, risk matrix, photos, corrective action, sign-off, revision control. | Resources / Services |
| **Named consultant profiles** | Safety buyers trust people, not logos. Photo, role, credentials, sectors, years, languages. | About / Team |
| **Normalised, named client wall** | Social proof with permission and optical consistency; link each logo to a case study where possible. | Home partners section |
| **Methodology + service SLA** | “Diagnose → Prioritise → Implement → Verify” with deliverables and response times. Makes the promise concrete. | Services / About |
| **Trust centre** | Privacy, Terms, confidentiality, data handling, portal security, PDPL statement, complaint/whistleblowing channel. | Footer + `/trust` |
| **Legal/contact hygiene** | Domain email instead of `support@qhsseconsultant.onmicrosoft.com`; LinkedIn **company** page (currently a personal `/in/` URL); registered address, phone, map, company registration. | Footer, Contact, Login |
| **Report integrity** | Page numbers, revision, reviewer sign-off, audit trail, “Confidential”, no silent truncation of observations. This is a brand promise, not just a PDF feature. | `lib/report-pdf.ts` |
| **Attributed testimonials** | A named role/company quote is stronger than a star rating. Keep them short and specific. | Home / Services |
| **Defined metrics** | “50+ clients”, “200+ reports”, “4+ years”, “99%” need definitions and dates. Publish the definition or remove the number. | Home / About |

**Do not add:** unverifiable accreditation badges, generic “ISO certified” claims if the firm is not certified, stock “award winner” laurels, or security logos without permission.

---

## 10. Governance and brand protection

- **Register the wordmark and device mark** (QHSSE Consultant + tree/person symbol) in Egypt; confirm the legal entity owns the mark. Keep the current logo files as evidence of first use.
- **Control the master assets:** one vector source, versioned exports, no PNG-in-SVG. Store in a `brand/` library with a README and checksums.
- **Licence partner logos:** written permission, usage scope, and expiry; remove logos on request.
- **Protect report authenticity:** QR verification, unique report IDs, revision numbers, and a verification page that shows status (“valid / revoked / superseded”).
- **Monitor impersonation:** domain email, LinkedIn company page, and a “report a fake certificate/report” contact.
- **Brand review gate:** any new page or PDF must pass palette tokens, font stack, logo clear space, and EN/AR glossary checks before release.

---

## Appendix — Evidence and measurements

- **Logo:** three files, 926,632 bytes each, identical SHA-256 `D4DC78C8…06CE`; 1024 × 1024 SVG with embedded opaque PNG; background pixel `(0,0)` = `#FFFFFF`, alpha 255.
- **Logo colours sampled:** canopy `#8FCF00` / `#3D9000`; wordmark/trunk `#714101`.
- **Wordmark legibility:** wordmark cap height ≈ 50/1024 = 4.9% of lockup height; at 52px → 2.5px; at 120px → 5.9px; at 170px → 8.3px.
- **Hero images:** 1672 × 941; 1.75MB, 1.82MB, 2.0MB PNG.
- **Contrast:** white/`#1E40AF` 8.72:1; white/`#22C55E` 2.28:1; `#15803D`/white 5.02:1; `#95D14C`/white 1.83:1; `#8FCF00`/white 1.89:1; `#714101`/white 8.54:1.
- **PDF palette:** `#666666`, `#A3A3A3`, `#777777`, `#95D14C`, `#E8B941`, `#DB6B5E`, `#F4E51F`, `#BDBDBD` — no brand navy/green system.
- **Certificate palette:** `#1E4031`, `#8B4D00`, `#F6F8FA`, `#111827`, `#4B5563` — no navy, no web green.

---

*Prepared as a read-only brand audit. The next step is to ratify the master brand, the single digital green, and the logo redraw scope before changing application code.*
