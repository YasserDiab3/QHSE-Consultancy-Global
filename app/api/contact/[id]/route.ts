import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

function isMissingContactRequestTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('ContactRequest') && message.includes('does not exist')
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await requireAdmin()
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const contactRequest = await prisma.contactRequest.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json(contactRequest)
  } catch (error: any) {
    if (isMissingContactRequestTable(error)) {
      return NextResponse.json(
        { error: 'Contact requests table is missing in the database. Please run the latest deployment sync.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update contact request' },
      { status: error.message === 'Forbidden' ? 403 : 500 }
    )
  }
}
