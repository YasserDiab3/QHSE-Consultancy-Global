import type { Metadata } from 'next'

type PageMetadataInput = {
  title: string
  description: string
  path: string
  noIndex?: boolean
}

export function pageMetadata({ title, description, path, noIndex = false }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: 'QHSSE Consultant',
      type: 'website',
      locale: 'en_US',
      alternateLocale: ['ar_EG'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    ...(noIndex
      ? {
          robots: {
            index: false,
            follow: false,
          },
        }
      : {}),
  }
}
