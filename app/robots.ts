import type { MetadataRoute } from 'next'

function baseUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL || 'https://qhsseconsultant.com'
  return value.replace(/\/$/, '')
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/dashboard', '/api/', '/login', '/register', '/training/certificate/'],
      },
    ],
    sitemap: `${baseUrl()}/sitemap.xml`,
    host: baseUrl(),
  }
}
