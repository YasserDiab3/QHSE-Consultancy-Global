'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const VISITOR_STORAGE_KEY = 'qhsse_visitor_key'

function getVisitorKey() {
  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY)
  if (existing) {
    return existing
  }

  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  window.localStorage.setItem(VISITOR_STORAGE_KEY, generated)
  return generated
}

export default function VisitorTracker() {
  const pathname = usePathname()
  const lastTrackedPath = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
      return
    }

    if (lastTrackedPath.current === pathname) {
      return
    }

    lastTrackedPath.current = pathname

    const visitorKey = getVisitorKey()
    void fetch('/api/visitors/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visitorKey,
        path: pathname,
      }),
      keepalive: true,
    }).catch(() => undefined)
  }, [pathname])

  return null
}
