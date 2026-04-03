'use client'

import { useLanguage } from '@/context'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors duration-200"
      aria-label="Switch language"
    >
      <Globe className="w-4 h-4" />
      <span>{language === 'en' ? 'العربية' : 'EN'}</span>
    </button>
  )
}
