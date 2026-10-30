/**
 * @file lib/offline-sync.ts
 * Background & Real-Time Sync Engine for Offline Field Inspections.
 * Handles batched network transmission of reports, observations, and photos.
 */

import {
  getOfflineReports,
  saveOfflineReportDraft,
  OfflineDraftReport,
  getPendingSyncCount,
} from '@/lib/offline-reports-store'

export type SyncResult = {
  total: number
  successCount: number
  failedCount: number
  errors: string[]
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const arr = dataUrl.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new File([u8arr], fileName, { type: mime })
}

export async function syncSingleOfflineReport(
  draft: OfflineDraftReport,
  onProgress?: (message: string) => void
): Promise<{ success: boolean; serverReportId?: string; error?: string }> {
  try {
    draft.syncStatus = 'SYNCING'
    draft.lastSyncAttempt = Date.now()
    await saveOfflineReportDraft(draft)

    onProgress?.(`مزامنة تقرير: ${draft.siteName}...`)

    // 1. Create Report on Server
    const reportRes = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: draft.clientId,
        date: draft.date,
        siteName: draft.siteName,
        siteNameAr: draft.siteNameAr || null,
        category: draft.category,
        consultantId: draft.consultantId || null,
        notes: draft.notes || null,
        notesAr: draft.notesAr || null,
        assessmentScores: draft.assessmentScores || null,
        status: draft.status || 'OPEN',
      }),
    })

    if (!reportRes.ok) {
      const err = await reportRes.json().catch(() => null)
      throw new Error(err?.error || `فشل إنشاء التقرير على الخادم (${reportRes.status})`)
    }

    const createdReport = await reportRes.json()
    const serverReportId = createdReport.id
    draft.serverReportId = serverReportId

    // 2. Create Observations & Upload Photos
    for (let i = 0; i < draft.observations.length; i++) {
      const obs = draft.observations[i]
      onProgress?.(`مزامنة ملاحظة ${i + 1} من ${draft.observations.length}...`)

      const obsRes = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: serverReportId,
          title: obs.title,
          titleAr: obs.titleAr || null,
          description: obs.description || null,
          descriptionAr: obs.descriptionAr || null,
          riskLevel: obs.riskLevel || 'MEDIUM',
          status: obs.status || 'OPEN',
          sortOrder: i,
        }),
      })

      if (!obsRes.ok) {
        console.warn(`[Sync] Observation create failed:`, await obsRes.text())
        continue
      }

      const createdObs = await obsRes.json()
      const serverObsId = createdObs.id

      // Upload photos for this observation
      for (const img of obs.images) {
        if (!img.dataUrl) continue

        try {
          const file = dataUrlToFile(img.dataUrl, img.name || `photo-${Date.now()}.jpg`)
          const formData = new FormData()
          formData.append('file', file)
          formData.append('observationId', serverObsId)
          formData.append('type', img.type || 'BEFORE')

          await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })
        } catch (imgErr) {
          console.warn('[Sync] Image upload skipped or failed:', imgErr)
        }
      }
    }

    // Mark as completely synced
    draft.syncStatus = 'SYNCED'
    draft.syncError = undefined
    await saveOfflineReportDraft(draft)

    return { success: true, serverReportId }
  } catch (error: any) {
    const errorMsg = error?.message || 'فشلت المزامنة'
    draft.syncStatus = 'FAILED'
    draft.syncError = errorMsg
    await saveOfflineReportDraft(draft)
    return { success: false, error: errorMsg }
  }
}

export async function syncAllPendingOfflineReports(
  onProgress?: (message: string) => void
): Promise<SyncResult> {
  const result: SyncResult = {
    total: 0,
    successCount: 0,
    failedCount: 0,
    errors: [],
  }

  if (typeof window !== 'undefined' && !navigator.onLine) {
    result.errors.push('الجهاز غير متصل بالإنترنت حالياً')
    return result
  }

  const reports = await getOfflineReports()
  const pending = reports.filter((r) => r.syncStatus === 'PENDING_SYNC' || r.syncStatus === 'FAILED')
  result.total = pending.length

  if (pending.length === 0) {
    return result
  }

  for (const draft of pending) {
    const res = await syncSingleOfflineReport(draft, onProgress)
    if (res.success) {
      result.successCount++
    } else {
      result.failedCount++
      if (res.error) result.errors.push(`${draft.siteName}: ${res.error}`)
    }
  }

  return result
}

/**
 * Initializes listeners for online state changes and background sync
 */
export function initAutoSync(onSyncFinished?: (result: SyncResult) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  let isSyncing = false

  const handleOnline = async () => {
    if (isSyncing) return
    const pendingCount = await getPendingSyncCount()
    if (pendingCount === 0) return

    isSyncing = true
    try {
      const res = await syncAllPendingOfflineReports()
      if (res.successCount > 0) {
        onSyncFinished?.(res)
      }
    } finally {
      isSyncing = false
    }
  }

  window.addEventListener('online', handleOnline)

  return () => {
    window.removeEventListener('online', handleOnline)
  }
}
