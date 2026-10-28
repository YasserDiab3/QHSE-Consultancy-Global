/**
 * Utility functions for parsing Device, Browser, OS, and Location details
 * from HTTP headers and Geolocation data.
 */

export type DeviceInfo = {
  device: 'Desktop' | 'Mobile' | 'Tablet'
  browser: string
  os: string
}

export function parseUserAgent(ua?: string | null): DeviceInfo {
  if (!ua) {
    return {
      device: 'Desktop',
      browser: 'Unknown Browser',
      os: 'Unknown OS',
    }
  }

  const s = ua.toLowerCase()

  // 1. Detect Device
  let device: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop'
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    device = 'Tablet'
  } else if (
    /mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop|windows phone/i.test(ua)
  ) {
    device = 'Mobile'
  }

  // 2. Detect OS
  let os = 'Unknown OS'
  if (s.includes('windows nt 10.0') || s.includes('windows nt 11.0')) os = 'Windows 10/11'
  else if (s.includes('windows nt 6.3')) os = 'Windows 8.1'
  else if (s.includes('windows nt 6.1')) os = 'Windows 7'
  else if (s.includes('windows nt')) os = 'Windows'
  else if (s.includes('iphone') || s.includes('ipad') || s.includes('ipod')) os = 'iOS'
  else if (s.includes('android')) os = 'Android'
  else if (s.includes('mac os x') || s.includes('macintosh')) os = 'macOS'
  else if (s.includes('linux')) os = 'Linux'
  else if (s.includes('cros')) os = 'ChromeOS'

  // 3. Detect Browser
  let browser = 'Unknown Browser'
  if (s.includes('edg/')) {
    const match = ua.match(/Edg\/([\d.]+)/)
    browser = `Edge ${match ? match[1].split('.')[0] : ''}`.trim()
  } else if (s.includes('opr/') || s.includes('opera')) {
    const match = ua.match(/OPR\/([\d.]+)/)
    browser = `Opera ${match ? match[1].split('.')[0] : ''}`.trim()
  } else if (s.includes('samsungbrowser')) {
    const match = ua.match(/SamsungBrowser\/([\d.]+)/)
    browser = `Samsung Internet ${match ? match[1].split('.')[0] : ''}`.trim()
  } else if (s.includes('chrome/') && !s.includes('chromium')) {
    const match = ua.match(/Chrome\/([\d.]+)/)
    browser = `Chrome ${match ? match[1].split('.')[0] : ''}`.trim()
  } else if (s.includes('firefox/')) {
    const match = ua.match(/Firefox\/([\d.]+)/)
    browser = `Firefox ${match ? match[1].split('.')[0] : ''}`.trim()
  } else if (s.includes('safari/') && !s.includes('chrome')) {
    const match = ua.match(/Version\/([\d.]+)/)
    browser = `Safari ${match ? match[1].split('.')[0] : ''}`.trim()
  }

  return { device, browser, os }
}

export function extractClientIp(
  forwardedFor?: string | null,
  realIp?: string | null
): string | undefined {
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }
  if (realIp && realIp.trim()) {
    return realIp.trim()
  }
  return undefined
}

export function normalizeCountryCode(value?: string | null): string | undefined {
  const code = value?.trim().toUpperCase()
  return code && code.length === 2 ? code : undefined
}

export function getCountryName(countryCode?: string | null, locale: 'ar' | 'en' = 'ar'): string {
  if (!countryCode) {
    return locale === 'ar' ? 'غير محدد' : 'Unknown'
  }

  const code = countryCode.trim().toUpperCase()

  // Common quick translations for Middle East / GCC & common regions
  const manualArabic: Record<string, string> = {
    EG: 'مصر',
    SA: 'المملكة العربية السعودية',
    AE: 'الإمارات العربية المتحدة',
    KW: 'الكويت',
    QA: 'قطر',
    BH: 'البحرين',
    OM: 'عُمان',
    JO: 'الأردن',
    LB: 'لبنان',
    IQ: 'العراق',
    YE: 'اليمن',
    SD: 'السودان',
    LY: 'ليبيا',
    TN: 'تونس',
    DZ: 'الجزائر',
    MA: 'المغرب',
    US: 'الولايات المتحدة',
    GB: 'المملكة المتحدة',
    FR: 'فرنسا',
    DE: 'ألمانيا',
    IT: 'إيطاليا',
    TR: 'تركيا',
  }

  if (locale === 'ar' && manualArabic[code]) {
    return manualArabic[code]
  }

  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' })
    return displayNames.of(code) || code
  } catch {
    return manualArabic[code] || code
  }
}

export function getCountryFlagEmoji(countryCode?: string | null): string {
  if (!countryCode || countryCode.length !== 2) return '🌐'
  const code = countryCode.toUpperCase()
  const offset = 127397
  return String.fromCodePoint(...[...code].map((c) => c.charCodeAt(0) + offset))
}

export function getGoogleMapsUrl(
  latitude?: number | null,
  longitude?: number | null
): string | null {
  if (latitude == null || longitude == null) return null
  if (isNaN(latitude) || isNaN(longitude)) return null
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}
