import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAdmin } from '@/lib/auth'
import { headers } from 'next/headers'
import { logActivity } from '@/lib/activity-log'
import { sendNotificationEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export async function GET() {
  try {
    await requireAdmin()

    const applications = await prisma.jobApplication.findMany({
      include: {
        jobOpening: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(applications, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load applications' }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const headerList = headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const body = await request.json()

    const jobOpeningId = normalizeText(body.jobOpeningId)
    const name = normalizeText(body.name)
    const email = normalizeText(body.email)

    if (!jobOpeningId || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const jobOpening = await prisma.jobOpening.findFirst({
      where: {
        id: jobOpeningId,
        isPublished: true,
        status: 'OPEN',
      },
    })

    if (!jobOpening) {
      return NextResponse.json({ error: 'Job opening not found' }, { status: 404 })
    }

    const application = await prisma.jobApplication.create({
      data: {
        jobOpeningId,
        name,
        email,
        phone: normalizeText(body.phone),
        company: normalizeText(body.company),
        linkedinUrl: normalizeText(body.linkedinUrl),
        coverLetter: normalizeText(body.coverLetter),
        status: 'NEW',
      },
      include: {
        jobOpening: true,
      },
    })

    const notificationTarget =
      process.env.CONTACT_NOTIFICATION_EMAIL || process.env.SMTP_USER || process.env.SMTP_FROM

    if (notificationTarget) {
      await sendNotificationEmail({
        to: notificationTarget,
        subject: `New job application: ${jobOpening.title}`,
        text: `A new application has been submitted for ${jobOpening.title}.\n\nName: ${name}\nEmail: ${email}\nPhone: ${normalizeText(body.phone) || '-'}\nCompany: ${normalizeText(body.company) || '-'}\nLinkedIn: ${normalizeText(body.linkedinUrl) || '-'}\nCover letter:\n${normalizeText(body.coverLetter) || '-'}`,
        html: `<p>A new application has been submitted for <strong>${jobOpening.title}</strong>.</p><ul><li><strong>Name:</strong> ${name}</li><li><strong>Email:</strong> ${email}</li><li><strong>Phone:</strong> ${normalizeText(body.phone) || '-'}</li><li><strong>Company:</strong> ${normalizeText(body.company) || '-'}</li><li><strong>LinkedIn:</strong> ${normalizeText(body.linkedinUrl) || '-'}</li></ul><p><strong>Cover letter:</strong></p><p>${(normalizeText(body.coverLetter) || '-').replace(/\n/g, '<br />')}</p>`,
      }).catch((emailError) => {
        console.error('Failed to send job application notification:', emailError)
      })
    }

    await sendNotificationEmail({
      to: email,
      subject: `Application received for ${jobOpening.title}`,
      text: `Hello ${name},\n\nWe received your application for ${jobOpening.title}. Our team will review it and contact you if there is a match.\n\nQHSSE Consultant`,
      html: `<p>Hello ${name},</p><p>We received your application for <strong>${jobOpening.title}</strong>.</p><p>Our team will review it and contact you if there is a match.</p><p>QHSSE Consultant</p>`,
    }).catch((emailError) => {
      console.error('Failed to send job application confirmation:', emailError)
    })

    if (session?.user?.id) {
      await logActivity(
        session.user.id,
        'JOB_APPLICATION_CREATED',
        'job-application',
        application.id,
        `Submitted application for ${jobOpening.title}`,
        ip
      ).catch(() => undefined)
    }

    return NextResponse.json(application, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit application' }, { status: 500 })
  }
}
