'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { initAutoSync, syncAllPendingOfflineReports } from '@/lib/offline-sync'
import { getPendingSyncCount } from '@/lib/offline-reports-store'
import { useLanguage } from '@/context'

export default function PwaRegister() {
  const { language, dir } = useLanguage()
  const isAr = language === 'ar'
  const [isOffline, setIsOffline] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Check for updates
            registration.onupdatefound = () => {
              const installingWorker = registration.installing
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New version ready; will activate on reload.')
                  }
                }
              }
            }
          })
          .catch((err) => {
            console.warn('[PWA] Service worker registration error:', err)
          })
      })
    }

    // 2. Initial Online/Offline State
    setIsOffline(!navigator.onLine)

    const updatePending = async () => {
      const count = await getPendingSyncCount()
      setPendingCount(count)
    }
    updatePending()

    const handleOnline = () => {
      setIsOffline(false)
      toast.success('تمت استعادة الاتصال بالإنترنت - بدء المزامنة السحابية التلقائية', {
        icon: '📶',
        duration: 4000,
      })
    }

    const handleOffline = () => {
      setIsOffline(true)
      toast(
        'أنت الآن في وضع عدم الاتصال (Offline) - يمكنك كتابة تقارير الفحص والتقاط الصور وسيتم حفظها على جهازك ومزامنتها تلقائياً',
        {
          icon: '⚠️',
          duration: 6000,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #334155',
          },
        }
      )
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 3. Init Auto Sync Listener
    const cleanupSync = initAutoSync((res) => {
      if (res.successCount > 0) {
        toast.success(`تمت مزامنة ${res.successCount} تقرير ميداني مع السحابة بنجاح!`, {
          icon: '✅',
          duration: 5000,
        })
        updatePending()
      }
    })

    const interval = setInterval(updatePending, 15000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      cleanupSync()
      clearInterval(interval)
    }
  }, [])

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      toast.error('لا يمكن المزامنة: يرجى التحقق من اتصال هاتفك بالإنترنت أولاً')
      return
    }

    setIsSyncing(true)
    try {
      const result = await syncAllPendingOfflineReports((msg) => toast.loading(msg, { id: 'manual-sync' }))
      toast.dismiss('manual-sync')
      if (result.successCount > 0) {
        toast.success(`تمت مزامنة ${result.successCount} تقرير ميداني بنجاح!`)
      } else if (result.failedCount > 0) {
        toast.error(`تعذر مزامنة بعض التقارير (${result.failedCount}). سيتم إعادة المحاولة تلقائياً.`)
      } else {
        toast('لا توجد تقارير معلقة بانتظار المزامنة', { icon: 'ℹ️' })
      }
      const count = await getPendingSyncCount()
      setPendingCount(count)
    } catch {
      toast.dismiss('manual-sync')
      toast.error('حدث خطأ أثناء المزامنة')
    } finally {
      setIsSyncing(false)
    }
  }

  // Floating Status Bar when Offline or when there are Pending Sync items
  if (!isOffline && pendingCount === 0) {
    return null
  }

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] start-4 z-40 max-w-sm transition-all duration-300">
      <div
        className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl backdrop-blur-md border ${
          isOffline
            ? 'bg-amber-950/90 text-amber-100 border-amber-800'
            : 'bg-slate-900/90 text-slate-100 border-slate-700'
        }`}
        dir={dir}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isOffline ? 'bg-amber-800/80 text-amber-200' : 'bg-blue-600 text-white'
          }`}
        >
          {isOffline ? <WifiOff className="h-5 w-5 animate-pulse" /> : <Wifi className="h-5 w-5" />}
        </div>

        <div className="flex-1 text-xs">
          <p className="font-bold">
            {isOffline
              ? (isAr ? 'وضع المعاينة الميدانية بدون إنترنت' : 'Offline Field Inspection Mode')
              : (isAr ? 'متصل بالإنترنت' : 'Connected')}
          </p>
          <p className="text-[11px] opacity-80">
            {pendingCount > 0
              ? (isAr ? `يوجد ${pendingCount} تقرير معلق بانتظار المزامنة` : `${pendingCount} report(s) pending sync`)
              : isOffline
              ? (isAr ? 'يتم حفظ المسودات والصور محلياً على الهاتف' : 'Drafts & photos saved locally')
              : (isAr ? 'جميع التقارير متزامنة' : 'All reports synced')}
          </p>
        </div>

        {pendingCount > 0 && !isOffline && (
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow transition hover:bg-blue-500 disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'مزامنة' : 'Sync'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
