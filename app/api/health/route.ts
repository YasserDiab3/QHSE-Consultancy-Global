import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const startTime = Date.now()
  let dbStatus = 'disconnected'

  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'connected'
  } catch (error) {
    dbStatus = 'error'
  }

  const memory = process.memoryUsage()
  const responseTimeMs = Date.now() - startTime

  const status = dbStatus === 'connected' ? 'healthy' : 'degraded'

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      responseTimeMs,
      services: {
        database: dbStatus,
        emailService: process.env.SMTP_HOST ? 'configured' : 'unconfigured',
        storage: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'connected' : 'unconfigured',
      },
      system: {
        uptimeSeconds: Math.round(process.uptime()),
        memoryUsageMB: {
          rss: Math.round(memory.rss / 1024 / 1024),
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        },
      },
    },
    { status: status === 'healthy' ? 200 : 503 }
  )
}
