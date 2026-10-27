# QHSSE Consultant — UX Heuristic & Conversion Audit

**Scope:** Public marketing site, service pages, contact/lead capture, training, careers, login/register.
**Review date:** 27 October 2026
**Reviewer:** UX Research (heuristic evaluation)
**Status:** Read-only audit. No `app/`, `components/`, or `lib/` files were modified.
**Method:** Nielsen’s 10 heuristics + LIFT conversion framework (value proposition, relevance, clarity, anxiety, distraction) + trust-signal inventory. Static review of the listed pages/components/locales/API routes, plus inspection of the production build output (`.next/server/app/*.html`) to verify what is actually delivered on first paint.
**Limitations:** No live analytics, session recordings, A/B tests, screen-reader sessions, or buyer interviews were available. Findings are code- and copy-based; severity should be confirmed with 5–8 target buyers and task-based usability tests before/after changes.

---

## 1. Executive summary

The portal looks polished at a glance, but the public experience currently asks a B2B buyer to trust it before it has earned that trust. The biggest issues are not visual — they are first-impression, proof, and lead-capture issues.

1. **The first paint is broken.** The server-rendered HTML contains raw translation keys (`home.heroTitle`, `home.heroSubtitle`, `common.tagline`) because translations are fetched only after hydration. The build output for `/` has ~38 raw key text nodes; `/services` ~29, `/about` ~21, `/contact` ~17. A prospect on a slow connection, a crawler, or a no-JS client sees the skeleton of an unfinished site.
2. **The value proposition is generic and self-referential.** “Building Safer Workplaces Through Expert QHSSE Solutions” could belong to any consultancy. There is no audience, outcome, geography, proof, or risk reversal above the fold, and the primary CTA (“Request a Visit”) is ambiguous.
3. **There is almost no evidence layer.** No named testimonials, no case studies, no consultant credentials, no team, no legal entity, no certification/accreditation detail. The client wall is unlabeled (`alt="Client logo 1"`), the stats include an undefined “99% Safety Rating,” and “decades of experience” contradicts “Since 2022.”
4. **Contact capture creates anxiety instead of reducing it.** Company and phone are optional, there is no consent/privacy notice, no response-time promise, no industry/timeline qualification, no inline errors, no persistent confirmation, and the map is a gray placeholder. Raw database errors can surface to prospects.
5. **Trust details undermine the brand.** The public email is a default Microsoft tenant address (`support@qhsseconsultant.onmicrosoft.com`), Privacy Policy and Terms are `href="#"` dead links, and the LinkedIn link is a personal profile rather than a company page.
6. **Arabic is a second-class experience.** `lang="en" dir="ltr"` is hardcoded in SSR, RTL is applied only after hydration, metadata is English-only, and several public blocks are English-only. Arabic copy reads literally in places.

**Recommended sequence:** fix the first-paint/translation delivery and hero/CTA copy first (hours, not weeks), then rebuild the contact page around reassurance and qualification, then add a minimum evidence layer (two case studies, two testimonials, credentials strip, team). Those three moves address most of the conversion gap.

---

## 2. Scoring and severity

**Impact (1–5):** expected effect on a qualified B2B buyer’s ability to understand, trust, and contact the firm.
**Effort (1–5):** implementation effort including copy, design, and engineering (1 = under 2 hours; 5 = multi-week).
**Priority score:** Impact ÷ Effort. Used for sequencing, not as a substitute for judgment.

| Severity | Meaning |
|---|---|
| **Blocker** | Breaks first impression or a primary conversion path; fix before traffic campaigns |
| **Critical** | Materially reduces trust or completion; fix in the current sprint |
| **High** | Clear friction or credibility gap; fix in the next 2–4 weeks |
| **Medium** | Worth fixing, but not a primary blocker |

**Confidence:** High for code-verifiable issues (raw keys, missing labels, dead links). Medium for content/strategy issues that depend on facts we could not verify (certifications, client permissions, actual response times).

---

## 3. What already works

Be fair to the build — several foundations are solid and should be preserved:

- **Service-to-contact continuity:** every service card links to `/contact?service=…`, and the contact page shows the selected service in a clear banner and prefills the message (`app/services/page.tsx:122-139`, `app/contact/page.tsx:23-51,117-127`). This is a good pattern; keep it.
- **Multiple contact channels:** phone, email, WhatsApp, LinkedIn, and floating call/WhatsApp buttons exist (`components/Footer.tsx`, `components/FloatingContactButtons.tsx`). The intent is right; placement and labeling need work.
- **Backend safeguards:** contact and job endpoints have Zod validation, rate limiting, HTML escaping, and confirmation emails (`app/api/contact/route.ts:39-86`, `app/api/job-applications/route.ts:48-141`). This is more than many consultancies have.
- **Training certificate verification:** a public verification page and verifiable certificate codes exist (`app/training/verify/page.tsx`). This is a genuine trust asset that is currently under-promoted.
- **Reduced motion for the hero:** the autoplay timer respects `prefers-reduced-motion` (`app/page.tsx:58-61`), and CSS animations are disabled (`app/globals.css:129-135`). The partner carousel does not, which is an inconsistency to fix.
- **Bilingual intent:** the language switcher and AR/EN locale files exist, and most public copy is translated. The delivery mechanism, not the ambition, is the problem.

---

## 4. Trust signal inventory

| Trust signal | Status | Evidence / gap | Recommended action |
|---|---|---|---|
| Named client logos | **Partial** | 18 logos on home, `alt="Client logo {n}"`, opaque filenames, no sector or permission note (`app/page.tsx:100-119,394-400`) | Real alt names, sector labels, “Selected clients — used with permission” |
| Quantified outcomes | **Weak** | “50+ clients, 200+ reports, 4+ years, 99% safety rating” with no definitions/timeframes (`app/page.tsx:93-98`, `en.json:74-78`) | Define each metric; replace “99%” with a verifiable outcome or remove |
| Testimonials | **Missing** | None on home, about, or services | 2–3 quotes with role, sector, site count, outcome |
| Case studies | **Missing** | No challenge/action/result narratives | 2–3 one-page case studies tied to core services |
| Consultant credentials | **Missing** | “Certified professionals” only, no names or certifications (`en.json:49-50`) | Credentials strip + 3 team bios (NEBOSH, IOSH, ISO Lead Auditor, HACCP) |
| Accreditations / memberships | **Missing** | No logos, numbers, or issuing bodies | Publish only what can be verified; link to issuer registers |
| Legal entity | **Inconsistent** | “QHSE Consultancy Global” (`en.json:64`) vs “QHSSE Consultant” (`Footer.tsx:111`, `layout.tsx:21`) | One legal name + registration number in footer/about |
| Contact transparency | **Partial** | Phone, email, address, WhatsApp, LinkedIn; no hours/timezone/SLA; `onmicrosoft.com` email | Domain email, hours, response promise, map link |
| Privacy / terms | **Missing** | Footer links are `href="#"`; no `/privacy` or `/terms` routes found | Publish real policies; link from every form |
| Security / data handling | **Missing** | CVs and contact data collected with no notice or retention statement | Short data-handling note on forms; retention policy |
| Reviews / third-party proof | **Missing** | No Google/LinkedIn recommendations, awards, or client references | Add LinkedIn recommendations or reference-on-request |
| Training accreditation | **Missing** | “Certificate after passing” with no issuer, CPD, or accreditation (`app/training/page.tsx:35-56,131-146`) | Name the issuing body and CPD value, or label as “internal certificate” |
| Social proof in hero | **Missing** | No logos, ratings, or client count above the fold | Add a compact proof strip under the hero CTA |

---

## 5. Top 10 friction points (ranked by buyer impact; effort shown for sequencing)

| # | Friction point | Page / file | Nielsen / LIFT | Impact | Effort | Priority |
|---|---|---|---|---|---|---|
| 1 | Raw i18n keys render on first paint | `context/language-context.tsx`, `app/layout.tsx`, all pages | #1 Visibility, #4 Consistency / Clarity | 5 | 1 | **5.0** |
| 2 | Hero value proposition and CTA are generic/ambiguous | `app/page.tsx:182-198`, `en.json:41-44`, `ar.json:41-44` | #2 Match, #8 Minimalist / Value prop, Clarity | 5 | 1 | **5.0** |
| 3 | Contact form creates anxiety and under-qualifies leads | `app/contact/page.tsx:129-201`, `app/api/contact/route.ts` | #5 Error prevention, #9 Recovery / Anxiety | 5 | 2 | **2.5** |
| 4 | No evidence layer: case studies, testimonials, credentials, team | `app/page.tsx`, `app/about/page.tsx`, `en.json:64-78` | #2 Match, #4 Consistency / Trust | 5 | 3 | **1.7** |
| 5 | Contact credibility: tenant email, dead legal links, placeholder map | `lib/contact-info.ts:1-10`, `components/Footer.tsx:109-120`, `app/contact/page.tsx:261-266` | #9 Recovery, #10 Help / Anxiety | 4 | 2 | **2.0** |
| 6 | CTA/navigation hierarchy is misaligned with the buyer journey | `components/Header.tsx:27-34,129-145`, `app/page.tsx:424-427` | #4 Consistency, #8 Minimalist / Distraction | 4 | 1 | **4.0** |
| 7 | Registration/login friction and password-rule mismatch | `app/register/page.tsx:205,231`, `lib/validation.ts:14`, `app/login/page.tsx:198-208` | #5 Error prevention, #9 Recovery / Anxiety | 4 | 1 | **4.0** |
| 8 | Arabic/RTL is not delivered at the document level and is partly untranslated | `app/layout.tsx:32`, `context/language-context.tsx:44-75`, `app/about/page.tsx:121-124` | #1 Visibility, #4 Consistency / Clarity | 4 | 3 | **1.3** |
| 9 | Services page lists capabilities but does not support a buying decision | `app/services/page.tsx:110-186` | #6 Recognition, #10 Help / Relevance | 4 | 3 | **1.3** |
| 10 | Autoplay motion and form/accessibility gaps | `app/page.tsx:58-68,121-144,233,394-400`, forms | #1, #3 User control, #9 / Clarity | 3 | 2 | **1.5** |

> **How to read the ranking:** impact first, then effort. Items 1, 2, 5, 6, and 7 are hours of work and should ship immediately. Items 3 and 4 are the highest-leverage structural fixes. Items 8–10 are important but can follow in the same sprint.

---

### 5.1 Blocker — Raw translation keys are served on first paint

**Impact 5 · Effort 1 · Confidence: high**

**Evidence**

- `context/language-context.tsx:50` initializes `messages` to `{}`; `t()` at `:77-80` calls `getNestedTranslation`, and `:26` returns the key path when a value is missing.
- The production build output confirms it. `.next/server/app/index.html` contains:
  - `<h1 …>home.heroTitle</h1>`
  - `<p …>home.heroSubtitle</p>`
  - `<span>common.tagline</span>`
- Approximate raw-key text nodes in the built HTML: **38** on `/`, **29** on `/services`, **21** on `/about`, **17** on `/contact`.
- `app/layout.tsx:32` hardcodes `<html lang="en" dir="ltr">`. Arabic only becomes RTL after the client fetches `ar.json` and calls `applyLanguageAttributes` (`context/language-context.tsx:44-75`).

**Why it matters**

This is the first thing a prospect, crawler, or slow-network user sees. It reads as an unfinished or broken site, and it happens on the highest-value pages. It also means the LCP text is a key path rather than a value proposition. For Arabic visitors, the page first renders English/LTR, then reflows to RTL — a visible layout shift and a credibility hit.

**Recommendation**

1. Statically import `en.json` (and `ar.json`) and use it as the initial `messages` state so English renders correctly on the server.
2. Add a tiny blocking script in `<head>` that reads `preferred-language` from `localStorage` and sets `document.documentElement.lang/dir` before first paint. Keep the React context in sync afterward.
3. For a durable fix, move to server-side locale routing (`/en/...`, `/ar/...`) or a library such as `next-intl` so metadata, `lang`, `dir`, and content are correct in the initial HTML.
4. Until then, do not render translated UI behind a client-only fetch without a skeleton/fallback.

**Definition of done**

- `curl https://…/` returns real hero copy, with zero `home.*` / `common.*` strings.
- No-JS view is readable.
- Arabic preference produces `lang="ar" dir="rtl"` before first paint, with no horizontal reflow.
- Lighthouse “largest contentful paint” element is the H1 text, not a key path.

---

### 5.2 Critical — The hero does not answer “what do you do, for whom, and why you?”

**Impact 5 · Effort 1 · Confidence: high**

**Evidence**

- H1: “Building Safer Workplaces Through Expert QHSSE Solutions” (`public/locales/en.json:41`).
- Sub: “We help organizations achieve operational excellence through integrated Quality, Health, Safety, Security & Environmental consultancy services.” (`en.json:42`).
- Primary CTA: “Request a Visit” (`en.json:43`); secondary “Explore Services” (`:44`).
- Eyebrow: “Since 2022” (`common.tagline`, `en.json:4`), used in the most valuable brand position.
- The two reassurance bullets are generic: “Practical solutions” and “Trusted field expertise” (`app/page.tsx:195-198`).
- The image caption is “QHSSE CONSULTANT” (`app/page.tsx:232`) — repeated category naming, not proof.

**Why it matters**

LIFT’s value-proposition test: a buyer should be able to say what you do, who it is for, and what happens next after five seconds. This hero says the category (“QHSSE”) three times and asserts expertise without evidence. “Request a Visit” is ambiguous — a sales visit, a paid site audit, or a free consultation? Ambiguity at the primary CTA suppresses clicks, especially for buyers who expect a scoping call, not a site visit.

“Since 2022” is also a weak trust anchor in the eyebrow position. Four years can be a strength if framed as “4+ years, 200+ reports,” but as a standalone badge it invites the question “only since 2022?”

**Recommendation**

- Lead with the buyer’s outcome, not the acronym: audit readiness, safer operations, fewer repeat findings.
- Name the audience and sectors: food, manufacturing, industrial teams.
- Replace “Request a Visit” with a specific, low-commitment next step: “Book a 30-minute scoping call.” Keep “Request a site visit” for service detail pages, where the context makes it concrete.
- Add risk reversal: no obligation, reply within one business day, NDA on request.
- Add the brand promise (“Clear findings. Prioritised action. Measurable closure.”) and one evidence line under the CTA: 200+ visit reports since 2022, standards supported.
- Replace the eyebrow with category + geography (“QHSSE consultancy · Cairo, Egypt”) or a credential line. Keep “Since 2022” for the About page.
- Add a tertiary “Or WhatsApp us” link for buyers who prefer chat.

**Definition of done**

- Five-second test with 5 target buyers: 4/5 can state the service, audience, and next step.
- Hero contains at least one quantified proof and one anxiety reducer.
- One primary CTA label is used consistently across the site.

---

### 5.3 Critical — The contact form asks for too little, promises too little, and reassures too little

**Impact 5 · Effort 2 · Confidence: high**

**Evidence**

- Required fields are only name, email, and message; company and phone are optional (`app/contact/page.tsx:129-175`). For B2B, company should be required.
- No industry, site count, timeline, budget range, or service field. The selected service is stored only inside the free-text message (`app/contact/page.tsx:23-31,117-127`), so it cannot be reported or routed reliably.
- No consent checkbox, no privacy link, no data-handling note, no response-time promise.
- Labels are not associated with inputs: built HTML for `/contact` has **5 `<label>` elements and 0 `for` attributes**; inputs have no `id`. Screen readers and clicking the label do not work as expected.
- No inline validation or `aria-describedby`; errors come back from the API and are shown in a toast.
- Success is a 4-second toast (`components/Providers.tsx:13-21`), then the form resets. There is no persistent confirmation, reference number, or “what happens next.”
- Server errors can leak internals: `app/api/contact/route.ts:88-92` returns “Contact requests table is missing in the database. Please run the latest deployment sync,” and the page displays `data.error` directly.
- The map is an empty gray box with a pin icon (`app/contact/page.tsx:261-266`), which reads as unfinished.
- No “prefer to talk?” block, hours, or scheduling link above the form.

**Why it matters**

This is the highest-intent page. Every unanswered anxiety (“Will I get a sales pitch? How fast? Is my data safe? Can I change the service?”) reduces completion. Optional company/phone also produces low-quality leads that sales must qualify manually. A 4-second toast is easy to miss; users may resubmit and hit the 5-per-hour rate limit.

**Recommendation**

1. **Qualify lightly:** require company; add optional Industry, Number of sites, and Timeline selects. Keep the form to one screen.
2. **Reassure:** add “We reply within 1 business day,” “No obligation,” “NDA on request,” and a consent checkbox linked to the privacy policy.
3. **Add a “Prefer to talk?” card** above the form with phone, WhatsApp, hours, and a “Book a 30-minute scoping call” link.
4. **Make errors human and localized:** inline messages, `aria-invalid`, `aria-describedby`, and a friendly fallback with the email address. Never surface database or deployment errors.
5. **Make success persistent:** a confirmation panel with a reference ID, expected response time, next steps, and a calendar/WhatsApp option. Keep the reference in the URL or on screen.
6. **Replace the map placeholder** with a static map image or an “Open in Google Maps” link plus the full address.
7. **Store structured fields** (service, industry, sites, timeline, source/UTM) so sales can route and report.
8. **Prefill smarter:** keep the selected-service banner but let the user change the service in the form via a select.

**Definition of done**

- 100% of submitted leads have a company name.
- All form controls have associated labels; keyboard and screen-reader users can complete the form.
- Success state persists and includes a reference and SLA.
- No raw API/database error text is rendered.
- Contact completion rate improves against a measured baseline (target +25% relative).

---

### 5.4 Critical — There is no evidence layer for a risk-averse B2B buyer

**Impact 5 · Effort 3 · Confidence: high (gap) / medium (content facts)**

**Evidence**

- The homepage client wall uses `alt={\`Client logo ${index + 1}\`}` and opaque filenames such as `B8RTGzcIGnBm3vnsFei2HaMjjqObSsDYFY1fNG0I.png` (`app/page.tsx:100-119,394-400`). There is no sector, permission note, or brand name.
- The stats block is “50+ clients / 200+ reports / 4+ years / 99% safety rating” (`app/page.tsx:93-98`). “99% Safety Rating” is undefined and unverifiable (`en.json:78`).
- “Certified professionals with decades of industry experience” (`en.json:49-50`) contradicts “Since 2022” (`en.json:4`) and “4+ Years Experience” (`en.json:77`).
- “Trusted by organizations worldwide” (`en.json:48`) conflicts with a Cairo-only address and no international proof.
- The About page has values, stats, and a commitment statement, but no team, leadership, credentials, legal entity, or history (`app/about/page.tsx:45-128`).
- The legal name varies: “QHSE Consultancy Global” (`en.json:64`) vs “QHSSE Consultant” (`components/Footer.tsx:111`, `app/layout.tsx:21`).
- Service copy says “ISO 22000 Certification” (`app/services/page.tsx:59`), which can imply the firm is a certification body. Consultancies prepare clients for certification; they do not issue ISO certificates.

**Why it matters**

Safety and quality buyers are professional risk managers. They are buying a firm that will represent them in front of regulators, customers, and auditors. Generic claims and contradictions are not neutral — they are evidence against competence. The absence of names, faces, sectors, and outcomes is the single largest trust gap on the site.

**Recommendation**

Build a minimum evidence layer, in this order:

1. **Two mini case studies** with a fixed structure: Context (sector, sites, trigger) → What we did (scope, duration) → Result (audit outcome, findings closed, certification achieved, days to close). Use real numbers or clearly labeled anonymized ranges.
2. **Two or three testimonials** with name/role, sector, and a specific outcome. If clients require anonymity: “Group QHSE Manager, food manufacturing, 3 sites.”
3. **Credentials strip** listing standards supported (ISO 9001, 45001, 14001, 22000, HACCP) with the qualifier “implementation & audit readiness,” plus consultant certifications that can be verified.
4. **Team section**: 3 lead consultants, photo, certifications, sectors, years, languages. Buyers want to know who will be on site.
5. **Legal/registration line** in the footer and About: registered entity name, registration number, address.
6. **Fix the arithmetic and the acronym**: one spelling (QHSSE), one legal name, one consistent “since 2022 / 4+ years / consultant experience” story.
7. **Client wall**: real brand names in alt text, sector labels, and a permission note. If permission is unclear, use “Selected clients” and remove logos until confirmed.
8. **Training proof**: name the certificate issuer and CPD value, or label it clearly as an internal completion certificate.

**Definition of done**

- Every numeric claim on home/about has a definition and time frame, or is removed.
- At least one case study and one testimonial exist for each core sector (food, manufacturing/industrial).
- A buyer can identify the legal entity and the people who will deliver the work without leaving the site.
- No claim implies the firm issues ISO certificates.

---

### 5.5 High — Contact credibility details read as an unconfigured business

**Impact 4 · Effort 2 · Confidence: high**

**Evidence**

- Public email: `support@qhsseconsultant.onmicrosoft.com` (`lib/contact-info.ts:4`). `onmicrosoft.com` is the default Microsoft 365 tenant domain; it looks internal and is more likely to trigger spam suspicion.
- LinkedIn: `https://www.linkedin.com/in/qhsseconsultant` (`lib/contact-info.ts:6`) — a personal profile, not a company page.
- Phone is displayed unformatted: `+201117755096` (`lib/contact-info.ts:2`).
- Privacy Policy and Terms of Service are `href="#"` (`components/Footer.tsx:113-120`). No `/privacy` or `/terms` route exists in the build.
- The contact map is a placeholder (`app/contact/page.tsx:261-266`).
- No business hours, timezone, or response SLA anywhere.
- Visitor tracking stores a persistent UUID in `localStorage` and posts it with every page path (`components/VisitorTracker.tsx:6-50`) with no privacy notice or consent.
- No data-retention note on the contact form or job application, despite collecting names, emails, phones, and CVs.

**Why it matters**

Procurement, legal, and compliance stakeholders routinely check these details before shortlisting a consultancy. A default tenant email and dead privacy links are the kind of details that move a vendor from “shortlist” to “not worth the risk.” If the firm serves EU/UK clients or handles personal data, the lack of a privacy notice is also a legal exposure (Egypt PDPL 151/2020; GDPR where applicable).

**Recommendation**

- Move to a domain email (`hello@` or `info@qhsseconsultant.com` / `.com.eg`) and configure SPF, DKIM, and DMARC. Keep the Microsoft mailbox if needed, but use the branded alias publicly.
- Create a company LinkedIn page and link it; keep the founder profile as secondary.
- Format the phone as `+20 111 775 5096` and add `tel:`/`wa.me` links.
- Publish `/privacy` and `/terms` (with counsel review), link them from the footer and every form, and add a short “how we handle your data” note.
- Add hours and timezone: e.g., “Sun–Thu, 9:00–17:00 EET” (confirm actual hours).
- Replace the map placeholder with an embedded/static map or a clear “Open in Google Maps” link.
- Add a retention statement for CVs and contact requests; restrict access.
- Add a cookie/privacy notice if visitor tracking continues.

**Definition of done**

- No `href="#"` legal links.
- Public email domain matches the website domain.
- Hours, timezone, and response SLA are visible on contact and footer.
- Privacy policy is reachable from every data-collection form.

---

### 5.6 High — The navigation and CTA hierarchy serves the training product, not the consultancy buyer

**Impact 4 · Effort 1 · Confidence: high**

**Evidence**

- Header primary button is “Create account” on every page except home (`components/Header.tsx:139-145`). It creates a **TRAINEE** account (`app/api/auth/register/route.ts:42`), not a client account.
- “Jobs” is a top-level nav item (`components/Header.tsx:27-34`), competing with Services and Contact for a B2B buyer’s attention.
- CTA vocabulary is inconsistent: “Request a Visit” (`en.json:43`), “Get Started Today” (`en.json:59`), “Request this service” (`app/services/page.tsx:136`), “Request This Service” (`:172`), “Send Message” (`en.json:106`), “Contact Us” (`en.json:95`).
- The training page’s “Start training” button sends anonymous users to login (`app/training/page.tsx:175-185`), but the label does not set that expectation.
- Floating WhatsApp/call buttons are mounted globally in the root layout (`app/layout.tsx:37`), so they also appear on `/login`, `/register`, and dashboards, where they compete with the task and can overlap content on small screens.
- The mobile menu button has no `aria-label`, `aria-expanded`, or `aria-controls` (`components/Header.tsx:150-157`).

**Why it matters**

LIFT’s distraction principle: every additional choice reduces the probability of the primary action. A buyer landing on `/services` sees “Login” and “Create account” as the most visually prominent header actions, while the actual buyer action — “talk to a consultant” — is absent from the header. “Create account” also sets a false expectation: a client portal account cannot be self-created.

**Recommendation**

- Header primary CTA: **“Book a scoping call”** → `/contact`. Secondary: a quiet “Client login.”
- Remove “Create account” from the marketing header; expose it from the login page and training page, labeled “Create a training account.”
- Move “Jobs” to the footer/utility nav or a “Company” dropdown. Keep primary nav to Services, Industries, About, Insights/Resources, Contact.
- Standardize CTA language:
  - Primary: “Book a scoping call”
  - Service cards: “Discuss this service”
  - Form: “Send request”
  - Training (anonymous): “Sign in to start training”
- Add phone/WhatsApp to the desktop header utility area (not only floating).
- Hide floating contact buttons on auth/admin pages; add labels on hover and ensure they do not cover form controls.
- Add a mobile sticky “Book a scoping call” bar on marketing pages.

**Definition of done**

- Exactly one primary CTA per page.
- Header CTA is the same on all marketing pages.
- Jobs is not in the primary nav.
- Anonymous training CTA says “Sign in to start.”

---

### 5.7 High — Registration and login fail at the door

**Impact 4 · Effort 1 · Confidence: high**

**Evidence**

- Client-side password `minLength={8}` (`app/register/page.tsx:205,231`); server schema requires **10** (`lib/validation.ts:14`). An 8- or 9-character password passes browser validation, then fails server validation with an English Zod message.
- No password requirements hint; the user only discovers the rule after submitting.
- Confirm-password mismatch is shown only as a toast (`app/register/page.tsx:83-86`), not inline next to the field.
- No consent/privacy checkbox despite collecting name, email, phone, and password.
- Login has no “Forgot password?” link, even though `auth.forgotPassword` exists in both locales (`en.json:124`, `ar.json:123`). No reset route exists.
- Login page is titled “Client Portal Login” (`en.json:116`) and says “Access your reports and visit records” (`:117`), but the only secondary action is “Create trainee account” (`app/login/page.tsx:198-208`). A client who needs portal access has no path.
- The header’s “Create account” creates a TRAINEE (`app/api/auth/register/route.ts:42`), reinforcing the mismatch.
- Login/register use a blue button (`#3a4fc4`) and brown accents (`#8B4D00`), while the marketing site uses a navy-and-green palette — a visible brand inconsistency at the trust-critical auth step (also flagged in `docs/audit/brand.md`).
- Show/hide password buttons are icon-only with no `aria-label` (`app/login/page.tsx:172-178`; `app/register/page.tsx:209-215`).
- The Google button uses a Chrome logo (`app/register/page.tsx:159`), not the Google “G” sign-in mark.
- Duplicate email returns “Unable to create account with these details” (`app/api/auth/register/route.ts:30-32`) — secure but a dead end for the user.

**Why it matters**

This is the conversion path for training revenue and client portal access. A rule mismatch guarantees a class of failed signups; a missing recovery path guarantees support load; a portal/trainee mismatch confuses B2B clients. Auth pages are also where users are most sensitive to visual trust cues, so the palette break matters more than it would elsewhere.

**Recommendation**

- Align the client `minLength` to 10 and show “At least 10 characters” under the field.
- Validate confirm-password inline; focus the first invalid field on submit.
- Add “Forgot password? Contact support” (or a full reset flow) with a prefilled mailto/WhatsApp link.
- Add consent + privacy link to registration.
- Clarify the two portals on the login page: “Client portal — for existing clients” vs “Training portal — create a training account.”
- Add a “Request client portal access” path for clients (contact form with a subject).
- Use the Google G mark and align the auth palette with the brand green.
- Add `aria-label` to eye buttons and mobile menu.
- On duplicate email, offer “Sign in instead” without confirming account existence in a risky way.

**Definition of done**

- No client/server password rule mismatch.
- A user can recover access from the login page without contacting a developer.
- Portal types are explained in one sentence each.
- Auth pages use the same brand system as the marketing site.

---

### 5.8 High — Arabic is delivered late, partially, and with literal copy

**Impact 4 · Effort 3 · Confidence: high**

**Evidence**

- SSR always outputs `<html lang="en" dir="ltr">` (`app/layout.tsx:32`); RTL is applied after hydration (`context/language-context.tsx:44-75`). This causes a direction/layout flash and leaves crawlers with English-only markup.
- All metadata is English-only (`app/layout.tsx:20-24`). There is no Arabic title/description, OG locale, or `hreflang`.
- English-only public blocks remain: “Our Commitment” and its paragraph on About (`app/about/page.tsx:121-124`); several form helpers and error messages.
- Server validation returns English messages (`lib/validation.ts:90-92`), and the contact API returns English-only errors (`app/api/contact/route.ts:95-97`). These are displayed directly in toasts on Arabic pages.
- Arabic copy is literal in places: “مؤسسة استشارات الجودة والصحة والسلامة والبيئة العالمية” (`ar.json:64`), “حلول شاملة للجودة والصحة والسلامة مصممة حسب احتياجات صناعتكم” (`ar.json:46`) mixes plural/addressee forms, and “حلول الخبراء” (`ar.json:41`) is an awkward calque.
- The language switcher’s `aria-label` is English-only (`components/LanguageSwitcher.tsx:14`).
- Layout uses physical properties in places (`right-4` on floating buttons) rather than logical `start/end`, so RTL behavior is inconsistent.

**Why it matters**

For Egyptian and Gulf buyers, Arabic is often the language of the decision-maker and the regulator. A site that flips direction after load, keeps English legal/commitment blocks, and shows English validation errors signals that Arabic is an afterthought. It also undermines SEO in Arabic search results.

**Recommendation**

- Server-detect locale and output correct `lang`/`dir` and metadata in the initial HTML.
- Translate every public string, including About commitment, form helpers, errors, and success states.
- Have a native B2B copy editor review the Arabic; standardize formal plural/addressee and define QHSSE once.
- Add Arabic metadata, OG tags, and `hreflang`.
- Use logical CSS properties (`ms/me`, `ps/pe`, `start/end`) and test RTL at 360px, 768px, and 1440px.
- Localize the language switcher label (“تغيير اللغة”).
- Add Arabic validation messages mapped from error codes, not raw English strings.

**Definition of done**

- `view-source` of an Arabic page shows `lang="ar" dir="rtl"` and Arabic hero copy.
- No English-only blocks on public Arabic pages.
- No layout shift when switching languages.
- Arabic form errors are in Arabic.

---

### 5.9 High — Services page describes capabilities but does not help a buyer decide

**Impact 4 · Effort 3 · Confidence: high**

**Evidence**

- The page repeats the same five services twice: once as cards (`app/services/page.tsx:110-143`) and again as detailed sections (`:145-186`). The seven additional services imported from `lib/service-cards.ts` appear only as cards.
- Detailed sections use gradient placeholder blocks instead of photos, diagrams, or deliverables (`:178-180`).
- “Features” are capability labels (“ISO 9001 Implementation,” “Hazard Identification”) rather than outcomes, deliverables, or scope (`:16-81`).
- No process, timeline, industries, engagement model, pricing/assessment offer, FAQ, or case-study links.
- CTA jumps straight to the contact form (“Request This Service,” `:171-173`) with no consideration content in between.
- “ISO 22000 Certification” (`:59`) risks implying the firm certifies clients.

**Why it matters**

A B2B buyer is not choosing a list of standards; they are choosing a scope, a timeline, a team, and a level of risk. The current page answers “what topics do you cover?” but not “what will I get, how long will it take, who will do it, and has it worked before?” The duplicated sections add length without adding decision support, and the placeholder blocks look unfinished.

**Recommendation**

- Build a service detail template with:
  1. Who it is for (sector, site type, trigger)
  2. The problem in the buyer’s language
  3. Deliverables (documents, workshops, audit days, reports)
  4. Four-step process (discovery → gap assessment → implementation → verification)
  5. Indicative timeline and client inputs required
  6. Proof (case study/testimonial)
  7. FAQ (“Do you certify?” “How fast can you start?” “Do you work outside Egypt?”)
  8. CTA (“Discuss your scope”)
- Replace gradient blocks with real field photos or clear diagrams.
- Remove the duplicate card/detail repetition or make cards link to detail pages.
- Add industry filters/landing pages: food & beverage, manufacturing, construction, logistics, healthcare, facilities.
- Publish “How engagements work” and an entry offer (e.g., fixed-fee gap assessment).
- Correct “ISO 22000 Certification” to “ISO 22000 implementation & audit readiness.”

**Definition of done**

- Each core service has a detail page with deliverables, timeline, and proof.
- No placeholder blocks remain.
- At least one case study is linked per core service.
- A buyer can compare scope and next steps without contacting sales.

---

### 5.10 Medium — Autoplay motion and accessibility gaps create friction and procurement risk

**Impact 3 · Effort 2 · Confidence: high**

**Evidence**

- Hero auto-advances every 5.2 seconds (`app/page.tsx:58-68`) with no pause control. The changing label has `aria-live="polite"` (`:233`), so screen readers may announce a new slide every 5 seconds.
- Inactive hero slides are `opacity-0` but not `aria-hidden`/`inert` (`:212-224`), so all three images and alts remain in the accessibility tree.
- Partner carousel auto-scrolls every 3.2 seconds (`:121-144`) with no pause and **no `prefers-reduced-motion` check**, unlike the hero.
- Client logo alt text is `Client logo {n}` (`:396`).
- Contact form labels are unassociated (0 `for` attributes in built HTML). The same pattern appears in login, register, and jobs.
- Mobile menu and password-eye buttons are icon-only with no accessible names (`components/Header.tsx:150-157`; `app/login/page.tsx:172-178`).
- Floating WhatsApp/call buttons are global (`app/layout.tsx:37`), including auth pages, and can overlap content on small screens.
- No skip link; no `aria-current="page"` on nav links; focus styles are mostly browser defaults.
- The homepage final CTA uses white text on `accent-500` (`app/page.tsx:424`, `tailwind.config.js:29`); `#22C55E` with white is **2.28:1**, below the 4.5:1 body-text threshold. The brand audit independently flags this (`docs/audit/brand.md`). Use navy `primary-500` or `accent-700` for the background.

**Why it matters**

WCAG 2.2.2 requires a mechanism to pause, stop, or hide moving content that starts automatically and lasts more than five seconds. Beyond compliance, motion sensitivity and screen-reader noise are real usability issues. B2B procurement increasingly includes accessibility questionnaires; a site that fails basic label/name checks creates avoidable risk for a consultancy selling compliance.

**Recommendation**

- Add pause/play controls to both carousels; pause on hover and keyboard focus; stop timers under `prefers-reduced-motion`.
- Mark inactive slides `aria-hidden` and `inert`; remove `aria-live` from the rotating label or announce only on user action.
- Use real client names in alt text; add a permission note.
- Associate every label with an input (`htmlFor`/`id`), add `aria-describedby` for helpers/errors, and `aria-invalid` on error.
- Add accessible names to icon-only buttons; add `aria-expanded`/`aria-controls` to the mobile menu.
- Hide floating contact buttons on auth/admin pages; ensure they do not cover form controls.
- Add a skip-to-content link; add visible focus styles; add `aria-current` to active nav.
- Run axe/Lighthouse and a keyboard-only pass on home, services, contact, login, register, jobs, training.

**Definition of done**

- Lighthouse accessibility ≥95 on the key pages.
- Carousels can be paused; no auto-motion under reduced motion.
- Every form control has an accessible name.
- Keyboard-only completion of contact, registration, and job application works.

---

## 6. Microcopy recommendations

Arabic below is formal MSA intended for Egyptian/Gulf B2B buyers. It aligns with the positioning, voice, and promise defined in the concurrent brand audit (`docs/audit/brand.md`): **“Clear findings. Prioritised action. Measurable closure.”** Have a native copy editor review before publishing, and do not publish claims (certifications, response times, client names) until verified.

### 6.1 Hero

| Element | Current | Recommended English | Recommended Arabic |
|---|---|---|---|
| Eyebrow | “Since 2022” | “QHSSE consultancy · Cairo, Egypt” | «استشارات QHSSE · القاهرة، مصر» |
| H1 | “Building Safer Workplaces Through Expert QHSSE Solutions” | “We turn audit findings into safer, compliant operations.” | «نحوّل نتائج التدقيق إلى عمليات أكثر أماناً والتزاماً.» |
| Subheadline | “We help organizations achieve operational excellence through integrated Quality, Health, Safety, Security & Environmental consultancy services.” | “QHSSE consultancy for food, industrial and healthcare operations in Egypt. Since 2022, we’ve delivered 200+ visit reports that stand up to regulators and customers.” | «استشارات QHSSE لمنشآت الأغذية والصناعة والرعاية الصحية في مصر. منذ 2022، سلّمنا أكثر من 200 تقرير زيارة تصمد أمام الجهات التنظيمية والعملاء.» |
| Primary CTA | “Request a Visit” | “Book a 30-minute scoping call” | «احجز مكالمة تحديد نطاق (30 دقيقة)» |
| Secondary CTA | “Explore Services” | “Explore services” | «استكشف الخدمات» |
| Risk reducer | — | “No obligation · Reply within 1 business day · NDA on request” | «بدون التزام · رد خلال يوم عمل · اتفاقية سرية عند الطلب» |
| Promise strip | “Practical solutions / Trusted field expertise” | “Clear findings. Prioritised action. Measurable closure.” | «نتائج واضحة. أولويات عملية. إغلاق قابل للقياس.» |
| Proof line | “50+ clients / 200+ reports” with no timeframe | “200+ visit reports since 2022 · ISO & HACCP specialists” (verify the number; link to a sample report) | «أكثر من 200 تقرير زيارة منذ 2022 · متخصصون في ISO وHACCP» |
| Hero caption | “QHSSE CONSULTANT” | “On-site food safety review · Cairo” (or the actual location/context) | «مراجعة ميدانية لسلامة الغذاء · القاهرة» |

**Alternative H1 to test:** “Safer sites. Cleaner audits. Systems your team actually uses.” / «مواقع أكثر أماناً. تدقيقات أكثر سلاسة. أنظمة يلتزم بها فريقك فعلاً.»

### 6.2 CTA system

| Location | Current | Recommended English | Recommended Arabic | Why |
|---|---|---|---|---|
| Header (logged out) | “Create account” (primary) | “Book a scoping call” (primary); “Client login” (secondary) | «احجز مكالمة تحديد النطاق» / «دخول العملاء» | Buyer action, not training signup |
| Home hero | “Request a Visit” | “Book a 30-minute scoping call” | «احجز مكالمة تحديد نطاق (30 دقيقة)» | Specific, low commitment |
| Home final CTA | “Get Started Today” | “Talk to a consultant” | «تحدث مع استشاري» | Human, low pressure |
| Service card | “Request this service” | “Discuss this service” | «ناقش هذه الخدمة» | Consultative, not e-commerce |
| Service detail | “Request This Service” | “Request a site visit” | «اطلب زيارة ميدانية» | Concrete, service-specific |
| Contact submit | “Send Message” | “Send request” | «أرسل الطلب» | Matches B2B lead intent |
| Contact submit helper | — | “No obligation. We reply within 1 business day.” | «بدون التزام. نرد خلال يوم عمل واحد.» | Removes anxiety |
| Training (anonymous) | “Start training” | “Sign in to start training” | «سجّل الدخول للبدء» | Sets expectation |
| Training (authenticated) | — | “Continue training” | «تابع التدريب» | Continuity |
| Register | “Create account and sign in” | “Create account” | «إنشاء حساب» | One action, less confusion |
| Jobs | “Submit application” | “Send application” | «أرسل الطلب» | Consistent |
| Jobs (no role) | “No suitable role? Contact us” | “No suitable role? Send us your CV” | «لا تجد وظيفة مناسبة؟ أرسل سيرتك الذاتية» | Clear next step |

### 6.3 Forms

#### Contact form

| Element | Recommended English | Recommended Arabic | Notes |
|---|---|---|---|
| Company | “Company name *” + helper “So we can tailor the response.” | «اسم الشركة *» + «حتى نخصص الرد.» | Make required |
| Email | “Work email *” + helper “We reply within 1 business day.” | «البريد الإلكتروني للعمل *» + «نرد خلال يوم عمل واحد.» | B2B intent |
| Phone | “Phone (optional)” + helper “Include country code, e.g. +20 111 775 5096.” | «الهاتف (اختياري)» + «أدخل رمز الدولة، مثال: ‎+20 111 775 5096.» | Reduces validation errors |
| Industry | “Industry” — Food & beverage / Manufacturing / Construction / Logistics / Healthcare / Other | «القطاع» — الأغذية والمشروبات / التصنيع / الإنشاءات / الخدمات اللوجستية / الرعاية الصحية / أخرى | Qualification + routing |
| Sites | “Number of sites” — 1 / 2–5 / 6–20 / 20+ | «عدد المواقع» — 1 / 2–5 / 6–20 / أكثر من 20 | Scoping signal |
| Timeline | “When do you need this?” — Immediate / 1–3 months / 3–6 months / Exploring | «متى تحتاج هذا؟» — فوري / 1–3 أشهر / 3–6 أشهر / أستكشف الخيارات | Urgency signal |
| Message | “What do you need help with? *” + placeholder “e.g. We operate 3 food manufacturing sites in 6th of October and need our HACCP documentation reviewed before a customer audit in March.” | «ما الذي تحتاج المساعدة فيه؟ *» + «مثال: لدينا ثلاثة مصانع أغذية في 6 أكتوبر ونحتاج مراجعة وثائق HACCP قبل تدقيق عميل في مارس.» | Example improves lead quality |
| Consent | “I agree to be contacted about this request. We won’t share your details. Privacy Policy.” | «أوافق على التواصل معي بخصوص هذا الطلب. لن نشارك بياناتك. سياسة الخصوصية.» | Legal + trust |
| Submit helper | “No obligation · NDA on request · Reply within 1 business day.” | «بدون التزام · اتفاقية سرية عند الطلب · رد خلال يوم عمل واحد.» | Anxiety reduction |
| Success | “Request received. Your reference is QH-2417. A consultant will reply within 1 business day. Need it sooner? Call +20 111 775 5096.” | «تم استلام طلبك. رقم المرجع: QH-2417. سيتواصل معك أحد استشاريينا خلال يوم عمل واحد. تحتاج رداً أسرع؟ اتصل على ‎+20 111 775 5096.» | Persistent confirmation |
| Error | “We couldn’t send your request. Try again, or email hello@qhsseconsultant.com — we reply within 1 business day.” | «تعذر إرسال طلبك. حاول مرة أخرى أو راسلنا على hello@qhsseconsultant.com — نرد خلال يوم عمل واحد.» | Never expose server errors |
| Rate limit | “You’ve reached the daily limit. Email us at hello@… and we’ll continue there.” | «وصلت إلى الحد اليومي. راسلنا على hello@… وسنكمل من هناك.» | Recovery path |

**Also add:** `autocomplete="name"`, `organization`, `email`, `tel`; `inputmode="tel"`; `aria-describedby` for helpers; `aria-invalid` on error; a hidden honeypot instead of relying only on rate limits.

#### Registration

| Element | Recommended English | Recommended Arabic |
|---|---|---|
| Password hint | “At least 10 characters.” | «10 أحرف على الأقل.» |
| Confirm mismatch | “Passwords don’t match.” (inline, next to field) | «كلمتا المرور غير متطابقتين.» |
| Phone helper | “Include country code, e.g. +20 111 775 5096.” | «أدخل رمز الدولة، مثال: ‎+20 111 775 5096.» |
| Consent | “I agree to the Terms and Privacy Policy.” | «أوافق على الشروط وسياسة الخصوصية.» |
| Portal explanation | “Training portal — for course participants. Looking for client reports? Request client portal access.” | «بوابة التدريب — للمشاركين في الدورات. تبحث عن تقارير العملاء؟ اطلب الوصول إلى بوابة العملاء.» |
| Duplicate email | “If this email is already registered, sign in instead.” | «إذا كان هذا البريد مسجلاً بالفعل، سجّل الدخول بدلاً من ذلك.» |

#### Job application

| Element | Recommended English | Recommended Arabic |
|---|---|---|
| Resume label | “CV (PDF or Word, max 5 MB) *” | «السيرة الذاتية (PDF أو Word، بحد أقصى 5 ميجابايت) *» |
| Privacy | “Your CV is used only for this application and stored securely.” | «تُستخدم سيرتك الذاتية لهذا التقديم فقط وتُحفظ بشكل آمن.» |
| Success | “Application received — reference #A-1042. We’ll contact you if there’s a match.” | «تم استلام طلبك — رقم المرجع A-1042. سنتواصل معك في حال وجود تطابق.» |
| External apply | “Apply on company site” (link, not text) | «التقديم عبر موقع الشركة» |
| File error | “This file is too large. Please upload a PDF or Word file under 5 MB.” | «الملف كبير جداً. يرجى رفع ملف PDF أو Word أقل من 5 ميجابايت.» |

### 6.4 Trust sections

| Section | Current | Recommended English | Recommended Arabic |
|---|---|---|---|
| Partner eyebrow | “Trusted Partnerships” | “Selected clients” (if they are clients, not partners) | «عملاء مختارون» |
| Partner heading | “Partners Who Power Our Mission” | “Trusted by food, industrial and healthcare teams in Egypt” (verify geography) | «موثوقون من فرق الأغذية والصناعة والرعاية الصحية في مصر» |
| Partner subtitle | “Browse our partners smoothly with automatic motion and simple previous/next controls.” | “A selection of organizations we’ve supported with audits, ISO implementation and safety training.” | «مجموعة من المؤسسات التي دعمناها في التدقيق وتطبيق ISO والتدريب على السلامة.» |
| Logo alt | “Client logo 1” | Real brand name, e.g. “El-Zomoroda for corn products logo” | اسم العلامة الفعلي |
| Permission note | — | “Selected clients — logos used with permission.” | «عملاء مختارون — تُستخدم الشعارات بموافقتهم.» |
| Credentials strip | — | “Standards we support: ISO 9001 · ISO 45001 · ISO 14001 · ISO 22000 · HACCP — implementation & audit readiness.” | «المعايير التي ندعمها: ISO 9001 · ISO 45001 · ISO 14001 · ISO 22000 · HACCP — التطبيق والاستعداد للتدقيق.» |
| Testimonial intro | — | “What clients say” | «ماذا يقول عملاؤنا» |
| Testimonial format | — | Quote + name/role + sector/site count + outcome | اقتباس + الاسم/الوظيفة + القطاع/عدد المواقع + النتيجة |
| Case study structure | — | “Challenge / What we did / Result” with a metric and timeframe | «التحدي / ما فعلناه / النتيجة» مع مؤشر وجدول زمني |
| Team heading | — | “The consultants who will do the work” | «الاستشاريون الذين سيعملون معك» |
| Legal line | — | “QHSSE Consultant is a registered [entity type] in Egypt. Commercial registration [number]. [Address].” | «QHSSE Consultant كيان مسجل في مصر. السجل التجاري [رقم]. [العنوان].» |
| Response promise | — | “We reply to every enquiry within one business day (Sun–Thu, 9:00–17:00 EET).” | «نرد على كل استفسار خلال يوم عمل واحد (الأحد–الخميس، 9:00–17:00 بتوقيت القاهرة).» |
| Privacy note | — | “We use your details only to respond to this request. Read our Privacy Policy.” | «نستخدم بياناتك للرد على هذا الطلب فقط. اقرأ سياسة الخصوصية.» |
| NDA note | — | “NDA available on request.” | «اتفاقية سرية متاحة عند الطلب.» |
| FAQ: certification | — | “Do you issue ISO certificates? No — we prepare you for certification by an accredited body and support you through the audit.” | «هل تصدرون شهادات ISO؟ لا — نجهزكم للاعتماد من جهة مانحة معتمدة وندعمكم خلال التدقيق.» |

### 6.5 Error and recovery messages

| Situation | Current | Recommended English | Recommended Arabic |
|---|---|---|---|
| Contact server error | Raw API text, e.g. “Contact requests table is missing…” | “We couldn’t send your request. Please try again, or email hello@… — we reply within one business day.” | «تعذر إرسال طلبك. حاول مرة أخرى أو راسلنا على hello@… — نرد خلال يوم عمل واحد.» |
| Validation error | English Zod message | Inline field-level message in the current language | رسالة inline أسفل الحقل بالعربية |
| Rate limited | Generic error | “You’ve reached the limit for today. Email us at hello@… and we’ll continue there.” | «وصلت إلى الحد اليومي. راسلنا على hello@… وسنكمل من هناك.» |
| Auth invalid | Localized toast | Keep, but add inline error and focus management | أبقِ الرسالة وأضف خطأ inline |
| Job file too large | “Resume file is too large” | “This file is over 5 MB. Please upload a smaller PDF or Word file.” | «الملف أكبر من 5 ميجابايت. يرجى رفع ملف PDF أو Word أصغر.» |
| Empty jobs | “No open roles right now” | Keep; add “Send us your CV” secondary action | أبقِ الرسالة وأضف «أرسل سيرتك الذاتية» |

---

## 7. Quick wins implementable within a day

Assumes copy sign-off and no schema migration. Times are for one developer/designer; several can run in parallel.

| # | Change | File(s) | Time | Expected effect |
|---|---|---|---|---|
| 1 | Preload English locale into initial context; add pre-paint `lang`/`dir` script | `context/language-context.tsx`, `app/layout.tsx` | 2h | Eliminates raw-key first paint; fixes RTL flash |
| 2 | Replace hero copy + unify CTA labels | `public/locales/en.json`, `ar.json`, `app/page.tsx`, `components/Header.tsx` | 2h | Clear value proposition; higher CTA CTR |
| 3 | Header: “Book a scoping call” primary; move Jobs to footer; remove “Create account” from marketing header | `components/Header.tsx`, `components/Footer.tsx` | 1h | Focus on buyer conversion |
| 4 | Contact: company required, consent + SLA microcopy, persistent success panel with reference, mailto fallback | `app/contact/page.tsx`, `lib/validation.ts`, `app/api/contact/route.ts` | 3h | Higher completion; better leads |
| 5 | Replace gray map placeholder with static map/Google Maps link + hours | `app/contact/page.tsx`, `lib/contact-info.ts` | 45m | Local trust |
| 6 | Auth: password `minLength=10` + hint, inline mismatch, “Forgot password? Contact support,” consent line | `app/register/page.tsx`, `app/login/page.tsx` | 2h | Fewer failed signups |
| 7 | A11y: associate labels, aria-labels for icon buttons, pause carousel on hover/focus, `aria-hidden` inactive slides, real logo alts, fix final-CTA contrast | `app/contact/page.tsx`, `app/jobs/page.tsx`, `app/login/page.tsx`, `app/register/page.tsx`, `app/page.tsx`, `components/Header.tsx` | 3h | Compliance + usability |
| 8 | Jobs: link `applyUrl`, scroll/focus form on mobile selection, client-side file size/type check | `app/jobs/page.tsx` | 1.5h | Fewer dead ends |
| 9 | Add proof strip + two testimonial placeholders under hero | `app/page.tsx`, `en.json`, `ar.json` | 2h | Immediate trust lift (content approval needed) |
| 10 | Publish `/privacy` and `/terms`; link from footer and forms | `app/privacy/page.tsx`, `app/terms/page.tsx`, `components/Footer.tsx` | 2h + legal review | Legal/credibility |
| 11 | Per-page metadata, OG image, JSON-LD `Organization`/`ProfessionalService`, `sitemap.ts`, `robots.ts` | `app/layout.tsx`, page files, `app/sitemap.ts`, `app/robots.ts` | 2h | Search relevance/trust |
| 12 | WhatsApp prefilled message contextual to page/service | `components/FloatingContactButtons.tsx` | 45m | Higher chat conversion |

**Day-1 set (highest ROI, ~9–10h with copy signed off):** items 1, 2, 3, 5, 6, 7, 8. Ship these first; they remove blockers and obvious credibility leaks without waiting for content or legal.

**Week-1 set:** items 4, 9, 10, 11, 12 plus the Arabic copy pass.

---

## 8. Secondary findings and backlog

These did not make the top 10 but should be scheduled.

1. **Jobs application flow dead ends** — `applyUrl` is rendered as text, not a link (`app/jobs/page.tsx:296-301`); the form is in a sticky sidebar only on desktop, so on mobile it sits below all job cards and selecting a card does not move the user to the form (`:259-309`); resume size/type is validated only server-side (`app/api/job-applications/route.ts:78-100`); no privacy note for CVs; no posted date/deadline.
2. **Training value is under-specified** — no duration, level, modules, assessment format, certificate issuer, CPD value, or sample certificate (`app/training/page.tsx:131-146,175-185`). The third stat card shows “80%+” with no label. “Start training” sends anonymous users to login without saying so.
3. **About page is thin for due diligence** — no team, leadership, history, certifications, legal entity, or offices; “Our Commitment” is English-only (`app/about/page.tsx:121-124`); the hero subtitle “Our Mission & Vision” is repeated as the next section’s H2 (`:59,71`).
4. **Homepage length and duplication** — service cards, stats, why-us, partner carousel, and final CTA repeat messages already made above the fold. Consider moving the partner wall lower or making it a compact strip.
5. **Partner section copy describes the UI, not the value** — “Browse our partners smoothly with automatic motion and simple previous/next controls” (`app/page.tsx:354-358`) is internal UX copy. Replace with a trust statement.
6. **No FAQ / “How we work” / pricing model** — buyers cannot answer “what does it cost?”, “how long?”, “do you certify?”, “do you work outside Egypt?” without contacting sales.
7. **Selected service is not editable on contact** — the banner is display-only (`app/contact/page.tsx:117-127`); a buyer who picked the wrong service must go back. Add a select or “Change” link.
8. **No structured lead source** — no UTM/source capture, no service field, no page attribution. This makes marketing ROI impossible to measure.
9. **Email deliverability and SLA** — auto-reply says “shortly” (`app/api/contact/route.ts:77-84`); no timeframe, no reference, no branded domain. Configure SPF/DKIM/DMARC and add a 1-business-day promise.
10. **Global floating buttons on auth/admin** — `app/layout.tsx:37` mounts them everywhere; hide on `/login`, `/register`, `/admin`, `/dashboard` to reduce distraction and overlap.
11. **No skip link / focus management** — add “Skip to content,” visible focus rings, and focus the first error on submit.
12. **No cookie/visitor notice** — `VisitorTracker` persists a UUID and posts on every page (`components/VisitorTracker.tsx:6-50`); add a privacy notice or remove tracking until consent is defined.
13. **SEO basics missing** — no per-page metadata, OG image, `sitemap.ts`, `robots.ts`, JSON-LD, or Arabic `hreflang`. The root metadata is English-only (`app/layout.tsx:20-24`).
14. **Auth visual inconsistency** — blue button/brown accents on login/register vs the navy-and-green marketing palette (`app/login/page.tsx:185`, `app/register/page.tsx:241`).
15. **Primary CTA contrast** — white on `accent-500` (`#22C55E`) is 2.28:1 on the homepage final CTA (`app/page.tsx:424`); use navy or `accent-700`. Covered in `docs/audit/brand.md`.
16. **Job data handling risk** — resumes are stored as base64 data URLs in the database (`app/api/job-applications/route.ts:94-101`); define size limits, retention, and access controls, and avoid exposing raw data URLs.

---

## 9. Measurement plan

### Baseline before changes

Instrument these events (no PII in analytics):

- `hero_cta_click` (primary/secondary)
- `service_card_click`, `service_detail_cta_click`
- `contact_start`, `contact_submit_success`, `contact_submit_error`
- `whatsapp_click`, `phone_click`, `email_click`
- `training_signup_start`, `training_signup_complete`, `course_start`
- `job_apply_start`, `job_apply_complete`
- `language_switch`
- Form field drop-off (which field is last completed)
- Page speed: LCP, CLS, INP on `/`, `/services`, `/contact` (mobile)

### Primary KPIs

| KPI | Current | Target (90 days) |
|---|---|---|
| Contact form completion (start → success) | Baseline TBD | +25% relative |
| Qualified lead rate (company + industry + timeline present) | Baseline TBD | 100% company; 70% industry/timeline |
| Time to first human response | Baseline TBD | < 1 business day |
| Service page → contact click-through | Baseline TBD | +20% relative |
| Arabic vs English contact conversion | Baseline TBD | Close the gap by 50% |
| Training registration completion | Baseline TBD | +20% relative |
| Job application completion | Baseline TBD | +15% relative |
| Lighthouse accessibility (key pages) | Baseline TBD | ≥ 95 |
| Raw i18n keys in first paint | 17–38 per page | 0 |

### Qualitative research next

1. **Five-second hero test** with 8–10 target buyers (food/industrial QHSE managers): recall of service, audience, next step.
2. **Moderated usability tests** (6–8 participants) on: find a service → request a quote; contact the firm; create a training account; apply for a job. Measure task success, time, errors, confidence (SEQ).
3. **Buyer interviews** (5–8) with QHSE/operations leaders: what proof they need before shortlisting; objections to the current site; language preference.
4. **Sales objection tagging** for 4 weeks: “no proof,” “unclear scope,” “price,” “response time,” “certification confusion.”
5. **Trust A/B test** after baseline: hero with proof strip vs current; contact form with SLA/consent vs current.

---

## 10. Suggested execution order

| Sprint | Work | Owner |
|---|---|---|
| **Day 1** | Raw-key fix, hero/CTA copy, header CTA/nav, auth password hint, map link, label/a11y fixes, jobs link | Frontend + copy |
| **Week 1** | Contact form rebuild (qualification, consent, success state), privacy/terms, metadata/OG/JSON-LD, Arabic copy pass | Frontend + content + legal |
| **Weeks 2–3** | Evidence layer: 2 case studies, 3 testimonials, credentials strip, team section, legal entity line | Content + design + leadership |
| **Weeks 3–4** | Service detail template, industries pages, FAQ, “How we work,” pricing/assessment offer | Content + design + frontend |
| **Week 4** | Accessibility audit (axe + keyboard + screen reader), RTL QA, performance pass | Frontend + QA |
| **Ongoing** | Measure KPIs, run 5-second tests and usability sessions, iterate copy | UX research + growth |

---

## Appendix A — Heuristic coverage

| Nielsen heuristic | Current rating | Main evidence |
|---|---|---|
| 1. Visibility of system status | **Poor** | Raw keys on first paint; 4s toast-only success; no progress on forms |
| 2. Match between system and real world | **Fair** | Jargon-heavy hero; “Request a Visit”; “99% safety rating” |
| 3. User control and freedom | **Fair** | Carousels lack pause; selected service not editable; no cancel/back on some flows |
| 4. Consistency and standards | **Poor** | QHSE vs QHSSE; legal name mismatch; CTA labels vary; auth palette differs |
| 5. Error prevention | **Poor** | Password 8 vs 10; phone regex round trip; no client-side file check; optional company |
| 6. Recognition rather than recall | **Fair** | Service prefill is good; no pricing/process/FAQ to recognize |
| 7. Flexibility and efficiency | **Fair** | WhatsApp/phone available; no scheduling, no quick quote, no saved forms |
| 8. Aesthetic and minimalist design | **Fair** | Polished visuals but long page, duplicated services, 18-logo carousel |
| 9. Help users recognize, diagnose, recover from errors | **Poor** | Raw server errors; English-only validation; no recovery from login |
| 10. Help and documentation | **Poor** | No FAQ, privacy, terms, process, or service deliverables |

## Appendix B — Files reviewed

- `app/page.tsx`, `app/about/page.tsx`, `app/services/page.tsx`, `app/contact/page.tsx`
- `app/jobs/page.tsx`, `app/training/page.tsx`, `app/login/page.tsx`, `app/register/page.tsx`
- `components/Header.tsx`, `components/Footer.tsx`, `components/FloatingContactButtons.tsx`, `components/Providers.tsx`, `components/VisitorTracker.tsx`, `components/LanguageSwitcher.tsx`, `components/BrandLogo.tsx`
- `context/language-context.tsx`
- `public/locales/en.json`, `public/locales/ar.json`
- `lib/contact-info.ts`, `lib/service-cards.ts`, `lib/validation.ts`
- `app/api/contact/route.ts`, `app/api/jobs/route.ts`, `app/api/job-applications/route.ts`, `app/api/auth/register/route.ts`
- `app/layout.tsx`, `app/globals.css`
- Build output: `.next/server/app/index.html`, `contact.html`, `services.html`, `about.html`, `jobs.html`, `training.html`

---

**Audit prepared by:** UX Research
**Next step:** validate the top three findings with 5–8 target buyers and ship the Day-1 set before the next campaign or SEO push.
