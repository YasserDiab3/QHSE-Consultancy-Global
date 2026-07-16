import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAdmin } from '@/lib/auth'
import { headers } from 'next/headers'
import { logActivity } from '@/lib/activity-log'
import { sendNotificationEmail } from '@/lib/email'
import { validateResumeFile } from '@/lib/file-validation'
import { enforceRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { escapeHtml, formatValidationError, jobApplicationSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024

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
    const parsed = jobApplicationSchema.safeParse({
      jobOpeningId: normalizeText(formData.get('jobOpeningId')),
      name: normalizeText(formData.get('name')),
      email: normalizeText(formData.get('email')),
      phone: normalizeText(formData.get('phone')),
      company: normalizeText(formData.get('company')),
      coverLetter: normalizeText(formData.get('coverLetter')),
    })
    if (!parsed.success) return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 })
    const { jobOpeningId, name, email, phone, company, coverLetter } = parsed.data

    const rateLimit = await enforceRateLimit(
      request,
      { keyPrefix: 'job-application', limit: 3, windowMs: 60 * 60 * 1000 },
      `${email}:${jobOpeningId}`
    )
    if (!rateLimit.success) return rateLimitResponse(rateLimit)

    const resume = formData.get('resume')

    if (!(resume instanceof File) || resume.size === 0) {
      return NextResponse.json({ error: 'Resume file is required' }, { status: 400 })
    }

    if (resume.size > MAX_RESUME_SIZE_BYTES) {
      return NextResponse.json({ error: 'Resume file is too large' }, { status: 400 })
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

    const bytes = await resume.arrayBuffer()
    let resumeDetails: { mimeType: string; originalName: string }
    try {
      resumeDetails = validateResumeFile(resume, Buffer.from(bytes))
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid resume file' }, { status: 400 })
    }
    const resumeUrl = `data:${resumeDetails.mimeType};base64,${Buffer.from(bytes).toString('base64')}`

    const application = await prisma.jobApplication.create({
      data: {
        jobOpeningId,
        name,
        email,
        phone,
        company,
        resumeUrl,
        resumeOriginalName: resumeDetails.originalName,
        coverLetter,
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
        text: `A new application has been submitted for ${jobOpening.title}.\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || '-'}\nCompany: ${company || '-'}\nResume file: ${resumeDetails.originalName}\nResume access: available inside the admin dashboard.\nCover letter:\n${coverLetter || '-'}`,
        html: `<p>A new application has been submitted for <strong>${escapeHtml(jobOpening.title)}</strong>.</p><ul><li><strong>Name:</strong> ${escapeHtml(name)}</li><li><strong>Email:</strong> ${escapeHtml(email)}</li><li><strong>Phone:</strong> ${escapeHtml(phone || '-')}</li><li><strong>Company:</strong> ${escapeHtml(company || '-')}</li><li><strong>Resume file:</strong> ${escapeHtml(resumeDetails.originalName)}</li><li><strong>Resume access:</strong> Available inside the admin dashboard.</li></ul><p><strong>Cover letter:</strong></p><p>${escapeHtml(coverLetter || '-').replace(/\n/g, '<br />')}</p>`,
      }).catch((emailError) => {
        console.error('Failed to send job application notification:', emailError)
      })
    }

    await sendNotificationEmail({
      to: email,
      subject: `Application received for ${jobOpening.title}`,
      text: `Hello ${name},\n\nWe received your application for ${jobOpening.title}. Our team will review it and contact you if there is a match.\n\nQHSSE Consultant`,
      html: `<p>Hello ${escapeHtml(name)},</p><p>We received your application for <strong>${escapeHtml(jobOpening.title)}</strong>.</p><p>Our team will review it and contact you if there is a match.</p><p>QHSSE Consultant</p>`,
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
  } catch {
    return NextResponse.json({ error: 'Unable to submit application at this time' }, { status: 500 })
  }
}
