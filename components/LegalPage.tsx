'use client'

import { useLanguage } from '@/context'
import type { BilingualLegalDocument } from '@/lib/legal-content'
import { ArrowUp } from 'lucide-react'

export default function LegalPage({ document }: { document: BilingualLegalDocument }) {
  const { language } = useLanguage()
  const doc = document[language]
  const isArabic = language === 'ar'

  return (
    <div id="top" className="container-custom py-28 md:py-32">
      <div className="mx-auto max-w-4xl">
        <p className="text-eyebrow uppercase text-brand-gold">{doc.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{doc.title}</h1>
        <p className="mt-3 text-sm font-medium text-slate-500">{doc.updated}</p>
        <p className="mt-6 text-lg leading-8 text-slate-600">{doc.intro}</p>

        <nav
          aria-label={isArabic ? 'محتويات الصفحة' : 'On this page'}
          className="mt-8 rounded-xl border border-surface-border bg-surface-page p-5"
        >
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            {isArabic ? 'المحتويات' : 'Contents'}
          </h2>
          <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {doc.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-slate-600 underline-offset-2 transition hover:text-brand-gold hover:underline"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="legal-prose mt-10">
          {doc.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-28">
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-brand-gold/20 bg-brand-gold-100/50 p-6">
          <p className="text-sm leading-7 text-slate-700">{doc.contact}</p>
        </div>

        <a
          href="#top"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
          {isArabic ? 'العودة إلى الأعلى' : 'Back to top'}
        </a>
      </div>
    </div>
  )
}
