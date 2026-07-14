'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { CheckCircle2, Search, XCircle } from 'lucide-react'
import { useLanguage } from '@/context'

type Verification = {
  valid: boolean
  certificateCode?: string
  recipientName?: string | null
  courseTitle?: string
  courseTitleAr?: string | null
  score?: number | null
  issuedAt?: string | null
}

export default function VerifyCertificatePage() {
  const { language } = useLanguage()
  const [code, setCode] = useState('')
  const [result, setResult] = useState<Verification | null>(null)
  const [loading, setLoading] = useState(false)
  const isArabic = language === 'ar'

  const verify = async (event: FormEvent) => {
    event.preventDefault()
    const value = code.trim()
    if (!value) return
    setLoading(true)
    try {
      const response = await fetch(`/api/training/certificates/${encodeURIComponent(value)}/verify`, { cache: 'no-store' })
      const data = await response.json().catch(() => ({ valid: false }))
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  const date = result?.issuedAt ? new Date(result.issuedAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US') : '-'
  const title = isArabic && result?.courseTitleAr ? result.courseTitleAr : result?.courseTitle

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container-custom py-28">
        <section className="mx-auto max-w-2xl">
          <div className="card p-8 md:p-10">
            <h1 className="text-3xl font-bold text-gray-900">{isArabic ? 'التحقق من الشهادة' : 'Verify a certificate'}</h1>
            <p className="mt-3 text-gray-600">{isArabic ? 'أدخل رمز التحقق الموجود على الشهادة للتأكد من صحتها.' : 'Enter the verification code printed on the certificate to confirm its authenticity.'}</p>
            <form onSubmit={verify} className="mt-7 flex flex-col gap-3 sm:flex-row">
              <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="QHSSE-TR-2026-XXXXXXXX" className="input-field flex-1" />
              <button type="submit" disabled={loading} className="btn-primary justify-center px-6 py-3"><Search className="h-5 w-5" />{isArabic ? 'تحقق' : 'Verify'}</button>
            </form>
            {result && (result.valid ? (
              <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
                <div className="flex items-center gap-3 font-bold"><CheckCircle2 className="h-6 w-6 text-emerald-600" />{isArabic ? 'شهادة صالحة' : 'Valid certificate'}</div>
                <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-emerald-800/70">{isArabic ? 'المتدرب' : 'Recipient'}</dt><dd className="mt-1 font-semibold">{result.recipientName || '-'}</dd></div>
                  <div><dt className="text-emerald-800/70">{isArabic ? 'التدريب' : 'Training'}</dt><dd className="mt-1 font-semibold">{title}</dd></div>
                  <div><dt className="text-emerald-800/70">{isArabic ? 'النتيجة' : 'Score'}</dt><dd className="mt-1 font-semibold">{result.score}%</dd></div>
                  <div><dt className="text-emerald-800/70">{isArabic ? 'تاريخ الإصدار' : 'Issued'}</dt><dd className="mt-1 font-semibold">{date}</dd></div>
                </dl>
              </div>
            ) : (
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800"><XCircle className="h-6 w-6" />{isArabic ? 'رمز التحقق غير صالح أو الشهادة غير موجودة.' : 'The verification code is invalid or the certificate was not found.'}</div>
            ))}
          </div>
          <Link href="/training" className="mt-5 inline-block text-primary-700 hover:underline">{isArabic ? 'العودة إلى التدريب' : 'Back to training'}</Link>
        </section>
      </main>
      <Footer />
    </div>
  )
}
