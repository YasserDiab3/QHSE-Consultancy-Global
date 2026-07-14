import { NextResponse } from 'next/server'
import { listPublishedTrainingCourses } from '@/lib/training-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const courses = await listPublishedTrainingCourses()
    return NextResponse.json(courses, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load training courses' }, { status: 500 })
  }
}
