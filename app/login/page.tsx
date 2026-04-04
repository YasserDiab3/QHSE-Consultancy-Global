'use client'

import BrandLogo from '@/components/BrandLogo'
import { useLanguage } from '@/context'
import { signIn, useSession } from 'next-auth/react'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

const AUTH_SERVICE_UNAVAILABLE = 'AUTH_SERVICE_UNAVAILABLE'

function LoginForm() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const error = searchParams.get('error')

  const copy = useMemo(
    () =>
      language === 'ar'
        ? {
            invalidCredentials: 'بيانات تسجيل الدخول غير صحيحة',
            serviceUnavailable: 'خدمة تسجيل الدخول غير متاحة حاليا. حاول مرة أخرى بعد قليل.',
            genericError: 'تعذر تسجيل الدخول. تحقق من الإعدادات ثم حاول مرة أخرى.',
            portal: 'CLIENT PORTAL',
          }
        : {
            invalidCredentials: t('auth.invalidCredentials'),
            serviceUnavailable: t('auth.serviceUnavailable'),
            genericError: 'Unable to sign in. Please check the configuration and try again.',
            portal: 'CLIENT PORTAL',
          },
    [language, t]
  )

  const getAuthErrorMessage = (code?: string | null) => {
    if (code === 'CredentialsSignin') {
      return copy.invalidCredentials
    }

    if (code === AUTH_SERVICE_UNAVAILABLE) {
      return copy.serviceUnavailable
    }

    if (!code) {
      return null
    }

    return copy.genericError
  }

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl)
      router.refresh()
    }
  }, [callbackUrl, router, status])

  useEffect(() => {
    const message = getAuthErrorMessage(error)
    if (message) {
      toast.error(message)
    }
  }, [copy.genericError, error, language])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        toast.error(getAuthErrorMessage(result.error) ?? t('common.error'))
        return
      }

      if (result?.url) {
        const parsedUrl = result.url.startsWith('http') ? new URL(result.url) : null
        const targetUrl = parsedUrl
          ? `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
          : result.url

        router.replace(targetUrl)
        router.refresh()
        return
      }

      router.replace(callbackUrl)
      router.refresh()
    } catch {
      toast.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f9fc] px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(151,215,0,0.14),_transparent_32%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,247,252,0.95))]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(139,77,0,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(139,77,0,0.45) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      <div className="relative w-full max-w-[560px]">
        <div className="overflow-hidden rounded-[34px] border border-white/85 bg-white/92 shadow-[0_32px_100px_rgba(15,23,42,0.14)] backdrop-blur-xl">
          <div className="border-b border-slate-100 bg-gradient-to-b from-[#f9fbf4] to-white px-8 pb-8 pt-10 text-center">
            <div className="mx-auto mb-5 flex justify-center">
              <BrandLogo variant="stacked" priority className="w-[200px] md:w-[230px]" />
            </div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.55em] text-[#8B4D00]/72">
              {copy.portal}
            </p>
            <h1 className="text-3xl font-bold leading-tight text-slate-900">{t('auth.loginTitle')}</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">{t('auth.loginSubtitle')}</p>
          </div>

          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="label-field text-slate-700">{t('auth.email')}</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="name@company.com"
                    className="input-field rounded-2xl border-slate-200 bg-slate-50 py-3 pl-12 text-slate-900 placeholder:text-slate-400 focus:border-[#8B4D00]/35 focus:bg-white focus:ring-4 focus:ring-[#8B4D00]/10"
                  />
                </div>
              </div>

              <div>
                <label className="label-field text-slate-700">{t('auth.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="........"
                    className="input-field rounded-2xl border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-[#8B4D00]/35 focus:bg-white focus:ring-4 focus:ring-[#8B4D00]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || status === 'loading'}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3a4fc4] px-5 py-4 text-base font-semibold text-white shadow-lg shadow-[#3a4fc4]/25 transition hover:bg-[#3147bd] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading || status === 'loading' ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('auth.loggingIn')}
                  </>
                ) : (
                  t('auth.loginButton')
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-600">
              <Link href="/" className="font-medium text-[#8B4D00] transition hover:text-[#6b3900]">
                {'<-'} {t('common.back')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
