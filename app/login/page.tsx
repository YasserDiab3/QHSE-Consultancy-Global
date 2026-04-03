'use client'

import { useLanguage } from '@/context'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Shield, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(t('common.success'))
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      toast.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.loginTitle')}</h1>
          <p className="text-gray-600 mt-2">{t('auth.loginSubtitle')}</p>
        </div>

        {/* Login Form */}
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
                  placeholder="••••••••"
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
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" />{t('auth.loggingIn')}</>
              ) : (
                t('auth.loginButton')
              )}
            </button>
          </form>
        </div>

        {/* Back to home */}
        <p className="text-center mt-6 text-sm text-gray-600">
          <Link href="/" className="text-primary-500 hover:text-primary-600 font-medium">
            ← {t('common.back')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
