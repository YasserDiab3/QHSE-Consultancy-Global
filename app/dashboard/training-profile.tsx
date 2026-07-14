'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Award, BookOpenCheck, Download, Loader2, UserRound } from 'lucide-react'
import { useLanguage } from '@/context'
import toast from 'react-hot-toast'

type Enrollment = {
  id: string
  courseTitle: string
  courseTitleAr?: string | null
  category: string
  status: string
  score: number | null
  passed: boolean
  attempts: number
  certificateCode: string | null
  certificateIssuedAt: string | null
  updatedAt: string | null
}

type Profile = {
  user: { id: string; name: string | null; email: string | null }
  enrollments: Enrollment[]
}

export default function TrainingProfile() {
  const { language } = useLanguage()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const copy = useMemo(
    () =>
      language === 'ar'
        ? {
            title: 'ملفي التدريبي',
            subtitle: 'تابع نتائج التدريب وحمّل شهاداتك مباشرة بعد الاجتياز.',
            completed: 'دورات مجتازة',
            certificates: 'شهادات متاحة',
            avgScore: 'متوسط النتائج',
            training: 'التدريب',
            status: 'الحالة',
            score: 'النتيجة',
            attempts: 'المحاولات',
            issuedAt: 'تاريخ الشهادة',
            certificate: 'تحميل الشهادة',
            noTraining: 'لا توجد تدريبات مسجلة على حسابك بعد.',
            loadError: 'تعذر تحميل الملف التدريبي',
          }
        : {
            title: 'My training profile',
            subtitle: 'Track training results and download certificates immediately after passing.',
            completed: 'Passed courses',
            certificates: 'Available certificates',
            avgScore: 'Average score',
            training: 'Training',
            status: 'Status',
            score: 'Score',
            attempts: 'Attempts',
            issuedAt: 'Certificate date',
            certificate: 'Download certificate',
            noTraining: 'No training activity is registered on your account yet.',
            loadError: 'Failed to load training profile',
          },
    [language]
  )

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/training/profile', { cache: 'no-store' })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data) throw new Error(data?.error || copy.loadError)
      setProfile(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.loadError)
    } finally {
      setLoading(false)
    }
  }, [copy.loadError])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const enrollments = profile?.enrollments ?? []
  const passed = enrollments.filter((item) => item.passed)
  const averageScore = enrollments.length
    ? Math.round(enrollments.reduce((sum, item) => sum + Number(item.score ?? 0), 0) / enrollments.length)
    : 0
  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : '-'

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[28px] bg-gradient-to-br from-primary-900 to-primary-700 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
              <UserRound className="h-4 w-4" />
              {profile?.user.email}
            </div>
            <h2 className="text-3xl font-bold">{copy.title}</h2>
            <p className="mt-3 max-w-2xl text-white/80">{copy.subtitle}</p>
          </div>
          <BookOpenCheck className="h-16 w-16 text-white/70" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Metric icon={BookOpenCheck} label={copy.completed} value={passed.length} />
        <Metric icon={Award} label={copy.certificates} value={passed.filter((item) => item.certificateCode).length} />
        <Metric icon={Download} label={copy.avgScore} value={`${averageScore}%`} />
      </div>

      <section className="card p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-200 text-sm text-gray-500">
                <th className="px-4 py-3 text-start">{copy.training}</th>
                <th className="px-4 py-3 text-start">{copy.status}</th>
                <th className="px-4 py-3 text-start">{copy.score}</th>
                <th className="px-4 py-3 text-start">{copy.attempts}</th>
                <th className="px-4 py-3 text-start">{copy.issuedAt}</th>
                <th className="px-4 py-3 text-start">{copy.certificate}</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.length ? enrollments.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 text-sm">
                  <td className="px-4 py-4 font-semibold text-gray-900">
                    {language === 'ar' && item.courseTitleAr ? item.courseTitleAr : item.courseTitle}
                    <div className="mt-1 text-xs font-normal text-gray-500">{item.category}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`badge ${item.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{item.status}</span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-900">{item.score == null ? '-' : `${item.score}%`}</td>
                  <td className="px-4 py-4 text-gray-700">{item.attempts}</td>
                  <td className="px-4 py-4 text-gray-700">{formatDate(item.certificateIssuedAt)}</td>
                  <td className="px-4 py-4">
                    {item.certificateCode ? (
                      <Link href={`/training/certificate/${item.certificateCode}`} className="btn-primary inline-flex px-4 py-2 text-sm">
                        <Download className="h-4 w-4" />
                        {copy.certificate}
                      </Link>
                    ) : '-'}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">{copy.noTraining}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}
