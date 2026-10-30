'use client'

import { useLanguage } from '@/context'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const nextLanguage = language === 'en' ? 'ar' : 'en'

  return (
    <button
      type="button"
      onClick={() => void setLanguage(nextLanguage)}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white/95 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-200 hover:bg-white hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      aria-label={nextLanguage === 'ar' ? 'التبديل إلى العربية' : 'Switch to English'}
      title={nextLanguage === 'ar' ? 'العربية' : 'English'}
    >
      <Globe className="h-4 w-4" aria-hidden="true" />
      <span lang={nextLanguage === 'ar' ? 'ar' : 'en'}>{nextLanguage === 'ar' ? 'العربية' : 'EN'}</span>
    </button>
  )
}
