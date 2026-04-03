import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'

export async function GET() {
  try {
    await requireAdmin()
    const clients = await prisma.client.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            reports: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return NextResponse.json(clients)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const headerList = headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'

    const { name, email, password, companyName, companyNameAr, phone, address } = body

    if (!name || !email || !password || !companyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'CLIENT',
        language: 'en',
        client: {
          create: {
            companyName,
            companyNameAr,
            phone,
            address,
          },
        },
      },
      include: {
        client: true,
      },
    })

    await logActivity(user.id, 'CLIENT_CREATED', 'client', user.client!.id, `Created client account for ${companyName}`, ip)

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
