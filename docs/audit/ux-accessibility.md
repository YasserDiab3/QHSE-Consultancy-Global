# UX, Accessibility & RTL Audit — QHSSE Consultant Portal

**Audit date:** 27 October 2026  
**Scope:** Public site, authentication, client portal, admin portal, shared components, language system, global CSS, validation, and related API responses  
**Standard:** WCAG 2.2 Level A/AA, WAI-ARIA Authoring Practices, Nielsen usability heuristics, Arabic/RTL layout conventions  
**Mode:** Read-only source audit. No application code was modified.  
**Overall result:** **Not ready for release.** Three P0 blockers prevent core tasks or fail Level A site-wide. Sixteen P1 findings create significant accessibility, task-flow, or trust barriers.

> This report complements the existing audits in `docs/audit/ux-heuristics.md`, `ui-design.md`, `brand.md`, and `privacy-compliance.md`. Where findings overlap, this report adds implementation-level evidence, acceptance criteria, and remediation sequencing rather than restating visual opinions.

---

## 1. Executive summary

The portal has a coherent visual shell and a broad feature set, but its accessibility and localization foundations are incomplete. The most serious problems are systemic, not cosmetic:

1. **Language is resolved only in the browser.** The server always emits `lang="en" dir="ltr"`, and the translation store starts empty. Prerendered HTML contains raw keys such as `home.heroTitle`, so Arabic users receive English/LTR first paint and may briefly see translation keys. This fails WCAG 3.1.1 on every route and undermines the Arabic experience before hydration.
2. **Visible form labels are not programmatically associated.** Auth, contact, jobs, certificate verification, and admin training forms use adjacent `<label>` text without `htmlFor`/`id`. Screen-reader and voice-control users cannot reliably identify fields. This affects the primary contact, application, registration, and sign-in tasks.
3. **The required resume upload cannot be reached by keyboard.** The file input is `display:none` inside a non-focusable label. A keyboard-only applicant can fill the form but cannot attach the required file, so the job application task is blocked.

Beyond the P0 set, navigation lacks a skip link and `<main>` on public routes, all routes share one document title, mobile navigation has no expanded/controls semantics, modals have no dialog behavior, and admin metrics open datasets with different scopes than the numbers shown. Arabic coverage is incomplete, certificate printing is blank because of global print CSS, and several async failures leave stale data without feedback.

### Scorecard

| Dimension | Rating | Summary |
|---|---:|---|
| Localization / first paint | **Critical** | Client-only language boot; static English document attributes; raw keys in SSR |
| Forms and error handling | **Critical** | Unassociated labels; transient toast-only errors; no `aria-invalid`/`aria-describedby` |
| Keyboard operability | **High risk** | Blocked resume/admin uploads; click-only cards; undersized chart controls |
| Screen-reader semantics | **High risk** | Missing landmarks, dialog semantics, control names, table labels, and announcements |
| Information architecture | **High risk** | Local-state tabs; no deep links or history; admin metric/filter scope mismatch |
| RTL behavior | **Medium-high risk** | Core direction works after hydration, but physical utilities and hardcoded strings break mirroring |
| Visual accessibility | **Medium-high risk** | Multiple text/UI contrast failures; small targets |
| Resilience | **High risk** | No route-level loading/error/404 states; silent fetch failures and stale data |
| Content consistency | **Medium risk** | Mixed English/Arabic hardcoded copy; translation key parity gaps |

**Release gate:** P0 items must be closed before any public launch. P1 items should be closed before calling the portal WCAG 2.2 AA-ready or accepting client/admin users at scale. P2 items can follow in a hardening sprint.

### Findings at a glance

| Severity | Count | Meaning |
|---|---:|---|
| P0 | 3 | Blocks a core task or violates Level A site-wide |
| P1 | 16 | Significant WCAG/task-flow barrier or trust risk |
| P2 | 11 | Polish, consistency, or secondary accessibility issue |
| **Total** | **30** | |

---

## 2. Scope, method, and limitations

### Reviewed

- **14 routes:** `/`, `/about`, `/services`, `/training`, `/training/[slug]`, `/training/verify`, `/training/certificate/[code]`, `/training/profile`, `/jobs`, `/contact`, `/login`, `/register`, `/dashboard`, `/admin`.
- **31 app TSX files and 10 shared component TSX files**, including header/footer, floating contact actions, language provider, client knowledge bank, client profile panel, and admin subcomponents.
- **15 forms** across public, auth, client, and admin surfaces.
- **Global CSS, Tailwind theme, locale JSON, Zod validation, auth options, and relevant API routes** (`/api/dashboard`, reports, contact requests, registration, verification).
- **Prerendered HTML in `.next/server/app`** to verify what users and crawlers receive before hydration.
- **Keyboard-path analysis** of navigation, forms, dashboards, modals, tables, uploads, and print.
- **Contrast calculations** using WCAG relative-luminance formulas.
- **Translation-key comparison** between `public/locales/en.json` and `public/locales/ar.json`.

### Method

Static source inspection was combined with rendered-output checks and manual keyboard-path reasoning. File and line references identify the implementation point to change. Each finding includes a concrete fix and acceptance criteria that can be converted directly into tickets or Playwright/axe tests.

### Limitations

- No live assistive-technology session (NVDA, JAWS, VoiceOver), browser matrix, or authenticated production dataset was available. Findings are source- and SSR-evidenced; the test plan in §10 closes that gap.
- Contrast ratios are computed from declared Tailwind colors. Opacity, overlays, images, and gradients can change effective contrast.
- The `.next` HTML is a build artifact and may not match the latest unbuilt source; the underlying client-only language architecture in source confirms the observed behavior.
- No penetration, privacy, or backend authorization review was performed here. See `docs/audit/privacy-compliance.md` and `docs/audit/database-architecture.md`.

### Severity model

- **P0 — Blocker:** Prevents a core task for a user group, or violates a Level A criterion across the product.
- **P1 — Major:** Significant barrier to a WCAG AA task flow, a misleading admin decision surface, or a failure that users cannot recover from without support.
- **P2 — Moderate:** Usability/consistency defect, secondary accessibility gap, or polish that should be scheduled but does not block the task.

---

## 3. Findings index

| ID | Severity | Finding | Primary area |
|---|---|---|---|
| P0-1 | P0 | Language and document direction fail before hydration | Localization / document semantics |
| P0-2 | P0 | Form labels are not programmatically associated | Forms / screen readers |
| P0-3 | P0 | Required resume upload is keyboard-inaccessible | Jobs / keyboard |
| P1-1 | P1 | No skip link, public `<main>` landmarks, unique titles, or route focus | Navigation / landmarks |
| P1-2 | P1 | Mobile navigation lacks name, state, Escape, and focus management | Header / keyboard |
| P1-3 | P1 | Form errors are transient toasts, not field-associated feedback | Forms / announcements |
| P1-4 | P1 | Icon-only, click-only, and undersized controls | Interactive controls |
| P1-5 | P1 | Modals lack dialog semantics, focus trap, Escape, and scroll lock | Admin / dialogs |
| P1-6 | P1 | Local-state tabs break deep links, refresh, and Back; report Back arrow points wrong | Dashboard IA |
| P1-7 | P1 | Admin overview cards and charts open differently scoped data | Admin metrics |
| P1-8 | P1 | Preset filters are dead ends with misleading empty states | Admin filters |
| P1-9 | P1 | Admin/client uploads repeat the hidden-input keyboard failure | Uploads |
| P1-10 | P1 | Language switching and coverage are incomplete | Localization |
| P1-11 | P1 | No password recovery; password rule mismatch; server errors not field-mapped | Auth |
| P1-12 | P1 | Certificate printing is blank because print CSS only reveals the client profile | Print |
| P1-13 | P1 | Auto-rotating hero/partner rail lacks pause and ignores reduced motion | Motion |
| P1-14 | P1 | Floating contact actions overlay modals and use physical positioning | Overlay / RTL |
| P1-15 | P1 | Missing route states and silent/stale fetch failures | Resilience |
| P1-16 | P1 | Site-wide text and UI contrast failures | Visual accessibility |
| P2-1 | P2 | Admin overview double-fetches and shows a dead Site Visitors card | Admin data |
| P2-2 | P2 | Activity log columns are mislabeled and expose raw actions | Admin tables |
| P2-3 | P2 | Admin training mixes hardcoded English labels and raw statuses | Localization |
| P2-4 | P2 | About “Our Commitment” is hardcoded English | Localization |
| P2-5 | P2 | Residual English filter labels and inconsistent date locales | Localization / formatting |
| P2-6 | P2 | Physical left/right utilities break RTL mirroring | RTL |
| P2-7 | P2 | Active navigation/tab state is visual only; focus styling is inconsistent | Navigation state |
| P2-8 | P2 | Destructive actions use native `confirm()` with no context or undo | Destructive UX |
| P2-9 | P2 | Long forms/modals discard unsaved work without warning | Forms |
| P2-10 | P2 | Required/optional conventions and field help are inconsistent | Forms |
| P2-11 | P2 | Footer legal links are dead and new-tab links are not indicated | Navigation / trust |

---

## 4. P0 — Blockers

### P0-1 — Language and document direction fail before hydration

**Severity:** P0  
**Area:** Localization, document semantics, first paint  
**Affected:** `app/layout.tsx:32`; `context/language-context.tsx:34,45-51,60,64-71`; `app/page.tsx:182`; `public/locales/ar.json`; all routes

**Evidence**

- `app/layout.tsx:32` always renders `<html lang="en" dir="ltr" suppressHydrationWarning>`.
- `context/language-context.tsx:50-51` initializes `language` to `'en'` and `messages` to `{}`.
- The translation loader runs in `useEffect` (`:64-71`), reads only `localStorage` (`:68`), fetches `/locales/{lang}.json` client-side (`:34`), and then mutates `<html lang/dir>` (`:45-46`).
- `t()` returns the key path when a message is absent (`context/language-context.tsx:30` and `:78-79`), so the first render prints dotted keys instead of English fallback text. `app/page.tsx:182` renders the H1 via `t('home.heroTitle')`.
- Prerendered HTML in `.next/server/app/index.html` contains `<html lang="en" dir="ltr">` and raw keys such as `home.heroTitle`, `nav.home`, `home.ctaTitle`, and `contact.infoTitle`.
- `ar.json` has 210 leaves versus 212 in `en.json`; `auth.invalidCredentials` and `auth.serviceUnavailable` are missing.
- `suppressHydrationWarning` masks the server/client language mismatch instead of resolving it.

**Problem**

The server cannot know the user’s language. Every route is emitted as English/LTR, with unresolved keys, until JavaScript downloads, reads `localStorage`, fetches a locale file, and re-renders. A returning Arabic user sees the wrong language and direction on first paint; a screen reader pronounces the page with the English voice; search engines and link previews index keys rather than content.

**Impact**

- Violates WCAG 3.1.1 Language of Page on every route.
- Breaks the primary Arabic user experience before interaction.
- Causes layout shift when `dir` flips from LTR to RTL.
- Makes the site unusable without JavaScript and unreliable on slow connections.
- Undermines trust and SEO for the Arabic audience.

**Fix**

1. Resolve locale on the server from a `NEXT_LOCALE`/`preferred-language` cookie, with `Accept-Language` as fallback. If the product wants shareable localized URLs, use an `/ar` route segment instead.
2. Import or read the locale JSON on the server, then pass `initialLanguage` and `initialMessages` into `LanguageProvider` from the root layout.
3. Render `<html lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'}>` on the server. Remove `suppressHydrationWarning` unless it is still needed for an unrelated theme attribute.
4. Return a real fallback string (English) when a key is missing, never the dotted key path. Add a development warning for missing keys and a CI parity check.
5. Persist the choice in both a cookie and `localStorage`. Listen for `storage` events so multiple tabs stay in sync.
6. Keep client-side switching for instant feedback, but update the cookie, `<html>` attributes, and messages together.

**Acceptance criteria**

- [ ] `GET /` with `Cookie: preferred-language=ar` returns `<html lang="ar" dir="rtl">` and an Arabic H1 in the response body.
- [ ] The same is true for `/about`, `/services`, `/jobs`, `/contact`, `/login`, `/register`, `/dashboard`, and `/admin`.
- [ ] A server-HTML scan finds no user-visible dotted translation keys matching `>(home|nav|about|contact|auth|admin)\.[A-Za-z]`.
- [ ] Switching language updates `<html lang/dir>` immediately, survives a full reload, and propagates to a second tab.
- [ ] `axe` rules `html-has-lang` and `html-lang-valid` pass on every route.
- [ ] Page content remains readable with JavaScript disabled (English fallback or server-selected Arabic).
- [ ] No hydration warning is emitted for language/direction.

---

### P0-2 — Form labels are not programmatically associated

**Severity:** P0  
**Area:** Forms, screen-reader and voice-control access  
**Affected:** `app/login/page.tsx:144,152-160,168-177`; `app/register/page.tsx:166,172-181,187-197,201-206,220-231`; `app/contact/page.tsx:132,136-143,147-155,159-166,170-177,181-186`; `app/jobs/page.tsx:387-423,447`; `app/training/verify/page.tsx:65`; `app/admin/admin-training.tsx:459-463`

**Evidence**

- There is no `htmlFor` attribute anywhere in `app/` or `components/`, and the audited inputs have no matching `id`.
- Example: `app/login/page.tsx:144` renders `<label className="label-field">…</label>` and `:152-159` renders the email `<input>` with no `id`.
- The same pattern appears for password, name, email, phone, confirm-password, company, message, resume, cover letter, and certificate code.
- `app/admin/admin-training.tsx:459-463` renders a reusable `Input` with a label and input but no association.
- Some forms do use valid wrapping labels (for example `components/ClientProfilePanel.tsx:52`), so the defect is not universal; it is systemic across the highest-value public/auth tasks.
- No form declares `aria-required`, `aria-invalid`, or `aria-describedby`; required state is communicated only by a visual `*` or the native `required` attribute.

**Problem**

A sighted user sees the label; assistive technology sees an unnamed edit field. Screen readers announce “edit text” or “password edit” without the field purpose. Voice-control users cannot say “click Email.” Browser autofill and password managers have less reliable cues.

**Impact**

- Blocks or severely hampers sign-in, registration, contact, job application, certificate verification, and admin training creation for screen-reader and voice-control users.
- Violates WCAG 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions, and 4.1.2 Name, Role, Value.
- Makes error recovery harder because fields cannot be referenced by name.

**Fix**

1. Add stable, unique `id` values and pair every separate label with `htmlFor`. Wrapping `<label>` is also valid and can be used for simple fields.
2. Add `name` and correct `autoComplete` tokens: `name`, `email`, `tel`, `organization`, `current-password`, `new-password`.
3. Use `fieldset`/`legend` for grouped choices and for the file-upload group.
4. Express required state in text, not only `*`: “Email (required)” or a legend explaining `*`. Keep the native `required` attribute.
5. Connect help text with `aria-describedby`.
6. Build one shared `FormField` primitive so future forms cannot regress.

**Acceptance criteria**

- [ ] Every visible label is associated with exactly one control, or wraps that control.
- [ ] The accessibility tree name for each field equals its visible label (excluding the required marker).
- [ ] `axe` `label` and `form-field-multiple-labels` rules pass on every route.
- [ ] Tabbing through login, register, contact, jobs, and verify announces purpose, required state, and autocomplete where applicable.
- [ ] Voice control can target “Email”, “Password”, “Resume”, and “Message” successfully.
- [ ] No new form can merge without an associated-label test.

---

### P0-3 — Required resume upload is keyboard-inaccessible

**Severity:** P0  
**Area:** Jobs application, keyboard operability  
**Affected:** `app/jobs/page.tsx:425-443`; submission guard at `:178-180`

**Evidence**

- The resume field renders a visible `<label>` with `cursor-pointer` styling around an `<input type="file" className="hidden">` (`:427-443`).
- `hidden` resolves to `display:none`; the input is removed from the tab order and the accessibility tree. The wrapping label is not focusable.
- The form is submitted through a button, and `resumeFile` is validated only in JavaScript (`:178-180`), producing a toast if absent.
- There is no `required` attribute on the file input and no keyboard-accessible trigger.

**Problem**

A keyboard-only or screen-reader applicant can complete every text field and press Submit, but cannot open the file picker to attach the required resume. The toast tells them to upload a file they have no way to select.

**Impact**

- Blocks the core job-application task for keyboard and many screen-reader users.
- Violates WCAG 2.1.1 Keyboard and 4.1.2 Name, Role, Value.
- Creates a dead end that support cannot resolve without asking the user to switch input methods.

**Fix**

1. Replace the hidden input with a visible, focusable file input styled to match the design, **or** use a real `<button type="button">` that calls `fileInputRef.current?.click()`.
2. If the native input is visually hidden, use an `sr-only` technique that keeps it focusable and style the label with `:focus-within`, rather than `display:none`.
3. Give the control an accessible name that includes “Resume” and “required”; connect the hint (“PDF, DOC, or DOCX up to 5 MB”) with `aria-describedby`.
4. Announce the selected filename and any validation error through a status/alert region. Provide a Remove/Replace action.
5. Add native `required` where possible, and keep the JS guard as a fallback.

**Acceptance criteria**

- [ ] Tab reaches the resume control and it shows a visible focus indicator.
- [ ] Enter or Space opens the file picker in Chrome, Edge, Firefox, and Safari.
- [ ] A screen reader announces “Resume, required, file upload” plus the format/size hint.
- [ ] Selecting a file announces its name; an invalid type/size produces an associated error.
- [ ] A keyboard-only user can complete and submit the application end to end.
- [ ] Removing the resume returns focus to the upload control.

---

## 5. P1 — Major findings

### P1-1 — No skip link, public `<main>` landmarks, unique titles, or route focus

**Severity:** P1  
**Area:** Navigation, landmarks, page identity  
**Affected:** `app/layout.tsx:20-25`; `app/page.tsx`; `app/about/page.tsx:50-121`; `app/services/page.tsx`; `app/jobs/page.tsx:220+`; `app/contact/page.tsx:95+`; `app/login/page.tsx:113+`; `app/register/page.tsx:130+`; `components/Header.tsx:60-206`

**Evidence**

- No skip link exists in `app/` or `components/`.
- `<main>` exists on admin, client dashboard, training detail, verify, certificate, and training profile, but not on `/`, `/about`, `/services`, `/jobs`, `/contact`, `/login`, or `/register`.
- Only `app/layout.tsx:20-25` exports metadata. No page exports `metadata` or `generateMetadata`, so every route shares “QHSSE Consultant | Quality, Health, Safety & Environmental Solutions.”
- Header/navigation persists across client-side route changes; focus stays on the clicked link, and no route announcer or heading focus is implemented.
- The desktop nav marks the active item only with color; no `aria-current` is present.

**Problem**

Keyboard users must tab through the entire header on every page, with no way to jump to content. Screen-reader users cannot use landmark navigation on the public site, cannot distinguish pages by title, and may not know that a client-side navigation completed.

**Impact**

- Violates WCAG 1.3.1, 2.4.1 Bypass Blocks, 2.4.2 Page Titled, and 2.4.3 Focus Order.
- Increases time-on-task for keyboard and screen-reader users substantially.
- Makes browser history, bookmarks, and tabs indistinguishable.

**Fix**

1. Add a skip link as the first focusable element in the root layout: “Skip to main content”, visible on focus, targeting `#main-content`.
2. Wrap every page’s primary content in `<main id="main-content" tabIndex={-1}>`.
3. Add route-level metadata through server page wrappers or `generateMetadata`; use a title template such as `%s | QHSSE Consultant`.
4. Add a route-focus component that moves focus to the `<main>`/H1 after client-side navigation, but not on first load. Announce the new page title through a polite live region.
5. Add `aria-current="page"` to the active navigation link.
6. Ensure exactly one H1 per route and a logical H1→H2→H3 order.

**Acceptance criteria**

- [ ] First Tab reveals “Skip to main content”; Enter moves focus to `<main>` and scrolls it into view.
- [ ] Every route has exactly one `<main>`, one H1, and a unique `<title>`.
- [ ] Client-side navigation moves focus to the new page heading and announces the title.
- [ ] `aria-current="page"` is exposed on the active nav item.
- [ ] `axe` rules `bypass`, `landmark-one-main`, `page-has-heading-one`, and `document-title` pass on every route.
- [ ] Keyboard traversal from page top to content takes one action, not dozens.

---

### P1-2 — Mobile navigation lacks name, state, Escape, and focus management

**Severity:** P1  
**Area:** Header, mobile keyboard/screen-reader access  
**Affected:** `components/Header.tsx:150-157,162-206`

**Evidence**

- The mobile toggle (`:150-157`) contains only a `Menu`/`X` icon. It has no `aria-label`, `aria-expanded`, or `aria-controls`.
- The panel (`:162-206`) is conditionally rendered with no `id`, no Escape handler, and no focus return.
- The button is roughly 40×40 px (`p-2` + 24 px icon), below the 44×44 mobile target convention.
- Links close the menu on click, but opening does not move focus into the panel and closing does not return focus to the trigger.
- The panel is a disclosure, not a modal; a focus trap is not required, but focus must not be lost.

**Problem**

A screen-reader user hears an unlabeled “button” with no state. A keyboard user can open the menu but cannot close it with Escape, and may not know where focus went. Touch users get a small target.

**Impact**

- Violates WCAG 4.1.2, 2.1.1, and 2.4.3; the 40 px toggle is also below the 44 px mobile target convention.
- Makes primary navigation unreliable on mobile, the dominant viewport for many users.

**Fix**

1. Add `aria-label={open ? 'Close menu' : 'Open menu'}`, `aria-expanded={open}`, and `aria-controls="mobile-navigation"`.
2. Give the panel `id="mobile-navigation"` and keep it in the DOM if animation requires it; otherwise ensure state is announced.
3. Add an Escape listener that closes the menu and returns focus to the toggle.
4. Close on outside click and on route change; keep focus on the toggle or first link as appropriate.
5. Increase the target to at least 44×44 px.
6. Add `aria-current="page"` to the active mobile link.

**Acceptance criteria**

- [ ] Screen reader announces “Open menu, button, collapsed” and “Close menu, button, expanded.”
- [ ] Escape closes the menu and returns focus to the toggle.
- [ ] Tabbing never enters a hidden/closed menu.
- [ ] The toggle is at least 44×44 px and has a visible focus ring.
- [ ] `axe` `button-name` and `aria-allowed-attr` pass.

---

### P1-3 — Form errors are transient toasts, not field-associated feedback

**Severity:** P1  
**Area:** Forms, error prevention/recovery, announcements  
**Affected:** `app/contact/page.tsx:67-82`; `app/login/page.tsx:73-77`; `app/register/page.tsx:84,95-118`; `app/jobs/page.tsx:178-180`; `app/admin/admin-training.tsx`; all forms

**Evidence**

- Server and validation failures are surfaced with `toast.error(...)` in contact, login, register, and jobs.
- No form uses `aria-invalid`, `aria-describedby`, or an inline error summary.
- The only explicit live region in the app is the hero status at `app/page.tsx:233`; form outcome announcements depend on the toast library.
- Contact success clears the form and shows only a transient toast; there is no persistent confirmation or reference number.
- Password mismatch is a toast, not a field-level message.
- Native HTML validation bubbles are the only inline feedback for required/format errors.

**Problem**

Errors disappear, are not tied to the field that caused them, and cannot be reviewed while correcting the form. A screen-reader user may hear a toast once, then have no way to find the invalid field. Server errors (duplicate email, rate limit, validation) arrive as English strings or generic messages.

**Impact**

- Violates WCAG 3.3.1 Error Identification, 3.3.3 Error Suggestion, and 4.1.3 Status Messages.
- Increases failed submissions and support contacts.
- Makes Arabic error recovery inconsistent.

**Fix**

1. Add an error summary at the top of the form with links to each invalid field; focus it on submit failure.
2. Set `aria-invalid="true"` and `aria-describedby` pointing to a persistent inline error for each field.
3. Keep server errors in component state until corrected; map error codes to localized field messages.
4. Use `role="alert"` for the summary and `role="status"`/`aria-live="polite"` for success and async progress.
5. Do not clear the form on success until the user has a persistent confirmation; show next steps and a reference number where available.
6. Add password requirements before submit, not only after failure.

**Acceptance criteria**

- [ ] Submitting an empty/invalid form focuses an error summary listing every error.
- [ ] Each invalid field has `aria-invalid="true"` and an associated description; correcting it clears the state.
- [ ] Server 400/409/429 errors appear inline, localized, and persist until the user edits the field.
- [ ] Success is announced once and remains visible with next steps.
- [ ] `axe` and a screen-reader smoke test confirm errors are announced without navigating away.

---

### P1-4 — Icon-only, click-only, and undersized controls

**Severity:** P1  
**Area:** Interactive controls, touch, keyboard  
**Affected:** `app/login/page.tsx:172-178`; `app/register/page.tsx:209-215,232-234`; `app/dashboard/client-dashboard.tsx:350-353,389-408`; `app/admin/admin-clients.tsx:398-404`; `app/admin/admin-reports.tsx:469-490`; admin knowledge-bank icon rows

**Evidence**

- Password visibility buttons have no `aria-label` and no pressed state (`login:172-178`, `register:209-215,232-234`).
- Client report cards are `<div onClick>` elements (`client-dashboard:350-353`) with no `role`, `tabIndex`, or keyboard handler; the nested Eye/Download buttons are inside the clickable div.
- Dashboard Eye/Download buttons use `title` only and are approximately 36×36 px (`:389-408`).
- Admin report/client action icons are `p-1.5` (≈28×28 px) and several have no name; the Eye button in reports has no `title`/`aria-label` (`admin-reports:469-490`).
- The admin risk/status chart uses 8 px-high buttons as the only click target (`admin-dashboard-client.tsx:378-385,420-427`).
- Hover-only `title` tooltips are unavailable to touch and keyboard-only users.

**Problem**

Unnamed icon buttons are announced as “button.” Click-only cards cannot be opened by keyboard. Tiny chart bars and icon targets are difficult to hit on touch and at 200% zoom. Nested buttons inside a clickable card create ambiguous activation.

**Impact**

- Violates WCAG 4.1.2 and 2.1.1; the 8 px chart bars also fail 2.5.8 Target Size (Minimum), while 28–36 px icon controls miss the 44 px mobile convention.
- Makes core dashboard actions unreliable for keyboard, touch, and motor-impaired users.

**Fix**

1. Give every icon-only button an `aria-label` that includes context: “View report for {siteName}”, “Download PDF for {siteName}”, “Show password”.
2. Add `aria-pressed` to password visibility toggles, or change the label between “Show password” and “Hide password.”
3. Replace clickable `<div>` cards with `<button>` or `<Link>`, or add `role="button"`, `tabIndex={0}`, and Enter/Space handlers. Move secondary actions outside the clickable element to avoid nested interactives.
4. Use at least 44×44 px targets for icon actions; for chart bars, add a full-width labeled row/button with a visible “View” affordance rather than relying on an 8 px bar.
5. Keep `title` as a supplement, never the accessible name.
6. Ensure a visible `focus-visible` ring on every control.

**Acceptance criteria**

- [ ] Every icon-only control has a unique, contextual accessible name.
- [ ] Tab reaches each report card; Enter opens it; inner actions do not trigger the card.
- [ ] No interactive element is nested inside another interactive element.
- [ ] All touch targets are at least 44×44 px (or have an equivalent larger hit area).
- [ ] `axe` `button-name`, `link-name`, and `nested-interactive` pass.
- [ ] At 200% zoom, controls remain visible and operable.

---

### P1-5 — Modals lack dialog semantics, focus trap, Escape, and scroll lock

**Severity:** P1  
**Area:** Admin dialogs, focus management  
**Affected:** `app/admin/admin-reports.tsx:280-433,661-845`; `app/admin/admin-clients.tsx:198-374,461-469`; `app/admin/admin-knowledge-bank-workspace.tsx:32`; `components/ClientKnowledgeBank.tsx:72`

**Evidence**

- Admin report form and report-detail modals use `fixed inset-0` overlays with no `role="dialog"`, `aria-modal`, or `aria-labelledby` (`admin-reports:281,661`).
- Close buttons are icon-only with no label (`:287,665`); no Escape listener, focus trap, initial focus, or focus return exists.
- The admin client form/profile overlays repeat the pattern (`admin-clients:198,461`).
- Knowledge-bank edit/preview dialogs also lack complete behavior. `ClientKnowledgeBank.tsx:72` has `role="dialog"` and `aria-modal="true"`, but no focus trap, Escape handling, or return target.
- Background content remains focusable and scrollable; there is no `inert` or scroll lock.

**Problem**

Keyboard and screen-reader users can tab into the page behind the modal, lose their place when it closes, and cannot dismiss it with Escape. The modal is visually modal but not programmatically modal.

**Impact**

- Violates WCAG 2.1.1, 2.4.3, and 4.1.2; fails the dialog pattern in WAI-ARIA APG.
- Creates high risk of editing the wrong record or losing unsaved changes in admin workflows.

**Fix**

1. Use a shared `Dialog` component built on native `<dialog>` or a proven primitive (Radix/Headless UI).
2. Set `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`/`aria-describedby`.
3. Move focus to the first meaningful control or the dialog container on open; trap Tab/Shift+Tab.
4. Close on Escape and overlay click (unless destructive/unsaved); restore focus to the trigger.
5. Lock body scroll and make background content inert.
6. Give close buttons an accessible name and a 44×44 px target.
7. For nested report/observation dialogs, avoid stacking; use a single dialog with internal steps.

**Acceptance criteria**

- [ ] Opening a modal announces its title and role; focus is inside.
- [ ] Tab and Shift+Tab cycle within the modal only.
- [ ] Escape closes and returns focus to the opener; overlay click behavior is documented.
- [ ] Background content is not tabbable or scrollable while open.
- [ ] All close buttons have names and adequate targets.
- [ ] `axe` dialog rules pass; manual NVDA/VoiceOver test confirms.

---

### P1-6 — Local-state tabs break deep links, refresh, and Back; report Back arrow points wrong

**Severity:** P1  
**Area:** Client/admin IA, browser history, RTL  
**Affected:** `app/dashboard/client-dashboard.tsx:150,256,259,350-353,514-517`; `app/admin/admin-dashboard-client.tsx:66,101-111,156-197`

**Evidence**

- Client dashboard active tab is local state (`client-dashboard:150`); tab buttons (`:256`) conditionally render panels (`:259`). No URL/query/hash is updated.
- Admin active tab is also local state (`admin-dashboard-client:66`); `activateTab` (`:101-111`) only sets state and scrolls. Tabs (`:156-197`) have no links or `aria-selected`.
- Refreshing either dashboard resets to the overview; Back leaves the dashboard or returns to the previous site rather than the previous tab.
- Opening a report from the overview sets a filter preset in local state, so the destination cannot be shared or restored.
- Client report detail Back uses `ChevronRight` (`:517`). In LTR it points right (forward); in RTL it is rotated 180° and points left (also wrong). The handler only clears `selectedReport`; it does not use history.

**Problem**

Users cannot bookmark, share, refresh, or use Back/Forward reliably. Support cannot link directly to a report or filtered view. The wrong back arrow contradicts the reading direction and the actual navigation.

**Impact**

- Violates WCAG 2.4.3 (focus/history expectations) and 1.3.1 (structure).
- Adds repeated navigation work and breaks admin deep-link workflows.
- Creates a visible RTL/LTR correctness defect.

**Fix**

1. Model dashboard sections as routes (`/dashboard/reports`, `/dashboard/reports/[id]`, `/dashboard/performance`, `/dashboard/documents`; `/admin/reports`, `/admin/clients/[id]`, etc.) or sync state to query parameters with `router.push`/`replace`.
2. Preserve filters in the URL so refresh and Back restore the exact view.
3. Use links with `aria-current="page"` for section navigation, or a proper tablist with arrow-key behavior.
4. On tab/panel change, move focus to the panel heading and announce it.
5. Implement Back with `router.back()` when there is in-app history, otherwise navigate to the list. Use `ChevronLeft` in LTR and `ChevronRight` in RTL (or a logical `ArrowLeft` with correct mirroring).
6. Keep the language switcher from resetting the current route/state.

**Acceptance criteria**

- [ ] Every dashboard tab and report detail has a unique URL.
- [ ] Refresh, bookmark, and direct link open the same view.
- [ ] Back returns to the previous list/filter; Forward returns to the detail.
- [ ] Active tab/link is exposed with `aria-current` or `aria-selected`, and keyboard operation follows the chosen pattern.
- [ ] The Back icon points toward the reading-start direction in both LTR and RTL.
- [ ] Switching language does not reset the current section.

---

### P1-7 — Admin overview cards and charts open differently scoped data

**Severity:** P1  
**Area:** Admin metrics, trust, decision-making  
**Affected:** `app/api/dashboard/route.ts:43,47-59`; `app/admin/admin-dashboard-client.tsx:234-238,248-252,378-385,420-427`

**Evidence**

- `openObservations` counts observations whose **observation** status is `OPEN` (`api/dashboard:43`).
- The “Open Observations” card displays that count but opens reports filtered by **report** status `OPEN` (`admin-dashboard:234-238`), not observations.
- `highRiskItems` counts observations with risk `HIGH`/`CRITICAL` and status `OPEN`/`IN_PROGRESS` (`api/dashboard:47-52`), but the card opens reports filtered by report `riskLevel` (`:248-252`).
- The risk breakdown is also observation-scoped (`api/dashboard:54-59`), while each bar opens a report list filtered by report risk (`admin-dashboard:378-385`).
- The report-status chart is report-scoped and its filter is aligned, which makes the mismatch in the other widgets less obvious.
- No card shows the applied scope or an “as of” timestamp.

**Problem**

The number and the destination describe different entities and sometimes different filter logic. An admin can click “12 open observations” and see a report list whose count is not 12, then act on the wrong records.

**Impact**

- Undermines the credibility of the admin dashboard.
- Can cause missed high-risk observations or unnecessary follow-up on closed reports.
- Violates the consistency/error-prevention heuristic and creates a data-integrity risk.

**Fix**

1. Define one metric contract per card: `{ label, entity, filter, count, destination, lastUpdated }`.
2. Either:
   - make observation metrics open an observation view filtered by observation status/risk, or
   - relabel them as report metrics and compute them from reports.
3. Reuse the same filter object for the count query and the destination query; add a test that count === result length.
4. Show filter chips and result counts at the destination.
5. Add `updatedAt` and revalidate stats after mutations.

**Acceptance criteria**

- [ ] For a seeded fixture, each card’s number equals the number of rows in the destination with the same filter.
- [ ] “Open Observations” opens an observation list filtered to `OPEN`, or is renamed to a report metric.
- [ ] High-risk and risk-breakdown clicks use the same observation scope as their counts.
- [ ] After create/delete/status changes, counts refresh without a manual reload.
- [ ] Metric definitions are documented in code or the admin handbook.

---

### P1-8 — Preset filters are dead ends with misleading empty states

**Severity:** P1  
**Area:** Admin reports and contact requests  
**Affected:** `app/admin/admin-reports.tsx:139-157,163-183,273-277,499-501`; `app/admin/admin-contact-requests.tsx:100-113,149-170`

**Evidence**

- Report filter presets are only displayed as a sentence (`admin-reports:139-157,273-277`). There is no in-view control to change or clear them, and `fetchData` is permanently constrained by the preset (`:163-183`).
- When a preset yields zero rows, the generic `common.noData` message appears (`:499-501`) without explaining that a filter is active or how to remove it.
- Contact requests returns early when `filteredRequests.length === 0` (`admin-contact-requests:149-157`), before rendering the header or active-filter label (`:166-170`). A filtered empty state therefore looks identical to “no requests ever.”
- The only filter control in the requests view is the per-request status select; there is no global filter/clear control.

**Problem**

After clicking an overview card, an admin is trapped in a filtered view with no visible escape. A zero-result page looks like data loss. Users must know to go back to the overview and re-enter the section.

**Impact**

- Violates visibility of system status and user control/freedom.
- Can be interpreted as missing data, prompting unnecessary support or duplicate work.
- Makes the overview shortcuts unsafe to use.

**Fix**

1. Add a filter bar to each view with applied-filter chips, result count, and “Clear all.”
2. Initialize from the preset but allow immediate editing; do not make the preset an immutable prop.
3. Distinguish “no data at all” from “no matches for these filters”; the latter must show the active filters and a clear action.
4. Keep the header and filter summary visible in every empty state.
5. Move filter state to the URL so Back/Forward preserve it.

**Acceptance criteria**

- [ ] Opening a preset shows the applied filter, a result count, and a visible Clear/Change control.
- [ ] Clearing the filter restores the unfiltered list without leaving the section.
- [ ] Filtered-empty and globally-empty states are visually and textually different.
- [ ] The active filter remains visible in the empty state.
- [ ] Result counts are announced through a polite live region.

---

### P1-9 — Admin/client uploads repeat the hidden-input keyboard failure

**Severity:** P1  
**Area:** Uploads, keyboard operability  
**Affected:** `app/admin/admin-reports.tsx:800-806,819-825`; `app/admin/admin-knowledge-bank-explorer.tsx:53`; `app/admin/admin-knowledge-bank-panel.tsx:124`; `app/admin/admin-knowledge-bank-workspace.tsx:32`; `components/ClientProfilePanel.tsx:52`

**Evidence**

- Admin report before/after observation images use `type="file"` with `className="hidden"` inside a non-focusable label (`admin-reports:800-806,819-825`).
- The knowledge-bank explorer, panel, and workspace use the same hidden-input-in-label pattern.
- The client logo upload in `ClientProfilePanel.tsx:52` is also hidden.
- These controls have no keyboard trigger, no focus state, and no announced selected-file/error state.

**Problem**

This is the same failure as P0-3, repeated across admin and client content-management tasks. Staff cannot attach evidence or upload documents without a mouse.

**Impact**

- Blocks evidence upload, knowledge-bank management, and client logo updates for keyboard users.
- Violates WCAG 2.1.1 and 4.1.2.
- Creates inconsistent accessibility between the application form and staff tools.

**Fix**

1. Apply the same focusable-upload pattern as P0-3: visible button/ref trigger or `sr-only` input with `:focus-within` styling.
2. Add contextual names (“Upload before photo for {observation}”, “Upload file to {folder}”, “Upload client logo”).
3. Announce progress, success, filename, and errors; prevent duplicate uploads while busy.
4. Keep the input’s accept/type/size constraints visible.

**Acceptance criteria**

- [ ] All file uploads are reachable by Tab and open with Enter/Space.
- [ ] Each upload has a unique contextual name and a visible focus indicator.
- [ ] Selected filename and upload result are announced.
- [ ] No focusable file input uses `display:none`.
- [ ] Keyboard-only staff can complete report evidence, knowledge-bank upload, and logo change.

---

### P1-10 — Language switching and coverage are incomplete

**Severity:** P1  
**Area:** Localization, persistence, content consistency  
**Affected:** `components/Header.tsx:98`; `components/LanguageSwitcher.tsx`; `app/login/page.tsx`; `app/register/page.tsx`; `context/language-context.tsx:60,68`; `public/locales/en.json`; `public/locales/ar.json`; `app/about/page.tsx:118-126`; `app/admin/admin-clients.tsx:461-469`

**Evidence**

- `LanguageSwitcher` is rendered only in the header. Login and register do not render the header, so users cannot change language on those pages.
- Persistence is `localStorage` only (`language-context:60,68`), so the server cannot read the preference and other tabs do not sync.
- `en.json` has 212 leaves; `ar.json` has 210. Missing: `auth.invalidCredentials`, `auth.serviceUnavailable`.
- About “Our Commitment” and its paragraph are hardcoded English (`about:118-126`), so Arabic mode shows an English block.
- The admin client profile is hardcoded Arabic (`admin-clients:461-469`), so English admins see Arabic headings, buttons, and financial labels.
- The switcher’s `aria-label` is always English (“Switch language”), even in Arabic mode.

**Problem**

Language is a client-side preference rather than a product-wide locale. Auth pages, admin-only content, and error keys break the illusion of a fully localized experience. Users can be stranded in the wrong language at the exact moment they need to sign in.

**Impact**

- Violates WCAG 3.1.2 Language of Parts for mixed-language blocks and 3.1.1 on first paint.
- Reduces comprehension and trust for Arabic and English users.
- Increases support burden for auth and admin tasks.

**Fix**

1. Add the language switcher to the auth layout (or a shared minimal header on login/register).
2. Persist locale in a cookie and `localStorage`; sync across tabs and across sign-in.
3. Move all hardcoded copy into locale files; add the two missing auth keys.
4. Localize the admin client profile based on the UI language, or present bilingual labels where data itself is bilingual.
5. Make the switcher label localized and announce the new language.
6. Add a CI parity test that fails on missing/extra keys.

**Acceptance criteria**

- [ ] Login and register expose a working language switcher.
- [ ] The selected language survives sign-in, reload, and a second tab.
- [ ] `en.json` and `ar.json` have identical key sets; CI fails on drift.
- [ ] About “Our Commitment” is translated in Arabic mode.
- [ ] Admin client profile labels follow the UI language; user-entered Arabic names remain unchanged.
- [ ] No mixed-language block appears without a `lang` attribute or a deliberate bilingual label.

---

### P1-11 — No password recovery; password rule mismatch; server errors not field-mapped

**Severity:** P1  
**Area:** Authentication, error prevention/recovery  
**Affected:** `app/login/page.tsx:200-205`; `app/register/page.tsx:84,95-118,205,231`; `lib/validation.ts:14-15`

**Evidence**

- Login links only to register and home; there is no “Forgot password?” link or reset route.
- Register uses `minLength={8}` for password and confirm password (`:205,231`), while the server schema requires at least 10 (`lib/validation.ts:14-15`).
- A user can satisfy the browser and submit, then receive a server error instead of a field-level explanation.
- Registration errors are shown through `toast.error(data?.error || copy.genericError)` (`:95-118`); duplicate-email and validation messages are not mapped to fields and may be English.
- Password requirements are not shown before submission.

**Problem**

Users who forget a password have no recovery path. Users who choose an 8–9 character password are told by the browser that the form is valid, then rejected by the server. The error appears in a toast, disconnected from the password field.

**Impact**

- Locks users out permanently unless they contact support.
- Causes avoidable registration failures and confusion.
- Violates WCAG 3.3.1/3.3.3 and the error-prevention heuristic.

**Fix**

1. Add “Forgot password?” and implement `/forgot-password` and `/reset-password/[token]` with enumeration-safe responses, expiry, single use, and rate limiting. If email delivery is not available, show a support-contact path instead of a dead end.
2. Set client `minLength={10}` and show “At least 10 characters” before submit.
3. Map server Zod/409/429 errors to localized field errors; place them at the field and in the summary.
4. Add a confirm-password inline mismatch, not a toast.
5. Test 8/9/10-character boundaries.

**Acceptance criteria**

- [ ] An 8- or 9-character password is blocked inline before any request; 10 is accepted.
- [ ] The password field displays the rule before submission.
- [ ] Duplicate email appears inline at the email field in the active language.
- [ ] “Forgot password?” leads to a working recovery flow or a clear support path.
- [ ] Recovery responses do not reveal whether an account exists; tokens expire and are single-use.
- [ ] 400/409/429 responses are field-associated and focus the first error.

---

### P1-12 — Certificate printing is blank because print CSS only reveals the client profile

**Severity:** P1  
**Area:** Print, certificate task completion  
**Affected:** `app/globals.css:165-170`; `app/training/certificate/[code]/page.tsx:134+`

**Evidence**

- Global print CSS hides every element (`body * { visibility: hidden; }`) and reveals only `#client-profile-print` (`:167-169`).
- The certificate page uses `print:` utility classes and `.print:hidden` for the header/buttons, but its certificate section has no `id="client-profile-print"` or other print-document class.
- Therefore browser printing of a certificate produces a blank page, despite the on-screen certificate and PDF download button.

**Problem**

A user who chooses the browser’s Print command instead of the PDF download gets a blank sheet. The page visually offers print-friendly styling, so the failure is surprising.

**Impact**

- Breaks a core certificate-sharing task.
- Creates support requests and distrust of the certificate.
- Affects all non-profile pages, not only certificates.

**Fix**

1. Replace the single-ID print rule with a reusable `.print-document` class or a route-scoped print layout.
2. Add `.print-document`/`id="certificate-print"` to the certificate section and keep it on the client profile.
3. Hide app chrome and non-document actions in print; preserve the certificate border/logo with `print-color-adjust: exact` where needed.
4. Define A4 page size, margins, and page-break rules per document.
5. Add a print-specific test (Chromium PDF generation or manual preview) for both certificate and client profile.

**Acceptance criteria**

- [ ] Browser Print on a certificate shows only the certificate: logo, recipient, course, score, date, code, and signature/branding.
- [ ] The output fits one A4 page (or documented pages) with no clipped content.
- [ ] Client-profile printing still works.
- [ ] No app navigation, buttons, or floating actions appear in print.
- [ ] Chrome/Edge and Firefox print previews are visually verified; PDF download still works.
- [ ] RTL certificate prints with correct alignment.

---

### P1-13 — Auto-rotating hero/partner rail lacks pause and ignores reduced motion

**Severity:** P1  
**Area:** Motion, cognitive/vestibular accessibility  
**Affected:** `app/page.tsx:58-68,121-144`; `app/globals.css:9,129-135`

**Evidence**

- Hero slides auto-advance every 5.2 seconds (`page.tsx:58-68`). The effect checks `prefers-reduced-motion` and returns early, but there is no pause/play control for users who do not set the OS preference.
- The partner rail auto-scrolls every 3.2 seconds (`:121-144`) and does **not** check `prefers-reduced-motion`.
- Global `scroll-behavior: smooth` (`globals.css:9`) is not disabled for reduced motion.
- The reduced-motion CSS only disables three decorative hero animations (`:129-135`); it does not affect JS timers or smooth scrolling.
- Manual previous/next controls exist for partners but do not stop the timer.

**Problem**

Content moves automatically for more than five seconds with no way to pause it. Users with vestibular disorders, attention differences, or reading difficulties cannot stop the motion. The partner rail ignores their system preference entirely.

**Impact**

- Violates WCAG 2.2.2 Pause, Stop, Hide.
- Can trigger discomfort and makes the hero/partner content hard to read.
- Wastes motion budget and battery on mobile.

**Fix**

1. Add a visible pause/play control for the hero and the partner rail; pause on hover and keyboard focus; resume only on explicit action.
2. Respect `prefers-reduced-motion` in all JS timers and in `scroll-behavior`. Use a shared `useReducedMotion` hook that listens for changes.
3. If reduced motion is set, render the first hero slide and a static/manual partner rail.
4. Remember the pause choice for the session.
5. Ensure manual controls are keyboard accessible and labeled.

**Acceptance criteria**

- [ ] With reduced motion enabled, the hero does not auto-advance, the partner rail does not auto-scroll, and smooth scrolling is disabled.
- [ ] A visible Pause button stops both timers; Play resumes them.
- [ ] Hover/focus pauses auto-advance and does not move focus.
- [ ] Manual partner controls work without restarting the timer unexpectedly.
- [ ] No content is available only through auto-rotation.
- [ ] Motion preference changes are honored without a reload.

---

### P1-14 — Floating contact actions overlay modals and use physical positioning

**Severity:** P1  
**Area:** Global overlay, RTL, mobile layout  
**Affected:** `components/FloatingContactButtons.tsx:8`; `app/admin/admin-reports.tsx:281,661`; `app/admin/admin-clients.tsx:199,461`; `components/ClientKnowledgeBank.tsx:72`

**Evidence**

- Floating buttons use `fixed bottom-6 right-4 z-[60]` (`FloatingContactButtons.tsx:8`), above admin modals at `z-50` (`admin-reports:281,661`; `admin-clients:199,461`).
- The buttons are rendered globally in `app/layout.tsx`, so they appear on auth, client, and admin pages, not just marketing pages.
- `right-4` is a physical property; in RTL the actions remain on the right instead of the inline-end (left) side.
- There is no safe-area inset, no hide-on-dialog behavior, and no collision handling with form submit buttons on small screens.

**Problem**

The WhatsApp/Call buttons can sit on top of a modal, form action, or table, intercepting clicks and obscuring content. In Arabic they are on the wrong side. On notched phones they can collide with the home indicator.

**Impact**

- Blocks modal actions and form submission on mobile.
- Breaks RTL layout expectations.
- Creates accidental taps and accessibility-order confusion.

**Fix**

1. Lower the z-index below dialogs or hide the floating group whenever a dialog is open (via a body data attribute or context).
2. Hide it on admin/auth/dashboard routes where it is not a primary action; keep it on public marketing pages.
3. Use logical positioning: `inset-inline-end: 1rem` / `bottom: calc(1.5rem + env(safe-area-inset-bottom))`.
4. Add a collapse/expand control on small screens if two 56 px buttons obscure content.
5. Include it after main content in DOM order and ensure it does not trap focus.
6. Hide it in print.

**Acceptance criteria**

- [ ] Floating buttons never appear above an open modal or intercept its controls.
- [ ] They are hidden on admin/auth screens (or explicitly justified if retained).
- [ ] In Arabic they anchor to the inline-end (left) side; in English, right.
- [ ] At 320 px width they do not cover the primary submit/back action.
- [ ] Safe-area insets are respected on notched devices.
- [ ] They are absent from print output.

---

### P1-15 — Missing route states and silent/stale fetch failures

**Severity:** P1  
**Area:** Resilience, feedback, data trust  
**Affected:** `app/` (no `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`); `app/dashboard/client-dashboard.tsx:156-174`; `app/admin/admin-reports.tsx:158-182`; `app/admin/admin-dashboard-client.tsx:71-87`; `app/training/verify/page.tsx:27-39`

**Evidence**

- No app-level `loading.tsx`, `error.tsx`, `global-error.tsx`, or `not-found.tsx` exists.
- Client reports fetch only updates on `res.ok`; failures are logged and the previous `reports` array remains (`client-dashboard:156-174`). There is no error state or retry.
- Admin reports does the same (`admin-reports:158-182`): non-OK responses leave stale data and no banner.
- Admin dashboard catches stats errors with a toast and leaves zero/old cards (`admin-dashboard:71-87`).
- Certificate verification has `try/finally` but no `catch` (`verify:27-39`); a network rejection leaves the old result visible and shows no error.
- Default Next.js 404/500 screens are unbranded and lack header/navigation.

**Problem**

When the network or API fails, users see old data as if it were current, an empty list as if there were no records, or a generic framework error. There is no retry path and no indication that the data is stale.

**Impact**

- Admins can make decisions on stale reports/metrics.
- Clients may believe reports/documents disappeared.
- Verification failures look like invalid certificates or do nothing.
- Violates visibility of system status and error recovery.

**Fix**

1. Add `app/loading.tsx` with skeleton states, `app/error.tsx` with retry, `app/global-error.tsx`, and a branded `app/not-found.tsx` with navigation/search.
2. Introduce a data hook/state shape `{ data, error, loading, refresh }`; throw on non-OK responses, clear or explicitly mark stale data, and abort stale requests.
3. Show an inline error panel with Retry and a timestamp; do not render old rows as current.
4. Add `aria-busy` and polite status announcements for loading/retry.
5. Add `catch` to certificate verification, clear the previous result, and show a localized “Unable to verify” message.
6. Add route-level tests with intercepted 500/offline responses.

**Acceptance criteria**

- [ ] A 500/offline response on reports, documents, stats, or verification shows a localized inline error with Retry.
- [ ] Stale data is not displayed as current; either cleared or labeled with its last-updated time.
- [ ] Retry recovers without a full page reload.
- [ ] Unknown URLs show a branded 404 with header, home/contact links, and a 404 status.
- [ ] Render errors are caught by an error boundary with a recovery action.
- [ ] Loading states are announced and do not cause layout jumps.

---

### P1-16 — Site-wide text and UI contrast failures

**Severity:** P1  
**Area:** Visual accessibility  
**Affected:** `tailwind.config.js:17,23-29`; `app/page.tsx:424`; `app/login/page.tsx:154,170`; `app/register/page.tsx:191,223`; `app/dashboard/client-dashboard.tsx:380+`; other `text-red-500`/`text-slate-400` usages

**Evidence**

- `accent.500 = #22c55e`; white text on it is **2.28:1** (`page.tsx:424`, `bg-accent-500 text-white`). Normal text requires 4.5:1; even large text requires 3:1.
- `red-500 = #ef4444`; on white it is **3.76:1**, below 4.5:1 for small text (e.g., high-risk labels). `red-600` is 4.83:1 and `red-700` is 6.47:1.
- `slate-400 = #94a3b8`; on white it is **2.56:1** (≈2.5:1 on the `bg-slate-50` inputs). It is used for placeholders (`login:154,170`; `register:191,223`) and for small text/icons. Placeholder text is not exempt from 1.4.3.
- `accent-700 = #15803d` on white is 5.02:1 and is a viable replacement for accent text/CTA backgrounds.
- Icons used as the only affordance (close, eye, chart bars) must meet 3:1 against adjacent colors; slate-400 at 2.56:1 fails.

**Problem**

Low-contrast text and controls are hard to read for low-vision users, in sunlight, and on lower-quality mobile screens. The green CTA is the most prominent action on the home page and has the worst ratio.

**Impact**

- Violates WCAG 1.4.3 Contrast (Minimum) and 1.4.11 Non-text Contrast.
- Reduces conversion on the primary CTA and readability of form hints/errors.
- Creates a site-wide defect that cannot be fixed page by page.

**Fix**

1. Define semantic contrast-safe tokens: `--action-bg`, `--action-text`, `--danger-text`, `--muted-text`, `--placeholder`.
2. Use `accent-700` for white-text CTAs, or use dark text on `accent-500`.
3. Use `red-600`/`red-700` for small danger text; reserve `red-500` for decorative fills with sufficient adjacent contrast.
4. Use `slate-500` (4.76:1) or darker for placeholders and small muted text; reserve `slate-400` for decorative icons that meet 3:1 or have a text label.
5. Add hover/focus/disabled state checks, not just default states.
6. Add axe color-contrast to CI and a manual contrast review for gradients/overlays.

**Acceptance criteria**

- [ ] All normal text is ≥4.5:1; large text ≥3:1; UI components/graphics ≥3:1.
- [ ] The home CTA passes in default, hover, and focus states.
- [ ] Placeholders pass 4.5:1 against their input background.
- [ ] Error/danger text passes 4.5:1 on white and on tinted alert backgrounds.
- [ ] `axe` `color-contrast` reports zero serious violations on all public/auth/dashboard routes.
- [ ] A documented contrast table exists for the design tokens.

---

## 6. P2 — Moderate findings

### P2-1 — Admin overview double-fetches and shows a dead Site Visitors card

**Severity:** P2  
**Area:** Admin performance/consistency  
**Affected:** `app/admin/admin-dashboard-client.tsx:71-99,269-273`

**Evidence**

- `fetchStats` runs on mount (`:92`) and again whenever `activeTab === 'overview'` (`:96-99`), producing two requests on first load.
- The “Site Visitors” card has `onClick: () => undefined` (`:269-273`); it looks actionable but does nothing.
- `totalVisitors` is fetched by the API but has no meaningful destination in the overview.

**Problem**

Duplicate requests waste bandwidth and can produce inconsistent snapshots. A card that looks clickable but is inert erodes trust.

**Fix**

- Fetch once on mount and refresh on explicit invalidation/visibility change.
- Either link the visitors card to a visitor analytics view or render it as a non-interactive metric with a clear “view details” link elsewhere.
- Add a last-updated timestamp and a refresh action.

**Acceptance criteria**

- [ ] First overview load issues one stats request, not two.
- [ ] The Site Visitors card either navigates to a real view or has no interactive affordance.
- [ ] A refresh action updates all cards atomically.
- [ ] No dead `onClick` handlers remain on summary cards.

---

### P2-2 — Activity log columns are mislabeled and expose raw actions

**Severity:** P2  
**Area:** Admin tables/localization  
**Affected:** `app/admin/admin-activity-log.tsx:42,69-74,82-88`

**Evidence**

- The action column uses `t('common.actions')` (“Actions”) instead of “Action.”
- The user column uses `t('admin.clients')` (“Clients”), even though it shows the acting user’s name/email.
- “Details” is hardcoded English.
- `log.action` is rendered as a raw value; dates use `toLocaleString(undefined)` (`:42`), so locale is environment-dependent.
- The table has no `<caption>`.

**Problem**

Column headers misdescribe the data, and raw action codes may be unreadable. Dates do not follow the selected language consistently.

**Fix**

- Add `admin.action`, `admin.user`, `admin.details`, and a localized action-label map.
- Use the app locale for dates.
- Add a `<caption>` or `aria-label` for the table.
- Map raw enums to human-readable, localized labels.

**Acceptance criteria**

- [ ] Headers read Action / User / Details / Date in English and their Arabic equivalents.
- [ ] No raw enum/action code is visible.
- [ ] Dates follow the selected locale.
- [ ] The table has an accessible name/caption.

---

### P2-3 — Admin training mixes hardcoded English labels and raw statuses

**Severity:** P2  
**Area:** Localization/admin forms  
**Affected:** `app/admin/admin-training.tsx:337-343,403-419`

**Evidence**

- Question builder labels are hardcoded English: `Question ${index + 1}`, `Option ${key}`, `Correct answer` (`:337-343`).
- Enrollment status renders `{item.status}` raw (`:419`); “Details” and some table labels are hardcoded.
- The surrounding `copy` object is localized, so the English fragments stand out in Arabic mode.

**Problem**

Arabic admins see a mixed-language form and raw status values, reducing comprehension and increasing data-entry errors.

**Fix**

- Move all labels/statuses into locale files or the existing `copy` map.
- Add a status-label map (`ENROLLED`, `COMPLETED`, etc.).
- Ensure Arabic input labels are paired with appropriate `dir` for mixed course content.

**Acceptance criteria**

- [ ] Arabic mode shows no English UI labels in the training builder except user-entered course content.
- [ ] Statuses are localized, not raw enums.
- [ ] Question/option labels include the number in the active language.
- [ ] `dir` is correct for Arabic and English fields.

---

### P2-4 — About “Our Commitment” is hardcoded English

**Severity:** P2  
**Area:** Localization/content  
**Affected:** `app/about/page.tsx:118-126`

**Evidence**

- The heading “Our Commitment” and the paragraph beneath it are literal English strings, while the rest of the page uses `t('about.*')`.
- In Arabic mode the block remains English with no `lang="en"` attribute.

**Problem**

The page’s mission statement is the only untranslated block, breaking the Arabic reading experience and violating language-of-parts expectations.

**Fix**

- Add `about.commitmentTitle` and `about.commitmentBody` to both locale files.
- Render them through `t()`.
- If intentional bilingual copy is desired, mark the English block with `lang="en"` and a clear label.

**Acceptance criteria**

- [ ] Toggling to Arabic translates both the heading and paragraph.
- [ ] No hardcoded English remains in the About page UI.
- [ ] Any intentional mixed-language content has a `lang` attribute.

---

### P2-5 — Residual English filter labels and inconsistent date locales

**Severity:** P2  
**Area:** Localization/formatting  
**Affected:** `app/dashboard/client-dashboard.tsx:299,311`; `app/admin/admin-reports.tsx:458,672`; `app/admin/admin-activity-log.tsx:42`

**Evidence**

- Client report filters use hardcoded “From” and “To” labels (`client-dashboard:299,311`) inside an otherwise translated filter panel.
- Admin reports use `new Date(report.date).toLocaleDateString()` with no locale (`admin-reports:458,672`), so the format depends on the browser.
- Activity log uses `toLocaleString(undefined, …)` (`admin-activity-log:42`).
- Client dashboard has a locale-aware `formatDate` (`:211-213`), creating inconsistency across surfaces.

**Problem**

Arabic users see English filter labels and dates that may not match the rest of the interface. Ambiguous numeric dates can be misread.

**Fix**

- Move “From”/“To” to locale keys.
- Centralize `formatDate`, `formatDateTime`, and `formatNumber` helpers using the active locale and a documented timezone.
- Use `Intl.DateTimeFormat` with explicit options; avoid `toLocaleDateString()` without a locale.

**Acceptance criteria**

- [ ] Arabic mode shows Arabic filter labels.
- [ ] Dates are consistent across dashboard, admin reports, and activity log.
- [ ] The timezone is documented and stable across server/client.
- [ ] No `undefined` locale or raw `Invalid Date` appears.

---

### P2-6 — Physical left/right utilities break RTL mirroring

**Severity:** P2  
**Area:** RTL layout  
**Affected:** `app/login/page.tsx:145-177`; `app/register/page.tsx:183-234`; `components/FloatingContactButtons.tsx:8`; `app/admin/admin-knowledge-bank-workspace.tsx:32`; `app/admin/admin-activity-log.tsx:71-74`; `app/jobs/page.tsx` arrow icons

**Evidence**

- Auth inputs place leading icons with `left-4` and trailing eye buttons with `right-4`; in RTL these should be inline-start (right) and inline-end (left).
- The floating contact group uses `right-4`.
- Knowledge-bank sidebar uses `border-l` and `text-right`; activity headers use `text-left`. These do not mirror.
- Several arrows use `rotate-180`/`ArrowRight` heuristics rather than direction-aware icons; the dashboard Back arrow is the clearest failure (P1-6).

**Problem**

RTL pages look partially mirrored: leading icons stay on the wrong side, table text aligns inconsistently, and borders appear on the wrong edge.

**Fix**

- Replace physical utilities with logical equivalents: `start-*`/`end-*`, `ps-*`/`pe-*`, `ms-*`/`me-*`, `text-start`/`text-end`, `border-s`/`border-e`.
- Use a direction-aware icon component or explicit `dir` checks for arrows.
- Audit generated CSS for remaining `left-`/`right-` in mirrored components.

**Acceptance criteria**

- [ ] LTR and RTL screenshots show mirrored leading/trailing icons and borders.
- [ ] Table headers align to the reading start in both directions.
- [ ] No content is clipped when `dir="rtl"`.
- [ ] Arrow directions match the reading direction and action semantics.

---

### P2-7 — Active navigation/tab state is visual only; focus styling is inconsistent

**Severity:** P2  
**Area:** Navigation state/focus  
**Affected:** `components/Header.tsx:82-90`; `app/dashboard/client-dashboard.tsx:256`; `app/admin/admin-dashboard-client.tsx:156-166`

**Evidence**

- Active nav links are styled with color only; no `aria-current="page"`.
- Dashboard/admin tabs are plain buttons with no `role="tab"`, `aria-selected`, or tablist keyboard behavior. They look like tabs but behave as independent buttons.
- Some controls have `focus:ring` via `.btn-*`, but icon buttons and text links rely on inconsistent/default outlines.
- Tab changes do not move focus to the new panel heading.

**Problem**

Screen-reader users cannot tell which section is current. Keyboard users get inconsistent focus cues, and tab semantics do not match the visual pattern.

**Fix**

- Add `aria-current="page"` to nav links.
- Either implement a real tablist (`role="tablist"`, `role="tab"`, `aria-selected`, arrow keys) or treat sections as links with `aria-current`.
- Add a consistent `focus-visible` ring token to all interactive elements.
- Move focus to the panel heading on section change.

**Acceptance criteria**

- [ ] Screen reader announces the current nav item/section.
- [ ] Tab/arrow-key behavior matches the chosen pattern.
- [ ] Every interactive element has a visible focus indicator with ≥3:1 contrast.
- [ ] Focus moves to the new panel heading after a section change.

---

### P2-8 — Destructive actions use native `confirm()` with no context or undo

**Severity:** P2  
**Area:** Destructive UX/admin  
**Affected:** `app/admin/admin-clients.tsx:150`; `app/admin/admin-jobs.tsx:264`; `app/admin/admin-knowledge-bank-explorer.tsx:51`; `app/admin/admin-knowledge-bank-panel.tsx:110`; `app/admin/admin-knowledge-bank-workspace.tsx:29-30`; `app/admin/admin-reports.tsx:227,592`

**Evidence**

- Deletions call the browser `confirm()` with a generic message.
- The dialog cannot name the item, show consequences, or offer undo.
- It is unstyled, blocking, and inconsistent with the rest of the design; in some browsers it can be suppressed.
- Reports/observations are permanently deleted after confirmation.

**Problem**

Generic confirms are easy to dismiss without reading and provide no recovery. Users cannot verify they are deleting the intended item.

**Fix**

- Use an accessible confirmation dialog with the item name, consequence, destructive action label, and Cancel as the default.
- For low-risk deletions, offer an undo toast after deletion.
- Localize the copy and focus the Cancel button initially.
- Add a soft-delete/retention policy where appropriate.

**Acceptance criteria**

- [ ] The confirmation names the item and explains the consequence.
- [ ] Cancel is the default focus; Escape cancels.
- [ ] The destructive button is clearly styled and labeled.
- [ ] Low-risk deletes offer undo; high-risk deletes require explicit confirmation.
- [ ] The dialog is keyboard/screen-reader accessible.

---

### P2-9 — Long forms/modals discard unsaved work without warning

**Severity:** P2  
**Area:** Forms/data loss  
**Affected:** `app/admin/admin-reports.tsx:280-433`; `app/admin/admin-clients.tsx:198-374`; `components/ClientProfilePanel.tsx:52`; knowledge-bank edit modal

**Evidence**

- Closing a report/client form via X or overlay instantly unmounts it; no dirty-state check or draft exists.
- The report form contains many fields and observation points; accidental closure loses substantial work.
- The client profile edit form and knowledge-bank edit dialog have the same behavior.
- `beforeunload` is not used, and route changes inside the app do not warn.

**Problem**

A stray click or Escape can destroy several minutes of data entry. Users may not notice until they reopen the form.

**Fix**

- Track dirty state and confirm before closing/navigating.
- Preserve drafts in session storage for long forms.
- Disable close while saving; show a saving state.
- Use the same accessible dialog pattern from P1-5 for the discard confirmation.

**Acceptance criteria**

- [ ] Editing a field and closing prompts “Discard changes?” with Stay/Discard.
- [ ] Staying preserves all values and focus.
- [ ] Successful save clears the dirty state and closes without a prompt.
- [ ] Drafts survive an accidental refresh for long forms (if implemented).
- [ ] The prompt is keyboard/screen-reader accessible.

---

### P2-10 — Required/optional conventions and field help are inconsistent

**Severity:** P2  
**Area:** Forms/content design  
**Affected:** `app/contact/page.tsx`; `app/jobs/page.tsx:387-447`; `app/login/page.tsx`; `app/register/page.tsx`; admin forms

**Evidence**

- Contact and jobs use `*` with no legend; login/register mark nothing even though all fields are required.
- Admin forms sometimes append `*` inside the label string, sometimes rely on the native attribute.
- Password rules, file constraints, and phone format are not consistently visible before submission.
- Optional fields are not marked as optional.

**Problem**

Users cannot predict which fields are required or what format is expected, leading to avoidable errors.

**Fix**

- Adopt one convention: mark required fields with “(required)” text, or mark optional fields and explain the marker in a legend.
- Show format/help text near the field and connect it with `aria-describedby`.
- Use `aria-required`/native `required` consistently.
- Centralize this in the shared `FormField` component.

**Acceptance criteria**

- [ ] All forms use the same required/optional convention.
- [ ] Screen readers announce required state and help text.
- [ ] Password/file/phone constraints are visible before submit.
- [ ] No field relies on color or `*` alone.

---

### P2-11 — Footer legal links are dead and new-tab links are not indicated

**Severity:** P2  
**Area:** Navigation/trust  
**Affected:** `components/Footer.tsx:27,36,114-118`

**Evidence**

- Privacy Policy and Terms of Service point to `href="#"` (`:114-118`), so clicking them jumps to the top or does nothing.
- LinkedIn and WhatsApp links open in a new tab (`target="_blank"`) with no “opens in a new tab” indication in the accessible name.
- The legal links are plain text in the footer, with no route or modal.

**Problem**

Users cannot access privacy/terms information, which is a trust and compliance gap. New-tab behavior is unexpected for keyboard/screen-reader users.

**Fix**

- Create `/privacy` and `/terms` pages or link to the canonical documents.
- Remove `href="#"` placeholders.
- Add visually hidden “(opens in a new tab)” text or an icon with an accessible label to external links, and keep `rel="noreferrer"`.
- Ensure the footer links are localized.

**Acceptance criteria**

- [ ] Privacy and Terms navigate to real content.
- [ ] No `href="#"` remains in the footer.
- [ ] External links announce that they open in a new tab.
- [ ] Footer links are localized and keyboard accessible.

---

## 7. Remediation plan

### Phase 0 — Stop the bleeding (1–2 days)

- Fix P0-3 resume upload with a focusable trigger.
- Add `htmlFor`/`id` to login, register, contact, jobs, and verify forms (P0-2), even before the shared component is finished.
- Add a temporary server-side English fallback so raw keys never reach users; then complete P0-1.

**Exit:** Keyboard user can apply; no raw translation keys; auth/contact fields have names.

### Phase 1 — Foundation (week 1)

- Implement server-resolved locale, document `lang/dir`, and locale persistence (P0-1, P1-10).
- Add skip link, `<main>`, route metadata/focus, and mobile-nav semantics (P1-1, P1-2).
- Add error summary/field-error primitives and apply to all public/auth forms (P1-3).
- Fix all file uploads (P0-3, P1-9).
- Add shared `FormField` and `Dialog` primitives.

**Exit:** P0 closed; core public/auth flows pass keyboard + axe smoke tests in English and Arabic.

### Phase 2 — Task flows and admin trust (weeks 2–3)

- Move dashboard/admin sections to URL-addressable routes; fix Back behavior and icons (P1-6).
- Align admin metric scopes and add filter bars/empty states (P1-7, P1-8).
- Implement dialog focus/Escape/scroll lock everywhere (P1-5).
- Fix icon names, click-only cards, target sizes, and chart controls (P1-4).
- Add route loading/error/404 states and data-fetch error handling (P1-15).
- Fix certificate print CSS (P1-12).

**Exit:** Admin can navigate, filter, and act without dead ends; failures are recoverable; certificate prints.

### Phase 3 — Accessibility and polish (week 4)

- Fix contrast tokens and all failing text/UI pairs (P1-16).
- Add pause/reduced-motion behavior (P1-13).
- Fix floating overlay and RTL physical utilities (P1-14, P2-6).
- Complete auth recovery and validation alignment (P1-11).
- Close P2 localization, table, destructive-action, unsaved-change, and footer items.

**Exit:** P1 closed; P2 scheduled or closed; WCAG 2.2 AA manual + automated verification complete.

### Suggested ownership

| Workstream | Owner |
|---|---|
| Locale/server rendering | Frontend + backend |
| Form primitives/validation | Frontend |
| Dialog/navigation/IA | Frontend |
| Admin data contracts | Backend + frontend |
| Print/PDF | Frontend |
| Accessibility verification | QA/accessibility specialist |

---

## 8. Target information architecture

### Public

```
/                       Home (value proposition, services, proof, CTA)
/about                  About, values, commitment
/services               Service detail and outcomes
/training               Course catalog
/training/[slug]        Course detail/enrollment
/training/verify        Certificate verification
/jobs                   Open roles + application
/contact                Contact form + direct channels
/login                  Sign in + recovery
/register               Create account
/privacy, /terms        Legal
```

Public navigation should remain 5–7 items. The language switcher belongs in the header and on auth screens. The primary CTA should be one consistent action (“Book a consultation” / “اتصل بنا”) across pages.

### Client portal

```
/dashboard                      Overview
/dashboard/reports              Report list + filters (URL state)
/dashboard/reports/[id]         Report detail + observations + response
/dashboard/performance          Trends/metrics
/dashboard/documents            Knowledge bank/files
/dashboard/profile              Profile/logo
```

Use a persistent section nav with `aria-current`. Report detail is a route, not local state. Back returns to the filtered list.

### Admin portal

```
/admin                          Overview (scoped metrics + last updated)
/admin/reports                  Reports list + filters
/admin/reports/[id]             Report detail/observations
/admin/clients                  Client list
/admin/clients/[id]             Client profile/financials
/admin/requests                 Contact requests + filters
/admin/knowledge                Knowledge bank
/admin/training                 Courses/enrollments
/admin/jobs                     Jobs/applications
/admin/activity                 Audit log
```

Each overview card must link to the exact filtered destination and show the same count. Admin tabs should be links, not local-state buttons. The overview should expose a “last updated” timestamp and a refresh action.

### Content hierarchy rules

- One H1 per page, matching the page title.
- H2 for major sections; H3 for cards/subsections; no skipped levels.
- Primary action appears once per view; secondary actions are visually subordinate.
- Empty states distinguish “no data” from “no matches” and always offer the next action.
- Errors appear next to the cause and in a summary; success is persistent enough to act on.

---

## 9. RTL and bilingual QA checklist

### Document and content

- [ ] `<html lang="ar" dir="rtl">` is server-rendered for Arabic routes/cookies.
- [ ] English phrases inside Arabic pages have `lang="en"`; Arabic phrases inside English pages have `lang="ar"`.
- [ ] Page titles, meta descriptions, and Open Graph locale match the active language.
- [ ] Numbers, dates, currencies, and phone numbers use the intended locale and bidi isolation.
- [ ] No raw translation keys appear in server or client HTML.

### Layout

- [ ] Leading icons are on the inline-start side; trailing icons on inline-end.
- [ ] `ps/pe`, `ms/me`, `start/end`, `text-start/end`, `border-s/e` replace physical utilities.
- [ ] Sidebars, drawers, and modals mirror correctly.
- [ ] Tables align to the reading start; numeric columns remain readable.
- [ ] Charts and progress bars grow from the correct side or remain direction-neutral by design.
- [ ] Floating actions use `inset-inline-end` and safe-area insets.

### Navigation and controls

- [ ] Back/forward arrows point in the reading direction.
- [ ] Carousels and sliders support RTL keyboard/pointer behavior.
- [ ] Form fields keep labels and errors adjacent in both directions.
- [ ] File upload triggers and icons mirror correctly.
- [ ] Focus order matches visual order.
- [ ] No horizontal scroll at 320 px in either direction.

### Content quality

- [ ] Arabic translations are reviewed by a native speaker, not only key-matched.
- [ ] English and Arabic key sets are identical in CI.
- [ ] Hardcoded English/Arabic strings are eliminated from components.
- [ ] Course/client names that are inherently bilingual are displayed with the correct language attribute.
- [ ] Print/PDF output mirrors correctly.

---

## 10. Verification and test plan

### Automated

1. **axe-core** on every route, both languages, desktop and mobile viewports. Fail on serious/critical.
2. **HTML validation** and a custom scan for raw translation keys, `href="#"`, missing `lang`, duplicate IDs, and unlabeled form controls.
3. **Translation parity test** comparing flattened key sets.
4. **Playwright keyboard tests**:
   - skip link;
   - mobile menu open/Escape/return;
   - resume/admin upload;
   - dialog focus trap/Escape/return;
   - report card Enter/Space;
   - tab/deep-link/Back behavior;
   - certificate print PDF smoke test.
5. **Route-state tests** with intercepted 500/offline responses and unknown URLs.
6. **Contrast token test** for the documented color pairs.

### Manual

1. **Keyboard-only**: complete contact, job application, registration, login, report view/response, admin report creation, client profile update, certificate print.
2. **Screen reader**: NVDA + Chrome/Firefox (Windows), VoiceOver + Safari (macOS/iOS). Check names, landmarks, dialog announcements, error summary, live regions, table headers, and language switching.
3. **Zoom/reflow**: 200% and 400% at 320 px; no loss of content or horizontal scrolling except data tables.
4. **RTL visual review**: English vs Arabic screenshots of header, forms, dashboards, tables, modals, certificate, and print.
5. **Motion**: OS reduced-motion on/off; pause controls; no auto-advance after pause.
6. **Touch**: 320–430 px widths; target sizes; floating buttons vs modals/forms.
7. **Print**: Chrome/Edge/Firefox preview for certificate and client profile; check page breaks and colors.
8. **Content**: native Arabic review of all public/auth/admin strings, especially errors and financial labels.

### Definition of done for WCAG 2.2 AA

- [ ] Zero open P0/P1 accessibility findings.
- [ ] axe serious/critical = 0 on all routes in both languages.
- [ ] All core tasks completed keyboard-only and with a screen reader.
- [ ] All text/UI contrast checks pass.
- [ ] All images have appropriate alt text; decorative images are ignored.
- [ ] All forms have names, instructions, errors, and status messages.
- [ ] All dialogs, menus, tabs, and tables follow their ARIA patterns.
- [ ] Reduced motion and pause controls work.
- [ ] Document language/direction are correct on first paint and after switching.
- [ ] Manual test evidence is attached to the release ticket.

---

## Appendix A — Route and landmark matrix

| Route | `<main>` | Unique title | Skip link | H1 | Notes |
|---|---:|---:|---:|---:|---|
| `/` | No | No | No | Yes | Raw keys in SSR; hero auto-rotate |
| `/about` | No | No | No | Yes | Hardcoded commitment block |
| `/services` | No | No | No | Yes | — |
| `/training` | No | No | No | Yes | — |
| `/training/[slug]` | Yes | No | No | Yes | — |
| `/training/verify` | Yes | No | No | Yes | No catch; unlabeled input |
| `/training/certificate/[code]` | Yes | No | No | Yes | Print blank |
| `/training/profile` | Yes | No | No | Yes | — |
| `/jobs` | No | No | No | Yes | Hidden required resume |
| `/contact` | No | No | No | Yes | Unassociated labels; toast-only |
| `/login` | No | No | No | Yes | No recovery/switcher |
| `/register` | No | No | No | Yes | 8 vs 10 rule |
| `/dashboard` | Yes | No | No | Yes | Local tabs; wrong Back arrow |
| `/admin` | Yes | No | No | Yes | Local tabs; mismatched metrics |

## Appendix B — Translation parity

| File | Leaf keys |
|---|---:|
| `public/locales/en.json` | 212 |
| `public/locales/ar.json` | 210 |
| Missing in Arabic | `auth.invalidCredentials`, `auth.serviceUnavailable` |
| Extra in Arabic | None |

## Appendix C — Contrast evidence

| Token/use | Ratio on white | Requirement | Result |
|---|---:|---:|---|
| `accent-500` (#22c55e) against white | 2.28:1 | 4.5:1 normal / 3:1 large | Fail |
| `accent-700` (#15803d) against white | 5.02:1 | 4.5:1 | Pass (recommended) |
| `red-500` (#ef4444) against white | 3.76:1 | 4.5:1 | Fail for small text |
| `red-600` (#dc2626) against white | 4.83:1 | 4.5:1 | Pass |
| `slate-400` (#94a3b8) against white | 2.56:1 | 4.5:1 text / 3:1 UI | Fail |
| `slate-500` (#64748b) + white text | 4.76:1 | 4.5:1 | Pass |
| `primary-500` (#1e40af) + white text | 8.72:1 | 4.5:1 | Pass |

## Appendix D — Evidence commands used

```powershell
# Raw keys and document language in prerendered HTML
Select-String -Path .next/server/app/index.html -Pattern 'home.heroTitle|lang="en"|dir="ltr"'

# Missing form associations
Get-ChildItem app,components -Recurse -Filter *.tsx | Select-String -Pattern 'htmlFor'

# ARIA/live-region inventory
Get-ChildItem app,components -Recurse -Filter *.tsx |
  Select-String -Pattern 'aria-current|aria-expanded|aria-controls|aria-selected|aria-live|role="dialog"|aria-modal'

# Route-state inventory
Get-ChildItem app -Recurse -Include loading.tsx,error.tsx,global-error.tsx,not-found.tsx

# Locale parity
node -e "const fs=require('fs');const en=JSON.parse(fs.readFileSync('public/locales/en.json'));const ar=JSON.parse(fs.readFileSync('public/locales/ar.json'));/* flatten and diff */"

# Contrast
node -e "function L(h){...} function cr(a,b){...}; console.log(cr('22c55e','ffffff'))"
```

---

**Report owner:** ArchitectUX  
**Review status:** Ready for triage  
**Application code changes:** None. This audit is read-only.
