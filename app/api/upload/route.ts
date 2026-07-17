import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { createImageRecord } from '@/lib/image-records'
import { validateImageFile } from '@/lib/file-validation'
import { enforceRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rateLimit = await enforceRateLimit(
      request,
      { keyPrefix: 'admin-upload', limit: 30, windowMs: 15 * 60 * 1000 },
      session.user.id
    )
    if (!rateLimit.success) return rateLimitResponse(rateLimit)

    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const formData = await request.formData()

    const file = formData.get('file') as File
    const observationId = formData.get('observationId') as string
    const type = (formData.get('type') as string) || 'EVIDENCE'

    if (!file || !observationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image file is too large' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    let imageDetails: { mimeType: string; originalName: string }
    try {
      imageDetails = validateImageFile(file, Buffer.from(bytes))
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid image file' }, { status: 400 })
    }
    const imageUrl = `data:${imageDetails.mimeType};base64,${Buffer.from(bytes).toString('base64')}`

    const image = await createImageRecord({
      observationId,
      type,
      url: imageUrl,
      originalName: imageDetails.originalName,
      mimeType: imageDetails.mimeType,
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
    return NextResponse.json({ error: 'Unable to upload image at this time' }, { status: 500 })
  }
}
