import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaff } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { sendNotificationEmail } from '@/lib/email'
import { createClientAccount, getClientAccountById, listClientAccounts } from '@/lib/client-records'
import { PortalSettings, serializePortalSettings } from '@/lib/client-profile'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    await requireStaff()
    const clients = await listClientAccounts()
    return NextResponse.json(clients)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStaff()
    const body = await request.json()
    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'

    const {
      name,
      email,
      password,
      companyName,
      companyNameAr,
      phone,
      address,
      showFinances = false,
      createAccount = false,
    } = body

    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ error: 'اسم المنشأة مطلوب' }, { status: 400 })
    }

    const trimmedEmail = typeof email === 'string' ? email.trim() : ''
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    const shouldCreateUser = Boolean((createAccount || password) && password?.trim())

    let userId: string | null = null

    if (shouldCreateUser) {
      if (!trimmedEmail) {
        return NextResponse.json({ error: 'البريد الإلكتروني مطلوب لإنشاء حساب دخول' }, { status: 400 })
      }

      const existingUser = await prisma.user.findUnique({ where: { email: trimmedEmail } })
      if (existingUser) {
        return NextResponse.json({ error: 'البريد الإلكتروني مستخدم بالفعل' }, { status: 400 })
      }

      const hashedPassword = await bcrypt.hash(password.trim(), 12)

      const user = await prisma.user.create({
        data: {
          name: trimmedName || companyName.trim(),
          email: trimmedEmail,
          password: hashedPassword,
          phone: phone?.trim() || null,
          role: 'CLIENT',
          language: 'ar',
        },
      })

      userId = user.id
    }

    const initialSettings: PortalSettings = {
      contactPerson: trimmedName || undefined,
      contactEmail: trimmedEmail || undefined,
      showFinances: Boolean(showFinances),
    }

    let clientId: string | null = null

    try {
      clientId = await createClientAccount({
        userId,
        companyName: companyName.trim(),
        companyNameAr: companyNameAr?.trim() || undefined,
        phone: phone?.trim() || undefined,
        address: address?.trim() || undefined,
        contactInfo: serializePortalSettings(initialSettings),
      })
    } catch (error) {
      if (userId) {
        await prisma.user.delete({ where: { id: userId } }).catch(() => undefined)
      }
      throw error
    }

    await logActivity(
      session.user.id,
      'CLIENT_CREATED',
      'client',
      clientId,
      `Created client account for ${companyName} (${userId ? 'with portal user' : 'no portal user'})`,
      ip
    )

    if (userId && trimmedEmail) {
      await sendNotificationEmail({
        to: trimmedEmail,
        subject: 'تم تفعيل حسابك في بوابة العميل',
        text: `مرحباً ${trimmedName || companyName}، تم إنشاء وتفعيل حسابك لبوابة العميل لشركة ${companyName}. يمكنك الدخول باستخدام بريدك الإلكتروني عبر: ${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''}/login`,
        html: `<p>مرحباً ${trimmedName || companyName}،</p><p>تم تفعيل حسابك لبوابة العميل لـ <strong>${companyName}</strong>.</p><p>يمكنك تسجيل الدخول عبر: <a href="${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''}/login">${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''}/login</a>.</p>`,
      }).catch((error) => {
        console.error('Failed to send client welcome email:', error)
      })
    }

    const client = await getClientAccountById(clientId)
    return NextResponse.json(client, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
