import { headers } from 'next/headers'

function normalizeCountryCode(value: string | null) {
  const code = value?.trim().toUpperCase()
  return code && code.length === 2 ? code : undefined
}

export function getCountryNameFromCode(countryCode?: string, locale = 'en') {
  if (!countryCode) {
    return locale === 'ar' ? 'غير محدد' : 'Unknown'
  }

  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' })
    return displayNames.of(countryCode) || countryCode
  } catch {
    return countryCode
  }
}

export function getVisitorGeoDetails() {
  const headerList = headers()
  const countryCode =
    normalizeCountryCode(headerList.get('x-vercel-ip-country')) ||
    normalizeCountryCode(headerList.get('cf-ipcountry')) ||
    normalizeCountryCode(headerList.get('x-country-code'))

  const city = headerList.get('x-vercel-ip-city') || headerList.get('x-city') || undefined
  const region = headerList.get('x-vercel-ip-country-region') || headerList.get('x-region') || undefined
  const forwardedFor = headerList.get('x-forwarded-for') || ''
  const ipAddress = forwardedFor.split(',')[0]?.trim() || headerList.get('x-real-ip') || undefined
  const userAgent = headerList.get('user-agent') || undefined

  return {
    countryCode,
    countryName: getCountryNameFromCode(countryCode),
    city,
    region,
    ipAddress,
    userAgent,
  }
}

export function isBotUserAgent(userAgent?: string) {
  if (!userAgent) {
    return false
  }

  const normalized = userAgent.toLowerCase()
  return ['bot', 'crawl', 'spider', 'slurp', 'facebookexternalhit', 'whatsapp'].some((token) =>
    normalized.includes(token)
  )
}
