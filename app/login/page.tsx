'use client'

import BrandLogo from '@/components/BrandLogo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useLanguage } from '@/context'
import { signIn, useSession } from 'next-auth/react'
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
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
  const [formError, setFormError] = useState<string | null>(null)

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

  const getAuthErrorMessage = useCallback(
    (code?: string | null) => {
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
    },
    [copy]
  )

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl)
      router.refresh()
    }
  }, [callbackUrl, router, status])

  useEffect(() => {
    const message = getAuthErrorMessage(error)
    if (message) {
      setFormError(message)
      toast.error(message)
    }
  }, [error, getAuthErrorMessage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFormError(null)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        const message = getAuthErrorMessage(result.error) ?? t('common.error')
        setFormError(message)
        toast.error(message)
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
      setFormError(t('common.error'))
      toast.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.10),_transparent_36%),linear-gradient(135deg,_#ffffff,_#f1f5f9)]" />
      <div className="absolute end-4 top-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="relative w-full max-w-[520px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lifted">
          <div className="border-b border-slate-100 bg-gradient-to-b from-brand-gold-100/40 to-white px-6 pb-7 pt-8 text-center sm:px-8">
            <div className="mb-4 flex justify-center">
              <BrandLogo
                variant="stacked"
                priority
                className="h-[96px] w-[96px] md:h-[112px] md:w-[112px]"
              />
            </div>
            <p className="mb-2 text-eyebrow uppercase text-brand-gold">
              {copy.portal}
            </p>
            <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{t('auth.loginTitle')}</h1>
            <p className="mt-3 text-base leading-7 text-slate-600">{t('auth.loginSubtitle')}</p>
          </div>

          <div className="px-6 py-7 sm:px-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {formError ? (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              ) : null}

              <div>
                <label htmlFor="login-email" className="label-field text-slate-700">{t('auth.email')}</label>
                <div className="relative">
                  <Mail className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    aria-invalid={Boolean(formError)}
                    placeholder="name@company.com"
                    className="input-field py-3 ps-12"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="label-field text-slate-700">{t('auth.password')}</label>
                <div className="relative">
                  <Lock className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    aria-invalid={Boolean(formError)}
                    placeholder="••••••••"
                    className="input-field py-3 pe-12 ps-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? (language === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password') : (language === 'ar' ? 'إظهار كلمة المرور' : 'Show password')}
                    className="absolute end-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
                <div className="mt-2 text-end">
                  <a
                    href="mailto:support@qhsseconsultant.onmicrosoft.com?subject=Password%20reset%20request"
                    className="text-sm font-medium text-brand-gold underline-offset-2 hover:text-brand-gold-600 hover:underline"
                  >
                    {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || status === 'loading'}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading || status === 'loading' ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    {t('auth.loggingIn')}
                  </>
                ) : (
                  t('auth.loginButton')
                )}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-600">
              <Link
                href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="font-medium text-brand-gold transition hover:text-brand-gold-600"
              >
                {language === 'ar' ? 'إنشاء حساب متدرب' : 'Create trainee account'}
              </Link>
              <span className="mx-3 text-slate-300" aria-hidden="true">|</span>
              <Link href="/" className="inline-flex items-center gap-1.5 font-medium text-brand-gold transition hover:text-brand-gold-600">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                {t('common.back')}
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
