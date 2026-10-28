import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { sendNotificationEmail } from '@/lib/email'
import { ROLES } from '@/lib/permissions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await requireAdmin()

    const users = await prisma.user.findMany({
      where: {
        role: {
          in: [ROLES.ADMIN, ROLES.DATA_ENTRY],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        language: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    const result = users.map((u) => ({
      ...u,
      isCurrentUser: u.id === session.user.id,
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team users' },
      { status: error.message === 'Forbidden' ? 403 : 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin()
    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const body = await request.json().catch(() => ({}))

    const { name, email, password, role, phone } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'اسم المستخدم مطلوب' }, { status: 400 })
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'بريد إلكتروني صالح مطلوب' }, { status: 400 })
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن لا تقل عن 8 خانات' }, { status: 400 })
    }

    const assignedRole = role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.DATA_ENTRY

    const normalizedEmail = email.trim().toLowerCase()
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      return NextResponse.json({ error: 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: assignedRole,
        phone: phone?.trim() || null,
        language: 'ar',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
      },
    })

    await logActivity(
      session.user.id,
      'TEAM_MEMBER_CREATED',
      'user',
      newUser.id,
      `إضافة عضو جديد في الفريق: ${newUser.name} (${assignedRole})`,
      ip
    )

    // Send invitation / credentials email asynchronously
    const roleAr = assignedRole === ROLES.ADMIN ? 'مدير نظام (Super Admin)' : 'مدخل بيانات (Data Entry)'
    sendNotificationEmail({
      to: newUser.email,
      subject: 'بيانات حسابك في منصة QHSSE Consultant',
      text: `مرحباً ${newUser.name}،\n\nتم إنشاء حسابك في منصة QHSSE بنجاح بصلاحية (${roleAr}).\n\nبيانات الدخول:\nالبريد الإلكتروني: ${newUser.email}\nكلمة المرور: ${password}\n\nيمكنك تسجيل الدخول من خلال الرابط: https://qhsseconsultant.com/login`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 24px; color: #1e293b; background-color: #f8fafc; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-bottom: 16px;">مرحباً ${newUser.name}،</h2>
          <p style="font-size: 15px; line-height: 1.6;">تم إنشاء حسابك في منصة <strong>QHSSE Consultant</strong> بنجاح وتعيينك بصلاحية: <strong>${roleAr}</strong>.</p>
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <p style="margin: 6px 0;"><strong>البريد الإلكتروني:</strong> <span style="font-family: monospace; color: #2563eb;">${newUser.email}</span></p>
            <p style="margin: 6px 0;"><strong>كلمة المرور:</strong> <span style="font-family: monospace; color: #059669;">${password}</span></p>
          </div>
          <p style="font-size: 14px; color: #64748b;">يرجى تسجيل الدخول وتغيير كلمة المرور في أول استخدام لضمان الأمان.</p>
          <div style="margin-top: 24px;">
            <a href="https://qhsseconsultant.com/login" style="background-color: #2563eb; color: #ffffff; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">تسجيل الدخول للمنصة</a>
          </div>
        </div>
      `,
    }).catch((err) => {
      console.error('Failed to send welcome email to new team member:', err)
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'فشل في إضافة عضو الفريق' },
      { status: error.message === 'Forbidden' ? 403 : 500 }
    )
  }
}
