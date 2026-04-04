import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { ensureClientTableCompatibility, isMissingTableOrColumnError } from '@/lib/db-compat'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    await ensureClientTableCompatibility()
    const body = await request.json()
    const headerList = headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'

    const { name, email, password, companyName, companyNameAr, phone, address } = body

    const existingClient = await prisma.client.findUnique({
      where: { id: params.id },
      include: { user: true },
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const duplicateUser = await prisma.user.findFirst({
      where: {
        email,
        id: {
          not: existingClient.userId,
        },
      },
    })

    if (duplicateUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const updateData: any = {
      companyName,
      companyNameAr,
      phone,
      address,
    }

    const userUpdateData: any = {
      name,
      email,
    }

    if (password) {
      userUpdateData.password = await bcrypt.hash(password, 12)
    }

    const updatedClient = await prisma.client.update({
      where: { id: params.id },
      data: {
        ...updateData,
        user: {
          update: userUpdateData,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    await logActivity(
      existingClient.userId,
      'CLIENT_UPDATED',
      'client',
      params.id,
      `Updated client account for ${companyName}`,
      ip
    )

    return NextResponse.json(updatedClient)
  } catch (error: any) {
    if (isMissingTableOrColumnError(error)) {
      return NextResponse.json(
        { error: 'Client schema in the database is outdated. Please redeploy once and try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    await ensureClientTableCompatibility()
    const headerList = headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'

    const client = await prisma.client.findUnique({
      where: { id: params.id },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    await prisma.client.delete({
      where: { id: params.id },
    })

    await logActivity(
      client.userId,
      'CLIENT_DELETED',
      'client',
      params.id,
      `Deleted client account for ${client.companyName}`,
      ip
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (isMissingTableOrColumnError(error)) {
      return NextResponse.json(
        { error: 'Client schema in the database is outdated. Please redeploy once and try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
