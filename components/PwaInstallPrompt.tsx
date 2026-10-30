'use client'

import { useEffect, useState } from 'react'
import { Download, X, Share, PlusSquare, Check } from 'lucide-react'
import { useLanguage } from '@/context'
import BrandLogo from '@/components/BrandLogo'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function PwaInstallPrompt() {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if dismissed recently (within 7 days)
    const lastDismissed = localStorage.getItem('qhsse_pwa_prompt_dismissed')
    if (lastDismissed && Date.now() - Number(lastDismissed) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true)
    }

    // Check if already running in standalone mode (already installed)
    const inStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (inStandalone) {
      setIsStandalone(true)
      return
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(ua)
    setIsIos(isIosDevice)

    // Listen for Chromium beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null)
      }
    } else if (isIos) {
      setShowIosGuide(true)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShowIosGuide(false)
    localStorage.setItem('qhsse_pwa_prompt_dismissed', String(Date.now()))
  }

  // Do not show if already in standalone app mode, or dismissed, or no install option available
  if (isStandalone || dismissed) {
    return null
  }

  // If neither prompt is available nor iOS
  if (!installPrompt && !isIos) {
    return null
  }

  return (
    <>
      {/* Floating Bottom Install Banner */}
      <div
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] end-4 z-40 max-w-sm w-[calc(100%-2rem)] sm:w-auto animate-in fade-in slide-in-from-bottom-5 duration-300"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-primary-950 p-4 text-white shadow-2xl border border-primary-500/30 backdrop-blur-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 p-1.5 text-white shadow-md border border-slate-800">
            <BrandLogo variant="mark" className="h-full w-full object-contain" priority />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white truncate">
              {isAr ? 'تطبيق QHSSE الرسمي' : 'Official QHSSE App'}
            </h4>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">
              {isAr
                ? 'ثبّت التطبيق على هاتفك للعمل في المصانع وتسجيل الملاحظات بدون إنترنت'
                : 'Install app on your phone for offline field inspections'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-primary-500 px-3.5 py-2.5 text-xs font-bold text-white shadow hover:bg-primary-400 active:scale-95 transition"
            >
              <Download className="h-4 w-4" />
              <span>{isAr ? 'تثبيت' : 'Install'}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              title={isAr ? 'إغلاق' : 'Dismiss'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl transition-all"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 p-1.5 text-white shadow-sm border border-slate-800">
                  <BrandLogo variant="mark" className="h-full w-full object-contain" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {isAr ? 'تثبيت تطبيق QHSSE' : 'Install QHSSE App'}
                  </h3>
                  <p className="text-[11px] text-gray-500">iPhone / iPad Safari</p>
                </div>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-gray-400 hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs text-gray-700 leading-relaxed">
              <p className="font-semibold text-gray-900">
                {isAr
                  ? 'اتبع الخطوات البسيطة التالية لإضافة التطبيق إلى شاشتك الرئيسية بشعاره الرسمي:'
                  : 'Follow these quick steps to add the app to your Home Screen with its official logo:'}
              </p>

              <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3.5 border border-gray-100">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">
                    {isAr ? 'اضغط على زر المشاركة (Share)' : 'Tap the Share button'}
                  </p>
                  <p className="text-gray-500 mt-0.5">
                    {isAr
                      ? 'ستجد أيقونة المشاركة أسفل متصفح Safari (أيقونة المربع وبداخله سهم للأعلى).'
                      : 'Look for the share icon at the bottom of Safari.'}
                  </p>
                  <div className="inline-flex items-center gap-1.5 mt-2 rounded-lg bg-white px-2.5 py-1.5 border border-gray-200 text-blue-600 font-semibold shadow-xs">
                    <Share className="h-3.5 w-3.5" />
                    <span>Share</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3.5 border border-gray-100">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">
                    {isAr
                      ? 'اختر "إضافة إلى الشاشة الرئيسية"'
                      : 'Select "Add to Home Screen"'}
                  </p>
                  <p className="text-gray-500 mt-0.5">
                    {isAr
                      ? 'مرر للأسفل في القائمة واضغط على خيار Add to Home Screen.'
                      : 'Scroll down and tap Add to Home Screen.'}
                  </p>
                  <div className="inline-flex items-center gap-1.5 mt-2 rounded-lg bg-white px-2.5 py-1.5 border border-gray-200 text-emerald-600 font-semibold shadow-xs">
                    <PlusSquare className="h-3.5 w-3.5" />
                    <span>Add to Home Screen</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3.5 border border-gray-100">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">
                    {isAr ? 'اضغط على "إضافة (Add)" أعلى اليمين' : 'Tap "Add" in top corner'}
                  </p>
                  <p className="text-gray-500 mt-0.5">
                    {isAr
                      ? 'سيظهر التطبيق كأيقونة مستقلة على هاتفك تعمل بكامل الشاشة وبشعار المنصة الرسمي.'
                      : 'The app icon will appear on your Home Screen, ready to launch in full screen.'}
                  </p>
                  <div className="flex items-center gap-2.5 mt-2.5 rounded-2xl bg-slate-900 px-3 py-2 text-white shadow-md border border-slate-800 w-fit">
                    <div className="h-7 w-7 shrink-0">
                      <BrandLogo variant="mark" className="h-full w-full object-contain" />
                    </div>
                    <span className="text-xs font-bold tracking-wide">QHSSE</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
              <button
                onClick={() => setShowIosGuide(false)}
                className="min-h-[44px] rounded-xl bg-primary-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-primary-500 active:scale-95 transition"
              >
                {isAr ? 'فهمت ذلك' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
