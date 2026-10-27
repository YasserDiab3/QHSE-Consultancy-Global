'use client'

import { useLanguage } from '@/context'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import LanguageSwitcher from './LanguageSwitcher'
import { Menu, X, User, UserPlus, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react'
import BrandLogo from './BrandLogo'

export default function Header() {
  const { t, language } = useLanguage()
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen])

  const navLinks = [
    { href: '/', label: language === 'ar' ? 'الرئيسية' : 'Home' },
    { href: '/about', label: language === 'ar' ? 'من نحن' : 'About' },
    { href: '/services', label: language === 'ar' ? 'خدماتنا' : 'Services' },
    { href: '/training', label: language === 'ar' ? 'التدريب' : 'Training' },
    { href: '/jobs', label: language === 'ar' ? 'الوظائف' : 'Jobs' },
    { href: '/contact', label: language === 'ar' ? 'اتصل بنا' : 'Contact' },
  ]
  const portalHref =
    session?.user.role === 'ADMIN'
      ? '/admin'
      : session?.user.role === 'TRAINEE'
        ? '/training'
        : '/dashboard'
  const portalLabel =
    session?.user.role === 'ADMIN'
      ? language === 'ar' ? 'لوحة تحكم المدير' : 'Admin Dashboard'
      : session?.user.role === 'TRAINEE'
        ? language === 'ar'
          ? 'التدريب'
          : 'Training'
        : t('nav.dashboard')
  const isPortal = pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  const useSolidHeader = isPortal || scrolled
  const isArabicInterface = language === 'ar'

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        useSolidHeader ? 'border-b border-primary-100/80 bg-white/95 shadow-[0_10px_32px_rgba(15,76,129,0.08)] backdrop-blur-xl' : 'bg-gradient-to-b from-primary-950/85 via-primary-900/45 to-transparent'
      }`}
    >
      <div className="container-custom">
        <div dir={isArabicInterface ? 'rtl' : 'ltr'} className="flex h-[72px] items-center gap-3 md:h-[84px]">
          {/* Logo */}
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2 transition-transform duration-300 hover:scale-[1.03]"
            aria-label="QHSSE Consultant — home"
          >
            <BrandLogo
              variant="mark"
              priority
              className={`transition-all duration-300 ${
                useSolidHeader
                  ? 'h-[46px] w-[46px] md:h-[54px] md:w-[54px]'
                  : 'h-[50px] w-[50px] md:h-[58px] md:w-[58px]'
              }`}
            />
            <span className="hidden flex-col leading-none sm:flex">
              <span className={`text-sm font-extrabold tracking-[0.08em] ${useSolidHeader ? 'text-primary-900' : 'text-white'}`}>
                QHSSE
              </span>
              <span className={`mt-1 text-[10px] font-semibold tracking-[0.24em] ${useSolidHeader ? 'text-slate-500' : 'text-white/75'}`}>
                CONSULTANT
              </span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav dir={language === 'ar' ? 'rtl' : 'ltr'} className={`hidden items-center gap-1 lg:flex ${useSolidHeader ? '' : 'rounded-2xl border border-white/15 bg-white/5 px-2 py-1.5 backdrop-blur-sm'}`}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 xl:px-4 ${
                  pathname === link.href
                    ? 'bg-primary-600 text-white shadow-sm'
                    : useSolidHeader
                    ? 'text-slate-700 hover:bg-primary-50 hover:text-primary-700'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div dir={language === 'ar' ? 'rtl' : 'ltr'} className={`${isArabicInterface ? 'me-auto' : 'ms-auto'} flex shrink-0 items-center gap-2 md:gap-3`}>
            <LanguageSwitcher />

            {session ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href={portalHref}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    useSolidHeader
                      ? 'text-gray-700 hover:text-primary-500 hover:bg-gray-100'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {session.user.role === 'ADMIN' ? (
                    <><ShieldCheck className="w-4 h-4" />{language === 'ar' ? 'لوحة تحكم المدير' : 'Admin Dashboard'}</>
                  ) : (
                    <><LayoutDashboard className="w-4 h-4" />{portalLabel}</>
                  )}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    useSolidHeader
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  {language === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/login"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    useSolidHeader ? 'text-gray-700 hover:bg-gray-100 hover:text-primary-600' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <User className="w-4 h-4" />
                  {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
                </Link>
                {pathname !== '/' && <Link
                  href="/register"
                  className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
                >
                  <UserPlus className="w-4 h-4" />
                  {language === 'ar' ? 'إنشاء حساب' : 'Create account'}
                </Link>}
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={mobileMenuOpen ? (language === 'ar' ? 'إغلاق القائمة' : 'Close menu') : (language === 'ar' ? 'فتح القائمة' : 'Open menu')}
              className={`rounded-lg p-2 transition-colors lg:hidden ${
                useSolidHeader ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
              }`}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-navigation" dir={language === 'ar' ? 'rtl' : 'ltr'} className="mb-4 max-h-[calc(100vh-96px)] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg fade-in lg:hidden">
            <nav className="p-4 space-y-1" aria-label={language === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  className="block rounded-lg px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary-500"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-gray-200">
                {session ? (
                  <>
                    <Link
                      href={portalHref}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 rounded-lg text-gray-700 hover:text-primary-500 hover:bg-gray-50 font-medium"
                    >
                      {portalLabel}
                    </Link>
                    <button
                      onClick={() => {
                        signOut({ callbackUrl: '/' })
                        setMobileMenuOpen(false)
                      }}
                      className="w-full text-start px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 font-medium"
                    >
                      {language === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg border border-primary-200 px-4 py-3 text-center font-medium text-primary-700">
                      {t('nav.login')}
                    </Link>
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg bg-primary-500 px-4 py-3 text-center font-medium text-white">
                      {language === 'ar' ? 'إنشاء حساب' : 'Create account'}
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
