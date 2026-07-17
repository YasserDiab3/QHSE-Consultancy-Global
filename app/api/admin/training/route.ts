import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import {
  createTrainingCourse,
  listAdminTrainingCourses,
  listAdminTrainingEnrollments,
} from '@/lib/training-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    await requireAdmin()

    const [courses, enrollments] = await Promise.all([
      listAdminTrainingCourses(),
      listAdminTrainingEnrollments(),
    ])

    const totalPassed = enrollments.filter((item) => item.passed).length
    const averageScore = enrollments.length
      ? Math.round(
          enrollments.reduce((sum, item) => sum + Number(item.score ?? 0), 0) / enrollments.length
        )
      : 0

    return NextResponse.json(
      {
        courses,
        enrollments,
        summary: {
          totalCourses: courses.length,
          totalEnrollments: enrollments.length,
          totalCertificates: totalPassed,
          averageScore,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (error: any) {
    const status = error?.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: error.message || 'Failed to load training admin data' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin()
    const body = await request.json().catch(() => ({}))

    const result = await createTrainingCourse({
      title: String(body.title || ''),
      titleAr: body.titleAr || null,
      category: String(body.category || 'SAFETY'),
      description: body.description || null,
      descriptionAr: body.descriptionAr || null,
      content: String(body.content || ''),
      contentAr: body.contentAr || null,
      passingScore: Number(body.passingScore || 80),
      isPublished: body.isPublished !== false,
      questions: Array.isArray(body.questions) ? body.questions : [],
    })

    const headerList = await headers()
    await logActivity(
      session.user.id,
      'TRAINING_COURSE_CREATED',
      'training',
      result.id,
      result.slug,
      headerList.get('x-forwarded-for') || 'unknown'
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    const status = error?.message === 'Forbidden' ? 403 : 400
    return NextResponse.json({ error: error.message || 'Failed to create training course' }, { status })
  }
}
