import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAdmin } from '@/lib/auth'
import { headers } from 'next/headers'
import { logActivity } from '@/lib/activity-log'
import { sendNotificationEmail } from '@/lib/email'
import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const ALLOWED_RESUME_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-')
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
    const formData = await request.formData()

    const jobOpeningId = normalizeText(formData.get('jobOpeningId'))
    const name = normalizeText(formData.get('name'))
    const email = normalizeText(formData.get('email'))

    if (!jobOpeningId || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const resume = formData.get('resume')

    if (!(resume instanceof File) || resume.size === 0) {
      return NextResponse.json({ error: 'Resume file is required' }, { status: 400 })
    }

    if (resume.size > MAX_RESUME_SIZE_BYTES) {
      return NextResponse.json({ error: 'Resume file is too large' }, { status: 400 })
    }

    const resumeMimeType = normalizeText(resume.type)
    const resumeExtension = extname(resume.name || '').toLowerCase()

    if (!ALLOWED_RESUME_MIME_TYPES.has(resumeMimeType || '') && !['.pdf', '.doc', '.docx'].includes(resumeExtension)) {
      return NextResponse.json({ error: 'Unsupported resume file type' }, { status: 400 })
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

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'job-applications')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const safeOriginalName = sanitizeFilename(resume.name || 'resume')
    const uniqueFilename = `${Date.now()}-${randomUUID()}${resumeExtension || '.pdf'}`
    const filepath = join(uploadDir, uniqueFilename)
    const bytes = await resume.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    const resumeUrl = `/uploads/job-applications/${uniqueFilename}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''
    const resumeLink = appUrl ? `${appUrl}${resumeUrl}` : resumeUrl

    const application = await prisma.jobApplication.create({
      data: {
        jobOpeningId,
        name,
        email,
        phone: normalizeText(formData.get('phone')),
        company: normalizeText(formData.get('company')),
        resumeUrl,
        resumeOriginalName: safeOriginalName,
        coverLetter: normalizeText(formData.get('coverLetter')),
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
        text: `A new application has been submitted for ${jobOpening.title}.\n\nName: ${name}\nEmail: ${email}\nPhone: ${normalizeText(formData.get('phone')) || '-'}\nCompany: ${normalizeText(formData.get('company')) || '-'}\nResume: ${resumeLink}\nCover letter:\n${normalizeText(formData.get('coverLetter')) || '-'}`,
        html: `<p>A new application has been submitted for <strong>${jobOpening.title}</strong>.</p><ul><li><strong>Name:</strong> ${name}</li><li><strong>Email:</strong> ${email}</li><li><strong>Phone:</strong> ${normalizeText(formData.get('phone')) || '-'}</li><li><strong>Company:</strong> ${normalizeText(formData.get('company')) || '-'}</li><li><strong>Resume:</strong> <a href="${resumeLink}">${safeOriginalName}</a></li></ul><p><strong>Cover letter:</strong></p><p>${(normalizeText(formData.get('coverLetter')) || '-').replace(/\n/g, '<br />')}</p>`,
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
