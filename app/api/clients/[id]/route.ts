import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, requireStaff } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { deleteClientAccount, getClientAccountById, updateClientAccount, updateClientContactInfo } from '@/lib/client-records'
import { parsePortalSettings, serializePortalSettings } from '@/lib/client-profile'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await requireStaff()
    const body = await request.json()
    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'

    const { name, email, password, companyName, companyNameAr, phone, address, profileLocked } = body

    const existingClient = await getClientAccountById(id)

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (email && email !== existingClient.user.email) {
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
    }

    const userUpdateData: Record<string, unknown> = {}
    if (name) userUpdateData.name = name
    if (email) userUpdateData.email = email
    if (password) {
      userUpdateData.password = await bcrypt.hash(password, 12)
    }

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: existingClient.userId },
        data: userUpdateData,
      })
    }

    if (companyName) {
      await updateClientAccount(id, {
        companyName,
        companyNameAr: companyNameAr !== undefined ? companyNameAr : existingClient.companyNameAr,
        phone: phone !== undefined ? phone : existingClient.phone,
        address: address !== undefined ? address : existingClient.address,
      })
    }

    if (profileLocked !== undefined) {
      const existingSettings = parsePortalSettings(existingClient.contactInfo)
      const isLocking = Boolean(profileLocked)
      existingSettings.profileLocked = isLocking
      if (isLocking) {
        existingSettings.lockedAt = existingSettings.lockedAt || new Date().toISOString()
        existingSettings.lockedBy = `ADMIN:${session.user.id}`
      } else {
        delete existingSettings.lockedAt
        delete existingSettings.lockedBy
      }
      await updateClientContactInfo(id, serializePortalSettings(existingSettings))
    }

    await logActivity(
      session.user.id,
      'CLIENT_UPDATED',
      'client',
      id,
      `Updated client account for ${companyName || existingClient.companyName}${profileLocked !== undefined ? ` (lock: ${profileLocked})` : ''}`,
      ip
    )

    const updatedClient = await getClientAccountById(id)
    return NextResponse.json(updatedClient)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
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

    const client = await getClientAccountById(id)

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    await logActivity(
      session.user.id,
      'CLIENT_DELETED',
      'client',
      id,
      `Deleted client account for ${client.companyName}`,
      ip
    )

    await deleteClientAccount(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
