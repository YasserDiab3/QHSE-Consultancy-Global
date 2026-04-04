import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { sendNotificationEmail } from '@/lib/email'

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
    return NextResponse.json(
      { error: error.message || 'Failed to load contact requests' },
      { status: error.message === 'Forbidden' ? 403 : 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, company, email, phone, message } = body

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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
        html: `<p>A new contact request has been submitted.</p><ul><li><strong>Name:</strong> ${name}</li><li><strong>Company:</strong> ${company || '-'}</li><li><strong>Email:</strong> ${email}</li><li><strong>Phone:</strong> ${phone || '-'}</li></ul><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br />')}</p><p><a href="${appUrl}/admin">Open admin panel</a></p>`,
      }).catch((emailError) => {
        console.error('Failed to send contact request notification:', emailError)
      })
    }

    await sendNotificationEmail({
      to: email,
      subject: 'We received your request',
      text: `Hello ${name},\n\nWe received your request and our team will contact you shortly.\n\nThank you,\nQHSSE Consultant`,
      html: `<p>Hello ${name},</p><p>We received your request and our team will contact you shortly.</p><p>Thank you,<br />QHSSE Consultant</p>`,
    }).catch((emailError) => {
      console.error('Failed to send contact request confirmation:', emailError)
    })

    return NextResponse.json(contactRequest, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to submit contact request' },
      { status: 500 }
    )
  }
}
