'use client'

import BrandLogo from '@/components/BrandLogo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useLanguage } from '@/context'
import { signIn, useSession } from 'next-auth/react'
import { AlertCircle, ArrowLeft, Chrome, Eye, EyeOff, Loader2, Lock, Mail, Phone, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

function RegisterForm() {
  const { language } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const callbackUrl = searchParams.get('callbackUrl') || '/training'
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN_ENABLED === 'true'

  const copy = useMemo(
    () =>
      language === 'ar'
        ? {
            phone: 'رقم الهاتف',
            confirmPassword: 'تأكيد كلمة المرور',
            continueWithGoogle: 'المتابعة باستخدام Google',
            or: 'أو',
            portal: 'TRAINING PORTAL',
            title: 'إنشاء حساب متدرب',
            subtitle: 'سجل حسابك للوصول إلى تدريبات السلامة وسلامة الغذاء والاختبار والشهادة.',
            name: 'الاسم الكامل',
            email: 'البريد الإلكتروني',
            password: 'كلمة المرور',
            button: 'إنشاء الحساب والدخول',
            loading: 'جاري إنشاء الحساب...',
            success: 'تم إنشاء الحساب بنجاح',
            hasAccount: 'لديك حساب بالفعل؟',
            login: 'تسجيل الدخول',
            back: 'رجوع',
            passwordsDoNotMatch: 'كلمتا المرور غير متطابقتين',
            passwordHint: '10 أحرف على الأقل',
            genericError: 'تعذر إنشاء الحساب. حاول مرة أخرى.',
          }
        : {
            portal: 'TRAINING PORTAL',
            title: 'Create trainee account',
            subtitle: 'Register to access safety and food-safety training, exams, and certificates.',
            name: 'Full name',
            email: 'Email address',
            password: 'Password',
            confirmPassword: 'Confirm password',
            phone: 'Phone number',
            passwordsDoNotMatch: 'Passwords do not match',
            passwordHint: 'At least 10 characters',
            continueWithGoogle: 'Continue with Google',
            or: 'or',
            button: 'Create account and sign in',
            loading: 'Creating account...',
            success: 'Account created successfully',
            hasAccount: 'Already have an account?',
            login: 'Sign in',
            back: 'Back',
            genericError: 'Unable to create account. Please try again.',
          },
    [language]
  )

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl)
      router.refresh()
    }
  }, [callbackUrl, router, status])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (password.length < 10) {
      setFormError(copy.passwordHint)
      return
    }

    if (password !== confirmPassword) {
      setFormError(copy.passwordsDoNotMatch)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, confirmPassword, language }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || copy.genericError)
      }

      toast.success(copy.success)
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      if (result?.url) {
        const parsedUrl = result.url.startsWith('http') ? new URL(result.url) : null
        router.replace(parsedUrl ? `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` : result.url)
        router.refresh()
        return
      }

      router.replace(callbackUrl)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.genericError
      setFormError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    void signIn('google', { callbackUrl })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.10),_transparent_36%),linear-gradient(135deg,_#ffffff,_#f1f5f9)]" />
      <div className="absolute end-4 top-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="relative w-full max-w-[540px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lifted">
          <div className="border-b border-slate-100 bg-gradient-to-b from-brand-gold-100/40 to-white px-6 pb-7 pt-8 text-center sm:px-8">
            <div className="mb-4 flex justify-center">
              <BrandLogo variant="stacked" priority className="h-[88px] w-[88px] md:h-[104px] md:w-[104px]" />
            </div>
            <p className="mb-2 text-eyebrow uppercase text-brand-gold">{copy.portal}</p>
            <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{copy.title}</h1>
            <p className="mt-3 text-base leading-7 text-slate-600">{copy.subtitle}</p>
          </div>

          <div className="px-6 py-7 sm:px-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {formError ? (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              ) : null}

              {googleEnabled && (
                <>
                  <button type="button" onClick={handleGoogleSignIn} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                    <Chrome className="h-5 w-5 text-[#4285F4]" aria-hidden="true" />
                    {copy.continueWithGoogle}
                  </button>
                  <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-500"><span className="h-px flex-1 bg-slate-200" />{copy.or}<span className="h-px flex-1 bg-slate-200" /></div>
                </>
              )}

              <div>
                <label htmlFor="register-name" className="label-field">{copy.name}</label>
                <div className="relative">
                  <UserRound className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="register-name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    autoComplete="name"
                    className="input-field py-3 ps-12"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-email" className="label-field">{copy.email}</label>
                <div className="relative">
                  <Mail className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    placeholder="name@company.com"
                    className="input-field py-3 ps-12"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-phone" className="label-field">{copy.phone}</label>
                <div className="relative">
                  <Phone className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="register-phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                    autoComplete="tel"
                    placeholder="+20 111 775 5096"
                    className="input-field py-3 ps-12"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-password" className="label-field">{copy.password}</label>
                <div className="relative">
                  <Lock className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={10}
                    autoComplete="new-password"
                    aria-describedby="register-password-hint"
                    className="input-field py-3 pe-12 ps-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? (language === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password') : (language === 'ar' ? 'إظهار كلمة المرور' : 'Show password')}
                    className="absolute end-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
                <p id="register-password-hint" className="mt-1.5 text-xs text-slate-500">{copy.passwordHint}</p>
              </div>

              <div>
                <label htmlFor="register-confirm-password" className="label-field">{copy.confirmPassword}</label>
                <div className="relative">
                  <Lock className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="register-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={10}
                    autoComplete="new-password"
                    className="input-field py-3 pe-12 ps-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    aria-label={showConfirmPassword ? (language === 'ar' ? 'إخفاء تأكيد كلمة المرور' : 'Hide password confirmation') : (language === 'ar' ? 'إظهار تأكيد كلمة المرور' : 'Show password confirmation')}
                    className="absolute end-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || status === 'loading'}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    {copy.loading}
                  </>
                ) : (
                  copy.button
                )}
              </button>

              <p className="text-center text-xs leading-6 text-slate-500">
                {language === 'ar' ? (
                  <>
                    بإنشاء الحساب فإنك توافق على{' '}
                    <Link href="/terms" className="font-medium text-brand-gold underline underline-offset-2">شروط الاستخدام</Link>{' '}
                    و{' '}
                    <Link href="/privacy" className="font-medium text-brand-gold underline underline-offset-2">سياسة الخصوصية</Link>.
                  </>
                ) : (
                  <>
                    By creating an account you agree to our{' '}
                    <Link href="/terms" className="font-medium text-brand-gold underline underline-offset-2">Terms of Service</Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="font-medium text-brand-gold underline underline-offset-2">Privacy Policy</Link>.
                  </>
                )}
              </p>
            </form>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 text-sm text-slate-600 sm:flex-row">
              <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-brand-gold transition hover:text-brand-gold-600">
                {copy.hasAccount} {copy.login}
              </Link>
              <span className="hidden text-slate-300 sm:inline" aria-hidden="true">|</span>
              <Link href="/" className="inline-flex items-center gap-1.5 font-medium text-brand-gold transition hover:text-brand-gold-600">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                {copy.back}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}
