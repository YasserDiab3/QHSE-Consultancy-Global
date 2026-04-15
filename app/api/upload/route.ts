import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { createImageRecord } from '@/lib/image-records'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const headerList = headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const formData = await request.formData()

    const file = formData.get('file') as File
    const observationId = formData.get('observationId') as string
    const type = (formData.get('type') as string) || 'EVIDENCE'

    if (!file || !observationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image file is too large' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const imageUrl = `data:${file.type || 'image/jpeg'};base64,${Buffer.from(bytes).toString('base64')}`

    const image = await createImageRecord({
      observationId,
      type,
      url: imageUrl,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    })

    await logActivity(
      session.user.id,
      'IMAGE_UPLOADED',
      'image',
      image.id,
      `Uploaded image for observation ${observationId}`,
      ip
    )

    return NextResponse.json(image, { status: 201 })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
