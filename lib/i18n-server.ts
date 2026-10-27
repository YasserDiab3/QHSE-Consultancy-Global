import { cookies } from 'next/headers'
import { LANGUAGE_COOKIE, dictionaries, normalizeLanguage, type Language } from '@/lib/i18n-config'

export type { Language }
export { LANGUAGE_COOKIE, LANGUAGE_COOKIE_MAX_AGE, dictionaries, normalizeLanguage } from '@/lib/i18n-config'

export async function getServerLanguage(): Promise<Language> {
  const cookieStore = await cookies()
  return normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value)
}

export function getMessages(language: Language) {
  return dictionaries[language]
}

export async function getServerI18n() {
  const language = await getServerLanguage()
  return {
    language,
    dir: language === 'ar' ? ('rtl' as const) : ('ltr' as const),
    messages: getMessages(language),
  }
}
