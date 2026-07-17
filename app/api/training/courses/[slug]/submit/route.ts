import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { getTrainingCourseBySlug, submitTrainingAttempt } from '@/lib/training-records'
import { enforceRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { formatValidationError, trainingAnswersSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimit = await enforceRateLimit(
      request,
      { keyPrefix: 'training-submit', limit: 10, windowMs: 15 * 60 * 1000 },
      session.user.id
    )
    if (!rateLimit.success) return rateLimitResponse(rateLimit)

    const course = await getTrainingCourseBySlug(slug)
    if (!course) {
      return NextResponse.json({ error: 'Training course not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = trainingAnswersSchema.safeParse(body?.answers)
    if (!parsed.success) return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 })
    const answers = parsed.data

    const result = await submitTrainingAttempt({
      userId: session.user.id,
      courseId: course.id,
      answers,
    })

    const headerList = await headers()
    await logActivity(
      session.user.id,
      result.passed ? 'TRAINING_PASSED' : 'TRAINING_FAILED',
      'training',
      course.id,
      `${course.title}: ${result.score}%`,
      headerList.get('x-forwarded-for') || 'unknown'
    )

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Unable to submit training exam at this time' }, { status: 500 })
  }
}
