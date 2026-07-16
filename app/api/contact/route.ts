import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { sendNotificationEmail } from '@/lib/email'
import { enforceRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { contactRequestSchema, escapeHtml, formatValidationError } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isMissingContactRequestTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('ContactRequest') && message.includes('does not exist')
}

export async function GET() {
  try {
    await requireAdmin()

    const requests = await prisma.contactRequest.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(requests)
  } catch (error: any) {
    if (isMissingContactRequestTable(error)) {
      return NextResponse.json([])
    }

    return NextResponse.json(
      { error: error.message || 'Failed to load contact requests' },
      { status: error.message === 'Forbidden' ? 403 : 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = contactRequestSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 })
    const { name, company, email, phone, message } = parsed.data

    const rateLimit = await enforceRateLimit(
      request,
      { keyPrefix: 'contact', limit: 5, windowMs: 60 * 60 * 1000 },
      email
    )
    if (!rateLimit.success) return rateLimitResponse(rateLimit)

    const contactRequest = await prisma.contactRequest.create({
      data: {
        name,
        company,
        email,
        phone,
        message,
      },
    })

    const notificationTarget = process.env.CONTACT_NOTIFICATION_EMAIL || process.env.SMTP_USER
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''

    if (notificationTarget) {
      await sendNotificationEmail({
        to: notificationTarget,
        subject: `New contact request from ${name}`,
        text: `A new contact request has been submitted.\n\nName: ${name}\nCompany: ${company || '-'}\nEmail: ${email}\nPhone: ${phone || '-'}\nMessage:\n${message}\n\nView requests in the admin panel: ${appUrl}/admin`,
        html: `<p>A new contact request has been submitted.</p><ul><li><strong>Name:</strong> ${escapeHtml(name)}</li><li><strong>Company:</strong> ${escapeHtml(company || '-')}</li><li><strong>Email:</strong> ${escapeHtml(email)}</li><li><strong>Phone:</strong> ${escapeHtml(phone || '-')}</li></ul><p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br />')}</p><p><a href="${appUrl}/admin">Open admin panel</a></p>`,
      }).catch((emailError) => {
        console.error('Failed to send contact request notification:', emailError)
      })
    }

    await sendNotificationEmail({
      to: email,
      subject: 'We received your request',
      text: `Hello ${name},\n\nWe received your request and our team will contact you shortly.\n\nThank you,\nQHSSE Consultant`,
      html: `<p>Hello ${escapeHtml(name)},</p><p>We received your request and our team will contact you shortly.</p><p>Thank you,<br />QHSSE Consultant</p>`,
    }).catch((emailError) => {
      console.error('Failed to send contact request confirmation:', emailError)
    })

    return NextResponse.json(contactRequest, { status: 201 })
  } catch (error: any) {
    if (isMissingContactRequestTable(error)) {
      return NextResponse.json(
        { error: 'Contact requests table is missing in the database. Please run the latest deployment sync.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Unable to submit your request at this time' },
      { status: 500 }
    )
  }
}
