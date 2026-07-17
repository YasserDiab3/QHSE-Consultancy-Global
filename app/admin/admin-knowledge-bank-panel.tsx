'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileText, FolderOpen, FolderPlus, Loader2, Pencil, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/context'

type Client = { id: string; companyName: string; companyNameAr?: string }
type Folder = { id: string; parentId?: string | null; name: string; category: string; description?: string | null }
type Document = { id: string; folderId?: string | null; title: string; category: string; size?: number | null; createdAt: string }

export default function AdminKnowledgeBankPanel() {
  const { language } = useLanguage()
  const isArabic = language === 'ar'
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [folders, setFolders] = useState<Folder[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [folderName, setFolderName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Document | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editFolderId, setEditFolderId] = useState('')

  const folderPaths = useMemo(() => {
    const lookup = new Map(folders.map((folder) => [folder.id, folder]))
    const path = (folder: Folder): string => folder.parentId && lookup.get(folder.parentId) ? `${path(lookup.get(folder.parentId)!)} / ${folder.name}` : folder.name
    return new Map(folders.map((folder) => [folder.id, path(folder)]))
  }, [folders])

  const loadClients = useCallback(async () => {
    try {
      const response = await fetch('/api/clients')
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Unable to load clients')
      setClients(payload)
      setClientId((value) => value || payload[0]?.id || '')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load clients') }
  }, [])

  const loadBank = useCallback(async () => {
    if (!clientId) { setFolders([]); setDocuments([]); setLoading(false); return }
    setLoading(true)
    try {
      const response = await fetch(`/api/knowledge-bank?clientId=${encodeURIComponent(clientId)}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Unable to load knowledge bank')
      setFolders(payload.folders || [])
      setDocuments(payload.documents || [])
      setSelectedFolderId((value) => value && payload.folders.some((folder: Folder) => folder.id === value) ? value : payload.folders[0]?.id || '')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load knowledge bank') }
    finally { setLoading(false) }
  }, [clientId])

  useEffect(() => { void loadClients() }, [loadClients])
  useEffect(() => { void loadBank() }, [loadBank])

  const createFolder = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!clientId || !folderName.trim()) return
    setSaving(true)
    try {
      const response = await fetch('/api/knowledge-bank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'folder', clientId, name: folderName.trim(), parentId: null, category: 'SYSTEM' }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Unable to create folder')
      setFolderName('')
      setSelectedFolderId(payload.id)
      toast.success(isArabic ? 'تم إنشاء المجلد' : 'Folder created')
      await loadBank()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create folder') }
    finally { setSaving(false) }
  }

  const uploadDocument = (file: File | null) => {
    if (!file || !clientId || !selectedFolderId) return
    if (file.size > 8 * 1024 * 1024) { toast.error(isArabic ? 'الحد الأقصى للملف 8 ميجابايت' : 'Maximum file size is 8 MB'); return }
    setSaving(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const response = await fetch('/api/knowledge-bank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'document', clientId, folderId: selectedFolderId, title: file.name, category: 'SYSTEM', url: reader.result, originalName: file.name, mimeType: file.type, size: file.size }) })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || 'Unable to upload file')
        toast.success(isArabic ? 'تم رفع الملف' : 'File uploaded')
        await loadBank()
      } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to upload file') }
      finally { setSaving(false) }
    }
    reader.onerror = () => { setSaving(false); toast.error(isArabic ? 'تعذر قراءة الملف' : 'Unable to read file') }
    reader.readAsDataURL(file)
  }

  const saveEdit = async () => {
    if (!editing || !clientId || !editTitle.trim()) return
    setSaving(true)
    try {
      const response = await fetch('/api/knowledge-bank', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, clientId, title: editTitle.trim(), folderId: editFolderId || null }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Unable to update file')
      setEditing(null)
      toast.success(isArabic ? 'تم تعديل الملف' : 'File updated')
      await loadBank()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update file') }
    finally { setSaving(false) }
  }

  const deleteDocument = async (document: Document) => {
    if (!clientId || !window.confirm(isArabic ? `حذف الملف «${document.title}»؟` : `Delete “${document.title}”?`)) return
    setSaving(true)
    try {
      const response = await fetch(`/api/knowledge-bank?id=${encodeURIComponent(document.id)}&clientId=${encodeURIComponent(clientId)}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Unable to delete file')
      toast.success(isArabic ? 'تم حذف الملف' : 'File deleted')
      await loadBank()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to delete file') }
    finally { setSaving(false) }
  }

  return <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
    <header className="rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-white p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="mb-3 inline-flex rounded-2xl bg-primary-100 p-3 text-primary-700"><FolderOpen className="h-7 w-7" /></div><h2 className="text-2xl font-bold text-slate-900">{isArabic ? 'بنك المعلومات المنظم' : 'Organized knowledge bank'}</h2><p className="mt-2 text-sm text-slate-600">{isArabic ? 'إدارة مجلدات وملفات كل عميل بشكل مستقل.' : 'Manage every client’s folders and files independently.'}</p></div><select value={clientId} onChange={(event) => setClientId(event.target.value)} className="input-field min-w-64"><option value="">{isArabic ? 'اختر العميل' : 'Choose client'}</option>{clients.map((client) => <option key={client.id} value={client.id}>{isArabic ? client.companyNameAr || client.companyName : client.companyName}</option>)}</select></div></header>
    {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div> : clientId && <><div className="grid gap-6 xl:grid-cols-2"><form onSubmit={createFolder} className="card space-y-4"><h3 className="flex items-center gap-2 font-bold text-slate-900"><FolderPlus className="h-5 w-5 text-primary-600" />{isArabic ? 'إنشاء مجلد' : 'Create folder'}</h3><input className="input-field" value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder={isArabic ? 'اسم المجلد' : 'Folder name'} required /><button disabled={saving} className="btn-primary w-full px-4 py-2">{isArabic ? 'إنشاء المجلد' : 'Create folder'}</button></form><div className="card space-y-4"><h3 className="flex items-center gap-2 font-bold text-slate-900"><Upload className="h-5 w-5 text-primary-600" />{isArabic ? 'رفع ملف' : 'Upload file'}</h3><select value={selectedFolderId} onChange={(event) => setSelectedFolderId(event.target.value)} className="input-field"><option value="">{isArabic ? 'اختر المجلد' : 'Choose folder'}</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folderPaths.get(folder.id)}</option>)}</select><label className={`btn-secondary flex cursor-pointer justify-center px-4 py-2 ${!selectedFolderId || saving ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-4 w-4" />{isArabic ? 'اختيار ورفع ملف' : 'Choose and upload file'}<input className="hidden" type="file" onChange={(event) => uploadDocument(event.target.files?.[0] || null)} /></label></div></div>
      <section className="card"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-slate-900">{isArabic ? 'ملفات العميل' : 'Client files'}</h3><span className="text-sm text-slate-500">{documents.length}</span></div>{documents.length ? <div className="space-y-3">{documents.map((document) => <div key={document.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><FileText className="h-6 w-6 shrink-0 text-primary-600" /><div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-900">{document.title}</p><p className="text-xs text-slate-500">{document.folderId ? folderPaths.get(document.folderId) : isArabic ? 'ملفات عامة' : 'General files'}</p></div><div className="flex gap-2"><button onClick={() => { setEditing(document); setEditTitle(document.title); setEditFolderId(document.folderId || '') }} className="btn-secondary px-3 py-2 text-sm"><Pencil className="h-4 w-4" />{isArabic ? 'تعديل' : 'Edit'}</button><button onClick={() => void deleteDocument(document)} disabled={saving} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" />{isArabic ? 'حذف' : 'Delete'}</button></div></div>)}</div> : <p className="py-10 text-center text-sm text-slate-500">{isArabic ? 'لا توجد ملفات بعد.' : 'No files yet.'}</p>}</section></>}
    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><h3 className="text-lg font-bold text-slate-900">{isArabic ? 'تعديل الملف' : 'Edit file'}</h3><div className="mt-5 space-y-4"><input className="input-field" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /><select className="input-field" value={editFolderId} onChange={(event) => setEditFolderId(event.target.value)}><option value="">{isArabic ? 'ملفات عامة' : 'General files'}</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folderPaths.get(folder.id)}</option>)}</select><div className="flex justify-end gap-3"><button onClick={() => setEditing(null)} className="btn-secondary px-4 py-2">{isArabic ? 'إلغاء' : 'Cancel'}</button><button onClick={() => void saveEdit()} disabled={saving} className="btn-primary px-4 py-2">{isArabic ? 'حفظ التعديل' : 'Save changes'}</button></div></div></div></div>}
  </div>
}
