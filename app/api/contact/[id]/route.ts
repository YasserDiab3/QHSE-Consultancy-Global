import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
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
    return NextResponse.json(
      { error: error.message || 'Failed to update contact request' },
      { status: error.message === 'Forbidden' ? 403 : 500 }
    )
  }
}
