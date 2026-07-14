import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ensureTrainingEnrollment, getTrainingCourseBySlug, listTrainingQuestions } from '@/lib/training-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const course = await getTrainingCourseBySlug(params.slug)
    if (!course) {
      return NextResponse.json({ error: 'Training course not found' }, { status: 404 })
    }

    await ensureTrainingEnrollment(session.user.id, course.id)
    const questions = await listTrainingQuestions(course.id)

    return NextResponse.json(
      { course, questions },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load training course' }, { status: 500 })
  }
}
