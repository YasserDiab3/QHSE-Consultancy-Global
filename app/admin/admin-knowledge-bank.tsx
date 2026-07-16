'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileText, FolderOpen, FolderPlus, Loader2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/context'

type Client = { id: string; companyName: string; companyNameAr?: string }
type Folder = { id: string; parentId?: string | null; name: string; category: string; description?: string | null }
type Document = { id: string; folderId?: string | null; title: string; category: string; size?: number | null; createdAt: string }

export default function AdminKnowledgeBank() {
  const { language } = useLanguage()
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [folders, setFolders] = useState<Folder[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [folderForm, setFolderForm] = useState({ name: '', category: 'SYSTEM', parentId: '', description: '' })
  const [selectedFolderId, setSelectedFolderId] = useState('')

  const copy = language === 'ar' ? {
    title: 'بنك المعلومات المنظم', subtitle: 'أنشئ مجلدات وأنظمة وإجراءات ونماذج منفصلة لكل عميل، ثم شاركها مباشرة عبر بوابته.', client: 'اختر العميل', folder: 'اسم المجلد', parent: 'داخل مجلد', root: 'مجلد رئيسي', create: 'إنشاء مجلد', upload: 'رفع ملف إلى المجلد', noFolders: 'أنشئ المجلد الأول لبدء تنظيم ملفات العميل.', noDocs: 'لا توجد ملفات في بنك المعلومات بعد.', category: 'التصنيف', description: 'وصف اختياري', files: 'ملفات', folders: 'مجلدات', chooseFolder: 'اختر مجلدًا للرفع', uploaded: 'تم رفع الملف', created: 'تم إنشاء المجلد',
  } : {
    title: 'Organized knowledge bank', subtitle: 'Create separate systems, procedures, and forms folders for every client, then share them directly in the portal.', client: 'Choose client', folder: 'Folder name', parent: 'Inside folder', root: 'Top-level folder', create: 'Create folder', upload: 'Upload file to folder', noFolders: 'Create the first folder to start organizing this client’s files.', noDocs: 'No files in the knowledge bank yet.', category: 'Category', description: 'Optional description', files: 'Files', folders: 'Folders', chooseFolder: 'Choose a folder to upload', uploaded: 'File uploaded', created: 'Folder created',
  }

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/clients')
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Unable to load clients')
      setClients(payload)
      setClientId((current) => current || payload[0]?.id || '')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load clients') }
    finally { setLoading(false) }
  }, [])

  const loadBank = useCallback(async () => {
    if (!clientId) { setFolders([]); setDocuments([]); return }
    setLoading(true)
    try {
      const response = await fetch(`/api/knowledge-bank?clientId=${encodeURIComponent(clientId)}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Unable to load knowledge bank')
      setFolders(payload.folders || [])
      setDocuments(payload.documents || [])
      setSelectedFolderId((current) => current && payload.folders.some((folder: Folder) => folder.id === current) ? current : payload.folders[0]?.id || '')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load knowledge bank') }
    finally { setLoading(false) }
  }, [clientId])

  useEffect(() => { void loadClients() }, [loadClients])
  useEffect(() => { void loadBank() }, [loadBank])

  const folderPath = useMemo(() => {
    const map = new Map(folders.map((folder) => [folder.id, folder]))
    const path = (folder: Folder): string => folder.parentId && map.get(folder.parentId) ? `${path(map.get(folder.parentId)!)} / ${folder.name}` : folder.name
    return new Map(folders.map((folder) => [folder.id, path(folder)]))
  }, [folders])

  const createFolder = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!clientId || !folderForm.name.trim()) return
    setSaving(true)
    try {
      const response = await fetch('/api/knowledge-bank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'folder', clientId, name: folderForm.name, category: folderForm.category, parentId: folderForm.parentId || null, description: folderForm.description || undefined }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Unable to create folder')
      setFolderForm({ name: '', category: 'SYSTEM', parentId: '', description: '' })
      setSelectedFolderId(payload.id)
      toast.success(copy.created)
      await loadBank()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create folder') }
    finally { setSaving(false) }
  }

  const uploadDocument = async (file: File | null) => {
    if (!file || !clientId || !selectedFolderId) return
    if (file.size > 8 * 1024 * 1024) { toast.error('Maximum file size is 8 MB'); return }
    setSaving(true)
    const reader = new FileReader()
    reader.onerror = () => { setSaving(false); toast.error('Unable to read file') }
    reader.onload = async () => {
      try {
        const response = await fetch('/api/knowledge-bank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'document', clientId, folderId: selectedFolderId, title: file.name, category: folderPath.get(selectedFolderId) || 'SYSTEM', url: reader.result, originalName: file.name, mimeType: file.type, size: file.size }) })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || 'Unable to upload file')
        toast.success(copy.uploaded)
        await loadBank()
      } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to upload file') }
      finally { setSaving(false) }
    }
    reader.readAsDataURL(file)
  }

  return <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
    <div className="rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-white p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="mb-3 inline-flex rounded-2xl bg-primary-100 p-3 text-primary-700"><FolderOpen className="h-7 w-7" /></div><h2 className="text-2xl font-bold text-slate-900">{copy.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{copy.subtitle}</p></div><select value={clientId} onChange={(event) => setClientId(event.target.value)} className="input-field min-w-64"><option value="">{copy.client}</option>{clients.map((client) => <option key={client.id} value={client.id}>{language === 'ar' ? client.companyNameAr || client.companyName : client.companyName}</option>)}</select></div></div>
    {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div> : !clientId ? null : <><div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"><form onSubmit={createFolder} className="card space-y-4"><div className="flex items-center gap-2"><FolderPlus className="h-5 w-5 text-primary-600" /><h3 className="font-bold text-slate-900">{copy.create}</h3></div><input className="input-field" placeholder={copy.folder} value={folderForm.name} onChange={(event) => setFolderForm({ ...folderForm, name: event.target.value })} required /><select className="input-field" value={folderForm.parentId} onChange={(event) => setFolderForm({ ...folderForm, parentId: event.target.value })}><option value="">{copy.root}</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folderPath.get(folder.id)}</option>)}</select><select className="input-field" value={folderForm.category} onChange={(event) => setFolderForm({ ...folderForm, category: event.target.value })}><option value="SYSTEM">System</option><option value="QUALITY">Quality</option><option value="FOOD_SAFETY">Food safety</option><option value="PROCEDURE">Procedure</option><option value="FORM">Form</option></select><textarea className="input-field min-h-24" placeholder={copy.description} value={folderForm.description} onChange={(event) => setFolderForm({ ...folderForm, description: event.target.value })} /><button disabled={saving} className="btn-primary w-full px-4 py-2"><FolderPlus className="h-4 w-4" />{copy.create}</button></form><div className="card"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold text-slate-900">{copy.files}</h3><p className="mt-1 text-xs text-slate-500">{copy.chooseFolder}</p></div><label className={`btn-secondary cursor-pointer px-4 py-2 ${!selectedFolderId || saving ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-4 w-4" />{copy.upload}<input type="file" className="hidden" onChange={(event) => void uploadDocument(event.target.files?.[0] || null)} /></label></div><select className="input-field mb-4" value={selectedFolderId} onChange={(event) => setSelectedFolderId(event.target.value)}><option value="">{copy.chooseFolder}</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folderPath.get(folder.id)}</option>)}</select>{documents.length ? <div className="space-y-2">{documents.map((document) => <div key={document.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><FileText className="h-5 w-5 shrink-0 text-primary-600" /><div className="min-w-0 flex-1"><p className="truncate font-medium text-slate-800">{document.title}</p><p className="truncate text-xs text-slate-500">{document.folderId ? folderPath.get(document.folderId) : copy.root}</p></div></div>)}</div> : <p className="py-10 text-center text-sm text-slate-500">{copy.noDocs}</p>}</div></div><section className="card"><div className="mb-4 flex items-center gap-2"><FolderOpen className="h-5 w-5 text-primary-600" /><h3 className="font-bold text-slate-900">{copy.folders} ({folders.length})</h3></div>{folders.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{folders.map((folder) => <div key={folder.id} className="rounded-xl border border-slate-200 p-4"><p className="font-semibold text-slate-900">{folderPath.get(folder.id)}</p><p className="mt-1 text-xs text-primary-700">{folder.category}</p>{folder.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{folder.description}</p>}</div>)}</div> : <p className="py-8 text-center text-sm text-slate-500">{copy.noFolders}</p>}</section></>}
  </div>
}
