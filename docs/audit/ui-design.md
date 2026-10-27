# QHSSE Consultant — UI Design System Audit

**Scope:** Next.js 16.2.10 / React 18.3 / Tailwind CSS 3.4.15 portal at `D:\Apps\safety consulataint`  
**Mode:** Read-only static audit. No application code was modified and no production build was run.  
**Date:** 27 October 2026  
**Evidence:** source review, Tailwind CLI compilation checks in a temp directory, WCAG 2.1 contrast calculation, and SHA-256 asset inspection.

---

## 0. Executive verdict

**Overall: 4 / 10 — coherent marketing shell, but not yet a production-ready design system.**

The public pages share a recognizable navy/white consultancy look, a consistent container width, Lucide iconography, and a sensible bilingual content structure. Beneath that surface, the system has four structural problems:

1. **The token layer is incomplete and partly invalid.** `primary-950` does not exist, and classes such as `bg-white/92` and `text-[#8B4D00]/72` generate no CSS at all. Two of the most important surfaces — the auth card and the hero scrim — therefore do not render as designed.
2. **There are two brands.** Marketing is navy/blue; the auth screens introduce an unrelated indigo (`#3a4fc4`), a 34px card radius, a 190px stacked logo, and a lime/gold background treatment. Admin and service surfaces add a rainbow of decorative gradients.
3. **Product UI has no component system.** Tables, tabs, badges, forms, empty states, and modals are re-invented per page. Only eight component classes exist in `globals.css`, and most pages bypass them.
4. **RTL, responsive, print, and accessibility are treated as afterthoughts.** Physical CSS properties break Arabic mirroring; tab bars overflow on phones; the global print rule hides the training certificate; several text/background pairs fail WCAG AA.

The marketing pages are presentable at a glance. The portal, auth, admin, RTL, and print experiences are not yet at the same level.

### Scorecard

| Dimension | Score | Summary |
|---|---:|---|
| Brand expression | 5/10 | Logo colors are distinctive, but the logo asset is a 926 KB raster and the auth/admin surfaces ignore the palette. |
| Color and contrast | 3/10 | Multiple undefined classes; 2.28:1, 1.98:1, 1.47:1, 3.65:1 failures. |
| Typography | 4/10 | Double-loaded fonts; no type scale; 16px/36px body copy; arbitrary sizes and tracking. |
| Spacing and layout | 5/10 | Good container primitive, but header misalignment and section rhythm drift (64/80/96/112px mixed). |
| Component consistency | 4/10 | Buttons/cards exist; inputs, badges, tables, tabs, modals, and states are inconsistent. |
| RTL | 3/10 | Physical `left/right/pl/pr/border-l`; direction is applied after hydration. |
| Responsive | 4/10 | Tab bars overflow at 320–390px; jobs sticky form is taller than the viewport. |
| State coverage | 3/10 | Spinner-only loading; fetch errors are reported as empty data; no retry in most places. |
| Accessibility | 3/10 | Contrast failures, clickable divs, 28px icon buttons, missing labels/ARIA/focus management. |
| Print | 2/10 | Global `visibility:hidden` hides the certificate; invalid `print:container-auto`. |

**Ship readiness:** do not launch publicly until all four P0 fixes are complete. P1 fixes should land in the same sprint; P2 items are the design-system cleanup that prevents the same defects from returning.

### Severity legend

- **P0** — visually broken or inaccessible on a primary user journey; fix before launch.
- **P1** — visible inconsistency or systemic gap; fix in the next sprint.
- **P2** — system polish and maintainability; schedule with the token migration.

---

## 1. What the brand actually is

The real logo is a brown tree with lime leaves and a wordmark. All three files in `public/brand/` are byte-identical:

```
qhsse-logo-header.svg   926,632 bytes
qhsse-logo-mark.svg     926,632 bytes
qhsse-logo-stacked.svg  926,632 bytes
SHA-256: D4DC78C8C1D4D9C4728C33A8B3A3C9FC808E5551A922624660AEFDEB3F8206CE
```

Each “SVG” embeds the same 1024×1024 PNG twice. The `header`, `mark`, and `stacked` variants therefore render the same stacked raster, and the header renders it at 52–60px, where the wordmark is illegible.

The palette implied by the mark is:

- **Structural navy** — trust, authority, the consultancy frame.
- **Brand gold / brown** `#8B4D00` — the signature accent, the tree trunk, premium/editorial moments.
- **Brand lime** `#97D700` — the leaf highlight, used sparingly with navy text.
- **White / slate neutrals** — the majority of the surface.

The current system instead treats `primary` (blue), `accent` (green), and seven decorative gradients as co-equal brands. That is why the admin dashboard, service cards, and auth screens feel like different products.

---

## 2. Design system specification

### 2.1 Color tokens

Adopt the existing `primary` scale, add the missing `950`, and separate brand signature colors from semantic status colors. Keep the palette to **60% neutral / 30% navy / 10% gold+lime**.

```js
// tailwind.config.js — target color layer
colors: {
  primary: {
    50:  '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#1e40af', // action
    600: '#1e3a8a', // hover
    700: '#1e3068',
    800: '#172554',
    900: '#0f172a',
    950: '#0b1222', // NEW — scrims, hero overlays, deepest ink
  },
  brand: {
    gold:      '#8B4D00',
    'gold-600':'#6B3900',
    'gold-100':'#F6EBDD',
    lime:      '#97D700',
    'lime-600':'#7FB800',
    'lime-100':'#F3FAD9',
  },
  success: {
    50:'#ecfdf5', 100:'#d1fae5', 600:'#059669', 700:'#047857', 800:'#065f46',
  },
  warning: {
    50:'#fffbeb', 100:'#fef3c7', 700:'#b45309', 800:'#92400e',
  },
  danger: {
    50:'#fef2f2', 100:'#fee2e2', 600:'#dc2626', 700:'#b91c1c', 800:'#991b1b',
  },
  info: {
    50:'#eff6ff', 100:'#dbeafe', 700:'#1d4ed8', 800:'#1e40af',
  },
  surface: {
    page:   '#f8fafc',
    card:   '#ffffff',
    sunken: '#f1f5f9',
    border: '#e2e8f0',
  },
  ink: {
    900:'#0f172a', 800:'#1e293b', 700:'#334155',
    600:'#475569', 500:'#64748b', 400:'#94a3b8',
  },
}
```

#### Color usage contract

| Role | Token | Hex | On white | White on it | Use |
|---|---|---|---:|---:|---|
| Primary action | `primary-500` | `#1e40af` | 8.72 | 8.72 | Default filled button, links on white. |
| Primary hover | `primary-600` | `#1e3a8a` | 10.36 | 10.36 | Hover/active only. |
| Deep surface | `primary-900` | `#0f172a` | 17.85 | 17.85 | Footer, dark sections. |
| Deepest scrim | `primary-950` | `#0b1222` | 18.69 | 18.69 | Hero/header overlays. |
| Signature | `brand-gold` | `#8B4D00` | 6.65 | 6.65 | One high-emphasis conversion CTA per page; editorial labels. |
| Signature hover | `brand-gold-600` | `#6B3900` | 8.89 | 8.89 | Hover only. |
| Highlight | `brand-lime` | `#97D700` | 1.74 | 1.74 | **Only with navy text**; never white text. |
| Success | `success-700` | `#047857` | 5.21 | 5.21 | Success text/button. |
| Danger | `danger-600` | `#dc2626` | 4.83 | 4.83 | Error text, destructive icons. |
| Danger hover | `danger-700` | `#b91c1c` | 6.47 | 6.47 | Hover/active. |
| Warning text | `warning-800` | `#92400e` | 6.84 | 6.84 | Warning badges/text. |
| Body text | `ink-600` | `#475569` | 7.58 | — | Secondary body. |
| Muted text | `ink-500` | `#64748b` | 4.76 | — | Captions only; minimum accessible neutral. |
| Decorative | `ink-400` | `#94a3b8` | 2.56 | — | Icons that duplicate text; never body copy. |

**Rules**

1. `accent` is retired as a brand color. Rename it to `success`; green is only a status color.
2. `brand-lime` is a highlight, not a button fill with white text. Use `bg-brand-lime text-primary-950` (10.71:1).
3. `brand-gold` on navy is 2.69:1 — never use gold text on dark surfaces. Gold is a **fill** with white text (6.65:1).
4. Use one neutral ramp. The codebase mixes `gray-*` and `slate-*`; pick `slate` (`ink` alias) and migrate.
5. No decorative rainbow gradients. Service/category color should be limited to three semantic hues plus neutral; admin KPI icons should use navy, gold, success, warning, danger only.

### 2.2 Typography

**Current defects:** `globals.css:1` imports Inter + Cairo from Google Fonts, while `app/layout.tsx:8-18` also loads them through `next/font`. `tailwind.config.js:36-39` points at literal `'Inter', 'Cairo'`, so the `next/font` CSS variables are never used. Arabic body text therefore picks Inter before Cairo, and the app makes two font requests for the same families.

**Target loading path:** one path only — `next/font` variables in `tailwind.config.js`. Remove the `@import`.

```js
fontFamily: {
  sans:   ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  arabic: ['var(--font-cairo)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
},
fontSize: {
  eyebrow: ['0.75rem',  { lineHeight: '1.4',  letterSpacing: '0.18em', fontWeight: '700' }],
  caption: ['0.75rem',  { lineHeight: '1.5' }],
  sm:      ['0.875rem', { lineHeight: '1.5' }],
  base:    ['1rem',     { lineHeight: '1.6' }],
  lg:      ['1.125rem', { lineHeight: '1.7' }],
  xl:      ['1.25rem',  { lineHeight: '1.5' }],
  '2xl':   ['1.5rem',   { lineHeight: '1.35' }],
  '3xl':   ['1.875rem', { lineHeight: '1.25' }],
  '4xl':   ['2.25rem',  { lineHeight: '1.15', letterSpacing: '-0.02em' }],
  '5xl':   ['3rem',     { lineHeight: '1.1',  letterSpacing: '-0.02em' }],
  display: ['clamp(2.5rem, 6vw, 4rem)', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
},
```

#### Type scale and usage

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `text-display` | 40–64 / 1.05 | 700 | Home hero only. |
| `text-5xl` | 48 / 1.1 | 700 | Page hero on desktop. |
| `text-4xl` | 36 / 1.15 | 700 | Section hero, certificate title. |
| `text-3xl` | 30 / 1.25 | 700 | Section title. |
| `text-2xl` | 24 / 1.35 | 700 | Card/detail title. |
| `text-xl` | 20 / 1.5 | 600 | Subsection, table title. |
| `text-lg` | 18 / 1.7 | 400 | Lead paragraph. |
| `text-base` | 16 / 1.6 | 400 | Body copy. |
| `text-sm` | 14 / 1.5 | 400/500 | UI labels, table cells. |
| `text-caption` | 12 / 1.5 | 500 | Metadata, helper text. |
| `text-eyebrow` | 12 / 1.4 / 0.18em | 700 | Section kicker, uppercase. |

**Rules**

- Headings: `font-bold`, `text-balance`, `max-w-[20ch]`–`max-w-[28ch]` for display.
- Body: `max-w-prose` (65ch), `text-pretty`; never `leading-9` at 16px (currently `app/training/[slug]/page.tsx:228`).
- Arabic: `[dir="rtl"] body { line-height: 1.8; letter-spacing: 0; }`; Arabic headings should not use negative tracking.
- Eyebrow tracking: `0.18em`, not `0.55em` (`app/login/page.tsx:134`, `app/register/page.tsx:147`).
- Use `font-semibold` (600) for buttons/labels; reserve 700 for headings and 800 for the logo/display only.
- Do not use `font-black`/900. The current font request loads 300–900, but only 400/500/600/700 are needed.

### 2.3 Spacing, layout, radius, elevation, motion

**Spacing base:** 4px. Use `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 112`.

| Primitive | Mobile | Desktop | Use |
|---|---:|---:|---|
| Section | 64 (`py-16`) | 96 (`py-24`) | Default marketing section. |
| Section tight | 48 (`py-12`) | 64 (`py-16`) | Stats, logo strip, CTA band. |
| Hero | 112 (`pt-28`) | 128 (`pt-32`) | Page hero below 72/84px header. |
| Card padding | 20 (`p-5`) | 24 (`p-6`) | Default card. |
| Card padding compact | 16 (`p-4`) | 16 | Dense lists, tables. |
| Card padding spacious | 24 (`p-6`) | 32 (`p-8`) | Auth, feature panels. |
| Stack | 8/12/16/24 | same | Form fields, card content. |
| Grid gap | 16/24 | 24/32 | Card grids. |

**Container:** `.container-custom` stays `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. The header must use the same container, not `w-full px-10`.

**Layout primitives**

```css
.section       { @apply py-16 md:py-24; }
.section-tight { @apply py-12 md:py-16; }
.section-muted { @apply bg-slate-50; }
.stack-4       { @apply space-y-4; }
.stack-6       { @apply space-y-6; }
```

**Radius scale:** `rounded-lg` 8 (small controls), `rounded-xl` 12 (inputs/buttons), `rounded-2xl` 16 (cards), `rounded-3xl` 24 (feature panels/modals), `rounded-full` pills/avatars. Deprecate `rounded-[22px]`, `rounded-[32px]`, `rounded-[34px]`, `rounded-[36px]`, and `rounded-[1.55rem]`.

**Elevation:** border-first. `shadow-sm` for cards, `shadow-md` on interactive hover, `shadow-xl` for modals/popovers. Replace arbitrary shadows such as `shadow-[0_32px_100px_rgba(15,23,42,0.14)]` with a token.

**Motion:** 150ms color, 200ms transform, 250–300ms modal/accordion. Use `ease-out`. Wrap non-essential motion in `motion-reduce:transition-none`; disable `scroll-behavior: smooth` under `prefers-reduced-motion`.

**Z-index scale:** header 40, floating contact 50, mobile menu 50, modal 60, preview 70, toast 80. Replace arbitrary `z-[60]`, `z-[70]` with named tokens.

**Breakpoints:** Tailwind defaults are sufficient. Test at 320, 360, 390, 768, 1024, 1280, 1440. Add `min-h-dvh` instead of `min-h-screen` on auth/dashboard shells for mobile browser chrome.

### 2.4 Component contracts and variants

#### Buttons

```css
.btn {
  @apply inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5
         text-sm font-semibold transition-colors duration-150
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
         focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60;
}
.btn-primary   { @apply bg-primary-500 text-white hover:bg-primary-600; }        /* 8.72:1 */
.btn-signature { @apply bg-brand-gold text-white hover:bg-brand-gold-600; }      /* 6.65:1 */
.btn-secondary { @apply border-2 border-primary-500 bg-white text-primary-600
                        hover:bg-primary-50; }                                  /* 10.36:1 */
.btn-ghost     { @apply bg-transparent text-ink-700 hover:bg-slate-100; }
.btn-danger    { @apply bg-danger-700 text-white hover:bg-danger-800; }          /* 6.47:1 */
.btn-on-dark   { @apply bg-white text-primary-700 hover:bg-slate-100; }          /* 10.26:1 */
.btn-lime      { @apply bg-brand-lime text-primary-950 hover:bg-brand-lime-600; }/* 10.71:1 */
```

| Variant | Size | Height | Padding | Text | Use |
|---|---|---:|---|---|---|
| `sm` | compact | 36px | `px-3` | 14px | Table actions, toolbar. |
| `md` | default | 44px | `px-5` | 14px | Most actions. |
| `lg` | hero | 52px | `px-7` | 16px | Hero/final CTA. |
| icon | square | 44×44 | — | — | Icon-only; always `aria-label`. |

**Hierarchy rule:** one primary/signature filled button per viewport. Secondary actions are outline or ghost. Never place two filled buttons side by side. On dark hero surfaces use `.btn-on-dark` or `.btn-lime`; do not use navy-filled buttons on navy.

#### Inputs and fields

```css
.input-field {
  @apply min-h-11 w-full rounded-xl border border-slate-500 bg-white px-3.5 py-2.5
         text-base text-ink-900 shadow-sm transition-colors
         placeholder:text-ink-500 hover:border-slate-600
         focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-500/15
         disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-ink-500;
}
.input-field[aria-invalid="true"] {
  @apply border-danger-700 ring-4 ring-danger-600/15;
}
.label-field { @apply mb-1.5 block text-sm font-semibold text-ink-800; }
.field-hint  { @apply mt-1.5 text-sm text-ink-500; }
.field-error { @apply mt-1.5 flex items-center gap-1.5 text-sm font-medium text-danger-700; }
```

Requirements:

- Every input has a visible `<label htmlFor>`; placeholders are examples, never labels.
- Required fields: visible `*` plus `<span className="sr-only">required</span>`; optional fields are marked “optional”, not every field marked required.
- Error: `aria-invalid`, `aria-describedby`, inline `.field-error` with `role="alert"`; do not rely on toast only.
- Autocomplete: `name`, `email`, `tel`, `current-password`, `new-password`, `organization`, `street-address`.
- Icon slots use logical properties: `start-4`, `end-4`, `ps-12`, `pe-12`.
- Selects: custom chevron, same height/border/focus. Dates: keep native picker, add `color-scheme` for dark mode if added later.
- Textareas: `min-h-28`, `resize-y`, no horizontal resize.
- File upload: visible dropzone with keyboard-focusable label; show file name, size, remove action.

#### Cards

| Variant | Class | Behavior |
|---|---|---|
| Base | `.card` = `rounded-2xl border border-slate-200 bg-white p-6 shadow-sm` | Static; **no hover transform**. |
| Interactive | `.card-interactive` | `hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2`; only for links/buttons. |
| Stat | `.card-stat` | 20–24px padding, label/caption, value 30px/700, icon 40px. |
| Table | `.card-table` | `p-0 overflow-hidden`; table owns its padding. |
| Form | `.card-form` | `p-6 md:p-8`, section spacing 24. |
| Modal | `.modal-panel` | `rounded-3xl shadow-xl max-h-[90dvh] overflow-y-auto`. |

Do not put `.card` plus a table. That is why admin tables have a 24px inset and a doubled scroll container.

#### Badges

`badge` = `inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold`. Always include a text label; color is secondary. Use a 6px dot for status/risk.

| Family | Low / info | Medium / warning | High | Critical / danger |
|---|---|---|---|---|
| Risk | `bg-success-100 text-success-800` | `bg-warning-100 text-warning-800` | `bg-orange-100 text-orange-800` | `bg-danger-100 text-danger-800` |
| Status | OPEN `bg-info-100 text-info-800` | IN_PROGRESS `bg-violet-100 text-violet-800` | — | CLOSED `bg-slate-100 text-ink-700` |
| Category | SAFETY `bg-info-100 text-info-800` | FOOD `bg-warning-100 text-warning-800` | QHSE `bg-teal-100 text-teal-800` | others neutral |

Reduce the current six-color category palette to three semantic hues plus neutral. Keep `lib/colors.ts` as the single mapping; remove inline color records in dashboards.

#### Tables

- Wrapper: `overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`; inner `overflow-x-auto`.
- `<caption className="sr-only">`; `<th scope="col">`; `text-start`; `bg-slate-50` header; `text-xs font-semibold uppercase tracking-wide text-ink-600`.
- Cells: `px-4 py-3 text-sm`; numeric cells `text-end tabular-nums`.
- Row hover: `hover:bg-slate-50`; selected `bg-primary-50`.
- Actions: 44×44 icon buttons, `aria-label`, grouped at the end; destructive action separated and confirmed in a dialog.
- Toolbar: title + count on the start; search/filter/export on the end; wraps on mobile.
- Empty state inside `<tbody>` with `colSpan`; do not append a div after the table.
- Sticky header for long tables: `thead th { position: sticky; top: 0; z-index: 10; }`.

#### Tabs

- Desktop: underline tabs (`border-b border-slate-200`, active `border-primary-600 text-primary-700`); mobile: scrollable pill bar.
- ARIA: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"`, arrow-key navigation.
- Never `w-fit` on a tab bar that must scroll; use `w-full overflow-x-auto` and `shrink-0` children.
- If there are more than five tabs, use a “More” menu or a sidebar on desktop.

#### Navigation

- Header height 72px mobile / 84px desktop; same `container-custom` as page content; fixed with a spacer or page `pt`.
- Transparent state: `bg-gradient-to-b from-primary-950/85 via-primary-900/45 to-transparent` once `primary-950` exists.
- Solid state: `bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm`.
- Active link: non-color cue (underline/bold) plus `aria-current="page"`.
- Mobile: full-height sheet or anchored panel with `aria-expanded`, `aria-controls`, `role="dialog"`, Escape, focus trap, scroll lock, route-change close.
- Skip link: “Skip to content” as the first focusable element; `<main id="main">` on every page.

#### Feedback and states

- **Loading:** skeleton that matches final geometry; `aria-busy="true"`; `role="status"` with `sr-only` text. Spinner only for actions shorter than 1s.
- **Empty:** icon 48px, title 18/700, description 14/400, one next-step CTA. Separate “no data yet” from “no results for these filters” (offer “Clear filters”).
- **Error:** inline panel with `role="alert"`, message, retry button; keep existing data visible if refresh fails.
- **Toast:** semantic variants — success `bg-success-700`, error `bg-danger-700`, info `bg-primary-700`; white text; 4s; `aria-live="polite"`. Remove the single blue `#1e40af` toast style in `components/Providers.tsx:18`.
- **Confirmation:** replace `window.confirm` with a branded dialog (focus trap, destructive button, cancel).

#### Print

- Scope print visibility to explicit document roots, not the whole body.
- Hide header, footer, floating contact, actions, and navigation.
- Reset shadows/borders/backgrounds; preserve certificate brand colors with `print-color-adjust: exact`.
- Repeat table headers; avoid breaking cards/sections; A4, 12mm margins.

---

## 3. Twelve prioritized visual fixes

Each fix is independent enough to ship on its own. File references are current as of this audit.

### P0-1 — Restore `primary-950` and the invalid opacity utilities

**Files:** `tailwind.config.js:11-22`, `components/Header.tsx:56`, `app/page.tsx:202,225,259`, `app/login/page.tsx:125,134`, `app/register/page.tsx:142,147`

**Problem**

`primary-950` is not in the palette. Tailwind therefore emits no CSS for:

- `from-primary-950/85` and `via-primary-900/45` in the transparent header (`Header.tsx:56`) — the header has no dark scrim at the top.
- `bg-primary-950` and `shadow-primary-950/30` on the hero frame (`app/page.tsx:202`) — no image placeholder/backdrop.
- `from-primary-950/70` and `to-primary-950/10` on the hero image overlay (`app/page.tsx:225`) — the bottom caption sits on an unscrimmed, potentially bright photo.
- `shadow-primary-950/10` on the floating value card (`app/page.tsx:259`).

`bg-white/92` (`login:125`, `register:142`) and `text-[#8B4D00]/72` (`login:134`, `register:147`) are also not in the default opacity scale. Verified with the installed Tailwind CLI in a temp directory: the only opacity classes that emitted CSS were `border-white/85` and `bg-white/95`; `/92`, `/72`, and every `primary-950` class emitted nothing.

**Replacement**

```js
// tailwind.config.js
primary: {
  // ...
  900: '#0f172a',
  950: '#0b1222',
},
```

```diff
- <header className="... from-primary-950/85 via-primary-900/45 ...">
+ <header className="... from-primary-950/85 via-primary-900/45 ..."> // now valid
```

```diff
- <div className="... bg-primary-950 shadow-2xl shadow-primary-950/30">
+ <div className="... bg-primary-950 shadow-2xl shadow-primary-950/30"> // now valid

- <div className="absolute inset-0 bg-gradient-to-t from-primary-950/70 via-transparent to-primary-950/10" />
+ <div className="absolute inset-0 bg-gradient-to-t from-primary-950/70 via-transparent to-primary-950/10" />
```

```diff
- <div className="... border border-white/85 bg-white/92 ...">
+ <div className="... border border-white/85 bg-white/95 ...">

- <p className="... text-[#8B4D00]/72">
+ <p className="... text-brand-gold">
```

If a muted gold is required, use `text-brand-gold` at full opacity (6.65:1) or `text-brand-gold-600` (8.89:1). Do not reintroduce a non-standard opacity step; use `text-brand-gold/80` only if it is verified to compile and passes 4.5:1.

**Acceptance:** no `primary-950` classes are dropped by the compiler; the header has a visible dark scrim on the home hero; the auth card is opaque white; the hero caption remains readable over all three slides.

---

### P0-2 — Rebuild the auth screens on system tokens

**Files:** `app/login/page.tsx:113-212`, `app/register/page.tsx:130-266`

**Problem**

The auth screens are a separate visual product:

- Indigo CTA `bg-[#3a4fc4]` (login:185, register:241) is not in the palette and appears nowhere else.
- 34px card radius, 560px width, `backdrop-blur-xl`, radial lime/gold background, and a 170–190px stacked logo. This is the only place in the product with this treatment.
- `bg-white/92` does not compile (see P0-1), so the card has no background; the `border-white/85` and blur remain, making the form float on the page wash.
- `text-[#8B4D00]/72` does not compile, so the “CLIENT PORTAL” kicker is dark gray, not gold.
- Physical `left-4`/`right-4`/`pl-12`/`pr-12` (login:146-175, register:168-232) place the mail/lock icons on the wrong side in Arabic and overlap the text.
- No inline error region; auth failures are toast-only.
- The password field has no requirements/hint; register has no terms acknowledgment.

**Replacement**

Use a compact, centered card with the real mark, one navy action, and logical properties.

```tsx
<div className="relative flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
  <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
    <div className="border-b border-slate-100 px-6 py-8 text-center sm:px-8">
      <BrandLogo variant="mark" priority className="mx-auto h-12 w-12" />
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">
        {copy.portal}
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink-900">{t('auth.loginTitle')}</h1>
      <p className="mt-2 text-sm text-ink-600">{t('auth.loginSubtitle')}</p>
    </div>
    <div className="px-6 py-6 sm:px-8">
      {/* ... */}
    </div>
  </div>
</div>
```

```diff
- <Mail className="absolute left-4 top-1/2 ... text-slate-400" />
+ <Mail className="absolute start-4 top-1/2 ... text-ink-500" />

- className="input-field rounded-2xl border-slate-200 bg-slate-50 py-3 pl-12 ... placeholder:text-slate-400 ..."
+ className="input-field ps-12"

- <button className="... bg-[#3a4fc4] ... hover:bg-[#3147bd]">
+ <button className="btn-primary w-full">
```

Required additions:

```tsx
<label htmlFor="login-email" className="label-field">
  {t('auth.email')} <span aria-hidden="true">*</span>
</label>
<input
  id="login-email"
  name="email"
  autoComplete="email"
  aria-invalid={Boolean(errors.email)}
  aria-describedby={errors.email ? 'login-email-error' : undefined}
  className="input-field"
/>
{errors.email && (
  <p id="login-email-error" role="alert" className="field-error">{errors.email}</p>
)}
```

- Replace the 170–190px logo with a 48–56px mark; add a small horizontal wordmark beside it if the mark is not self-explanatory.
- Remove the radial-lime/gold/grid background. If brand texture is desired, use a 4px gold-to-lime top rule or a very light `bg-brand-gold-100/40` band.
- Keep the card `max-w-md` (28rem). Register has six fields; use `space-y-4`, not `space-y-5`/`space-y-6`, and put name/phone in a two-column grid at `sm`.
- Add inline auth error state above the form; keep toast for transient network errors only.
- Add password hint (“At least 8 characters”) and a show/hide button with `aria-label` that changes (“Show password”/“Hide password”).

**Acceptance:** auth screens contain no indigo or raw brand hex; card is opaque; all icons mirror in Arabic; every input has a programmatic label; the form can be completed and errors announced without a toast.

---

### P0-3 — Fix CTA contrast, hierarchy, and brand color misuse

**Files:** `app/page.tsx:424`, `app/training/page.tsx:112-117`, `components/FloatingContactButtons.tsx:14`, `app/services/page.tsx:166`

**Problem**

| Location | Class | Ratio | Requirement |
|---|---|---:|---|
| Home final CTA `app/page.tsx:424` | `bg-accent-500 text-white` | **2.28:1** | 4.5:1 text |
| Same, hover | `hover:bg-accent-600` | **3.30:1** | 4.5:1 text |
| Training register CTA `app/training/page.tsx:115` | `btn-primary` (#1e40af) on hero #172554 | **1.68:1** boundary | 3:1 UI component |
| WhatsApp float `FloatingContactButtons.tsx:14` | `bg-[#25D366] text-white` | **1.98:1** | 3:1 icon |
| Services check icon `app/services/page.tsx:166` | `text-accent-500` on white | **2.28:1** | 3:1 meaningful icon |

The home CTA is the worst: white on bright green is unreadable at the text sizes used. The training register button is navy on a navy hero, so it disappears as a button even though its white text passes on its own fill. The WhatsApp button is brighter than the WCAG icon threshold.

**Replacement**

Add two system variants:

```css
.btn-signature { @apply bg-brand-gold text-white hover:bg-brand-gold-600; } /* 6.65:1 */
.btn-lime      { @apply bg-brand-lime text-primary-950 hover:bg-brand-lime-600; } /* 10.71:1 */
```

```diff
- <Link href="/contact" className="btn-primary bg-accent-500 px-8 py-4 text-lg hover:bg-accent-600">
+ <Link href="/contact" className="btn-signature px-8 py-4 text-lg">
```

```diff
- <Link href="/register?callbackUrl=%2Ftraining" className="btn-primary justify-center px-6 py-3">
+ <Link href="/register?callbackUrl=%2Ftraining" className="btn-lime justify-center px-6 py-3">
```

```diff
- <a className="... bg-[#25D366] text-white ...">
+ <a className="... bg-[#128C4A] text-white ring-1 ring-white/20 ...">
```

`#128C4A` is 4.31:1 against white — sufficient for an icon-only control (3:1) and visually close to WhatsApp’s dark green. For a white-surface treatment, use `bg-white text-[#128C4A] ring-1 ring-[#128C4A]/30`.

```diff
- <CheckCircle className="h-5 w-5 flex-shrink-0 text-accent-500" />
+ <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary-600" />
```

**Hierarchy rules**

- One signature/gold CTA per page: home final CTA, contact submit, or a single campaign CTA. Do not make every “Create account” gold.
- On dark surfaces: `.btn-on-dark` (white/navy) or `.btn-lime` (lime/navy). Never navy-on-navy.
- Green (`success`) is for pass/valid/closed states, not for conversion.
- Keep the home hero’s white primary button; it is high contrast and gives the final CTA a different role (gold).

**Acceptance:** every CTA text is ≥4.5:1 and every button boundary is ≥3:1; the home final CTA and training register CTA are unmistakable; no `accent-500` remains as a CTA or meaningful icon color.

---

### P0-4 — Make the form system accessible and consistent

**Files:** `app/globals.css:42-48`; all forms (`app/contact/page.tsx:129-201`, `app/jobs/page.tsx:385-468`, `app/admin/admin-reports.tsx:291-431`, `app/admin/admin-training.tsx:284-361`, auth screens)

**Problem**

- `.input-field` uses `border-gray-300` (#d1d5db) on white = **1.47:1**, below the 3:1 non-text requirement for a control boundary.
- `placeholder:text-slate-400`/`text-gray-400` = **2.54–2.56:1**, below 4.5:1 for placeholder text.
- `.label-field` is a visual style only; most labels have no `htmlFor`, and inputs have no `id`. Clicking a label does not focus the field, and screen readers do not associate them.
- No error, disabled, read-only, or loading styles. Errors are toast-only; fields never turn red.
- `.input-field` height is ~40px (`py-2.5` + 16px line), below the 44px touch target.
- `.btn-primary` has no `disabled:` styles; auth buttons add their own, but the shared button does not.
- Admin forms mix `.input-field` with custom `rounded-xl border-slate-200` fields (`admin-reports:401`, `admin-jobs` search fields, `ClientProfilePanel:48`), producing three input looks.
- Contact/jobs forms do not use `autoComplete`; the date filters in the client dashboard are labeled “From”/“To” in English inside an Arabic UI (`client-dashboard.tsx:299,308`).

**Replacement**

```css
.input-field {
  @apply min-h-11 w-full rounded-xl border border-slate-500 bg-white px-3.5 py-2.5
         text-base text-ink-900 shadow-sm transition-colors
         placeholder:text-ink-500 hover:border-slate-600
         focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-500/15
         disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-ink-500
         aria-[invalid=true]:border-danger-700 aria-[invalid=true]:ring-danger-600/15;
}
.label-field { @apply mb-1.5 block text-sm font-semibold text-ink-800; }
.field-hint  { @apply mt-1.5 text-sm text-ink-500; }
.field-error { @apply mt-1.5 flex items-center gap-1.5 text-sm font-medium text-danger-700; }

.btn:disabled { @apply pointer-events-none opacity-60; }
```

```tsx
<div>
  <label htmlFor="contact-email" className="label-field">
    {t('contact.email')} <span aria-hidden="true">*</span>
  </label>
  <input
    id="contact-email"
    name="email"
    type="email"
    autoComplete="email"
    required
    aria-invalid={Boolean(errors.email)}
    aria-describedby={errors.email ? 'contact-email-error' : 'contact-email-hint'}
    className="input-field"
  />
  <p id="contact-email-hint" className="field-hint">{t('contact.emailHint')}</p>
  {errors.email && <p id="contact-email-error" role="alert" className="field-error">{errors.email}</p>}
</div>
```

- Add `id`/`htmlFor` to every field in contact, jobs, admin reports, admin training, admin jobs, admin clients, and auth.
- Add `autoComplete` to contact/jobs/admin forms.
- Replace custom input classes with `.input-field`; use a `fieldClass` constant only if a variant is genuinely needed.
- Add `aria-describedby` for hints and errors; use `role="alert"` on the error text.
- Add `required` + visible marker; mark optional fields, not every field.
- Add `inputMode="tel"`/`inputMode="numeric"` where appropriate.
- Translate the dashboard date labels: `t('reports.from')`, `t('reports.to')`; add `dir="ltr"` to date inputs so the native picker is not mirrored.
- Add an inline form-level error summary at the top of long forms, linked to the first invalid field.

**Acceptance:** all controls are ≥44px; input borders are ≥3:1; placeholders are ≥4.5:1; every control has an accessible name; errors are visible and announced; all forms share one input appearance.

---

### P1-5 — Align the header, fix the active state, and rebuild the mobile menu

**Files:** `components/Header.tsx:55-59,78-93,97,150-208`

**Problem**

- The header uses `w-full px-4 sm:px-6 lg:px-10` (line 59), while every page uses `.container-custom` = `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. On a 1440px screen the logo starts at 40px from the viewport while the hero `h1` starts at the centered container edge (~112px). The brand and the content do not share a vertical line.
- Active desktop nav is `bg-primary-600 text-white` (line 85) on the transparent header’s `primary-800` background. The white text passes (10.36:1), but the pill boundary is **1.42:1**, below 3:1. The only active cue is a barely visible dark pill.
- `ml-auto`/`mr-auto` (line 97) is physical; in Arabic the right-side cluster is pushed to the wrong side.
- The mobile menu (line 163) is an in-flow `div` inside the fixed header. It has no `aria-expanded`/`aria-controls`, no `role="dialog"`, no Escape handling, no focus trap, no scroll lock, no max-height/overflow, and no active link state. On a 568px-tall phone, the menu can extend below the viewport with no way to scroll.
- The language switcher is a gray chip on a transparent hero; it looks detached from the white-on-navy header.
- No skip link; no `aria-current="page"`.

**Replacement**

```diff
- <div className="w-full px-4 sm:px-6 lg:px-10">
+ <div className="container-custom">
```

```diff
- <div className={`${isArabicInterface ? 'mr-auto' : 'ml-auto'} flex ...`}>
+ <div className="ms-auto flex ...">
```

```tsx
// Desktop active state — underline + weight, not a low-contrast pill
const desktopLinkClass = pathname === link.href
  ? useSolidHeader
    ? 'bg-primary-50 text-primary-800 shadow-sm'
    : 'relative bg-white/10 text-white font-semibold ring-1 ring-inset ring-white/25 ' +
      'after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-brand-lime'
  : useSolidHeader
    ? 'text-slate-700 hover:bg-slate-100 hover:text-primary-700'
    : 'text-white/90 hover:bg-white/10 hover:text-white';
```

```tsx
<button
  type="button"
  aria-expanded={mobileMenuOpen}
  aria-controls="mobile-nav"
  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
  onClick={() => setMobileMenuOpen((open) => !open)}
>
```

```tsx
{mobileMenuOpen && (
  <div
    id="mobile-nav"
    role="dialog"
    aria-modal="true"
    aria-label="Main navigation"
    className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+80px)] z-50 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:hidden"
  >
    {/* links with min-h-11, aria-current, active bg-primary-50 text-primary-800 */}
  </div>
)}
```

- Close the menu on `pathname` change, Escape, and outside click; lock body scroll while open; return focus to the trigger.
- Add a skip link in `Header` or `layout.tsx`: `<a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-primary-700 focus:shadow-lg">Skip to content</a>`.
- Add `aria-current={pathname === link.href ? 'page' : undefined}` to desktop and mobile links.
- Give `LanguageSwitcher` an `onDark` prop: transparent header = `bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20`; solid = current `bg-slate-100 text-slate-700`.
- Add `<main id="main">` to every page that currently starts with a `<section>` (home, about, services, contact, jobs, training).

**Acceptance:** the logo and the first hero heading share the same container edge at ≥1024px; the active nav has a non-color cue; the mobile menu is keyboard operable, scrollable, and closes predictably; every page has one `<main>` and a skip link.

---

### P1-6 — Replace the 926 KB “SVG” logo with a real lockup

**Files:** `components/BrandLogo.tsx:10-26,36-46`; `components/Header.tsx:66-74`; `components/Footer.tsx:21`; `app/login/page.tsx:128-132`; `app/register/page.tsx:144-146`; `app/training/certificate/[code]/page.tsx:152-154`; `app/dashboard/training-profile.tsx:117-119`

**Problem**

All three brand files are byte-identical 926,632-byte files. Each is an SVG wrapper around a 1024×1024 PNG (two copies). `BrandLogo` renders all variants at 1024×1024 with `unoptimized`, then CSS scales them down:

- Header: `h-[52px] w-[52px] md:h-[60px] md:w-[60px]` / `h-[56px] w-[56px] md:h-[64px] md:w-[64px]` (Header:69-73). The stacked wordmark inside the raster is unreadable at 52–60px.
- Footer: 120–140px stacked; auth: 170–190px; certificate: 150px.
- Because all variants are the same image, `variant="header"`, `"mark"`, and `"stacked"` have no effect.
- The asset is ~926 KB per file, and the header requests it on every page; `priority` makes it a preload. This is the single largest image payload in the app.
- `alt="QHSSE Consultant logo"` is always English, even in Arabic; when a text wordmark sits next to it, the alt duplicates the accessible name.

**Replacement**

Export three genuine assets from the source brand file:

| Variant | File | Intrinsic size | Use |
|---|---|---:|---|
| `horizontal` | `/brand/qhsse-logo-horizontal.svg` | 480×120 (4:1) | Header, footer, auth header, certificate header. |
| `mark` | `/brand/qhsse-logo-mark.svg` | 128×128 | Favicon, compact avatar, mobile header if paired with text. |
| `stacked` | `/brand/qhsse-logo-stacked.svg` | 320×320 | Certificate seal, footer at ≥96px, print. |

```tsx
const CONFIG = {
  horizontal: { src: '/brand/qhsse-logo-horizontal.svg', width: 480, height: 120 },
  mark:       { src: '/brand/qhsse-logo-mark.svg',       width: 128, height: 128 },
  stacked:    { src: '/brand/qhsse-logo-stacked.svg',    width: 320, height: 320 },
} as const
```

```tsx
<BrandLogo variant="horizontal" priority className="h-9 w-auto md:h-10" />
```

```tsx
// If only the mark exists, pair it with a text lockup:
<Link href="/" aria-label="QHSSE Consultant home" className="flex items-center gap-2.5">
  <BrandLogo variant="mark" className="h-10 w-10" />
  <span className="flex flex-col leading-none">
    <span className="text-lg font-extrabold tracking-tight text-current">QHSSE</span>
    <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-current/70">
      Consultant
    </span>
  </span>
</Link>
```

- Header: horizontal lockup at 36–40px height; remove the 52–60px stacked raster.
- Footer: horizontal at 144×36 or stacked at 96×96.
- Auth: mark 48–56px, not 170–190px.
- Certificate: horizontal 180×45 or stacked 120×120; keep the seal legible in print.
- `BrandLogo` should accept `width`/`height` from the config and set `sizes` for raster fallbacks; keep `unoptimized` only for SVG, and remove it for PNG.
- Decorative logos: `alt=""` when adjacent text repeats the name; otherwise `alt={language === 'ar' ? 'شعار QHSSE Consultant' : 'QHSSE Consultant logo'}`.
- Add `aria-label` to the logo link; do not rely on the image alt for the link name.

**Acceptance:** header wordmark is legible at 40px height; logo payload is <50 KB per page; the three variants are visually distinct; no 926 KB file is served.

---

### P1-7 — Build one admin/table system

**Files:** `app/admin/admin-reports.tsx:442-452,470-494`; `app/admin/admin-activity-log.tsx:66-75`; `app/admin/admin-dashboard-client.tsx:499-508`; `app/admin/admin-training.tsx:393-436`; `app/dashboard/training-profile.tsx:141-181`; `app/admin/admin-clients.tsx:461-467`

**Problem**

- Tables are wrapped in `.card`, which adds `p-6`; the table then has its own `px-4`. The header and first/last columns are inset 24px from the card border, while the table scrolls inside a second container. It looks accidental, not designed.
- `text-left` headers (`admin-reports:446-451`, `admin-activity-log:71-74`) do not mirror in Arabic. `admin-dashboard-client` computes `textAlign` correctly (line 223) but the other tables do not.
- Action buttons are `p-1.5` + 16px icon = 28px (`admin-reports:472-492`); delete is `text-red-500` (3.76:1) with no `aria-label`, only a hover title on some.
- No `<caption>`, no `scope="col"`, no `aria-label` on icon actions, no keyboard support for the clickable rows in `admin-dashboard-client:513-517`.
- `admin-reports` prints raw enum values (`report.category`, `report.status`) while `admin-dashboard` translates them. Dates use `toLocaleDateString()` without a locale (`admin-reports:458`, `admin-dashboard:520`, `admin-clients:467`).
- `admin-activity-log` fetches with no error state; a failed request renders an empty table.
- `admin-training` and `training-profile` do use `text-start` and 44px-ish padding, but their card/padding/empty patterns differ from reports. There is no shared table.

**Replacement**

```tsx
<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
  <div className="overflow-x-auto">
    <table className="w-full min-w-[760px] text-sm">
      <caption className="sr-only">{t('admin.manageReports')}</caption>
      <thead className="bg-slate-50">
        <tr>
          <th scope="col" className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-ink-600">
            {t('reports.siteName')}
          </th>
          {/* ... */}
        </tr>
      </thead>
      <tbody>
        {reports.map((report) => (
          <tr key={report.id} className="border-t border-slate-100 hover:bg-slate-50">
            <td className="px-4 py-3 text-start font-medium text-ink-900">{report.siteName}</td>
            {/* ... */}
            <td className="px-4 py-3">
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  aria-label={t('reports.viewReport')}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <Eye className="h-4 w-4" />
                </button>
                {/* ... */}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

- Remove `.card` from table wrappers. If a card look is required, use `.card-table` = `p-0 overflow-hidden`.
- Add a toolbar: title/count on the start, search + filter + export on the end; `flex flex-col gap-3 md:flex-row md:items-center md:justify-between`.
- Use `text-start`/`text-end`; numeric cells `tabular-nums`.
- `scope="col"` on all `<th>`; `<caption className="sr-only">`.
- 44×44 action targets; `aria-label` on every icon button; destructive action `text-danger-600 hover:bg-danger-50` with confirmation dialog.
- Translate enums via `t()` in every table; centralize date formatting:

```ts
const locale = language === 'ar' ? 'ar-EG' : 'en-GB'
new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
```

- Make rows links when they navigate; if a row must stay a `<tr>`, add `tabIndex={0}`, `role="link"`, `onKeyDown` for Enter/Space, and a visible focus ring. Better: wrap the site name in a `<Link>` and keep the row as a visual hover.
- Add error/empty/loading states inside the table card (see P1-10).

**Acceptance:** tables are flush with the card border, headers are start-aligned in both directions, all icon actions are 44px and labeled, no raw enum or locale-less date appears, and keyboard users can open a report.

---

### P1-8 — Complete RTL mirroring and apply direction before first paint

**Files:** `context/language-context.tsx:44-47,50,64-75`; `app/layout.tsx:32`; `app/login/page.tsx:146-175`; `app/register/page.tsx:168-232`; `components/ClientKnowledgeBank.tsx:60,64,68`; `components/FloatingContactButtons.tsx:8`; `components/Header.tsx:97`; `app/page.tsx:172-173,381-382`; `app/about/page.tsx:118`; `app/dashboard/training-profile.tsx:114`; `app/admin/admin-jobs.tsx:436,493,505`; `app/admin/admin-clients.tsx:237-325`

**Problem**

- `document.documentElement.lang` and `.dir` are set in `applyLanguageAttributes` after the provider mounts and fetches translations. The server-rendered HTML is always `<html lang="en" dir="ltr">`; Arabic users see an LTR flash, then a full mirror. On slow networks this is a visible layout jump.
- The provider initializes `language` to `'en'` and only reads `localStorage` in an effect, so even the React tree starts in English.
- Physical properties remain in high-traffic surfaces:

| File | Current | Effect in RTL |
|---|---|---|
| `login:146,162` / `register:168,183,199,222,230` | `left-4` on icons | Icons stay left while text starts right; overlap. |
| `login:154,170` / `register:175,191,207,223,231` | `pl-12`/`pr-12` | Wrong padding side; text under icon. |
| `login:175` / `register:212,232` | `right-4` on password toggle | Toggle on wrong side. |
| `Header:97` | `mr-auto`/`ml-auto` | Right cluster pushed to wrong side. |
| `ClientKnowledgeBank:60,64` | `border-l` | Divider on wrong side. |
| `ClientKnowledgeBank:64,68` | `text-right` | Forces right alignment even in English; double-flips in RTL. |
| `FloatingContactButtons:8` | `right-4 md:right-6` | Stays right; may cover Arabic content. |
| `page.tsx:172-173` | `-right-24`, `left-0` | Decorative blobs do not mirror. |
| `page.tsx:381-382` | `left-0`/`right-0` fade gradients | Fade on the wrong edge in RTL. |
| `about:118` | `right-0 translate-x-1/2` | Blob wrong side. |
| `training-profile:114` | `-right-20` | Blob wrong side. |
| `admin-jobs:436,493,505` | `left-3` icon | Icon wrong side. |
| `admin-clients:237-325` | `left-3` icons | Icon wrong side. |
| `admin-knowledge-bank-workspace:32` | `border-l` | Stats divider wrong side. |

- `dir` is applied to nested header divs (`Header:60,78,97,163`) but not consistently to page content. Nested `dir` also creates local ordering quirks; the document should own direction.

**Replacement**

Set direction on the document before paint. Prefer a cookie so the server can render the correct `lang`/`dir`:

```tsx
// app/layout.tsx (server)
import { cookies } from 'next/headers'
const locale = cookies().get('NEXT_LOCALE')?.value === 'ar' ? 'ar' : 'en'

<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
```

If a cookie is out of scope for this sprint, add a blocking inline script in `<head>`:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `(function(){try{var l=localStorage.getItem('preferred-language')||'en';document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';}catch(e){}})();`,
  }}
/>
```

Then hydrate `LanguageProvider` from the same value (prop or `document.documentElement.lang`) so React does not reset it.

**Logical property migration**

| Physical | Logical |
|---|---|
| `left-*` / `right-*` | `start-*` / `end-*` |
| `pl-*` / `pr-*` | `ps-*` / `pe-*` |
| `ml-*` / `mr-*` | `ms-*` / `me-*` |
| `text-left` / `text-right` | `text-start` / `text-end` |
| `border-l` / `border-r` | `border-s` / `border-e` |
| `rounded-l-*` / `rounded-r-*` | `rounded-s-*` / `rounded-e-*` |
| `inset-y-0 left-0` | `inset-y-0 start-0` |

For gradients, Tailwind 3 has no logical direction. Use `rtl:bg-gradient-to-l` alongside `bg-gradient-to-r` (and the reverse), or a CSS class:

```css
[dir="rtl"] .fade-start { background-image: linear-gradient(to left, #fff, transparent); }
```

Other rules:

- Remove nested `dir` from `Header`; keep one document direction. Use `dir="ltr"` only on phone numbers, emails, codes, and dates.
- Test Arabic with the language switcher on every page: nav order, icon side, input icon side, table headers, sidebar border, carousel arrows, breadcrumbs, modal close position.
- `ClientKnowledgeBank` already uses `paddingInlineStart` (line 64) — good; convert the rest.
- `FloatingContactButtons` should mirror to `end-4 md:end-6` unless the business explicitly wants it bottom-right in both languages. If it stays right, document the exception.

**Acceptance:** no LTR flash when Arabic is stored; no physical `left/right/pl/pr/border-l` in the audited surfaces; Arabic forms have icons on the right; tables align to the start; decorative gradients/blobs mirror or are intentionally centered.

### P1-9 — Make the portal and long forms resilient from 320px up

**Files:** `app/dashboard/client-dashboard.tsx:250-256`; `app/admin/admin-dashboard-client.tsx:157-170`; `app/jobs/page.tsx:308-309`; `app/training/certificate/[code]/page.tsx:150-153`; `app/admin/admin-reports.tsx:661-662`; `components/FloatingContactButtons.tsx:8`; app shells at `app/page.tsx:159`, `app/jobs/page.tsx:220`, `app/training/page.tsx:86`, `app/login/page.tsx:120`, `app/register/page.tsx:137`

**Problem**

- The client dashboard tab bar is `flex w-fit` with no scroll owner (line 250). At 320px its four labels need roughly 480–520px inside a 288px content column, so the document itself scrolls sideways and the last tab is unreachable.
- The admin tab bar (line 157) has eight tabs in one strip. `overflow-x-auto` is present, but `w-fit` makes the bar content-width rather than column-width, and there is no scroll affordance, fade, or “More” control; tabs 6–8 simply disappear off-screen. Eight top-level destinations are too many for a horizontal bar even on desktop.
- The jobs application panel is `sticky top-28` (line 309). At the `lg` breakpoint the form column is roughly 370px wide and the form is 900–1000px tall; with a 112px top offset the submit button is below a 768px viewport. Because the panel has no internal scroll, the CTA cannot be reached while the panel is pinned.
- The certificate is `p-10` with a `rounded-[36px]` frame and a 150px logo (lines 150–153). At 320px the inner content width inside the two paddings and double border is about 120px, so the logo overflows and the recipient name wraps every few characters.
- Admin modals use `max-h-[90vh]` (line 662). On mobile browsers `vh` includes chrome that is not visible, so the footer/form actions can be clipped; there is no sticky footer or bottom-sheet layout at small widths.
- App shells use `min-h-screen`, which produces a 100vh jump when mobile browser chrome collapses.
- The floating contact stack is `right-4` without safe-area handling and without page bottom padding, so it overlaps form controls and the last row of tables on phones.
- Portal pages use full-bleed `px-4 sm:px-6 lg:px-10` (dashboard line 225, admin line 145). That is a second container system alongside marketing’s centered `.container-custom`; the header can only align with one of them. The header correction itself is P1-5.

**Replacement**

Use one container contract, one scroll owner per tab set, and a form panel that never traps its own CTA.

```tsx
// Portal shell — same max width and gutters as marketing
<main className="pt-24 pb-24">
  <div className="container-custom">
    {/* page header, tabs, content */}
  </div>
</main>
```

```tsx
// Client dashboard: four tabs, horizontal scroll with edge padding
<div className="-mx-4 mb-6 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
  <div
    role="tablist"
    aria-label={t('dashboard.tabs')}
    className="flex w-max min-w-full gap-1 rounded-xl border border-slate-200 bg-white p-1"
  >
    <button
      role="tab"
      aria-selected={activeTab === id}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
        activeTab === id ? 'bg-primary-500 text-white' : 'text-ink-600 hover:bg-slate-100'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  </div>
</div>
```

```tsx
// Admin: sidebar on desktop, 2-column grid on phones — never an 8-item strip
<div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:grid-cols-4 lg:flex lg:flex-col lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
  {/* role="tablist", aria-orientation="vertical" at lg; aria-selected on every tab */}
</div>
```

If the admin layout must stay horizontal, wrap the strip in a `relative` container with a right-edge fade and a “More” button for overflow; do not rely on an invisible scrollbar.

```diff
- <div className="sticky top-28 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
+ <div
+   id="application-form"
+   className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6
+              lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:overscroll-contain"
+ >
```

- Below `lg`, selecting a job should bring the form into view:

```tsx
const selectJob = (job: JobOpening) => {
  setSelectedJob(job)
  if (window.matchMedia('(max-width: 1023px)').matches) {
    requestAnimationFrame(() => {
      document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
}
```

- If `prefers-reduced-motion` is set, use `behavior: 'auto'`.
- Add `pb-24 lg:pb-0` to the jobs page bottom so the floating contact stack cannot cover the submit button.
- Keep the sticky panel only when it fits: `lg:max-h-[calc(100dvh-8rem)]` plus `overflow-y-auto` is the minimum. Alternatively move `lg:sticky` to `xl:sticky` and leave the form static at 1024.

```diff
- <section className="mx-auto max-w-5xl rounded-[36px] border border-amber-200 bg-white p-10 shadow-2xl ...">
-   <div className="rounded-[28px] border-4 border-double border-[#8B4D00]/35 p-10 text-center">
-     <BrandLogo variant="stacked" priority className="h-[150px] w-[150px]" />
+ <section className="mx-auto max-w-5xl rounded-2xl border border-amber-200 bg-white p-5 shadow-xl sm:rounded-3xl sm:p-10 ...">
+   <div className="rounded-xl border-2 border-double border-[#8B4D00]/35 p-5 text-center sm:rounded-[28px] sm:border-4 sm:p-10">
+     <BrandLogo variant="stacked" priority className="h-24 w-24 sm:h-[150px] sm:w-[150px]" />
```

- Certificate typography at 320: `text-3xl sm:text-4xl md:text-5xl` for the title, `text-2xl sm:text-4xl` for the recipient, and `grid-cols-1 sm:grid-cols-3` for the score/date/code tiles.
- Modal layout:

```diff
- <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
-   <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
+ <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4">
+   <div
+     role="dialog"
+     aria-modal="true"
+     className="w-full max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-2xl bg-white shadow-xl
+                sm:max-w-3xl sm:rounded-2xl"
+   >
```

- Put the modal footer in `sticky bottom-0 border-t border-slate-200 bg-white p-4`; the close button is `h-11 w-11` and labeled.
- Replace `min-h-screen` with `min-h-dvh` on all app shells; keep `min-h-screen` only where an explicit fallback is needed for very old browsers.
- Floating contact:

```diff
- <div className="fixed bottom-6 right-4 z-[60] flex flex-col gap-3 md:bottom-8 md:right-6">
+ <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-4 z-50 flex flex-col gap-3 md:bottom-8 md:end-6">
```

- On phones, keep the two buttons at `h-12 w-12` minimum with `gap-3`; ensure the page has `pb-24` so the stack never covers the final control.
- Add `min-w-0` to flex children that contain long Arabic labels or tables; keep `overflow-x-auto` on the table wrapper, not on the card.

**Acceptance:** no horizontal document scroll at 320/360/390px; every tab label is reachable; the jobs submit button is reachable without fighting the sticky panel at 1024×768 and 1280×800; the certificate fits the viewport width at 320px; modals keep their actions visible at 92dvh; the header and the first page heading share the same left/right edge at 1024/1280/1440.

---

### P1-10 — Replace spinner-only and false-empty states with loading, error, empty, and retry

**Files:** `app/jobs/page.tsx:126-148,244-257`; `app/training/page.tsx:63-83,148-153`; `app/dashboard/client-dashboard.tsx:156-175,333-342`; `app/admin/admin-activity-log.tsx:30-38,61-100`; `app/admin/admin-reports.tsx:161-183,438-440,499-501`; `app/admin/admin-training.tsx:186-199,364`; `components/ClientKnowledgeBank.tsx:52-53`

**Problem**

- Jobs shows a toast on fetch failure, then falls through to `jobs.length === 0` and renders “No open roles right now” with a contact CTA (lines 248–257). A network outage is presented as a business fact, and there is no retry control.
- Training does the same: `toast.error` in the catch (line 76) and `copy.noCourses` in the empty branch (line 153). An error is indistinguishable from an empty catalog.
- `fetchReports` (dashboard lines 156–175) only calls `setReports` when `res.ok`; a non-OK response leaves the previous/empty array in place and renders “no reports”, while the catch only logs to the console. No retry.
- Admin activity log has no error state at all. A failed request leaves `logs=[]` and renders an empty table (lines 61–100).
- Admin reports has the same `if (res.ok)` swallow (lines 176–177); loading is a bare spinner, and the empty state is a `<div>` appended after `</table>` inside the card (lines 499–501), outside table semantics and after the scroll container.
- Admin training shows only a toast on failure and a spinner on load (lines 195–198, 364).
- Spinners have no `role="status"` or screen-reader text; the page jumps from zero height to full content.
- The UI never distinguishes “no data yet” from “no results for these filters”, and the filter panels have no “Clear all” action.
- Empty-state icons are `text-gray-300` (1.47:1) or `text-slate-300`, i.e. effectively invisible.

**Replacement**

Introduce one state contract per data surface:

```tsx
type LoadState = 'loading' | 'ready' | 'error'

const [state, setState] = useState<LoadState>('loading')
const [error, setError] = useState('')
```

- Set `state='error'` on `!res.ok` **and** in `catch`; set `state='ready'` only after a parsed, valid payload. Keep the previous data on refresh so the screen does not flash empty.
- Loading: geometry-matched skeleton, not a spinner:

```tsx
<div aria-busy="true" role="status" className="space-y-4">
  <span className="sr-only">{t('common.loading')}</span>
  {[0, 1, 2].map((i) => (
    <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="h-3 w-24 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
      <div className="mt-4 h-5 w-2/3 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
    </div>
  ))}
</div>
```

- Error: inline panel with a retry, not a toast:

```tsx
<div role="alert" className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
  <AlertTriangle className="mx-auto h-10 w-10 text-danger-600" aria-hidden="true" />
  <h2 className="mt-3 text-lg font-bold text-ink-900">{t('common.loadErrorTitle')}</h2>
  <p className="mt-1 text-sm text-ink-600">{t('common.loadErrorBody')}</p>
  <button type="button" onClick={retry} className="btn-secondary mt-4">
    {t('common.retry')}
  </button>
</div>
```

- Empty: one shared component with a 48px icon, 18px/700 title, 14px body, and exactly one next step:

```tsx
<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
  <BriefcaseBusiness className="mx-auto h-12 w-12 text-ink-400" aria-hidden="true" />
  <h2 className="mt-4 text-lg font-bold text-ink-900">{t('jobs.emptyTitle')}</h2>
  <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">{t('jobs.emptyBody')}</p>
  <Link href="/contact" className="btn-secondary mt-6">{t('jobs.contactFallback')}</Link>
</div>
```

- Filtered empty uses a different title and a `Clear filters` button; true empty has no filter action.
- Tables: put the empty row inside `<tbody>` so it inherits column widths and table semantics:

```tsx
<tbody>
  {reports.length === 0 ? (
    <tr>
      <td colSpan={6} className="px-4 py-16 text-center">
        <EmptyState ... />
      </td>
    </tr>
  ) : (
    reports.map(/* ... */)
  )}
</tbody>
```

- Remove the `<div>` after `</table>` (admin-reports:499–501); do not place a block empty state inside the horizontal scroll container.
- Jobs and training: only show the “no open roles / no courses” empty state when `state === 'ready'`; `state === 'error'` renders the error panel with `fetchJobs`/`loadCourses` as retry.
- Dashboard reports, admin reports, admin training, and activity log: add the same error state and retry. Keep the existing knowledge-bank error/retry pattern (`ClientKnowledgeBank:52-53`) and upgrade its loading to a skeleton.
- Buttons in loading state: `disabled`, `aria-busy="true"`, spinner `aria-hidden="true"`, visible text remains.
- Add filter “Clear all” actions on the dashboard and admin report toolbars.
- Use `role="status"` for “saved”/“downloaded” confirmations, or keep the toast but give it a semantic variant.

**Translation note:** `common.loading`, `common.loadErrorTitle`, `common.loadErrorBody`, `common.retry`, `jobs.emptyTitle`, `jobs.emptyBody`, and `jobs.contactFallback` are illustrative keys, not existing entries. Add every new key to both the `en` and `ar` dictionaries in `context/language-context.tsx` in the same change; do not ship English-only fallbacks in the Arabic UI.

**Acceptance:** disconnecting the network produces an error panel with retry on jobs, training, dashboard reports, admin reports, admin training, and activity log; no failed request can render “no data”; filtered-empty can be cleared; loading skeletons match final geometry and announce a status; no spinner is the only loading feedback on a page-level fetch.

---

### P2-11 — Unify typography, section rhythm, cards, badges, and decorative restraint

**Files:** `app/globals.css:1,8-18,38-60`; `tailwind.config.js:36-39`; `app/layout.tsx:8-18`; `app/page.tsx:175,277,307,324,344,410,396`; `app/about/page.tsx:66,95,115,102`; `app/services/page.tsx:110,145,157,179,188`; `app/training/page.tsx:89,106`; `app/training/[slug]/page.tsx:228`; `app/training/certificate/[code]/page.tsx:162`; `app/login/page.tsx:134-138`; `app/register/page.tsx:147-151`; `lib/service-cards.ts:27-99`; `app/admin/admin-dashboard-client.tsx:230-272,305,472`; `app/contact/page.tsx:263`

**Problem**

- **Fonts are loaded twice.** `globals.css:1` imports Inter + Cairo 300–900 from Google Fonts, while `app/layout.tsx:8-18` loads the same families through `next/font`. `tailwind.config.js:37-38` points at literal `'Inter'` and `'Cairo'`, so the generated `--font-inter` and `--font-cairo` variables are never consumed. Arabic resolution depends on CSS order, and the app makes duplicate font requests.
- **There is no type scale.** Hero headings use `text-4xl md:text-5xl lg:text-6xl`, page headings use `text-4xl md:text-6xl`, section headings use `text-3xl md:text-4xl`, auth headings use `text-3xl`, and body copy varies between `text-sm`, `text-base`, `text-lg`, and `text-xl` without a role-based rule. The auth kicker uses `tracking-[0.55em]` (`login:134`, `register:147`) while the hero uses `tracking-[0.2em]` (`page:232`). At 12px, `0.55em` adds 6.6px after every character and overflows a narrow Arabic/English card.
- **Body leading is wrong.** `training/[slug]:228` sets 16px body copy to `leading-9` (2.25), the certificate body is 20px/36px (`certificate:162`), and the training hero subtitle is 20px/36px (`training:106`). These are display leadings, not reading leadings.
- **Section rhythm drifts.** Home uses `py-20 md:py-28` (277, 324, 410), `py-16 md:py-20` (307), and `py-20 md:py-24` (344); inner pages use `py-16 md:py-24`. Section-header margins alternate between `mb-16` (`page:326`, `about:97`) and `mb-12` (`page:346`). Sections 324 and 344 are both white and adjacent, so “Why QHSSE” and “Partners” merge into one undifferentiated block.
- **Cards do too many things.** `.card` always adds `p-6`, a border, a shadow, and `hover:shadow-md`, so static cards lift on hover and imply clickability. About adds `hover:-translate-y-1` to non-clickable value cards (`about:102`); service cards use `p-8`; the certificate uses `p-10`. Radii include `rounded-xl/2xl/3xl` plus `rounded-[22px]`, `rounded-[28px]`, `rounded-[32px]`, `rounded-[34px]`, `rounded-[36px]`, and `rounded-[1.55rem]`. Shadows include `shadow-[0_32px_100px_rgba(15,23,42,0.14)]` and `shadow-[0_10px_32px_rgba(15,76,129,0.08)]`.
- **Decorative color is unbounded.** `lib/service-cards.ts` assigns eight hues (blue, amber, rose, teal, violet, orange, emerald, cyan). The admin KPI map (`admin-dashboard-client:230-272`) assigns seven gradients, and the visitor bar is a navy-to-green gradient (`:472`). The training hero ends in a raw dark green `#163d2d` (`training:89`), the home hero uses an `accent-400` blob (`page:172`), and the About mission uses `text-accent-400` (`about:120`). Green is being used as decoration and as a semantic success color at the same time.
- **Placeholders read as broken UI.** Service detail sections render a 192–256px `bg-gradient-to-br ${service.color} opacity-20` rectangle (`services:179`) that looks like a failed image load. The contact map is a 192px gray box with a pin (`contact:263`).
- **Badges are ad hoc.** `.badge` has no minimum height or border; jobs uses inline `bg-emerald-100 text-emerald-800` (line 274) and `bg-gray-100 text-gray-700` (line 278); `lib/colors.ts` defines six category hues, four status hues, and four risk hues. Similar pills are reimplemented in admin tables and dashboards.
- **Partner alt text is generic.** `alt={\`Client logo ${index + 1}\`}` (`page:396`) tells a screen-reader user nothing and adds noise.
- **Arabic typography is not tuned.** Body line-height stays at 1.5, and `letter-spacing` from English kickers is not reset for Arabic, where tracking should be zero.

**Replacement**

One font path, one type scale, one section rhythm, and a strict decorative budget.

```js
// tailwind.config.js
fontFamily: {
  sans:   ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  arabic: ['var(--font-cairo)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
},
fontSize: {
  eyebrow: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.18em', fontWeight: '700' }],
  caption: ['0.75rem', { lineHeight: '1.5' }],
  sm:      ['0.875rem', { lineHeight: '1.5' }],
  base:    ['1rem', { lineHeight: '1.6' }],
  lg:      ['1.125rem', { lineHeight: '1.7' }],
  xl:      ['1.25rem', { lineHeight: '1.5' }],
  '2xl':   ['1.5rem', { lineHeight: '1.35' }],
  '3xl':   ['1.875rem', { lineHeight: '1.25' }],
  '4xl':   ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
  '5xl':   ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
  display: ['clamp(2.5rem, 6vw, 4rem)', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
},
```

```diff
- @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;...&family=Cairo:wght@300;...&display=swap');
```

```css
body { @apply font-sans text-base text-ink-900 antialiased; }

html[dir="rtl"] body {
  @apply font-arabic;
  line-height: 1.8;
  letter-spacing: 0;
}

html[dir="rtl"] h1,
html[dir="rtl"] h2,
html[dir="rtl"] h3,
html[dir="rtl"] .section-title {
  letter-spacing: 0;
}

.section       { @apply py-16 md:py-24; }
.section-tight { @apply py-12 md:py-16; }
.section-muted { @apply bg-slate-50; }

.section-header { @apply mx-auto mb-10 max-w-3xl text-center md:mb-14; }
.section-title  { @apply text-3xl font-bold text-ink-900 text-balance md:text-4xl; }
.section-subtitle { @apply mt-3 text-lg text-ink-600; } /* no mx-auto */
```

**Section replacements**

| File:line | Current | Replace with |
|---|---|---|
| `page:277` | `bg-gray-50 py-20 md:py-28` | `section section-muted` |
| `page:307` | `bg-primary-700 py-16 md:py-20` | `section-tight bg-primary-800` |
| `page:324` | `py-20 md:py-28` | `section section-muted` |
| `page:344` | `bg-white py-20 md:py-24` | `section` |
| `page:410` | `bg-gradient-to-br from-gray-900 to-primary-900 py-20 md:py-28` | `section bg-primary-900` |
| `page:175` | `py-28 pt-32 lg:py-32 lg:pt-36` | `pb-20 pt-32 lg:pb-28 lg:pt-36` |
| `about:66,95,115` | `py-16 md:py-24` / `py-16 md:py-24 bg-gray-50` | `section` / `section section-muted` |
| `services:110,145,188` | `py-16 md:py-24` variants | `section` / `section section-muted` |
| `contact`, `jobs`, `training` sections | `py-16 md:py-24` | `section` |

**Type replacements**

- Home hero: `text-display` (or `text-4xl md:text-5xl lg:text-6xl` with `leading-[1.05]`) and `max-w-[18ch]`.
- Page heroes: `text-4xl md:text-5xl`, `text-balance`.
- Section titles: `.section-title`.
- Card titles: `text-xl md:text-2xl font-bold`.
- Body: `text-base leading-relaxed` (1.625); do not use `leading-9` below 24px.
- Training body (`training/[slug]:228`): `leading-relaxed text-ink-700`, not `leading-9`.
- Certificate recipient (`certificate:161`): `text-2xl sm:text-4xl`; certificate body (`:162`): `text-lg leading-relaxed`.
- Auth kicker (`login:134`, `register:147`): `text-eyebrow text-brand-gold`, no `tracking-[0.55em]`.
- Arabic headings: no negative tracking, line-height 1.3–1.4; Arabic body 1.8.

**Cards, radii, shadows, badges**

```css
.card {
  @apply rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6;
  /* no hover, no transform */
}
.card-interactive {
  @apply transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-primary-500;
}
.badge {
  @apply inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-1
         text-xs font-semibold;
}
.badge-dot { @apply h-1.5 w-1.5 rounded-full bg-current; }
```

- Replace `rounded-[22px]/[28px]/[32px]/[34px]/[36px]/[1.55rem]` with `rounded-2xl` (cards, modals ≤ 640px) or `rounded-3xl` (feature panels, certificate).
- Replace arbitrary shadows with `shadow-sm` (cards), `shadow-md` (hover), `shadow-xl` (modals/popovers).
- Update `lib/colors.ts` to a three-hue category palette plus neutral: SAFETY = info, FOOD_SAFETY = warning, QHSE = teal/neutral, everything else neutral. Keep `riskLevelColors` and `statusColors` semantic, and always pair color with a text label or dot.
- Replace inline job badges with `badge badge-success` / `badge badge-neutral`; do not repeat `bg-emerald-100 text-emerald-800` at call sites.

**Decorative budget**

- Allowed decorative hues: navy, gold, lime (as a highlight with navy text), and neutral. Success/warning/danger are reserved for status.
- Remove `bg-gradient-to-br ${service.color}` from service cards; use `bg-primary-50 text-primary-700` icon tiles. If categories need differentiation, use three tints, not eight.
- Replace the empty service gradient panel (`services:179`) with a real photograph, a branded diagram, or no second column. A 20%-opacity gradient rectangle is not an image.
- Replace the contact gray box (`contact:263`) with an embedded map (`title`, `loading="lazy"`, `aspect-[4/3]`, `rounded-2xl`) or an address card with a “Get directions” link.
- Admin KPI tiles: one navy icon tile; reserve gold for the single most important KPI and danger for overdue/urgent. Remove the seven-color map (`admin-dashboard-client:230-272`) and the navy→green progress gradient (`:472`).
- Replace `to-[#163d2d]` (`training:89`) with `to-primary-900`; replace `accent-400` blobs/icons with `brand-lime/20` or `primary-300/20`.
- Partner logos: `alt=""` when the logo is decorative or the name is adjacent; otherwise `alt={partner.name}`. Never “Client logo 1”.
- Do not use green (`accent`/`success`) as a CTA or decorative wash; it is a status color only.
- Keep hover transforms only on `.card-interactive` and actual links/buttons; remove `hover:-translate-y-1` from About value cards.

**Acceptance:** one font request path; every heading and body size maps to the scale; all top-level sections use `.section`/`.section-tight`; the page alternates white and `bg-slate-50` intentionally; no arbitrary radius/shadow; no decorative rainbow gradient; no empty gradient placeholder; Arabic line-height and tracking are correct; every badge has a text label and semantic variant.

---

### P2-12 — Make print a first-class output

**Files:** `app/globals.css:165-173`; `app/training/certificate/[code]/page.tsx:46,59,134,136-139,150-184`; `app/admin/admin-clients.tsx:461-471`; `app/admin/admin-reports.tsx` (report detail); `app/training/verify/page.tsx`; `app/dashboard/training-profile.tsx`

**Problem**

- The global print rule is an escape hatch for one document:

```css
@media print {
  @page { size: A4; margin: 12mm; }
  body * { visibility: hidden; }
  #client-profile-print, #client-profile-print * { visibility: visible; }
  #client-profile-print { position: absolute; inset: 0; width: 100%; }
  #client-profile-print section { break-inside: avoid; }
  #client-profile-print table { width: 100%; border-collapse: collapse; }
  #client-profile-print th, #client-profile-print td { padding: 8px; }
}
```

  Every page except the admin client-profile modal prints blank. The certificate page hides its header/footer with `print:hidden`, but its `<main>` and certificate `<section>` are **not** inside `#client-profile-print`, so `body * { visibility: hidden }` hides the certificate too.
- `print:container-auto` (`certificate:134`) is not a Tailwind utility and generates no CSS. The intended result (full-width, no padding) does not happen.
- `print:min-h-screen` on the certificate section (`:150`) forces the section to at least one viewport height inside an A4 page with 12mm margins, which can push a blank second page.
- The certificate frame is `rounded-[36px]` and `border-4`; print overrides remove the radius and border, so the printed certificate loses its frame. Browser “background graphics off” also drops the gold/lime fills unless `print-color-adjust: exact` is set.
- The certificate copy defines a print label (`:46`, `:59`) but the button renders a hardcoded “Download PDF” and only calls `downloadTrainingCertificatePdf` (`:136-139`). There is no `window.print()` path despite the “Print / Download PDF” language.
- The admin client-profile print works only because of the global ID; it is Arabic-only in both languages (`admin-clients:462-469`), and its `fixed`/`overflow-y-auto` screen layout is converted with `print:static`/`print:overflow-visible`, which is easy to break.
- Report detail, training profile, and verification result have no print styles at all. Printing them produces the global blank page.
- No `thead` repetition for long tables, no explicit `break-inside` rules outside the client profile, and no test for English vs Arabic.

**Replacement**

Replace the global visibility switch with opt-in print roots:

```css
@media print {
  @page { size: A4; margin: 12mm; }

  html, body { background: #fff !important; color: #0f172a; }

  .no-print,
  header, footer, nav,
  [data-print="hide"] {
    display: none !important;
  }

  .print-root { display: block !important; }
  .print-root,
  .print-root * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-root table { width: 100%; border-collapse: collapse; }
  .print-root thead { display: table-header-group; }
  .print-root tfoot { display: table-footer-group; }
  .print-avoid-break { break-inside: avoid; }

  .print-root img { max-width: 100%; height: auto; }
  .print-root a[href]::after { content: ""; } /* do not print raw URLs */
  .print-root { max-width: none !important; width: auto !important; margin: 0 !important; }
}
```

- Remove `body * { visibility: hidden }` and the `#client-profile-print` visibility selectors. Keep the client-profile ID only for identification, not for print visibility.
- Mark printable wrappers explicitly:
  - Certificate: `<section id="certificate-print" className="print-root ...">`.
  - Admin client profile: `id="client-profile-print" className="print-root ..."`.
  - Report detail / training profile / verification result: add `print-root` only if they are intended to be printable; otherwise hide their print buttons.
- Certificate-specific:
  - Remove `print:container-auto` and `print:min-h-screen`; use `print:max-w-none print:p-0 print:shadow-none`.
  - Keep the inner frame: `print:rounded-none` is fine, but keep a `1px` inner border and the gold rule; set `print-color-adjust: exact`.
  - Set `width: 186mm` (A4 minus 2×12mm margins), `min-height: 0`, and `break-inside: avoid`.
  - Hide the verify link and all action buttons: `print:hidden` / `.no-print`.
  - Do not scale with `transform`; use millimetre widths and `pt` font sizes for print predictability.
- Buttons: provide two explicit actions:

```tsx
<button type="button" onClick={() => window.print()} className="btn-secondary px-5 py-3">
  <Printer className="h-5 w-5" aria-hidden="true" />
  {language === 'ar' ? 'طباعة' : 'Print'}
</button>
<button type="button" onClick={() => void downloadPdf()} className="btn-primary px-5 py-3">
  <Download className="h-5 w-5" aria-hidden="true" />
  {language === 'ar' ? 'تحميل PDF' : 'Download PDF'}
</button>
```

- Admin client profile: render labels from the current language, not hardcoded Arabic; keep `print:static` on the overlay but set `print:bg-white print:p-0`; add `print-avoid-break` to each section and `thead` repetition for the report table.
- Add print tests: Chrome/Edge print preview, A4, English and Arabic, backgrounds on and off. Certificate must be exactly one page; client profile must be readable without the modal chrome; marketing pages must not print a blank sheet.

**Acceptance:** printing the certificate produces one branded A4 page; printing a non-printable page either prints its content without chrome or exposes no print action; print roots are explicit and do not depend on one hardcoded ID; `print:container-auto` is gone; the certificate has separate Print and Download PDF actions.

---

## 4. Contrast failure register

Ratios use WCAG 2.1 relative luminance. Alpha colors are composited over the actual backdrop; the ratio is for the rendered color, not the token hex. Normal text needs **4.5:1**, large text (≥18.66px bold or ≥24px) needs **3:1**, and meaningful UI boundaries/icons need **3:1** (WCAG 1.4.11).

| # | Location | Class pair | Ratio | Needs | Replacement |
|---:|---|---|---:|---:|---|
| 1 | Home final CTA `app/page.tsx:424` | `bg-accent-500 text-white` | **2.28:1** | 4.5 | `btn-signature` (gold/white 6.65) or `btn-primary` (8.72) |
| 2 | Home final CTA hover `app/page.tsx:424` | `hover:bg-accent-600` + white | **3.30:1** | 4.5 | `hover:bg-brand-gold-600` (8.89) |
| 3 | Training register CTA `app/training/page.tsx:115` | `btn-primary` #1e40af on `primary-800` hero #172554 | **1.68:1** boundary | 3:1 | `btn-lime` (10.71) or `btn-on-dark` |
| 4 | Header active nav `Header.tsx:85` | `bg-primary-600` on `primary-800` scrim | **1.42:1** boundary | 3:1 | `bg-white/15 text-white ring-1 ring-white/25` + underline; or white pill with `text-primary-700` |
| 5 | WhatsApp float `FloatingContactButtons.tsx:14` | `bg-[#25D366] text-white` | **1.98:1** | 3:1 icon | `bg-[#128C4A]` (4.31) or white surface with green icon |
| 6 | Services check icon `app/services/page.tsx:166` | `text-accent-500` on white | **2.28:1** | 3:1 | `text-primary-600` (10.36) |
| 7 | All inputs `app/globals.css:43`; auth fields; `ClientProfilePanel.tsx:48` | `border-gray-300`/`border-slate-200` on white | **1.47:1** / ~1.3:1 | 3:1 | `border-slate-500` (4.76) |
| 8 | Input placeholders `globals.css:42-44`; `login:154`; `register:191` | default `gray-400` on white | **2.54:1** | 4.5 | `placeholder:text-ink-500` (4.76) |
| 9 | Muted icons/meta `contact:264`, `dashboard:339,410`, `admin-reports:665`, `login:146` | `text-gray-400` on white | **2.54:1** | 3:1 icon / 4.5 text | `text-ink-500` (4.76); `ink-400` only for decorative duplicates |
| 10 | Knowledge-bank labels `ClientKnowledgeBank.tsx:60,64,68` | `text-slate-400` on white / `slate-50/70` | **2.56:1** / **2.45:1** | 4.5 | `text-ink-500` / `text-ink-600` |
| 11 | Admin KPI badge `admin-dashboard-client.tsx:463` | `bg-gray-100 text-gray-500` | **4.39:1** | 4.5 | `text-ink-600` (on gray-100 ~5.6) |
| 12 | File-count badge `ClientKnowledgeBank.tsx:64` | `bg-slate-100 text-slate-500` | **4.34:1** | 4.5 | `text-ink-600` |
| 13 | High-risk count `dashboard/client-dashboard.tsx:382` | `text-red-500` on white | **3.76:1** | 4.5 | `text-danger-700` (6.47) |
| 14 | Verify labels `training/verify/page.tsx:72-75` | `text-emerald-800/70` on `emerald-50` (composited #4b8e7b) | **3.65:1** | 4.5 | `text-success-800` solid (~8.5) |
| 15 | Dark-surface focus rings `globals.css:27`; training CTA | `focus:ring-primary-500` on `primary-800` | **1.68:1** | 3:1 | `focus-visible:ring-white focus-visible:ring-offset-primary-900` |

**Do not introduce**

| Pair | Ratio | Rule |
|---|---:|---|
| `brand-gold #8B4D00` on `primary-900 #0f172a` | **2.69:1** | Never gold text on navy. Gold is a fill with white text. |
| White on `brand-lime #97D700` | **1.74:1** | Never white on lime. Use `text-primary-950` on lime (10.71). |
| White on `primary-500` + `primary-500` focus ring | 8.72 text / 1.0 ring | The focus ring disappears into the button fill; use a white offset ring on dark or `ring-offset-2`. |

**Non-contrast token failures**

These classes generate **no CSS at all**, so they are not “low contrast” — the intended color never renders:

- `bg-white/92` (`login:125`, `register:142`) — the auth card has no background; it relies on `border-white/85` and backdrop blur.
- `text-[#8B4D00]/72` (`login:134`, `register:147`) — the kicker inherits body text instead of gold.
- `from-primary-950/85`, `via-primary-950/70`, `bg-primary-950`, `shadow-primary-950/30` (`Header:56`, `page:202,225,259`) — `primary-950` is absent from the palette.
- `bg-white/95` and `border-white/85` do compile; the failure is specific to the 92/72 steps and the missing 950 shade.
- `print:container-auto` (`certificate:134`) is not a Tailwind utility and emits nothing.

**Verified passes worth preserving:** white on `primary-500` 8.72; white on `primary-600` 10.36; `primary-600` text on white 10.36; gold on white 6.65; lime with `primary-950` text 10.71; `success-700` on white 5.21; `danger-600` on white 4.83; `danger-700` on white 6.47; `ink-600` on white 7.58; `ink-500` on white 4.76 (the accessible neutral floor); the blue call float `bg-[#3B82F6] text-white` at 3.68:1 passes for a large icon, but still unify it to `bg-primary-500` so the float pair is system-consistent.

---

## 5. Accessibility blockers that are not contrast

These are not color issues, and they are more expensive to retrofit than a token change. File references point to the current implementation; the fix column states the required pattern.

| # | Blocker | Evidence | Why it fails | Required fix |
|---:|---|---|---|---|
| 1 | Marketing/auth pages have no `<main>` landmark and no skip link | `app/page.tsx:158-160` renders `<div>` → `<Header />` → sections → `<Footer />`; same for `about`, `services`, `contact`, `jobs`, `training`, `login`, `register`. `app/layout.tsx:32-38` has no skip link. | Screen-reader users cannot jump to content; keyboard users tab through the entire nav on every page. Only dashboard/admin/training-detail pages use `<main>`. | Add `<a href="#main" className="skip-link">Skip to content</a>` as the first focusable element and wrap page content in `<main id="main" tabIndex={-1}>`. One `<main>` per page. |
| 2 | Nested `<main>` landmarks | `components/ClientKnowledgeBank.tsx:65` and `app/admin/admin-knowledge-bank-explorer.tsx:53` render `<main>` inside the dashboard `<main>` (`client-dashboard:224`, `admin-dashboard-client:144`). | Multiple main landmarks confuse landmark navigation. | Use `<section aria-labelledby="...">` or `<div>` inside the page-level `<main>`. |
| 3 | Report cards are clickable `<div>`s | `app/dashboard/client-dashboard.tsx:350-353`: `onClick={() => setSelectedReport(report)}` on a `<div className="card ... cursor-pointer">`, no `role`, `tabIndex`, or key handler. | Mouse-only; cannot be opened with Tab/Enter/Space; no focus ring. | Make the card a `<button>` or wrap the title in a `<Link>`; keep download/eye as sibling buttons with `stopPropagation`. Add `focus-visible:ring-2`. |
| 4 | Table rows are clickable `<tr>`s | `app/admin/admin-dashboard-client.tsx:513-517`: `<tr onClick={() => onOpenReports()}>` with `cursor-pointer`, no keyboard support. | Same as above; also invalid interactive semantics on a row. | Put a `<Link>` on the site name (primary target) and keep the row hover visual. If the whole row must navigate, add `tabIndex={0}`, `role="link"`, `onKeyDown` for Enter/Space, and a visible focus ring. |
| 5 | Icon action targets are 28–32px | `app/admin/admin-reports.tsx:472-492` `p-1.5` + 16px icon = 28px; `admin-clients:400`; `client-dashboard:395-405` `p-2` + 20px = 36px; `admin-reports:665` close button is 20px; `LanguageSwitcher.tsx:13` is ~32px high. | WCAG 2.5.8 target size (minimum 24px, enhanced 44px) and mobile usability. | `inline-flex h-11 w-11 items-center justify-center` for every icon button; 44px minimum. Keep visual icon at 16–20px inside the 44px target. |
| 6 | Modals have no dialog semantics or focus management | `admin-reports.tsx:661-662`, `admin-clients.tsx:461`, `admin-jobs.tsx:327`; only `ClientKnowledgeBank.tsx:72` has `role="dialog" aria-modal="true"`. None has Escape handling, focus trap, or body scroll lock. | Keyboard focus stays behind the overlay; Escape does nothing; screen readers do not announce the dialog. | Use one `<Dialog>` primitive: `role="dialog" aria-modal="true" aria-labelledby`, focus first field/close on open, trap Tab, close on Escape/overlay click, restore trigger focus, lock scroll. |
| 7 | Tabs have no tab semantics | `client-dashboard.tsx:250-256`, `admin-dashboard-client.tsx:157-169` render plain `<button>`s with no `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, or `role="tabpanel"`. | Screen readers announce a row of buttons with no selected state; arrow-key navigation is absent. | Add the ARIA tabs pattern (P1-9) and `aria-selected`; use `aria-controls`/`id` pairs; support Left/Right/Home/End. |
| 8 | Mobile menu trigger is unlabeled and not stateful | `Header.tsx:150-157` icon-only button with no `aria-label`; menu at `:163` has no `aria-expanded`, `aria-controls`, role, Escape, or scroll lock. | Screen readers announce “button” with no name; state changes are silent. | `aria-label={open ? 'Close menu' : 'Open menu'}`, `aria-expanded`, `aria-controls="mobile-nav"`, `role="dialog"`, Escape, focus trap, scroll lock (P1-5). Localize the label. |
| 9 | Form labels are visually adjacent but not programmatically associated | `contact:132-177`, `jobs:387-447`, `admin-reports:294-379` use `<label className="label-field">` with no `htmlFor` and inputs with no `id`. Required `*` is plain text. | Clicking the label does not focus the field; screen readers may announce “edit text” with no name; required state is not announced. | `<label htmlFor="contact-name">… <span aria-hidden="true">*</span><span className="sr-only">required</span></label>` + `id`, `name`, `autoComplete`, `aria-invalid`, `aria-describedby`. Use P0-4’s field contract. |
| 10 | Hidden file input is not keyboard reachable | `jobs:433-437` uses `className="hidden"` inside a `<label>`; the label is not focusable. | Keyboard users cannot upload a CV, blocking the primary jobs journey. | Use `className="sr-only peer"` on the input and `peer-focus-visible:ring-2` on the visible dropzone; keep the label as the click target; show file name/size and a remove button. |
| 11 | Radio cards have no visible focus and rely on border color | `training/[slug]/page.tsx:283-296`: `sr-only` input, selected state `border-primary-400 bg-primary-50`, no `peer-focus-visible`, no check icon. | Keyboard users cannot see which option is focused; selection is color-only for low-vision users. | `className="peer sr-only"` + label `peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-checked:border-primary-600 peer-checked:bg-primary-50`; add a check icon and keep text. |
| 12 | Icon-only actions have no accessible name | `dashboard:390-409` download/view buttons use `title` only; `admin-reports:472-492` four icon buttons have no `aria-label`; `admin-reports:665` close has none. | `title` is not a reliable accessible name and does not appear on touch. | `aria-label={t('reports.downloadPDF')}` etc.; add `<span className="sr-only">` as fallback. |
| 13 | Logo and partner image alt text is generic/duplicated | `BrandLogo.tsx` always uses `alt="QHSSE Consultant logo"`; `page:396` uses `alt={\`Client logo ${index + 1}\`}`; observation images repeat `alt={group.label}` (`client-dashboard:123-127`). | Adds noise, no information; duplicates the adjacent text name. | Decorative logos `alt=""`; meaningful partner logos `alt={partner.name}`; observation images `alt={image.caption || t('reports.evidencePhoto')}`. Add `aria-label` to the logo link, not the image. |
| 14 | Motion preferences are only partly respected | `globals.css:129-135` disables the hero animations, but `html { scroll-behavior: smooth }` (`:8-10`), `.fade-in`/`.slide-up` (`:62-68`), and card hover transforms are not covered. | Users who request reduced motion still get smooth scrolling and entrance animations. | `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } .fade-in, .slide-up { animation: none; } * { transition-duration: 0.01ms !important; } }` and `motion-reduce:` on hover lifts. |
| 15 | Toast is the only error channel and is always blue | `components/Providers.tsx:18` sets `background: '#1e40af'` for all toast types; auth, contact, jobs, and training errors are toast-only. | Errors are not tied to the field, disappear, and are not announced inline; success/error look identical. | Semantic toast variants (`success-700`, `danger-700`, `primary-700`), `aria-live="polite"`, and inline `role="alert"` errors for forms (P0-4, P1-10). |
| 16 | Tables lack captions, header scope, and localized dates | `admin-reports:443-452`, `admin-activity-log:68-75`, `admin-dashboard-client:499-508`; `toLocaleDateString()` with no locale at `admin-reports:458`, `admin-dashboard:520`, `admin-clients:467`. | Screen readers cannot associate headers with cells; dates flip between US/EU formats and do not follow the Arabic locale. | `<caption className="sr-only">`, `<th scope="col">`, `text-start`, `tabular-nums`, and `Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', …)`. |
| 17 | Language switcher target and label | `LanguageSwitcher.tsx:13-14`: ~32px high, `aria-label="Switch language"` in English even in Arabic. | Target below 44px; the control’s purpose is not localized. | `min-h-11 px-3`, `aria-label={language === 'ar' ? 'تغيير اللغة' : 'Switch language'}`, `aria-live` on the label or `lang` attributes. |

**Already good, keep it:** the knowledge-bank preview has `role="dialog" aria-modal="true"` and a labeled close button (`ClientKnowledgeBank.tsx:72`); primary buttons and inputs have visible focus rings; Lucide icons are consistently sized; all tables that need it already have an `overflow-x-auto` wrapper; `aria-current` is absent but easy to add in P1-5.

---

## 6. RTL, responsive, state, and print audits

### 6.1 RTL coverage

| Surface | Mechanism today | Status | Remaining work |
|---|---|---|---|
| Document shell | `<html lang="en" dir="ltr">` in `layout.tsx:32`; `applyLanguageAttributes` sets `lang`/`dir` only after the provider mounts and translations load (`language-context.tsx:44-47,64-75`). | **Fail** | Server-render from a cookie, or add a blocking `<head>` script so Arabic never flashes LTR. Hydrate the provider from the same value. |
| Header | Nested `dir` on the header row, nav, and right cluster (`Header.tsx:60,78,97,163`); `mr-auto`/`ml-auto` at `:97`. | **Partial** | One document direction; `ms-auto`; remove nested `dir`; mirror the logo cluster order only through logical flow. |
| Auth | `left-4`/`right-4` icons and `pl-12`/`pr-12` padding (`login:146-175`, `register:168-232`). | **Fail** | `start-4`/`end-4`, `ps-12`/`pe-12`; test password toggle and mail/lock icons in Arabic. |
| Marketing | Home text alignment is computed (`page:177`), but blobs and fades use `-right-24`, `left-0`, `right-0` (`page:172-173,381-382`); About blob `right-0 translate-x-1/2` (`about:118`); training profile `-right-20` (`training-profile:114`). | **Partial** | Use `-end-24`, `start-0`, `end-0`; for directional fades use `rtl:bg-gradient-to-l` or a `[dir=rtl]` CSS rule. |
| Dashboard | `ClientProfilePanel` uses logical `start`/`me`; `ClientKnowledgeBank` uses `border-l` and `text-right` (`:60,64,68`). | **Partial** | `border-s`, `text-start`; keep `paddingInlineStart` (already used at `:64`). |
| Admin tables | `text-left` headers (`admin-reports:446-451`, `admin-activity-log:71-74`); `admin-dashboard` computes alignment correctly (`:223`). | **Fail** | `text-start`/`text-end`; numbers `text-end tabular-nums`. |
| Admin forms | `left-3` icons (`admin-jobs:436,493,505`; `admin-clients:237-325`); knowledge-bank stats `border-l` (`admin-knowledge-bank-workspace:32`). | **Fail** | `start-3`, `border-s`; test select chevrons and date inputs. |
| Floating contact | Fixed `right-4 md:right-6` (`FloatingContactButtons.tsx:8`). | **Exception** | Mirror to `end-4 md:end-6` or document a deliberate bottom-right exception. |
| Dates/numbers | `toLocaleDateString()` with no locale (`admin-reports:458`, `admin-dashboard:520`, `admin-clients:467`); `toLocaleString(undefined)` (`admin-activity-log:42`). | **Partial** | `Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', …)`; use Western digits for IDs/codes, Arabic-Indic only if the brand requires. |
| Content | About “Our Commitment” and its paragraph are hardcoded English (`about:121-123`) on the Arabic page; `aria-label="Switch language"` is English-only. | **Fail** | Move all copy to the translation layer; localize control labels. |

### 6.2 Responsive coverage

| Width / condition | Observed result | Verdict |
|---|---|---|
| 320px | Client dashboard tab bar overflows the document; certificate inner content is ~120px wide with a 150px logo; auth card uses a 170–190px logo; floating contact overlaps the bottom-right control; header is 72px. | **Fail** |
| 360 / 390px | Same tab overflow; admin’s eight tabs are off-screen with no affordance; jobs form sits below the list and is not revealed after selection; auth card radius/padding dominates the viewport. | **Fail** |
| 640px | Two-column form grids start; cards reflow; header still uses the mobile menu. | **Pass with caveats** |
| 768px | Nav remains a hamburger until `lg` (acceptable for a 6-link nav); jobs stays stacked; admin tables scroll horizontally; no broken layout. | **Partial** |
| 1024px | Header is 16px out of alignment with the container; admin tabs are cramped; jobs sticky form begins and is taller than a 768px viewport; certificate is comfortable. | **Fail** |
| 1280px | Header is 8px out of alignment; jobs form still ~900–1000px tall in an 800px viewport; marketing grid is stable. | **Partial** |
| 1440px | Header logo starts ~72px left of the page content; `max-w-7xl` content is centered while the header is full-bleed. | **Fail** |
| Landscape phone / short window | Sticky jobs panel and `90vh` modals clip their actions; no internal scroll on the jobs panel. | **Fail** |

**What already works:** all major grids collapse to one column; tables have `overflow-x-auto` wrappers; images are responsive; hero type steps down; cards use flexible heights; the container is centered on marketing pages. The failures are concentrated in tab bars, the jobs panel, the certificate, the header container, modals, and fixed floating elements.

### 6.3 State coverage

| Surface | Loading | Empty | Error | Retry | Notes |
|---|---|---|---|---|---|
| Jobs list | Spinner only | False empty after error | Toast only | No | Error and “no open roles” are indistinguishable. |
| Training catalog | Spinner only | False empty after error | Toast only | No | Same false-empty pattern. |
| Dashboard reports | Spinner only | “No reports” for both empty and failed fetch | Console only | No | `fetchReports` ignores non-OK responses. |
| Client knowledge bank | Spinner | Yes | Inline error card | Yes | The best existing pattern; upgrade loading to a skeleton. |
| Admin reports | Spinner only | `<div>` after `</table>` | None | No | Empty state is outside table semantics; non-OK responses are swallowed. |
| Admin activity log | Spinner only | Empty table | None | No | No error branch at all. |
| Admin training | Spinner only | No explicit empty state | Toast only | No | Failed load leaves empty tables. |
| Admin clients / jobs / contact requests | Spinner only | Card empty state | Toast or silent | Partial | Consistent only in being inconsistent. |
| Client profile panel | Spinner | `return null` when no profile | `return null` | No | A failed load looks like “no profile”. |
| Auth | Button pending state | n/a | Toast only | n/a | No inline error region. |
| Contact | Button pending state | n/a | Toast only | n/a | No field-level error. |
| Certificate | Spinner + text | “Failed to load” card | Toast + not-found card | No explicit retry | The not-found card is shown for auth/network failures too. |

### 6.4 Print coverage

| Document | Current result | Cause | Required |
|---|---|---|---|
| Training certificate | **Blank page(s)** | Global `body * { visibility: hidden }`; certificate is not inside `#client-profile-print`; invalid `print:container-auto`; `print:min-h-screen` overflow. | Add `print-root` to the certificate; remove the global visibility rule; one A4 page with brand colors. |
| Admin client profile | Works, Arabic-only | Only element inside `#client-profile-print`; hardcoded Arabic labels. | Keep the print root; localize labels; add table header repetition and break rules. |
| Admin report detail | Blank | No print root; global rule hides it. | Add a print root or remove the print action. |
| Training profile | Blank | No print root. | Add a print root if printable; otherwise hide print. |
| Certificate verification result | Blank | No print root. | Add a compact verification receipt print root if needed. |
| Marketing pages | Blank | Global rule hides all content. | Print content without chrome, or explicitly mark “not printable”. |

---

## 7. Token and component migration map

Use this as the mechanical checklist for the design-system PR. The left column is what exists today; the right column is the target contract from §2.

### 7.1 Color and token aliases

| Current | Replace with | Notes |
|---|---|---|
| `gray-50/100/200/…` and `slate-*` mixed | `slate-*` for surfaces/borders; `ink-*` for text | One neutral ramp. `ink-500` is the accessible muted floor. |
| `accent-50…900` | `success-50…800` | Green is a status color only; never a CTA fill with white text. |
| `bg-[#3a4fc4]`, `hover:bg-[#3147bd]` | `bg-primary-500`, `hover:bg-primary-600` | Auth indigo is not a brand color. |
| `text-[#8B4D00]`, `text-[#8B4D00]/72` | `text-brand-gold` (no opacity step) | 6.65:1 on white; opacity 72 does not compile. |
| `bg-[#25D366] text-white` | `bg-[#128C4A] text-white` or a `whatsapp` token | 1.98:1 → 4.31:1. |
| `bg-[#3B82F6]` | `bg-primary-500` | 3.68 → 8.72. |
| `to-[#163d2d]`, `accent-400` decorative | `primary-900`, `brand-lime/20` | Keep decorative hues inside the brand. |
| `bg-white/92` | `bg-white` or `bg-white/95` | 92 is not in the opacity scale. |
| `primary-950` (missing) | Add `950: '#0b1222'` | Enables header scrim, hero frame, deepest surface. |
| `text-gray-400` for metadata | `text-ink-500` (text) / `text-ink-400` (decorative only) | 2.54:1 → 4.76:1. |
| `border-gray-300` inputs | `border-slate-500` | 1.47:1 → 4.76:1. |
| `text-red-500` text | `text-danger-700` | 3.76:1 → 6.47:1. |
| `text-emerald-800/70` | `text-success-800` | 3.65:1 → ~8.5:1. |

### 7.2 Typography

| Current | Replace with |
|---|---|
| `@import` Google Fonts + `next/font` | `next/font` variables only |
| `fontFamily.sans: ['Inter','Cairo']` | `['var(--font-inter)', …]`; `arabic: ['var(--font-cairo)', …]` |
| `tracking-[0.55em]` auth kicker | `text-eyebrow` (0.18em) |
| `leading-9` at 16–20px | `leading-relaxed` (1.625) |
| `text-[10px]`, `text-[11px]`, arbitrary sizes | `text-caption` (12/1.5) or `text-sm` |
| `font-black` / 900 | `font-bold` (700); `font-extrabold` only for the logo |
| Arabic body line-height 1.5 | 1.8; Arabic heading tracking 0 |

### 7.3 Spacing, layout, radius, elevation

| Current | Replace with |
|---|---|
| `py-20 md:py-28`, `py-20 md:py-24`, `py-16 md:py-20` | `.section` (`py-16 md:py-24`) or `.section-tight` (`py-12 md:py-16`) |
| `mb-16`, `mb-12`, `mb-10`, `mb-8` section headers | `.section-header` (`mb-10 md:mb-14`) |
| `rounded-[22px]/[28px]/[32px]/[34px]/[36px]/[1.55rem]` | `rounded-lg/xl/2xl/3xl/full` |
| `shadow-[0_32px_100px_…]`, `shadow-[0_10px_32px_…]` | `shadow-sm/md/xl` |
| `w-full px-4 sm:px-6 lg:px-10` (header/portal) | `container-custom` |
| `min-h-screen` app shells | `min-h-dvh` |
| `w-fit` tab bars | `w-full overflow-x-auto` + `shrink-0` children, or admin sidebar |
| `z-[60]`, `z-[70]`, `z-[80]` | named z-index scale: header 40, floating 50, modal 60, preview 70, toast 80 |
| `window.confirm` | branded `<Dialog>` with focus trap |

### 7.4 Logical properties

| Physical | Logical |
|---|---|
| `left-*` / `right-*` | `start-*` / `end-*` |
| `pl-*` / `pr-*` | `ps-*` / `pe-*` |
| `ml-*` / `mr-*` | `ms-*` / `me-*` |
| `text-left` / `text-right` | `text-start` / `text-end` |
| `border-l` / `border-r` | `border-s` / `border-e` |
| `rounded-l-*` / `rounded-r-*` | `rounded-s-*` / `rounded-e-*` |
| `inset-y-0 left-0` | `inset-y-0 start-0` |

### 7.5 Component classes to add

| Class | Contract |
|---|---|
| `.card-interactive` | Hover lift/shadow and `focus-within` ring; only for links/buttons. |
| `.card-table` | `p-0 overflow-hidden`; table owns its padding. |
| `.card-form` | `p-6 md:p-8`; form sections `space-y-6`. |
| `.btn-signature` | Gold fill, white text; one per page. |
| `.btn-lime` | Lime fill, `primary-950` text; dark surfaces only. |
| `.btn-on-dark` | White fill, navy text; dark hero secondary/primary. |
| `.input-field[aria-invalid="true"]` | Danger border + ring. |
| `.field-error`, `.field-hint` | Inline validation and helper text. |
| `.badge-*` | Semantic badge variants with 6px dot. |
| `.empty-state` | 48px icon, title, body, one CTA. |
| `.skeleton` | Geometry-matched pulse with reduced-motion fallback. |
| `.table-shell` | Rounded border, `overflow-hidden`, inner `overflow-x-auto`. |
| `.tablist` / `.tab` | ARIA tabs, scrollable on mobile. |
| `.print-root` | Explicit printable document root. |

---

## 8. Method, coverage, and verification

### 8.1 What was reviewed

**Configuration and shell:** `tailwind.config.js`; `app/globals.css`; `app/layout.tsx`; `components/Providers.tsx`; `context/language-context.tsx`.

**Components:** `Header.tsx`, `Footer.tsx`, `BrandLogo.tsx`, `LanguageSwitcher.tsx`, `FloatingContactButtons.tsx`, `ClientProfilePanel.tsx`, `ClientKnowledgeBank.tsx`.

**Public pages:** `app/page.tsx`; `about`; `services`; `contact`; `jobs`; `training`; `training/[slug]`; `training/certificate/[code]`; `training/verify`; `login`; `register`.

**Portal pages:** `dashboard/page.tsx`, `dashboard/client-dashboard.tsx`, `dashboard/training-profile.tsx`; `admin/page.tsx`, `admin/admin-dashboard-client.tsx`, `admin/admin-reports.tsx`, `admin/admin-activity-log.tsx`, `admin/admin-training.tsx`, `admin/admin-clients.tsx`, `admin/admin-jobs.tsx`, `admin/admin-contact-requests.tsx`, `admin/admin-knowledge-bank-explorer.tsx`, `admin/admin-knowledge-bank-panel.tsx`, `admin/admin-knowledge-bank-workspace.tsx`.

**Data/asset helpers:** `lib/colors.ts`, `lib/service-cards.ts`; `public/brand/qhsse-logo-header.svg`, `qhsse-logo-mark.svg`, `qhsse-logo-stacked.svg`.

### 8.2 How the findings were verified

1. **Static source review.** Every finding cites a file and line from the current working tree. No application file was modified.
2. **Tailwind compilation checks.** The installed Tailwind CLI was run in a temporary directory with the project config and content. `bg-white/92`, `text-[#8B4D00]/72`, `from-primary-950/85`, `via-primary-950/70`, `bg-primary-950`, and `shadow-primary-950/30` produced no declarations; `border-white/85` and `bg-white/95` did. This confirms the auth card and hero scrim are not merely low-contrast — they do not render.
3. **WCAG contrast calculation.** A Node script implemented the WCAG 2.1 relative-luminance formula. Alpha colors were composited over the actual backdrop (for example, `emerald-800/70` over `emerald-50` = `#4b8e7b`, 3.65:1). All values in §4 are computed, not estimated.
4. **Asset inspection.** SHA-256 `D4DC78C8C1D4D9C4728C33A8B3A3C9FC808E5551A922624660AEFDEB3F8206CE`; each brand file is 926,632 bytes and contains the same 1024×1024 raster twice.
5. **What was not tested at runtime:** no dev server, browser automation, screen reader, axe scan, or physical print output. The report is a static design audit; §8.4 lists the runtime checks required before sign-off.

### 8.3 Constraints and assumptions

- **Read-only:** no application code, config, or assets were changed. `docs/audit/ui-design.md` is the only file created.
- **No build:** production CSS output was not generated; Tailwind behavior was verified with the installed CLI in a temp directory.
- **Brand assumption:** navy is the structural color, gold `#8B4D00` is the signature, lime `#97D700` is a highlight. Indigo `#3a4fc4` and the ad-hoc green CTA are treated as off-system.
- **No dark mode:** the app has no dark theme; the spec does not add one. If dark mode is planned, semantic tokens (`surface`, `ink`, `border`) should be designed now rather than adding a second palette later.
- **Translations:** translation message quality and completeness were not audited beyond visible hardcoded English (About “Our Commitment”) and locale-less dates.
- **PDF:** certificate/report PDF generators were not inspected; print CSS is separate from PDF output.

### 8.4 Recommended verification before sign-off

1. **Contrast:** run axe or Lighthouse on home, auth, jobs, dashboard, and admin; confirm 0 color-contrast violations at AA for the pairs in §4.
2. **Keyboard:** tab through home → contact → login → dashboard → admin; verify skip link, visible focus, tabs, modals, file upload, and radio cards.
3. **Screen reader:** VoiceOver/NVDA on the login form, dashboard report list, admin table, and certificate preview.
4. **RTL:** set Arabic in `localStorage`, hard-reload every audited page; confirm no LTR flash, no icon/padding flips, tables start-aligned, dates localized.
5. **Responsive:** 320, 360, 390, 768, 1024, 1280, 1440; portrait and landscape; check no horizontal document scroll and no clipped CTAs.
6. **Print:** Chrome/Edge print preview, A4, English and Arabic, backgrounds on/off; certificate exactly one page; no blank sheets.
7. **Performance:** confirm the header no longer preloads a 926 KB asset; measure LCP on home and auth before/after the logo fix.

### 8.5 What to preserve

- The navy/white consultancy shell, the centered `.container-custom`, and the Lucide icon language.
- The gold/lime brand accents — they are distinctive; the problem is their misuse, not their existence.
- The bilingual content architecture and the existing `t()`/`language` plumbing.
- The primary button/input focus rings and the high-contrast `primary-500`/white pairing.
- The knowledge-bank inline error + retry pattern; make it the template for every data surface.
- The table `overflow-x-auto` wrappers and the responsive grid collapse already in place.

---

**End of audit.** The report is intentionally implementation-oriented: every P0/P1 item names the file, the current class or markup, the failure, and the replacement. The design-system spec in §2 is the target; §3 is the ordered work; §4–§6 are the verification registers; §7 is the migration checklist.
