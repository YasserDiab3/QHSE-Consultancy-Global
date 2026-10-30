import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'QHSSE Consultant | Quality, Health, Safety & Environmental Solutions',
    short_name: 'QHSSE',
    description: 'نظام إدارة واستشارات الجودة والسلامة والصحة المهنية والبيئة والمعاينة الميدانية',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#1e40af',
    orientation: 'any',
    scope: '/',
    lang: 'ar',
    dir: 'rtl',
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/brand/qhsse-logo-mark.svg',
        sizes: '1024x1024',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'تقارير السلامة الميدانية',
        short_name: 'التقارير',
        description: 'إنشاء ومتابعة تقارير السلامة الميدانية',
        url: '/admin',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'المعاينة الميدانية بدون إنترنت',
        short_name: 'معاينة أوفلاين',
        description: 'تسجيل مسودات التقارير والصور الميدانية بدون إنترنت',
        url: '/admin',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
