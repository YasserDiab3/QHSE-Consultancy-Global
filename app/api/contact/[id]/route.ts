import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ensureContactRequestTable, isMissingTableOrColumnError } from '@/lib/db-compat'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    await ensureContactRequestTable()
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const contactRequest = await prisma.contactRequest.update({
      where: { id: params.id },
      data: { status },
    })

    return NextResponse.json(contactRequest)
  } catch (error: any) {
    if (isMissingTableOrColumnError(error)) {
      return NextResponse.json(
        { error: 'Contact requests storage is not ready yet. Please redeploy and try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update contact request' },
      { status: error.message === 'Forbidden' ? 403 : 500 }
    )
  }
}
