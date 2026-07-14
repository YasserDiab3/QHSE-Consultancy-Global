import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { getTrainingCourseBySlug, submitTrainingAttempt } from '@/lib/training-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const course = await getTrainingCourseBySlug(params.slug)
    if (!course) {
      return NextResponse.json({ error: 'Training course not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const answers = body?.answers && typeof body.answers === 'object' ? body.answers : {}

    const result = await submitTrainingAttempt({
      userId: session.user.id,
      courseId: course.id,
      answers,
    })

    const headerList = headers()
    await logActivity(
      session.user.id,
      result.passed ? 'TRAINING_PASSED' : 'TRAINING_FAILED',
      'training',
      course.id,
      `${course.title}: ${result.score}%`,
      headerList.get('x-forwarded-for') || 'unknown'
    )

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit training exam' }, { status: 500 })
  }
}
