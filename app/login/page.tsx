'use client'

import { useLanguage } from '@/context'
import { signIn, useSession } from 'next-auth/react'
import { Suspense, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'

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

  const getAuthErrorMessage = (code?: string | null) => {
    if (code === 'CredentialsSignin') {
      return language === 'ar' ? 'بيانات تسجيل الدخول غير صحيحة' : t('auth.invalidCredentials')
    }

    if (code === AUTH_SERVICE_UNAVAILABLE) {
      return language === 'ar'
        ? 'خدمة تسجيل الدخول غير متاحة حاليا. حاول مرة أخرى بعد قليل.'
        : t('auth.serviceUnavailable')
    }

    if (!code) return null

    return language === 'ar'
      ? 'تعذر تسجيل الدخول. تحقق من الإعدادات ثم حاول مرة أخرى.'
      : 'Unable to sign in. Please check the configuration and try again.'
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
  }, [error, language])

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
        const targetUrl = result.url.startsWith('http')
          ? new URL(result.url).pathname + new URL(result.url).search + new URL(result.url).hash
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <BrandLogo
              className="justify-center"
              textClassName="text-primary-800"
              subtitleClassName="text-primary-500/70"
            />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.loginTitle')}</h1>
          <p className="text-gray-600 mt-2">{t('auth.loginSubtitle')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label-field">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-field pl-10"
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label-field">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-field pl-10 pr-10"
                  placeholder="........"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || status === 'loading'}
              className="btn-primary w-full"
            >
              {loading || status === 'loading' ? (
                <><Loader2 className="w-5 h-5 animate-spin" />{t('auth.loggingIn')}</>
              ) : (
                t('auth.loginButton')
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-gray-600">
          <Link href="/" className="text-primary-500 hover:text-primary-600 font-medium">
            {'<-'} {t('common.back')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
