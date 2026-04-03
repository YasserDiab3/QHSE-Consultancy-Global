import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    const filepath = join(uploadDir, filename)

    await writeFile(filepath, buffer)

    const imageUrl = `/uploads/${filename}`

    // Create image record in database
    const { prisma } = await import('@/lib/prisma')

    const image = await prisma.image.create({
      data: {
        observationId,
        type,
        url: imageUrl,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
      },
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
