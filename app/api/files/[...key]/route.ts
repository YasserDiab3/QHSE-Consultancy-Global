import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createSignedStorageUrl, STORAGE_BUCKET } from '@/lib/storage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { key } = await params
  if (!Array.isArray(key) || key.length < 2) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const [bucket, ...segments] = key
  const objectPath = segments.join('/')

  if (bucket !== STORAGE_BUCKET || !objectPath || objectPath.includes('..')) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const storedUrl = `/api/files/${bucket}/${objectPath}`

  if (session.user.role !== 'ADMIN') {
    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Client logos are not sensitive and are rendered inside the client portal.
    if (!objectPath.startsWith('branding/')) {
      const [document, image] = await Promise.all([
        prisma.clientDocument.findFirst({
          where: {
            url: storedUrl,
            client: { userId: session.user.id },
          },
          select: { id: true },
        }),
        prisma.image.findFirst({
          where: {
            url: storedUrl,
            observation: {
              report: {
                client: { userId: session.user.id },
              },
            },
          },
          select: { id: true },
        }),
      ])

      if (!document && !image) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  const signedUrl = await createSignedStorageUrl(storedUrl, 120)
  if (!signedUrl) {
    return NextResponse.json({ error: 'File is not available' }, { status: 404 })
  }

  return NextResponse.redirect(signedUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
    },
  })
}
