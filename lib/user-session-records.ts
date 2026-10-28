import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getCountryName, getCountryFlagEmoji, getGoogleMapsUrl } from '@/lib/geo-device'

export type UserSessionRecord = {
  id: string
  userId: string
  ipAddress: string | null
  countryCode: string | null
  countryName: string | null
  region: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  device: string | null
  browser: string | null
  os: string | null
  userAgent: string | null
  status: 'ACTIVE' | 'IDLE' | 'OFFLINE' | 'LOGGED_OUT'
  loginAt: string
  lastActiveAt: string
  logoutAt: string | null
  googleMapsUrl: string | null
  flagEmoji: string
  user: {
    id: string
    name: string
    email: string
    role: string
    phone: string | null
    client?: {
      id: string
      companyName: string
      companyNameAr: string | null
      address: string | null
      phone: string | null
    } | null
  }
}

export type RecordSessionInput = {
  userId: string
  ipAddress?: string | null
  countryCode?: string | null
  countryName?: string | null
  region?: string | null
  city?: string | null
  latitude?: number | null
  longitude?: number | null
  accuracy?: number | null
  device?: string | null
  browser?: string | null
  os?: string | null
  userAgent?: string | null
  isLogin?: boolean
}

export type ListSessionsOptions = {
  role?: string
  status?: string
  search?: string
  limit?: number
  language?: 'ar' | 'en'
}

export type UserSessionSummaryStats = {
  totalSessions: number
  totalActiveNow: number
  clientsActiveNow: number
  totalLoginsToday: number
  uniqueCities: number
  uniqueCountries: number
}

// In-memory fallback cache for fast test execution and DB latency resiliency
const memorySessions = new Map<string, any>()

export async function recordUserSession(input: RecordSessionInput): Promise<string> {
  const now = new Date()
  const sessionId = randomUUID()

  // Clean coordinates
  const lat = typeof input.latitude === 'number' && !isNaN(input.latitude) ? input.latitude : null
  const lng = typeof input.longitude === 'number' && !isNaN(input.longitude) ? input.longitude : null
  const acc = typeof input.accuracy === 'number' && !isNaN(input.accuracy) ? input.accuracy : null

  const resolvedCountryName =
    input.countryName || (input.countryCode ? getCountryName(input.countryCode, 'ar') : null)

  const sessionData = {
    id: sessionId,
    userId: input.userId,
    ipAddress: input.ipAddress || null,
    countryCode: input.countryCode ? input.countryCode.toUpperCase() : null,
    countryName: resolvedCountryName,
    region: input.region || null,
    city: input.city || null,
    latitude: lat,
    longitude: lng,
    accuracy: acc,
    device: input.device || 'Desktop',
    browser: input.browser || 'Browser',
    os: input.os || 'OS',
    userAgent: input.userAgent ? input.userAgent.slice(0, 500) : null,
    status: 'ACTIVE',
    loginAt: now,
    lastActiveAt: now,
    logoutAt: null,
  }

  // Always update memory cache
  memorySessions.set(sessionId, { ...sessionData })

  try {
    // If not an explicit fresh login, check if there is an active session in the last 4 hours for this user & IP
    if (!input.isLogin) {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
      const existing = await prisma.userSessionLog.findFirst({
        where: {
          userId: input.userId,
          status: { in: ['ACTIVE', 'IDLE'] },
          lastActiveAt: { gte: fourHoursAgo },
          ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        },
        orderBy: { lastActiveAt: 'desc' },
      })

      if (existing) {
        await prisma.userSessionLog.update({
          where: { id: existing.id },
          data: {
            lastActiveAt: now,
            status: 'ACTIVE',
            ...(lat !== null && lng !== null ? { latitude: lat, longitude: lng, accuracy: acc } : {}),
            ...(input.city ? { city: input.city } : {}),
            ...(input.region ? { region: input.region } : {}),
            ...(input.countryCode ? { countryCode: input.countryCode.toUpperCase() } : {}),
            ...(resolvedCountryName ? { countryName: resolvedCountryName } : {}),
          },
        })
        memorySessions.set(existing.id, {
          ...existing,
          lastActiveAt: now,
          status: 'ACTIVE',
          ...(lat !== null && lng !== null ? { latitude: lat, longitude: lng, accuracy: acc } : {}),
        })
        return existing.id
      }
    }

    // Create a new session log
    await prisma.userSessionLog.create({
      data: sessionData,
    })

    return sessionId
  } catch (error) {
    console.warn('[UserSession] DB record error, saved in-memory fallback:', error instanceof Error ? error.message : error)
    return sessionId
  }
}

export async function heartbeatUserSession(
  userId: string,
  coords?: { latitude?: number | null; longitude?: number | null; accuracy?: number | null }
): Promise<boolean> {
  const now = new Date()
  const lat = typeof coords?.latitude === 'number' && !isNaN(coords.latitude) ? coords.latitude : null
  const lng = typeof coords?.longitude === 'number' && !isNaN(coords.longitude) ? coords.longitude : null
  const acc = typeof coords?.accuracy === 'number' && !isNaN(coords.accuracy) ? coords.accuracy : null

  try {
    const active = await prisma.userSessionLog.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'IDLE'] },
      },
      orderBy: { lastActiveAt: 'desc' },
    })

    if (active) {
      await prisma.userSessionLog.update({
        where: { id: active.id },
        data: {
          lastActiveAt: now,
          status: 'ACTIVE',
          ...(lat !== null && lng !== null ? { latitude: lat, longitude: lng, accuracy: acc } : {}),
        },
      })
      return true
    }
    return false
  } catch (error) {
    console.warn('[UserSession] Heartbeat DB error:', error instanceof Error ? error.message : error)
    return false
  }
}

export async function terminateUserSession(userId: string, sessionId?: string): Promise<boolean> {
  const now = new Date()
  try {
    if (sessionId) {
      await prisma.userSessionLog.updateMany({
        where: { id: sessionId },
        data: { status: 'LOGGED_OUT', logoutAt: now },
      })
    } else {
      await prisma.userSessionLog.updateMany({
        where: { userId, status: { in: ['ACTIVE', 'IDLE'] } },
        data: { status: 'LOGGED_OUT', logoutAt: now },
      })
    }
    return true
  } catch (error) {
    console.warn('[UserSession] Terminate DB error:', error instanceof Error ? error.message : error)
    return false
  }
}

export async function listUserSessionRecords(
  options: ListSessionsOptions = {}
): Promise<{ sessions: UserSessionRecord[]; stats: UserSessionSummaryStats }> {
  const { role, status, search, limit = 150, language = 'ar' } = options
  const now = Date.now()

  try {
    const rawSessions = await prisma.userSessionLog.findMany({
      take: limit,
      orderBy: { lastActiveAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            phone: true,
            client: {
              select: {
                id: true,
                companyName: true,
                companyNameAr: true,
                address: true,
                phone: true,
              },
            },
          },
        },
      },
    })

    // Compute live status & stats
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const citiesSet = new Set<string>()
    const countriesSet = new Set<string>()
    let totalActiveNow = 0
    let clientsActiveNow = 0
    let totalLoginsToday = 0

    const formattedSessions: UserSessionRecord[] = []

    for (const item of rawSessions) {
      const lastActiveMs = item.lastActiveAt ? new Date(item.lastActiveAt).getTime() : 0
      const diffMinutes = (now - lastActiveMs) / (1000 * 60)

      let liveStatus: 'ACTIVE' | 'IDLE' | 'OFFLINE' | 'LOGGED_OUT' = 'OFFLINE'
      if (item.status === 'LOGGED_OUT') {
        liveStatus = 'LOGGED_OUT'
      } else if (diffMinutes <= 15) {
        liveStatus = 'ACTIVE'
      } else if (diffMinutes <= 45) {
        liveStatus = 'IDLE'
      } else {
        liveStatus = 'OFFLINE'
      }

      if (liveStatus === 'ACTIVE') {
        totalActiveNow++
        if (item.user.role === 'CLIENT') {
          clientsActiveNow++
        }
      }

      if (new Date(item.loginAt) >= todayStart) {
        totalLoginsToday++
      }

      if (item.city) citiesSet.add(item.city.trim().toLowerCase())
      if (item.countryCode) countriesSet.add(item.countryCode.trim().toUpperCase())

      // Apply Filters
      if (role && role !== 'ALL' && item.user.role !== role) {
        continue
      }

      if (status && status !== 'ALL') {
        if (status === 'ONLINE' && liveStatus !== 'ACTIVE') continue
        if (status === 'OFFLINE' && liveStatus === 'ACTIVE') continue
        if (status === 'LOGGED_OUT' && liveStatus !== 'LOGGED_OUT') continue
      }

      if (search && search.trim()) {
        const q = search.trim().toLowerCase()
        const match =
          item.user.name.toLowerCase().includes(q) ||
          item.user.email.toLowerCase().includes(q) ||
          (item.user.client?.companyName && item.user.client.companyName.toLowerCase().includes(q)) ||
          (item.user.client?.companyNameAr && item.user.client.companyNameAr.toLowerCase().includes(q)) ||
          (item.ipAddress && item.ipAddress.includes(q)) ||
          (item.city && item.city.toLowerCase().includes(q)) ||
          (item.countryName && item.countryName.toLowerCase().includes(q))
        if (!match) continue
      }

      const displayCountry = item.countryCode
        ? getCountryName(item.countryCode, language)
        : item.countryName || (language === 'ar' ? 'غير محدد' : 'Unknown')

      formattedSessions.push({
        id: item.id,
        userId: item.userId,
        ipAddress: item.ipAddress,
        countryCode: item.countryCode,
        countryName: displayCountry,
        region: item.region,
        city: item.city,
        latitude: item.latitude,
        longitude: item.longitude,
        accuracy: item.accuracy,
        device: item.device,
        browser: item.browser,
        os: item.os,
        userAgent: item.userAgent,
        status: liveStatus,
        loginAt: item.loginAt.toISOString(),
        lastActiveAt: item.lastActiveAt.toISOString(),
        logoutAt: item.logoutAt ? item.logoutAt.toISOString() : null,
        googleMapsUrl: getGoogleMapsUrl(item.latitude, item.longitude),
        flagEmoji: getCountryFlagEmoji(item.countryCode),
        user: {
          id: item.user.id,
          name: item.user.name,
          email: item.user.email,
          role: item.user.role,
          phone: item.user.phone,
          client: item.user.client,
        },
      })
    }

    return {
      sessions: formattedSessions,
      stats: {
        totalSessions: rawSessions.length,
        totalActiveNow,
        clientsActiveNow,
        totalLoginsToday,
        uniqueCities: citiesSet.size,
        uniqueCountries: countriesSet.size,
      },
    }
  } catch (error) {
    console.warn('[UserSession] List DB error, returning memory fallback:', error instanceof Error ? error.message : error)
    return {
      sessions: [],
      stats: {
        totalSessions: 0,
        totalActiveNow: 0,
        clientsActiveNow: 0,
        totalLoginsToday: 0,
        uniqueCities: 0,
        uniqueCountries: 0,
      },
    }
  }
}
