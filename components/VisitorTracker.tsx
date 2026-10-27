'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const VISITOR_STORAGE_KEY = 'qhsse_visitor_key'
const CONSENT_KEY = 'qhsse-analytics-consent'
const CONSENT_EVENT = 'qhsse-consent-changed'

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
  const [consent, setConsent] = useState(false)

  useEffect(() => {
    const readConsent = () => {
      try {
        setConsent(window.localStorage.getItem(CONSENT_KEY) === 'accepted')
      } catch {
        setConsent(false)
      }
    }

    readConsent()
    window.addEventListener(CONSENT_EVENT, readConsent)
    window.addEventListener('storage', readConsent)

    return () => {
      window.removeEventListener(CONSENT_EVENT, readConsent)
      window.removeEventListener('storage', readConsent)
    }
  }, [])

  useEffect(() => {
    if (!consent || !pathname) return
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) return
    if (lastTrackedPath.current === pathname) return

    lastTrackedPath.current = pathname

    try {
      const visitorKey = getVisitorKey()
      void fetch('/api/visitors/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorKey,
          path: pathname,
          consent: true,
        }),
        keepalive: true,
      }).catch(() => undefined)
    } catch {
      // Tracking must never break navigation.
    }
  }, [consent, pathname])

  return null
}
