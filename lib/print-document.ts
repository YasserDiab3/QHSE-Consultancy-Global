export interface PrintOptions {
  element: HTMLElement
  title?: string
  lang?: string
  dir?: 'rtl' | 'ltr'
  extraCss?: string
}

/**
 * Universal, isolated document printing utility.
 * Solves:
 * 1. 0 blank pages (no parent DOM tree).
 * 2. 100% style preservation by extracting active CSS rules from document.styleSheets
 *    and injecting explicit print grid/card rules.
 * 3. No broken images by resolving relative image URLs against window.location.origin.
 * 4. Eliminates blob URL restrictions by using a same-origin DOM-written iframe.
 */
export async function printElement({
  element,
  title = 'Document',
  lang = 'ar',
  dir = 'rtl',
  extraCss = '',
}: PrintOptions): Promise<void> {
  if (typeof window === 'undefined' || !element) {
    if (typeof window !== 'undefined') {
      window.print()
    }
    return
  }

  // 1. Clone element and rewrite relative image URLs to absolute URLs
  const clone = element.cloneNode(true) as HTMLElement
  const images = clone.querySelectorAll<HTMLImageElement>('img')
  images.forEach((img) => {
    img.removeAttribute('srcset')
    const rawSrc = img.getAttribute('src')
    if (rawSrc) {
      try {
        img.src = new URL(rawSrc, window.location.origin).href
      } catch {
        // Keep existing if unparseable
      }
    }
  })

  // 2. Extract active CSS rules from document.styleSheets (same-origin Tailwind build)
  let collectedCss = ''
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules || sheet.rules
      if (rules) {
        for (const rule of Array.from(rules)) {
          collectedCss += rule.cssText + '\n'
        }
      }
    } catch {
      // Cross-origin stylesheet (e.g. Google Fonts) will be loaded via <link>
    }
  }

  // 3. Fallback <link> tags with absolute URLs
  const linkTags = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
    .map((link) => {
      const href = link.getAttribute('href')
      if (!href) return ''
      try {
        const absHref = new URL(href, window.location.origin).href
        return `<link rel="stylesheet" href="${absHref}">`
      } catch {
        return ''
      }
    })
    .filter(Boolean)
    .join('\n')

  // 4. Extract any inline style tags
  const inlineStyles = Array.from(document.querySelectorAll('style'))
    .map((s) => s.outerHTML)
    .join('\n')

  const origin = window.location.origin

  // 5. Construct standalone printable HTML document
  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <base href="${origin}/" />
    <title>${title}</title>
    ${linkTags}
    ${inlineStyles}
    <style>
      /* Extracted Runtime CSS */
      ${collectedCss}
    </style>
    <style>
      /* Print Page & Layout Guarantees */
      @page {
        size: A4 portrait;
        margin: 12mm 10mm;
      }
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-sizing: border-box !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        font-family: 'Cairo', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        line-height: 1.5;
        font-size: 13px;
        -webkit-font-smoothing: antialiased;
      }
      .no-print, .print\\:hidden {
        display: none !important;
      }
      .print\\:block {
        display: block !important;
      }
      .print\\:flex {
        display: flex !important;
      }
      .print\\:grid {
        display: grid !important;
      }

      /* Grid & Flex Layouts for Print */
      .grid {
        display: grid !important;
      }
      .grid-cols-1 {
        grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
      }
      .grid-cols-2, .sm\\:grid-cols-2, .md\\:grid-cols-2, .print\\:grid-cols-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      .grid-cols-3, .sm\\:grid-cols-3, .md\\:grid-cols-3, .print\\:grid-cols-3 {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }
      .grid-cols-4, .sm\\:grid-cols-4, .md\\:grid-cols-4, .print\\:grid-cols-4 {
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      }
      .col-span-1 {
        grid-column: span 1 / span 1 !important;
      }
      .col-span-2, .sm\\:col-span-2, .md\\:col-span-2, .print\\:col-span-2 {
        grid-column: span 2 / span 2 !important;
      }
      .gap-1 { gap: 0.25rem !important; }
      .gap-1\\.5 { gap: 0.375rem !important; }
      .gap-2 { gap: 0.5rem !important; }
      .gap-3 { gap: 0.75rem !important; }
      .gap-4 { gap: 1rem !important; }
      .gap-6 { gap: 1.5rem !important; }
      .gap-8 { gap: 2rem !important; }

      .flex {
        display: flex !important;
      }
      .inline-flex {
        display: inline-flex !important;
      }
      .flex-col {
        flex-direction: column !important;
      }
      .flex-row, .sm\\:flex-row, .print\\:flex-row {
        flex-direction: row !important;
      }
      .items-center {
        align-items: center !important;
      }
      .justify-between, .sm\\:justify-between, .print\\:justify-between {
        justify-content: space-between !important;
      }
      .justify-center {
        justify-content: center !important;
      }
      .text-center {
        text-align: center !important;
      }
      .text-start {
        text-align: start !important;
      }
      .text-end {
        text-align: end !important;
      }

      /* Card Styling, Spacing & Elevation */
      .rounded-lg { border-radius: 0.5rem !important; }
      .rounded-xl { border-radius: 0.75rem !important; }
      .rounded-2xl { border-radius: 1rem !important; }
      .rounded-3xl { border-radius: 1.5rem !important; }
      .rounded-full { border-radius: 9999px !important; }

      .border { border-width: 1px !important; border-style: solid !important; }
      .border-b { border-bottom-width: 1px !important; border-bottom-style: solid !important; }
      .border-b-2 { border-bottom-width: 2px !important; border-bottom-style: solid !important; }
      .border-b-4 { border-bottom-width: 4px !important; border-bottom-style: solid !important; }
      .border-t { border-top-width: 1px !important; border-top-style: solid !important; }
      .border-t-2 { border-top-width: 2px !important; border-top-style: solid !important; }
      .border-dashed { border-style: dashed !important; }

      .p-2 { padding: 0.5rem !important; }
      .p-3 { padding: 0.75rem !important; }
      .p-4 { padding: 1rem !important; }
      .p-5 { padding: 1.25rem !important; }
      .p-6 { padding: 1.5rem !important; }
      .px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
      .px-2\\.5 { padding-left: 0.625rem !important; padding-right: 0.625rem !important; }
      .px-3 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
      .px-4 { padding-left: 1rem !important; padding-right: 1rem !important; }
      .px-5 { padding-left: 1.25rem !important; padding-right: 1.25rem !important; }
      .py-0\\.5 { padding-top: 0.125rem !important; padding-bottom: 0.125rem !important; }
      .py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
      .py-2\\.5 { padding-top: 0.625rem !important; padding-bottom: 0.625rem !important; }
      .pb-4 { padding-bottom: 1rem !important; }
      .pb-6 { padding-bottom: 1.5rem !important; }
      .pt-3 { padding-top: 0.75rem !important; }
      .pt-6 { padding-top: 1.5rem !important; }
      .mt-0\\.5 { margin-top: 0.125rem !important; }
      .mt-1 { margin-top: 0.25rem !important; }
      .mt-2 { margin-top: 0.5rem !important; }
      .mt-4 { margin-top: 1rem !important; }
      .mt-8 { margin-top: 2rem !important; }
      .mb-2 { margin-bottom: 0.5rem !important; }
      .mb-3 { margin-bottom: 0.75rem !important; }
      .mb-4 { margin-bottom: 1rem !important; }
      .space-y-6 > * + * { margin-top: 1.5rem !important; }
      .space-y-8 > * + * { margin-top: 2rem !important; }

      /* Typography & Hierarchy */
      .text-\\[10px\\] { font-size: 10px !important; line-height: 14px !important; }
      .text-\\[11px\\] { font-size: 11px !important; line-height: 15px !important; }
      .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
      .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
      .text-base { font-size: 1rem !important; line-height: 1.5rem !important; }
      .text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
      .text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
      .text-2xl { font-size: 1.5rem !important; line-height: 2rem !important; }
      .text-3xl { font-size: 1.875rem !important; line-height: 2.25rem !important; }
      .text-4xl { font-size: 2.25rem !important; line-height: 2.5rem !important; }
      .font-medium { font-weight: 500 !important; }
      .font-semibold { font-weight: 600 !important; }
      .font-bold { font-weight: 700 !important; }
      .font-extrabold { font-weight: 800 !important; }
      .font-black { font-weight: 900 !important; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }
      .uppercase { text-transform: uppercase !important; }
      .tracking-wider { letter-spacing: 0.05em !important; }
      .tracking-tight { letter-spacing: -0.025em !important; }
      .leading-relaxed { line-height: 1.625 !important; }

      .w-auto { width: auto !important; }
      .w-full { width: 100% !important; }
      .w-20 { width: 5rem !important; }
      .w-48 { width: 12rem !important; }
      .h-full { height: 100% !important; }
      .h-16 { height: 4rem !important; }
      .h-20 { height: 5rem !important; }
      .mx-auto { margin-left: auto !important; margin-right: auto !important; }
      .shrink-0 { flex-shrink: 0 !important; }
      .object-contain { object-fit: contain !important; }

      /* Table formatting */
      table {
        width: 100% !important;
        border-collapse: collapse !important;
      }
      thead {
        display: table-header-group !important;
      }
      tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      th {
        background-color: #f8fafc !important;
        font-weight: 700 !important;
      }
      th, td {
        padding: 6px 10px !important;
        border: 1px solid #e2e8f0 !important;
      }
      .divide-y > * + * { border-top-width: 1px !important; border-top-style: solid !important; }
      .divide-slate-100 > * + * { border-top-color: #f1f5f9 !important; }

      /* Card Backgrounds and Borders */
      .bg-white { background-color: #ffffff !important; }
      .bg-slate-50 { background-color: #f8fafc !important; }
      .bg-slate-100, .bg-slate-100\\/60 { background-color: #f1f5f9 !important; }
      .border-slate-200 { border-color: #e2e8f0 !important; }
      .border-slate-300 { border-color: #cbd5e1 !important; }
      .border-slate-900, .border-slate-900\\/80 { border-color: #0f172a !important; }
      .text-slate-900 { color: #0f172a !important; }
      .text-slate-800 { color: #1e293b !important; }
      .text-slate-700 { color: #334155 !important; }
      .text-slate-600 { color: #475569 !important; }
      .text-slate-500 { color: #64748b !important; }
      .text-slate-400 { color: #94a3b8 !important; }

      .bg-brand-gold\\/15 { background-color: rgba(217, 119, 6, 0.15) !important; }
      .text-brand-gold { color: #d97706 !important; }

      .bg-primary-50, .bg-primary-50\\/70 { background-color: #f0fdf4 !important; }
      .border-primary-100 { border-color: #dcfce7 !important; }
      .border-primary-200 { border-color: #bbf7d0 !important; }
      .border-primary-700 { border-color: #15803d !important; }
      .text-primary-600 { color: #16a34a !important; }
      .text-primary-700 { color: #15803d !important; }
      .text-primary-800 { color: #166534 !important; }
      .text-primary-900 { color: #14532d !important; }
      .text-primary-950 { color: #052e16 !important; }

      .bg-emerald-50, .bg-emerald-50\\/70 { background-color: #ecfdf5 !important; }
      .bg-emerald-100 { background-color: #d1fae5 !important; }
      .border-emerald-200 { border-color: #a7f3d0 !important; }
      .text-emerald-600 { color: #059669 !important; }
      .text-emerald-700 { color: #047857 !important; }
      .text-emerald-800 { color: #065f46 !important; }
      .text-emerald-950 { color: #022c22 !important; }

      .bg-rose-50, .bg-rose-50\\/70 { background-color: #fff1f2 !important; }
      .border-rose-200 { border-color: #fecdd3 !important; }
      .text-rose-700 { color: #be123c !important; }
      .text-rose-800 { color: #9f1239 !important; }
      .text-rose-950 { color: #4c0519 !important; }

      .bg-orange-50 { background-color: #fff7ed !important; }
      .border-orange-200 { border-color: #fed7aa !important; }
      .text-orange-700 { color: #c2410c !important; }
      .text-orange-800 { color: #9a3412 !important; }
      .text-orange-950 { color: #431407 !important; }

      .bg-amber-50 { background-color: #fffbeb !important; }
      .bg-amber-100 { background-color: #fef3c7 !important; }
      .border-amber-200 { border-color: #fde68a !important; }
      .text-amber-700 { color: #b45309 !important; }
      .text-amber-800 { color: #92400e !important; }
      .text-amber-950 { color: #451a03 !important; }

      .bg-blue-50 { background-color: #eff6ff !important; }
      .border-blue-200 { border-color: #bfdbfe !important; }
      .text-blue-700 { color: #1d4ed8 !important; }
      .text-blue-800 { color: #1e40af !important; }
      .text-blue-950 { color: #172554 !important; }

      /* Page Break Handling */
      section, .break-inside-avoid, .avoid-break {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      ${extraCss}
    </style>
  </head>
  <body>
    <div style="width: 100%; max-width: 900px; margin: 0 auto; padding: 4px;">
      ${clone.innerHTML}
    </div>
  </body>
</html>`

  return new Promise<void>((resolve) => {
    // 6. Create hidden iframe attached to current document tree
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.opacity = '0'
    iframe.style.pointerEvents = 'none'
    iframe.setAttribute('aria-hidden', 'true')
    iframe.setAttribute('tabindex', '-1')

    document.body.appendChild(iframe)

    const frameWindow = iframe.contentWindow
    const frameDoc = iframe.contentDocument || frameWindow?.document

    if (!frameWindow || !frameDoc) {
      iframe.remove()
      window.print()
      resolve()
      return
    }

    const cleanup = () => {
      setTimeout(() => {
        try {
          iframe.remove()
        } catch {
          // ignore
        }
        resolve()
      }, 1500)
    }

    try {
      frameDoc.open()
      frameDoc.write(html)
      frameDoc.close()
    } catch {
      cleanup()
      window.print()
      return
    }

    // 7. Ensure images and fonts are loaded before triggering print dialog
    const checkReadyAndPrint = () => {
      const iframeImages = Array.from(frameDoc.images)
      const imagePromises = iframeImages.map((img) => {
        if (img.complete) return Promise.resolve()
        return new Promise<void>((res) => {
          img.onload = () => res()
          img.onerror = () => res()
        })
      })

      const fontsPromise = (frameDoc as any).fonts?.ready
        ? (frameDoc as any).fonts.ready
        : Promise.resolve()

      Promise.all([...imagePromises, fontsPromise])
        .then(() => {
          setTimeout(() => {
            try {
              frameWindow.focus()
              frameWindow.print()
            } catch {
              window.print()
            } finally {
              cleanup()
            }
          }, 150)
        })
        .catch(() => {
          setTimeout(() => {
            try {
              frameWindow.focus()
              frameWindow.print()
            } catch {
              window.print()
            } finally {
              cleanup()
            }
          }, 150)
        })
    }

    if (frameDoc.readyState === 'complete') {
      checkReadyAndPrint()
    } else {
      iframe.onload = () => checkReadyAndPrint()
    }
  })
}
