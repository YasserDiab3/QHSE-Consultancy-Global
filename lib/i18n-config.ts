import en from '@/public/locales/en.json'
import ar from '@/public/locales/ar.json'

export type Language = 'en' | 'ar'

export const LANGUAGE_COOKIE = 'preferred-language'
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const dictionaries = { en, ar } as const

export function normalizeLanguage(value?: string | null): Language {
  return value === 'ar' ? 'ar' : 'en'
}

export function isRtl(language: Language) {
  return language === 'ar'
}
