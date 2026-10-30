import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaff } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { sendNotificationEmail } from '@/lib/email'
import { getClientAccountById, linkUserToClient, unlinkUserFromClient } from '@/lib/client-records'
import { parsePortalSettings, serializePortalSettings } from '@/lib/client-profile'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await requireStaff()
    const body = await request.json()
    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'

    const { email, name, password, sendEmail = true } = body

    const client = await getClientAccountById(id)
    if (!client) {
      return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 })
    }

    const trimmedEmail = typeof email === 'string' ? email.trim() : ''
    const trimmedName = typeof name === 'string' ? name.trim() : (client.companyNameAr || client.companyName)
    const trimmedPassword = typeof password === 'string' ? password.trim() : ''

    if (!trimmedEmail) {
      return NextResponse.json({ error: 'البريد الإلكتروني مطلوب لتفعيل الحساب' }, { status: 400 })
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن لا تقل عن 6 أحرف' }, { status: 400 })
    }

    let userId = client.userId

    if (userId) {
      // User account already exists, update credentials
      const duplicateUser = await prisma.user.findFirst({
        where: {
          email: trimmedEmail,
          id: { not: userId },
        },
      })
      if (duplicateUser) {
        return NextResponse.json({ error: 'البريد الإلكتروني مستخدم لحساب آخر' }, { status: 400 })
      }

      const hashedPassword = await bcrypt.hash(trimmedPassword, 12)
      await prisma.user.update({
        where: { id: userId },
        data: {
          email: trimmedEmail,
          name: trimmedName,
          password: hashedPassword,
        },
      })
    } else {
      // Check if user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      })

      if (existingUser) {
        // If an orphan client user exists with this email, link it; otherwise return error
        const existingClientWithUser = await prisma.client.findFirst({
          where: { userId: existingUser.id },
        })
        if (existingClientWithUser && existingClientWithUser.id !== client.id) {
          return NextResponse.json({ error: 'البريد الإلكتروني مستخدم لعميل آخر' }, { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(trimmedPassword, 12)
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: trimmedName,
            password: hashedPassword,
            role: 'CLIENT',
          },
        })
        userId = existingUser.id
        await linkUserToClient(client.id, userId)
      } else {
        const hashedPassword = await bcrypt.hash(trimmedPassword, 12)
        const newUser = await prisma.user.create({
          data: {
            name: trimmedName,
            email: trimmedEmail,
            password: hashedPassword,
            role: 'CLIENT',
            language: 'ar',
            phone: client.phone || null,
          },
        })
        userId = newUser.id
        await linkUserToClient(client.id, userId)
      }
    }

    // Sync settings
    const settings = parsePortalSettings(client.contactInfo)
    settings.contactEmail = trimmedEmail
    settings.contactPerson = trimmedName
    await prisma.client.update({
      where: { id: client.id },
      data: { contactInfo: serializePortalSettings(settings) },
    }).catch(() => null)

    await logActivity(
      session.user.id,
      'CLIENT_ACCOUNT_ACTIVATED',
      'client',
      client.id,
      `Activated portal access for ${client.companyName} (${trimmedEmail})`,
      ip
    )

    if (sendEmail) {
      await sendNotificationEmail({
        to: trimmedEmail,
        subject: 'تم تفعيل حسابك في بوابة العميل',
        text: `مرحباً ${trimmedName}، تم تفعيل حسابك للدخول إلى بوابة عملاء ${client.companyName}. البريد: ${trimmedEmail} - يمكنك تسجيل الدخول عبر: ${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''}/login`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #0284c7;">مرحباً ${trimmedName}</h2>
            <p>تم تفعيل حساب الدخول الخاص بشركتكم <strong>${client.companyName}</strong> لبوابة إدارة السلامة.</p>
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #bae6fd;">
              <p style="margin: 0 0 8px;"><strong>بيانات الدخول:</strong></p>
              <p style="margin: 0 0 4px;">البريد الإلكتروني: <code>${trimmedEmail}</code></p>
              <p style="margin: 0;">كلمة المرور: <code>${trimmedPassword}</code></p>
            </div>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''}/login" style="display: inline-block; background: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">الدخول إلى البوابة</a></p>
            <p style="font-size: 12px; color: #64748b; margin-top: 20px;">ننصح بتغيير كلمة المرور بعد أول تسجيل دخول من صفحة الملف الشخصي.</p>
          </div>
        `,
      }).catch((err) => {
        console.error('Failed to send activation email:', err)
      })
    }

    const updatedClient = await getClientAccountById(client.id)
    return NextResponse.json({ success: true, client: updatedClient })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'حدث خطأ أثناء تفعيل الحساب' },
      { status: error.message === 'Forbidden' ? 403 : 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await requireStaff()
    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'

    const client = await getClientAccountById(id)
    if (!client) {
      return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 })
    }

    if (!client.userId) {
      return NextResponse.json({ error: 'العميل لا يمتلك حساب دخول مفعل' }, { status: 400 })
    }

    const previousUserId = client.userId
    await unlinkUserFromClient(client.id)

    // Delete or deactivate the client user
    await prisma.user.delete({ where: { id: previousUserId } }).catch(() => null)

    await logActivity(
      session.user.id,
      'CLIENT_ACCOUNT_DEACTIVATED',
      'client',
      client.id,
      `Deactivated portal access for ${client.companyName}`,
      ip
    )

    const updatedClient = await getClientAccountById(client.id)
    return NextResponse.json({ success: true, client: updatedClient })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'حدث خطأ أثناء تعطيل الحساب' },
      { status: error.message === 'Forbidden' ? 403 : 500 }
    )
  }
}
