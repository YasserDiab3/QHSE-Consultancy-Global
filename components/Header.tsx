'use client'

import { useLanguage } from '@/context'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import LanguageSwitcher from './LanguageSwitcher'
import { Menu, X, User, UserPlus, LogOut, LayoutDashboard, ShieldCheck, Home } from 'lucide-react'
import BrandLogo from './BrandLogo'

export default function Header() {
  const { t, language } = useLanguage()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/about', label: t('nav.about') },
    { href: '/services', label: t('nav.services') },
    { href: '/training', label: language === 'ar' ? 'التدريب' : 'Training' },
    { href: '/jobs', label: language === 'ar' ? 'الوظائف' : 'Jobs' },
    { href: '/contact', label: t('nav.contact') },
  ]
  const portalHref =
    session?.user.role === 'ADMIN'
      ? '/admin'
      : session?.user.role === 'TRAINEE'
        ? '/training'
        : '/dashboard'
  const portalLabel =
    session?.user.role === 'ADMIN'
      ? t('admin.title')
      : session?.user.role === 'TRAINEE'
        ? language === 'ar'
          ? 'التدريب'
          : 'Training'
        : t('nav.dashboard')

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-slate-200/70 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl' : 'bg-gradient-to-b from-slate-950/40 to-transparent'
      }`}
    >
      <div className="container-custom">
        <div className="flex h-[72px] items-center justify-between gap-3 md:h-[84px]">
          {/* Logo */}
          <Link
            href="/"
            className={`group flex shrink-0 items-center overflow-hidden rounded-2xl border p-1.5 shadow-lg shadow-slate-900/10 transition-all duration-300 hover:-translate-y-0.5 ${
              scrolled
                ? 'border-slate-200/80 bg-white/96'
                : 'border-white/70 bg-white/92 backdrop-blur-sm'
            }`}
          >
            <BrandLogo
              variant="header"
              priority
              className={`transition-all duration-300 ${
                scrolled
                  ? 'h-[52px] w-[52px] md:h-[60px] md:w-[60px]'
                  : 'h-[56px] w-[56px] md:h-[64px] md:w-[64px]'
              }`}
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className={`hidden items-center gap-1 rounded-2xl border px-2 py-1.5 lg:flex ${scrolled ? 'border-slate-200 bg-slate-50/80' : 'border-white/15 bg-white/5 backdrop-blur-sm'}`}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 xl:px-4 ${
                  scrolled
                    ? 'text-gray-700 hover:text-primary-500 hover:bg-gray-100'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <LanguageSwitcher />

            {session ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    scrolled
                      ? 'text-gray-700 hover:text-primary-500 hover:bg-gray-100'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  {t('nav.home')}
                </Link>
                <Link
                  href={portalHref}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    scrolled
                      ? 'text-gray-700 hover:text-primary-500 hover:bg-gray-100'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {session.user.role === 'ADMIN' ? (
                    <><ShieldCheck className="w-4 h-4" />{t('admin.title')}</>
                  ) : (
                    <><LayoutDashboard className="w-4 h-4" />{portalLabel}</>
                  )}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    scrolled
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/login"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    scrolled ? 'text-gray-700 hover:bg-gray-100 hover:text-primary-600' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <User className="w-4 h-4" />
                  {t('nav.login')}
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
                >
                  <UserPlus className="w-4 h-4" />
                  {language === 'ar' ? 'إنشاء حساب' : 'Create account'}
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
              }`}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white rounded-xl shadow-lg border border-gray-200 mb-4 overflow-hidden fade-in">
            <nav className="p-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg text-gray-700 hover:text-primary-500 hover:bg-gray-50 font-medium transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-gray-200">
                {session ? (
                  <>
                    <Link
                      href="/"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 rounded-lg text-gray-700 hover:text-primary-500 hover:bg-gray-50 font-medium"
                    >
                      {t('nav.home')}
                    </Link>
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
                      {t('nav.logout')}
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
