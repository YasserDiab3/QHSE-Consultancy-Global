'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

export default function UserPresenceTracker() {
  const { data: session, status } = useSession()
  const hasRecorded = useRef(false)
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null)
  const coordsRef = useRef<{ latitude?: number; longitude?: number; accuracy?: number } | null>(null)

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) {
      return
    }

    const sendRecord = async (coords?: { latitude?: number; longitude?: number; accuracy?: number }, isLogin = false) => {
      try {
        await fetch('/api/user-sessions/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: coords?.latitude,
            longitude: coords?.longitude,
            accuracy: coords?.accuracy,
            isLogin,
          }),
        })
      } catch {
        // silent fail on network hiccups
      }
    }

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/user-sessions/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: coordsRef.current?.latitude,
            longitude: coordsRef.current?.longitude,
            accuracy: coordsRef.current?.accuracy,
          }),
        })
      } catch {}
    }

    // 1. Initial recording with IP/server headers
    if (!hasRecorded.current) {
      hasRecorded.current = true
      void sendRecord(undefined, false)

      // 2. Request client GPS coordinates if available
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        try {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              }
              coordsRef.current = coords
              // Update session with precise coordinates
              void sendRecord(coords, false)
            },
            () => {
              // Permission denied or unavailable; server IP geo is already preserved.
            },
            {
              enableHighAccuracy: true,
              timeout: 8000,
              maximumAge: 60000,
            }
          )
        } catch {}
      }
    }

    // 3. Heartbeat every 2.5 minutes
    heartbeatTimer.current = setInterval(sendHeartbeat, 2.5 * 60 * 1000)

    // 4. Resume activity when user switches back to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void sendHeartbeat()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session?.user?.id, status])

  return null
}
