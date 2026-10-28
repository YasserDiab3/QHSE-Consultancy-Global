import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { ROLES } from '@/lib/permissions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await requireAdmin()
    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const body = await request.json().catch(() => ({}))

    const targetUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'عضو الفريق غير موجود' }, { status: 404 })
    }

    const { name, email, password, role, phone } = body
    const updateData: Record<string, any> = {}

    if (name && typeof name === 'string') {
      updateData.name = name.trim()
    }

    if (phone !== undefined) {
      updateData.phone = typeof phone === 'string' && phone.trim().length > 0 ? phone.trim() : null
    }

    if (email && typeof email === 'string' && email.includes('@')) {
      const normalizedEmail = email.trim().toLowerCase()
      if (normalizedEmail !== targetUser.email) {
        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
        if (existing) {
          return NextResponse.json({ error: 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر' }, { status: 400 })
        }
        updateData.email = normalizedEmail
      }
    }

    if (password && typeof password === 'string' && password.trim().length >= 8) {
      updateData.password = await bcrypt.hash(password.trim(), 12)
    }

    if (role && [ROLES.ADMIN, ROLES.DATA_ENTRY].includes(role)) {
      if (id === session.user.id && role !== ROLES.ADMIN) {
        const adminCount = await prisma.user.count({ where: { role: ROLES.ADMIN } })
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: 'لا يمكنك سحب صلاحية الإدارة من حسابك لأنك المدير الوحيد في النظام' },
            { status: 400 }
          )
        }
      }
      updateData.role = role
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        updatedAt: true,
      },
    })

    await logActivity(
      session.user.id,
      'TEAM_MEMBER_UPDATED',
      'user',
      id,
      `تحديث بيانات عضو الفريق: ${updatedUser.name} (${updatedUser.role})`,
      ip
    )

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'فشل في تحديث بيانات عضو الفريق' },
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
    const session = await requireAdmin()
    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'

    // Safeguard 1: Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'لا يمكنك حذف الحساب المسجل به حالياً منعاً لانقطاع الوصول وإقفال النظام في وجهك' },
        { status: 400 }
      )
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'عضو الفريق غير موجود' }, { status: 404 })
    }

    // Safeguard 2: Prevent deleting the last remaining admin
    if (targetUser.role === ROLES.ADMIN) {
      const adminCount = await prisma.user.count({
        where: { role: ROLES.ADMIN },
      })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'لا يمكن حذف المدير الوحيد المتبقي في النظام. يجب إضافة وتعيين مدير آخر أولاً' },
          { status: 400 }
        )
      }
    }

    // Safeguard 3: Preserve data integrity (reassign consultant reports to the current active admin)
    await prisma.report.updateMany({
      where: { consultantId: id },
      data: { consultantId: session.user.id },
    })

    // Delete user
    await prisma.user.delete({
      where: { id },
    })

    await logActivity(
      session.user.id,
      'TEAM_MEMBER_DELETED',
      'user',
      id,
      `حذف عضو الفريق: ${targetUser.name} (${targetUser.email} - ${targetUser.role})`,
      ip
    )

    return NextResponse.json({ success: true, message: 'تم حذف عضو الفريق بنجاح' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'فشل في حذف عضو الفريق' },
      { status: error.message === 'Forbidden' ? 403 : 500 }
    )
  }
}
