/**
 * @file lib/offline-reports-store.ts
 * High-performance client-side storage engine for Offline Field Inspections.
 * Leverages IndexedDB for large image payloads with localStorage fallback.
 */

export type OfflineObservationImage = {
  id: string
  type: 'BEFORE' | 'AFTER' | 'EVIDENCE'
  dataUrl: string // base64 preview & upload payload
  name: string
  mimeType: string
  size: number
}

export type OfflineObservation = {
  id: string
  title: string
  titleAr?: string
  description?: string
  descriptionAr?: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
  images: OfflineObservationImage[]
}

export type OfflineDraftReport = {
  id: string // Client UUID
  clientId: string
  clientName?: string
  siteName: string
  siteNameAr?: string
  date: string // YYYY-MM-DD
  category: string
  consultantId?: string
  notes?: string
  notesAr?: string
  assessmentScores?: Record<string, number>
  status: 'DRAFT' | 'OPEN' | 'PENDING_REVIEW' | 'CLOSED'
  observations: OfflineObservation[]
  createdAt: number
  updatedAt: number
  syncStatus: 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'FAILED'
  lastSyncAttempt?: number
  syncError?: string
  serverReportId?: string
}

const DB_NAME = 'qhsse_offline_db'
const DB_VERSION = 1
const STORE_REPORTS = 'offline_reports'
const STORE_CLIENTS = 'cached_clients'
const LOCAL_STORAGE_KEY = 'qhsse_offline_reports_backup'
const CLIENTS_STORAGE_KEY = 'qhsse_cached_clients_backup'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser() || !window.indexedDB) {
      return reject(new Error('IndexedDB is not available in this environment'))
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_REPORTS)) {
        db.createObjectStore(STORE_REPORTS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_CLIENTS)) {
        db.createObjectStore(STORE_CLIENTS, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// -----------------------------------------------------------------------------
// Offline Reports CRUD
// -----------------------------------------------------------------------------

export async function saveOfflineReportDraft(draft: OfflineDraftReport): Promise<void> {
  if (!isBrowser()) return

  draft.updatedAt = Date.now()

  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_REPORTS, 'readwrite')
      const store = tx.objectStore(STORE_REPORTS)
      const req = store.put(draft)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn('[OfflineStore] IndexedDB put failed, falling back to localStorage:', err)
    // Fallback: save to localStorage (strip heavy base64 if needed, but try saving)
    try {
      const current = getReportsFromLocalStorage()
      const index = current.findIndex((item) => item.id === draft.id)
      if (index >= 0) {
        current[index] = draft
      } else {
        current.unshift(draft)
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current))
    } catch (storageErr) {
      console.error('[OfflineStore] Failed to save in localStorage fallback:', storageErr)
    }
  }
}

export async function getOfflineReports(): Promise<OfflineDraftReport[]> {
  if (!isBrowser()) return []

  try {
    const db = await openDatabase()
    return await new Promise<OfflineDraftReport[]>((resolve, reject) => {
      const tx = db.transaction(STORE_REPORTS, 'readonly')
      const store = tx.objectStore(STORE_REPORTS)
      const req = store.getAll()
      req.onsuccess = () => {
        const results = (req.result || []) as OfflineDraftReport[]
        results.sort((a, b) => b.updatedAt - a.updatedAt)
        resolve(results)
      }
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn('[OfflineStore] IndexedDB getAll failed, using localStorage fallback:', err)
    return getReportsFromLocalStorage()
  }
}

export async function getOfflineReportById(id: string): Promise<OfflineDraftReport | null> {
  if (!isBrowser()) return null

  try {
    const db = await openDatabase()
    return await new Promise<OfflineDraftReport | null>((resolve, reject) => {
      const tx = db.transaction(STORE_REPORTS, 'readonly')
      const store = tx.objectStore(STORE_REPORTS)
      const req = store.get(id)
      req.onsuccess = () => resolve((req.result as OfflineDraftReport) || null)
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    const list = getReportsFromLocalStorage()
    return list.find((item) => item.id === id) || null
  }
}

export async function deleteOfflineReport(id: string): Promise<void> {
  if (!isBrowser()) return

  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_REPORTS, 'readwrite')
      const store = tx.objectStore(STORE_REPORTS)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn('[OfflineStore] IndexedDB delete failed:', err)
  }

  // Also clean localStorage
  try {
    const current = getReportsFromLocalStorage()
    const filtered = current.filter((item) => item.id !== id)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered))
  } catch {}
}

export async function getPendingSyncCount(): Promise<number> {
  const reports = await getOfflineReports()
  return reports.filter((r) => r.syncStatus === 'PENDING_SYNC' || r.syncStatus === 'FAILED').length
}

function getReportsFromLocalStorage(): OfflineDraftReport[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

// -----------------------------------------------------------------------------
// Offline Client Cache
// -----------------------------------------------------------------------------

export async function cacheClientsLocally(
  clients: Array<{ id: string; companyName: string; companyNameAr?: string }>
): Promise<void> {
  if (!isBrowser() || !clients || !clients.length) return

  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CLIENTS, 'readwrite')
      const store = tx.objectStore(STORE_CLIENTS)
      clients.forEach((c) => store.put(c))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    try {
      localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients))
    } catch {}
  }
}

export async function getCachedClients(): Promise<
  Array<{ id: string; companyName: string; companyNameAr?: string }>
> {
  if (!isBrowser()) return []

  try {
    const db = await openDatabase()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CLIENTS, 'readonly')
      const store = tx.objectStore(STORE_CLIENTS)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  } catch {
    try {
      const raw = localStorage.getItem(CLIENTS_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }
}
