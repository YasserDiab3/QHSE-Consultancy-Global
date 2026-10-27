import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { createImageRecord } from '@/lib/image-records'
import { validateImageFile } from '@/lib/file-validation'
import { uploadFile } from '@/lib/storage'
import { enforceRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { getClientIdByUserId } from '@/lib/client-records'
import { listReportRecords } from '@/lib/report-records'
import { updateObservationRecord } from '@/lib/observation-records'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'CLIENT'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rateLimit = await enforceRateLimit(
      request,
      { keyPrefix: 'upload-image', limit: 40, windowMs: 15 * 60 * 1000 },
      session.user.id
    )
    if (!rateLimit.success) return rateLimitResponse(rateLimit)

    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const formData = await request.formData()

    const file = formData.get('file') as File
    const observationId = formData.get('observationId') as string
    const requestedType = (formData.get('type') as string) || 'EVIDENCE'

    if (!file || !observationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify client authorization for this specific observation
    if (session.user.role === 'CLIENT') {
      const clientId = await getClientIdByUserId(session.user.id)
      const reports = clientId ? await listReportRecords({ clientId }) : []
      const ownsObservation = reports.some((report) =>
        report.observations.some((obs) => obs.id === observationId)
      )

      if (!ownsObservation) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Clients upload proof photos which are categorized as 'AFTER'
    const finalType = session.user.role === 'CLIENT' ? 'AFTER' : requestedType

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
    const imageUrl = await uploadFile({
      data: Buffer.from(bytes),
      contentType: imageDetails.mimeType,
      originalName: imageDetails.originalName,
      folder: 'observations',
    })

    const image = await createImageRecord({
      observationId,
      type: finalType,
      url: imageUrl,
      originalName: imageDetails.originalName,
      mimeType: imageDetails.mimeType,
      size: file.size,
    })

    // If client uploaded proof, advance the action status to pending consultant review
    if (session.user.role === 'CLIENT') {
      await updateObservationRecord(observationId, {
        correctiveActionStatus: 'PENDING_REVIEW',
      })
    }

    await logActivity(
      session.user.id,
      session.user.role === 'CLIENT' ? 'CLIENT_PROOF_IMAGE_UPLOADED' : 'IMAGE_UPLOADED',
      'image',
      image.id,
      session.user.role === 'CLIENT'
        ? `Client uploaded proof photo (AFTER) for observation ${observationId}`
        : `Uploaded image for observation ${observationId}`,
      ip
    )

    return NextResponse.json(image, { status: 201 })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Unable to upload image at this time' }, { status: 500 })
  }
}
