import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { headers } from 'next/headers'
import { extractClientIp, normalizeCountryCode, parseUserAgent, getCountryName } from '@/lib/geo-device'
import { recordUserSession } from '@/lib/user-session-records'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const headerList = await headers()
    const forwardedFor = headerList.get('x-forwarded-for')
    const realIp = headerList.get('x-real-ip')
    const ipAddress = extractClientIp(forwardedFor, realIp)

    const countryCode =
      normalizeCountryCode(headerList.get('x-vercel-ip-country')) ||
      normalizeCountryCode(headerList.get('cf-ipcountry')) ||
      normalizeCountryCode(headerList.get('x-country-code'))

    const city = headerList.get('x-vercel-ip-city') || headerList.get('x-city') || undefined
    const region = headerList.get('x-vercel-ip-country-region') || headerList.get('x-region') || undefined
    const rawUa = headerList.get('user-agent') || ''

    // Server Geo Coordinates (e.g. from Vercel / Cloudflare edge headers)
    const headerLat = parseFloat(headerList.get('x-vercel-ip-latitude') || '')
    const headerLng = parseFloat(headerList.get('x-vercel-ip-longitude') || '')

    const { device, browser, os } = parseUserAgent(rawUa)

    // Body payload from client (e.g. navigator.geolocation)
    let body: any = {}
    try {
      body = await req.json()
    } catch {}

    const clientLat = typeof body?.latitude === 'number' && !isNaN(body.latitude) ? body.latitude : null
    const clientLng = typeof body?.longitude === 'number' && !isNaN(body.longitude) ? body.longitude : null
    const clientAccuracy = typeof body?.accuracy === 'number' && !isNaN(body.accuracy) ? body.accuracy : null

    const finalLat = clientLat !== null ? clientLat : (!isNaN(headerLat) ? headerLat : null)
    const finalLng = clientLng !== null ? clientLng : (!isNaN(headerLng) ? headerLng : null)

    const sessionId = await recordUserSession({
      userId: session.user.id,
      ipAddress,
      countryCode,
      countryName: countryCode ? getCountryName(countryCode, 'ar') : undefined,
      region,
      city,
      latitude: finalLat,
      longitude: finalLng,
      accuracy: clientAccuracy,
      device,
      browser,
      os,
      userAgent: rawUa,
      isLogin: Boolean(body?.isLogin),
    })

    return NextResponse.json({ success: true, sessionId })
  } catch (error: any) {
    console.error('Failed to record user session:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
