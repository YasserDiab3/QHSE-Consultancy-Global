'use client'

import BrandLogo from '@/components/BrandLogo'
import { useLanguage } from '@/context'
import { signIn, useSession } from 'next-auth/react'
import { Chrome, Eye, EyeOff, Loader2, Lock, Mail, Phone, UserRound } from 'lucide-react'
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
    if (password !== confirmPassword) {
      toast.error(language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match')
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
      toast.error(error instanceof Error ? error.message : copy.genericError)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    void signIn('google', { callbackUrl })
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
              <BrandLogo variant="stacked" priority className="h-[150px] w-[150px] md:h-[170px] md:w-[170px]" />
            </div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.55em] text-[#8B4D00]/72">
              {copy.portal}
            </p>
            <h1 className="text-3xl font-bold leading-tight text-slate-900">{copy.title}</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">{copy.subtitle}</p>
          </div>

          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {googleEnabled && (
                <>
                  <button type="button" onClick={handleGoogleSignIn} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                    <Chrome className="h-5 w-5 text-[#4285F4]" />
                    {language === 'ar' ? 'المتابعة باستخدام Google' : copy.continueWithGoogle}
                  </button>
                  <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />{language === 'ar' ? 'أو' : copy.or}<span className="h-px flex-1 bg-slate-200" /></div>
                </>
              )}
              <div>
                <label className="label-field text-slate-700">{copy.name}</label>
                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    autoComplete="name"
                    className="input-field rounded-2xl border-slate-200 bg-slate-50 py-3 pl-12 text-slate-900 focus:border-[#8B4D00]/35 focus:bg-white focus:ring-4 focus:ring-[#8B4D00]/10"
                  />
                </div>
              </div>

              <div>
                <label className="label-field text-slate-700">{copy.email}</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    placeholder="name@company.com"
                    className="input-field rounded-2xl border-slate-200 bg-slate-50 py-3 pl-12 text-slate-900 placeholder:text-slate-400 focus:border-[#8B4D00]/35 focus:bg-white focus:ring-4 focus:ring-[#8B4D00]/10"
                  />
                </div>
              </div>

              <div>
                <label className="label-field text-slate-700">{copy.password}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="input-field rounded-2xl border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-slate-900 focus:border-[#8B4D00]/35 focus:bg-white focus:ring-4 focus:ring-[#8B4D00]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label-field text-slate-700">{language === 'ar' ? 'رقم الهاتف' : copy.phone}</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required autoComplete="tel" placeholder="+20 111 775 5096" className="input-field rounded-2xl border-slate-200 bg-slate-50 py-3 pl-12 text-slate-900 placeholder:text-slate-400 focus:border-[#8B4D00]/35 focus:bg-white focus:ring-4 focus:ring-[#8B4D00]/10" />
                </div>
              </div>

              <div>
                <label className="label-field text-slate-700">{language === 'ar' ? 'تأكيد كلمة المرور' : copy.confirmPassword}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} autoComplete="new-password" className="input-field rounded-2xl border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-slate-900 focus:border-[#8B4D00]/35 focus:bg-white focus:ring-4 focus:ring-[#8B4D00]/10" />
                  <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600">
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || status === 'loading'}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3a4fc4] px-5 py-4 text-base font-semibold text-white shadow-lg shadow-[#3a4fc4]/25 transition hover:bg-[#3147bd] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {copy.loading}
                  </>
                ) : (
                  copy.button
                )}
              </button>
            </form>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-slate-600 sm:flex-row">
              <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-[#8B4D00] transition hover:text-[#6b3900]">
                {copy.hasAccount} {copy.login}
              </Link>
              <span className="hidden text-slate-300 sm:inline">|</span>
              <Link href="/" className="font-medium text-[#8B4D00] transition hover:text-[#6b3900]">
                {'<-'} {copy.back}
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
