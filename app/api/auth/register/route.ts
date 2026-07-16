import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { enforceRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { formatValidationError, registrationSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = registrationSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 })
    const { name, email, password, phone } = parsed.data
    const language = parsed.data.language === 'ar' ? 'ar' : 'en'

    const rateLimit = await enforceRateLimit(
      request,
      { keyPrefix: 'registration', limit: 5, windowMs: 60 * 60 * 1000 },
      email
    )
    if (!rateLimit.success) return rateLimitResponse(rateLimit)

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Unable to create account with these details' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role: 'TRAINEE',
        language,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unable to create account at this time' }, { status: 500 })
  }
}
