'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  LANGUAGE_COOKIE,
  LANGUAGE_COOKIE_MAX_AGE,
  dictionaries,
  isRtl,
  normalizeLanguage,
  type Language,
} from '@/lib/i18n-config'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => Promise<void>
  t: (key: string) => string
  dir: 'ltr' | 'rtl'
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function getNestedTranslation(obj: Record<string, unknown>, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part]
    }

    return undefined
  }, obj)

  return typeof value === 'string' ? value : undefined
}

function translate(messages: Record<string, unknown>, key: string) {
  return (
    getNestedTranslation(messages, key) ??
    getNestedTranslation(dictionaries.en as unknown as Record<string, unknown>, key) ??
    key
  )
}

function applyLanguageAttributes(lang: Language) {
  document.documentElement.lang = lang
  document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr'
}

function persistLanguage(lang: Language) {
  try {
    window.localStorage.setItem(LANGUAGE_COOKIE, lang)
  } catch {
    // Storage can be unavailable in private browsing; the cookie still works.
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${LANGUAGE_COOKIE}=${lang}; Path=/; Max-Age=${LANGUAGE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`
}

export function LanguageProvider({
  children,
  initialLanguage = 'en',
}: {
  children: ReactNode
  initialLanguage?: Language
}) {
  const [language, setLanguageState] = useState<Language>(() => normalizeLanguage(initialLanguage))

  const setLanguage = useCallback(async (lang: Language) => {
    const nextLanguage = normalizeLanguage(lang)
    setLanguageState(nextLanguage)
    applyLanguageAttributes(nextLanguage)
    persistLanguage(nextLanguage)
  }, [])

  useEffect(() => {
    applyLanguageAttributes(language)

    // Migrate visitors who chose a language before the cookie existed.
    const hasCookie = document.cookie
      .split('; ')
      .some((entry) => entry.startsWith(`${LANGUAGE_COOKIE}=`))
    if (hasCookie) return

    let saved: string | null = null
    try {
      saved = window.localStorage.getItem(LANGUAGE_COOKIE)
    } catch {
      saved = null
    }

    if ((saved === 'ar' || saved === 'en') && saved !== language) {
      void setLanguage(saved)
    }
    // Run once on mount; language changes are handled by setLanguage itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const messages = dictionaries[language] as unknown as Record<string, unknown>
  const t = useCallback((key: string) => translate(messages, key), [messages])
  const dir: 'ltr' | 'rtl' = isRtl(language) ? 'rtl' : 'ltr'

  const value = useMemo(
    () => ({ language, setLanguage, t, dir }),
    [dir, language, setLanguage, t]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }

  return context
}
