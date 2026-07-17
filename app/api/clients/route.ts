import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { sendNotificationEmail } from '@/lib/email'
import { createClientAccount, getClientAccountById, listClientAccounts } from '@/lib/client-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    await requireAdmin()
    const clients = await listClientAccounts()
    return NextResponse.json(clients)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'

    const { name, email, password, companyName, companyNameAr, phone, address } = body

    if (!name || !email || !password || !companyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'CLIENT',
        language: 'en',
      },
    })

    let clientId: string | null = null

    try {
      clientId = await createClientAccount({
        userId: user.id,
        companyName,
        companyNameAr,
        phone,
        address,
      })
    } catch (error) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined)
      throw error
    }

    await logActivity(session.user.id, 'CLIENT_CREATED', 'client', clientId, `Created client account for ${companyName}`, ip)

    await sendNotificationEmail({
      to: user.email,
      subject: 'Your client portal account is ready',
      text: `Hello ${user.name}, your client portal account has been created for ${companyName}. You can sign in using your email at ${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''}/login.`,
      html: `<p>Hello ${user.name},</p><p>Your client portal account has been created for <strong>${companyName}</strong>.</p><p>You can sign in using your email at <a href="${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''}/login">${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''}/login</a>.</p>`,
    }).catch((error) => {
      console.error('Failed to send client welcome email:', error)
    })

    const client = await getClientAccountById(clientId)
    return NextResponse.json(client, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
