'use client'

import { useLanguage } from '@/context'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import LanguageSwitcher from './LanguageSwitcher'
import { Menu, X, Shield, User, LogOut, LayoutDashboard, ShieldCheck, Home } from 'lucide-react'

export default function Header() {
  const { t } = useLanguage()
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
    { href: '/contact', label: t('nav.contact') },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Shield className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className={`text-lg md:text-xl font-bold transition-colors ${scrolled ? 'text-primary-600' : 'text-white'}`}>
                QHSSE
              </span>
              <span className={`text-lg md:text-xl font-light transition-colors ${scrolled ? 'text-gray-600' : 'text-white/90'}`}>
                {' '}Consultant
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
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
          <div className="flex items-center gap-3">
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
                  href={session.user.role === 'ADMIN' ? '/admin' : '/dashboard'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    scrolled
                      ? 'text-gray-700 hover:text-primary-500 hover:bg-gray-100'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {session.user.role === 'ADMIN' ? (
                    <><ShieldCheck className="w-4 h-4" />{t('admin.title')}</>
                  ) : (
                    <><LayoutDashboard className="w-4 h-4" />{t('nav.dashboard')}</>
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
              <Link
                href="/login"
                className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  scrolled
                    ? 'bg-primary-500 text-white hover:bg-primary-600'
                    : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                <User className="w-4 h-4" />
                {t('nav.login')}
              </Link>
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
                      href={session.user.role === 'ADMIN' ? '/admin' : '/dashboard'}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 rounded-lg text-gray-700 hover:text-primary-500 hover:bg-gray-50 font-medium"
                    >
                      {session.user.role === 'ADMIN' ? t('admin.title') : t('nav.dashboard')}
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
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-lg bg-primary-500 text-white font-medium text-center"
                  >
                    {t('nav.login')}
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
