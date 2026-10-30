'use client'

import { useState, useEffect, useRef } from 'react'
import {
  WifiOff,
  Wifi,
  Plus,
  Camera,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  FileText,
  Building2,
  Calendar,
  Layers,
  Image as ImageIcon,
  Send,
  Loader2,
} from 'lucide-react'
import { useLanguage } from '@/context'
import toast from 'react-hot-toast'
import {
  OfflineDraftReport,
  OfflineObservation,
  OfflineObservationImage,
  getOfflineReports,
  saveOfflineReportDraft,
  deleteOfflineReport,
  getCachedClients,
  cacheClientsLocally,
} from '@/lib/offline-reports-store'
import { syncAllPendingOfflineReports, syncSingleOfflineReport } from '@/lib/offline-sync'
import { getRiskLevelColor } from '@/lib/colors'

const CATEGORIES = [
  { value: 'GENERAL_SAFETY', labelAr: 'السلامة العامة', labelEn: 'General Safety' },
  { value: 'FOOD_SAFETY', labelAr: 'سلامة الغذاء والأيزو 22000', labelEn: 'Food Safety & ISO 22000' },
  { value: 'OCCUPATIONAL_HEALTH', labelAr: 'الصحة المهنية', labelEn: 'Occupational Health' },
  { value: 'FIRE_SAFETY', labelAr: 'مكافحة الحريق والإنذار', labelEn: 'Fire Safety & Prevention' },
  { value: 'ENVIRONMENTAL', labelAr: 'إدارة البيئة والمخلفات', labelEn: 'Environmental Management' },
  { value: 'QUALITY', labelAr: 'إدارة الجودة ISO 9001', labelEn: 'Quality Management' },
]

export default function OfflineInspectionModal({
  isOpen,
  onClose,
  onSynced,
}: {
  isOpen: boolean
  onClose: () => void
  onSynced?: () => void
}) {
  const { language, dir } = useLanguage()
  const isAr = language === 'ar'

  const [activeTab, setActiveTab] = useState<'NEW' | 'DRAFTS'>('NEW')
  const [offlineReports, setOfflineReports] = useState<OfflineDraftReport[]>([])
  const [cachedClients, setCachedClients] = useState<Array<{ id: string; companyName: string }>>([])
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<string>('')

  // Form State
  const [clientId, setClientId] = useState('')
  const [siteName, setSiteName] = useState('')
  const [category, setCategory] = useState('GENERAL_SAFETY')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  // Observations list
  const [observations, setObservations] = useState<OfflineObservation[]>([])

  // Current observation being drafted
  const [obsTitle, setObsTitle] = useState('')
  const [obsRisk, setObsRisk] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM')
  const [obsDesc, setObsDesc] = useState('')
  const [obsImages, setObsImages] = useState<OfflineObservationImage[]>([])

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Load drafts and client cache
  const loadData = async () => {
    const drafts = await getOfflineReports()
    setOfflineReports(drafts)

    // Load clients
    let clients = await getCachedClients()
    if (clients.length === 0 && navigator.onLine) {
      try {
        const res = await fetch('/api/clients')
        if (res.ok) {
          const remoteClients = await res.json()
          clients = remoteClients.map((c: any) => ({
            id: c.id,
            companyName: c.companyName || c.user?.name,
          }))
          await cacheClientsLocally(clients)
        }
      } catch {}
    }
    setCachedClients(clients)
  }

  useEffect(() => {
    if (isOpen) {
      setIsOnline(navigator.onLine)
      loadData()
    }
  }, [isOpen])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Handle Photo Capture from Camera/Files
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        setObsImages((prev) => [
          ...prev,
          {
            id: 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            type: 'BEFORE',
            dataUrl,
            name: file.name,
            mimeType: file.type || 'image/jpeg',
            size: file.size,
          },
        ])
      }
      reader.readAsDataURL(file)
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAddObservation = () => {
    if (!obsTitle.trim()) {
      toast.error(isAr ? 'يرجى كتابة عنوان الملاحظة' : 'Please enter observation title')
      return
    }

    const newObs: OfflineObservation = {
      id: 'obs-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      title: obsTitle.trim(),
      description: obsDesc.trim(),
      riskLevel: obsRisk,
      status: 'OPEN',
      images: [...obsImages],
    }

    setObservations((prev) => [...prev, newObs])

    // Reset current observation input
    setObsTitle('')
    setObsDesc('')
    setObsRisk('MEDIUM')
    setObsImages([])
    toast.success(isAr ? 'تمت إضافة الملاحظة للتقرير' : 'Observation added')
  }

  const handleRemoveObservation = (id: string) => {
    setObservations((prev) => prev.filter((o) => o.id !== id))
  }

  const handleSaveReportDraft = async () => {
    if (!clientId) {
      toast.error(isAr ? 'يرجى اختيار العميل أو المصنع' : 'Please select client')
      return
    }
    if (!siteName.trim()) {
      toast.error(isAr ? 'يرجى تحديد اسم الموقع أو خط الإنتاج' : 'Please enter site name')
      return
    }
    if (observations.length === 0) {
      toast.error(
        isAr ? 'يرجى إضافة ملاحظة فحص واحدة على الأقل' : 'Please add at least one observation'
      )
      return
    }

    const selectedClient = cachedClients.find((c) => c.id === clientId)

    const draftReport: OfflineDraftReport = {
      id: 'draft-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      clientId,
      clientName: selectedClient?.companyName || 'عميل',
      siteName: siteName.trim(),
      date,
      category,
      notes: notes.trim() || undefined,
      status: 'OPEN',
      observations,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'PENDING_SYNC',
    }

    await saveOfflineReportDraft(draftReport)
    toast.success(
      isAr
        ? 'تم حفظ تقرير المعاينة بنجاح على الهاتف (جاهز للمزامنة)'
        : 'Inspection draft saved offline successfully',
      { icon: '💾' }
    )

    // Reset form
    setSiteName('')
    setNotes('')
    setObservations([])
    await loadData()
    setActiveTab('DRAFTS')

    // If online, offer auto sync
    if (navigator.onLine) {
      handleSyncAll()
    }
  }

  const handleSyncAll = async () => {
    if (!navigator.onLine) {
      toast.error(isAr ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection')
      return
    }

    setIsSyncing(true)
    try {
      const result = await syncAllPendingOfflineReports((msg) => setSyncProgress(msg))
      if (result.successCount > 0) {
        toast.success(
          isAr
            ? `تمت مزامنة ${result.successCount} تقرير مع السحابة بنجاح!`
            : `Synced ${result.successCount} reports to cloud!`
        )
        onSynced?.()
      } else if (result.failedCount > 0) {
        toast.error(
          isAr
            ? `تعذر مزامنة ${result.failedCount} تقرير. تحقق من الشبكة.`
            : `Failed to sync ${result.failedCount} reports.`
        )
      } else {
        toast(isAr ? 'جميع التقارير متزامنة بالفعل' : 'All reports are already synced', { icon: 'ℹ️' })
      }
      await loadData()
    } finally {
      setIsSyncing(false)
      setSyncProgress('')
    }
  }

  const handleSyncSingle = async (draft: OfflineDraftReport) => {
    if (!navigator.onLine) {
      toast.error(isAr ? 'يرجى الاتصال بالإنترنت' : 'Connect to internet first')
      return
    }

    setIsSyncing(true)
    try {
      const res = await syncSingleOfflineReport(draft, (msg) => setSyncProgress(msg))
      if (res.success) {
        toast.success(isAr ? 'تمت مزامنة التقرير بنجاح!' : 'Report synced successfully!')
        await loadData()
        onSynced?.()
      } else {
        toast.error(res.error || (isAr ? 'فشلت المزامنة' : 'Sync failed'))
      }
    } finally {
      setIsSyncing(false)
      setSyncProgress('')
    }
  }

  const handleDeleteDraft = async (id: string) => {
    if (confirm(isAr ? 'هل أنت متأكد من حذف هذه المسودة؟' : 'Delete this draft?')) {
      await deleteOfflineReport(id)
      await loadData()
      toast.success(isAr ? 'تم حذف المسودة' : 'Draft deleted')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm">
      <div
        className="flex h-full sm:h-[92vh] max-h-[100dvh] w-full max-w-4xl flex-col rounded-none sm:rounded-3xl bg-white shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom,0px)]"
        dir={dir}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-slate-900 p-3.5 sm:p-6 text-white pt-[calc(0.875rem+env(safe-area-inset-top,0px))]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 shadow-md">
              <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-lg font-bold">
                  {isAr ? 'المعاينة الميدانية (أوفلاين)' : 'Offline Field Inspection'}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-bold ${
                    isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {isOnline ? (isAr ? 'أونلاين' : 'Online') : (isAr ? 'أوفلاين' : 'Offline')}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                {isAr
                  ? 'تسجيل الملاحظات والتقاط الصور مباشرة من الموقع بحفظ محلي ومزامنة سحابية'
                  : 'Capture inspection observations and photos directly on site with auto cloud sync'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleSyncAll}
              disabled={isSyncing || !isOnline}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-blue-500 disabled:opacity-40 transition"
              title={isAr ? 'مزامنة المسودات مع السحابة' : 'Sync drafts to cloud'}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isAr ? 'مزامنة السحابة' : 'Cloud Sync'}</span>
            </button>
            <button
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sync Progress Bar if active */}
        {isSyncing && (
          <div className="bg-blue-600 px-4 py-2 text-xs font-semibold text-white flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{syncProgress || (isAr ? 'جاري مزامنة التقارير مع السحابة...' : 'Syncing reports to cloud...')}</span>
            </div>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 px-4 pt-2">
          <button
            onClick={() => setActiveTab('NEW')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs sm:text-sm font-bold transition ${
              activeTab === 'NEW'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Plus className="h-4 w-4" />
            {isAr ? 'معاينة جديدة وتصوير الملاحظات' : 'New Field Inspection'}
          </button>
          <button
            onClick={() => setActiveTab('DRAFTS')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs sm:text-sm font-bold transition ${
              activeTab === 'DRAFTS'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Clock className="h-4 w-4" />
            {isAr ? 'المسودات المحفوظة محلياً' : 'Local Drafts'}
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] text-primary-700">
              {offlineReports.length}
            </span>
          </button>
        </div>

        {/* Tab 1: New Inspection Form */}
        {activeTab === 'NEW' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Top General Info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isAr ? 'العميل أو المنشأة *' : 'Client / Facility *'}
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 text-base sm:text-sm focus:border-primary-500 focus:outline-none"
                >
                  <option value="">{isAr ? '-- اختر العميل --' : '-- Select Client --'}</option>
                  {cachedClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isAr ? 'اسم الموقع / خط الإنتاج / المستودع *' : 'Site / Line / Area *'}
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder={isAr ? 'مثال: خط التعبئة والتغليف 1' : 'e.g. Production Line 1'}
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 text-base sm:text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isAr ? 'مجال الفحص *' : 'Category *'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 text-base sm:text-sm focus:border-primary-500 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {isAr ? c.labelAr : c.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Current Observations Added */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary-600" />
                  <span>
                    {isAr ? 'ملاحظات الفحص المسجلة' : 'Recorded Observations'} ({observations.length})
                  </span>
                </h4>
              </div>

              {observations.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center text-xs text-gray-400">
                  {isAr
                    ? 'لم يتم تسجيل أي ملاحظات بعد. استخدم المربع بالأسفل لكتابة الملاحظة والتقاط الصور.'
                    : 'No observations recorded yet. Use the card below to add one.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {observations.map((obs, idx) => (
                    <div
                      key={obs.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-900">{obs.title}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getRiskLevelColor(
                              obs.riskLevel
                            )}`}
                          >
                            {obs.riskLevel}
                          </span>
                        </div>
                        {obs.description && (
                          <p className="text-xs text-gray-500 ps-7">{obs.description}</p>
                        )}

                        {obs.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1 ps-7">
                            {obs.images.map((img) => (
                              <div
                                key={img.id}
                                className="relative h-14 w-14 overflow-hidden rounded-xl border border-gray-200 shadow-sm"
                              >
                                <img
                                  src={img.dataUrl}
                                  alt={img.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemoveObservation(obs.id)}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title={isAr ? 'حذف الملاحظة' : 'Remove observation'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fast Add Observation Card */}
            <div className="rounded-2xl border border-primary-200 bg-primary-50/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-xs sm:text-sm font-bold text-primary-950 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary-600" />
                  <span>{isAr ? 'إضافة ملاحظة فحص والتقاط صورة' : 'Add Observation & Capture Photo'}</span>
                </h5>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {isAr ? 'وصف المخالفة أو الملاحظة *' : 'Observation Title *'}
                  </label>
                  <input
                    type="text"
                    value={obsTitle}
                    onChange={(e) => setObsTitle(e.target.value)}
                    placeholder={
                      isAr
                        ? 'مثال: وجود تسرّب زيوت على ممر المشاة الرئيسي أو عدم ارتداء السترة'
                        : 'e.g. Oil leakage on pedestrian path'
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white p-3 text-base sm:text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {isAr ? 'درجة الخطورة *' : 'Risk Level *'}
                  </label>
                  <select
                    value={obsRisk}
                    onChange={(e) => setObsRisk(e.target.value as any)}
                    className="w-full rounded-xl border border-gray-200 bg-white p-3 text-base sm:text-sm font-semibold focus:border-primary-500 focus:outline-none"
                  >
                    <option value="LOW">{isAr ? 'منخفضة (LOW)' : 'LOW'}</option>
                    <option value="MEDIUM">{isAr ? 'متوسطة (MEDIUM)' : 'MEDIUM'}</option>
                    <option value="HIGH">{isAr ? 'عالية (HIGH)' : 'HIGH'}</option>
                    <option value="CRITICAL">{isAr ? 'حرجة جداً (CRITICAL)' : 'CRITICAL'}</option>
                  </select>
                </div>
              </div>

              {/* Photo Upload / Camera snap */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700">
                  {isAr ? 'الصور الميدانية للملاحظة' : 'Field Photos'}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-dashed border-primary-300 bg-white px-4 py-2.5 text-xs font-bold text-primary-700 hover:bg-primary-50 active:scale-95 transition"
                  >
                    <Camera className="h-4 w-4" />
                    <span>{isAr ? 'تصوير بالكاميرا أو اختيار صور' : 'Snap Photo / Choose Files'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={handlePhotoCapture}
                  />

                  {obsImages.map((img, i) => (
                    <div
                      key={img.id}
                      className="relative h-14 w-14 overflow-hidden rounded-xl border border-gray-300 shadow-sm"
                    >
                      <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setObsImages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute end-0 top-0 flex h-6 w-6 items-center justify-center rounded-bl-lg bg-black/70 text-white hover:bg-rose-600 transition"
                        title="Delete photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddObservation}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-primary-500 active:scale-95 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isAr ? 'إدراج الملاحظة' : 'Add Observation'}</span>
                </button>
              </div>
            </div>

            {/* General Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {isAr ? 'توصيات أو ملاحظات عامة للتقرير' : 'General Recommendations / Notes'}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isAr ? 'أي ملاحظات إضافية بخصوص بيئة العمل والسلامة...' : 'Any additional notes...'}
                className="w-full rounded-xl border border-gray-200 p-3 text-base sm:text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Drafts & Sync Manager */}
        {activeTab === 'DRAFTS' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  {isAr ? 'مسودات الفحص المحفوظة على جهازك' : 'Offline Drafts on Device'}
                </h4>
                <p className="text-xs text-gray-500">
                  {isAr
                    ? 'يمكنك مراجعة التقارير المسجلة ميدانياً وإرسالها للسحابة فور توفر الشبكة.'
                    : 'Review locally saved inspection reports and sync to cloud.'}
                </p>
              </div>

              <button
                onClick={handleSyncAll}
                disabled={isSyncing || !isOnline || offlineReports.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-500 disabled:opacity-40 transition"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'مزامنة الكل الآن' : 'Sync All Now'}</span>
              </button>
            </div>

            {offlineReports.length === 0 ? (
              <div className="rounded-3xl border border-gray-100 bg-gray-50/50 p-12 text-center text-gray-400">
                <FileText className="mx-auto h-12 w-12 text-gray-300" />
                <h4 className="mt-3 text-sm font-bold text-gray-700">
                  {isAr ? 'لا توجد مسودات فحص محفوظة محلياً' : 'No offline drafts'}
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  {isAr
                    ? 'عند كتابة تقرير أثناء غياب الإنترنت، سيتم حفظه هنا تلقائياً.'
                    : 'Any report drafted without network will safely appear here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {offlineReports.map((draft) => {
                  const isPending = draft.syncStatus === 'PENDING_SYNC' || draft.syncStatus === 'FAILED'
                  const isSuccess = draft.syncStatus === 'SYNCED'

                  return (
                    <div
                      key={draft.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3 hover:shadow-md transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary-600" />
                          <span className="font-bold text-sm text-gray-900">{draft.clientName}</span>
                          <span className="text-xs text-gray-500">/ {draft.siteName}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              isSuccess
                                ? 'bg-emerald-100 text-emerald-800'
                                : draft.syncStatus === 'SYNCING'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isSuccess ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : draft.syncStatus === 'SYNCING' ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Clock className="h-3.5 w-3.5" />
                            )}
                            {isSuccess
                              ? isAr
                                ? 'متزامن مع السحابة'
                                : 'Synced'
                              : draft.syncStatus === 'SYNCING'
                              ? isAr
                                ? 'جاري المزامنة...'
                                : 'Syncing...'
                              : isAr
                              ? 'بانتظار المزامنة'
                              : 'Pending Sync'}
                          </span>

                          <span className="text-xs text-gray-400">{draft.date}</span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1">
                        <p>
                          <strong>{isAr ? 'عدد الملاحظات:' : 'Observations:'}</strong> {draft.observations.length}
                        </p>
                        {draft.syncError && (
                          <p className="text-rose-600 font-semibold">
                            ⚠️ {isAr ? 'خطأ المزامنة:' : 'Sync Error:'} {draft.syncError}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
                        <span className="text-gray-400 text-[11px]">
                          {isAr ? 'حُفظ محلياً:' : 'Saved locally:'}{' '}
                          {new Date(draft.updatedAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US')}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title={isAr ? 'حذف المسودة' : 'Delete draft'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          {isPending && isOnline && (
                            <button
                              onClick={() => handleSyncSingle(draft)}
                              disabled={isSyncing}
                              className="flex items-center gap-1 rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-primary-500 transition"
                            >
                              <Send className="h-3 w-3" />
                              <span>{isAr ? 'مزامنة التقرير' : 'Sync Report'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Bottom Footer */}
        {activeTab === 'NEW' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/90 px-4 py-3 sm:px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <span className="text-xs text-gray-500 order-2 sm:order-1 text-center sm:text-start">
              {isAr
                ? 'يتم الحفظ المشفر في ذاكرة الهاتف الداخلية IndexedDB'
                : 'Securely saved to local device IndexedDB'}
            </span>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end order-1 sm:order-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none min-h-[44px] rounded-xl border border-gray-200 px-5 py-2.5 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveReportDraft}
                className="flex-[2] sm:flex-none min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-emerald-500 active:scale-95 transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isAr ? 'حفظ المسودة على الهاتف' : 'Save Draft Offline'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
