'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

type Language = 'en' | 'ar'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  dir: 'ltr' | 'rtl'
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function getNestedTranslation(obj: any, path: string): string {
  return path.split('.').reduce((acc, part) => acc?.[part], obj) || path
}

let translations: Record<string, any> = {}
let loadedLang: Language = 'en'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [, forceUpdate] = useState(0)

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang)
    loadedLang = lang
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-language', lang)
    }
    forceUpdate((n) => n + 1)
  }, [])

  useEffect(() => {
    const loadTranslations = async () => {
      const savedLang = (localStorage.getItem('preferred-language') || 'en') as Language
      try {
        const res = await fetch(`/locales/${savedLang}.json`)
        translations = await res.json()
      } catch {
        translations = {}
      }
      setLanguageState(savedLang)
      loadedLang = savedLang
      document.documentElement.lang = savedLang
      document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr'
    }
    loadTranslations()
  }, [])

  const t = useCallback(
    (key: string) => {
      const value = getNestedTranslation(translations, key)
      return typeof value === 'string' ? value : key
    },
    [language]
  )

  useEffect(() => {
    if (translations[language]) {
      // already loaded
    }
  }, [language])

  const dir = language === 'ar' ? 'rtl' : 'ltr'

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
