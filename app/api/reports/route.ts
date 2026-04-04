import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { sendNotificationEmail } from '@/lib/email'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const riskLevel = searchParams.get('riskLevel')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const category = searchParams.get('category')

    const where: any = {}

    // Filter by client (clients can only see their own reports)
    if (session.user.role === 'CLIENT') {
      const client = await prisma.client.findUnique({
        where: { userId: session.user.id },
      })
      if (client) {
        where.clientId = client.id
      } else {
        return NextResponse.json([])
      }
    }

    // Apply filters
    if (status) where.status = status
    if (category) where.category = category
    if (dateFrom) where.date = { ...where.date, gte: new Date(dateFrom) }
    if (dateTo) where.date = { ...where.date, lte: new Date(dateTo) }
    if (riskLevel) {
      where.observations = {
        some: { riskLevel },
      }
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        observations: {
          include: {
            images: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        client: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        consultant: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json(reports)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const headerList = headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const body = await request.json()

    const { clientId, date, siteName, siteNameAr, category, consultantId, notes, notesAr, status } = body

    if (!clientId || !date || !siteName || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const report = await prisma.report.create({
      data: {
        clientId,
        date: new Date(date),
        siteName,
        siteNameAr,
        category,
        status: status || 'OPEN',
        consultantId: consultantId || undefined,
        notes,
        notesAr,
      },
      include: {
        client: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
      },
    })

    await logActivity(session.user.id, 'REPORT_CREATED', 'report', report.id, `Created report for ${siteName}`, ip)

    const clientEmail = report.client?.user?.email
    if (clientEmail) {
      const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''}/dashboard`
      await sendNotificationEmail({
        to: clientEmail,
        subject: `New report available: ${siteName}`,
        text: `A new report for ${siteName} has been added to your portal. View it at ${portalUrl}.`,
        html: `<p>A new report for <strong>${siteName}</strong> has been added to your portal.</p><p><a href="${portalUrl}">Open dashboard</a></p>`,
      }).catch((error) => {
        console.error('Failed to send report notification email:', error)
      })
    }

    return NextResponse.json(report, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
