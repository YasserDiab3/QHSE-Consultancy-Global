'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import BrandLogo from '@/components/BrandLogo'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useLanguage } from '@/context'
import { Award, Download, Loader2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { downloadTrainingCertificatePdf } from '@/lib/certificate-pdf'

type Certificate = {
  id: string
  userName: string | null
  userEmail: string | null
  courseTitle: string
  courseTitleAr?: string | null
  category: string
  score: number | null
  certificateCode: string | null
  certificateIssuedAt: string | Date | null
}

export default function TrainingCertificatePage() {
  const params = useParams<{ code: string }>()
  const { language } = useLanguage()
  const { status } = useSession()
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)

  const copy = useMemo(
    () =>
      language === 'ar'
        ? {
            loading: 'جاري تحميل الشهادة...',
            title: 'شهادة إتمام تدريب',
            presentedTo: 'تمنح هذه الشهادة إلى',
            completed: 'لإتمامه بنجاح تدريب',
            score: 'النتيجة',
            issueDate: 'تاريخ الإصدار',
            code: 'رقم الشهادة',
            verify: 'التحقق من الشهادة',
            print: 'طباعة / تنزيل PDF',
            back: 'العودة للتدريب',
            notFound: 'تعذر تحميل الشهادة',
          }
        : {
            loading: 'Loading certificate...',
            title: 'Certificate of Training Completion',
            presentedTo: 'This certificate is proudly presented to',
            completed: 'for successfully completing',
            score: 'Score',
            issueDate: 'Issue date',
            code: 'Certificate code',
            verify: 'Verify certificate',
            print: 'Print / Download PDF',
            back: 'Back to training',
            notFound: 'Failed to load certificate',
          },
    [language]
  )

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status === 'unauthenticated') {
        setLoading(false)
      }
      return
    }

    const loadCertificate = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/training/certificates/${params.code}`, { cache: 'no-store' })
        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(data?.error || copy.notFound)
        }

        setCertificate(data)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : copy.notFound)
      } finally {
        setLoading(false)
      }
    }

    void loadCertificate()
  }, [copy.notFound, params.code, status])

  const courseTitle = certificate
    ? language === 'ar' && certificate.courseTitleAr
      ? certificate.courseTitleAr
      : certificate.courseTitle
    : ''
  const issuedAt = certificate?.certificateIssuedAt
    ? new Date(certificate.certificateIssuedAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')
    : '-'

  const downloadPdf = async () => {
    if (!certificate) return
    try {
      await downloadTrainingCertificatePdf({
        recipientName: certificate.userName || certificate.userEmail || '-',
        courseTitle,
        score: certificate.score,
        certificateCode: certificate.certificateCode,
        issuedAt: certificate.certificateIssuedAt,
      })
    } catch {
      toast.error(language === 'ar' ? 'تعذر تنزيل الشهادة' : 'Failed to download certificate')
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
        <span className="ms-3 text-gray-600">{copy.loading}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="container-custom py-28 print:container-auto print:p-0">
        <div className="mx-auto mb-6 flex max-w-5xl justify-end gap-3 print:hidden">
          <button type="button" onClick={() => void downloadPdf()} className="btn-primary px-5 py-3">
            <Download className="h-5 w-5" />
            {language === 'ar' ? 'تحميل PDF' : 'Download PDF'}
          </button>
          <Link href="/training" className="btn-secondary px-5 py-3">
            {copy.back}
          </Link>
          <Link href="/training/verify" className="btn-secondary px-5 py-3">
            <ShieldCheck className="h-5 w-5" />
            {copy.verify}
          </Link>
        </div>

        {certificate ? (
          <section className="mx-auto max-w-5xl rounded-[36px] border border-amber-200 bg-white p-10 shadow-2xl print:min-h-screen print:max-w-none print:rounded-none print:border-0 print:shadow-none">
            <div className="rounded-[28px] border-4 border-double border-[#8B4D00]/35 p-10 text-center">
              <div className="mb-8 flex justify-center">
                <BrandLogo variant="stacked" priority className="h-[150px] w-[150px]" />
              </div>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-5 py-2 text-emerald-700">
                <Award className="h-5 w-5" />
                QHSSE Consultant
              </div>
              <h1 className="text-4xl font-bold text-primary-900 md:text-5xl">{copy.title}</h1>
              <p className="mt-10 text-lg text-gray-500">{copy.presentedTo}</p>
              <h2 className="mt-4 text-4xl font-bold text-[#8B4D00]">{certificate.userName || certificate.userEmail}</h2>
              <p className="mx-auto mt-8 max-w-2xl text-xl leading-9 text-gray-700">
                {copy.completed}
                <span className="block font-bold text-primary-800">{courseTitle}</span>
              </p>
              <div className="mt-12 grid gap-4 text-start md:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">{copy.score}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{certificate.score}%</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">{copy.issueDate}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{issuedAt}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">{copy.code}</p>
                  <p className="mt-2 break-all text-lg font-bold text-gray-900">{certificate.certificateCode}</p>
                  <Link href="/training/verify" className="mt-2 inline-block text-sm font-semibold text-primary-700 hover:underline print:hidden">
                    {copy.verify}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="card mx-auto max-w-xl py-14 text-center text-gray-600">{copy.notFound}</div>
        )}
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  )
}
