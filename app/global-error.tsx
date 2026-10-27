'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8fafc', color: '#0f172a' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div style={{ maxWidth: '480px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                margin: '0 auto',
                borderRadius: '9999px',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
              }}
              aria-hidden="true"
            >
              !
            </div>
            <h1 style={{ marginTop: '24px', fontSize: '24px' }}>Something went wrong</h1>
            <p style={{ marginTop: '12px', color: '#475569', lineHeight: 1.6 }}>
              An unexpected error occurred. Please try again or return to the home page.
            </p>
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 0,
                  background: '#1e40af',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <Link
                href="/"
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '2px solid #1e40af',
                  color: '#1e40af',
                  background: 'transparent',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
