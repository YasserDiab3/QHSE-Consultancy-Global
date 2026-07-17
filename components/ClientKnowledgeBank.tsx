'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Download, Eye, FileText, Folder, FolderOpen, Home, Loader2, X } from 'lucide-react'

type Document = { id: string; folderId?: string | null; title: string; category: string; url: string; originalName?: string | null; mimeType?: string | null; size?: number | null; createdAt: string }
type FolderItem = { id: string; parentId?: string | null; name: string; category: string }

export default function ClientKnowledgeBank({ documents, folders, loading, error, language, onRetry }: { documents: Document[]; folders: FolderItem[]; loading: boolean; error: string; language: string; onRetry: () => Promise<void> }) {
  const ar = language === 'ar'
  const t = (arabic: string, english: string) => ar ? arabic : english
  const root = '__root__'
  const [selected, setSelected] = useState(root)
  const [preview, setPreview] = useState<Document | null>(null)
  const folderMap = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders])

  useEffect(() => { if (selected !== root && !folderMap.has(selected)) setSelected(root) }, [folderMap, selected])

  useEffect(() => {
    if (!preview?.url.startsWith('data:')) return
    const mime = preview.mimeType?.toLowerCase() || preview.url.match(/^data:([^;,]+)/i)?.[1]?.toLowerCase() || ''
    const pdf = mime === 'application/pdf' || /\.pdf(?:$|[?#])/i.test(preview.originalName || preview.title)
    if (!pdf) return
    let active = true
    fetch(preview.url)
      .then((response) => response.blob())
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob)
        if (active) setPreview((current) => current?.url === preview.url ? { ...current, url: objectUrl } : current)
        else URL.revokeObjectURL(objectUrl)
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [preview])

  const path = (id?: string | null) => {
    const names: string[] = []
    let current = id ? folderMap.get(id) : undefined
    while (current) { names.unshift(current.name); current = current.parentId ? folderMap.get(current.parentId) : undefined }
    return names
  }
  const currentPath = selected === root ? [] : path(selected)
  const childFolders = selected === root ? folders.filter((folder) => !folder.parentId) : folders.filter((folder) => folder.parentId === selected)
  const fileList = selected === root ? documents.filter((document) => !document.folderId) : documents.filter((document) => document.folderId === selected)
  const fileCount = (id: string) => documents.filter((document) => document.folderId === id).length
  const size = (value?: number | null) => !value ? t('حجم غير محدد', 'Size unavailable') : value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`
  const fileType = (document: Document) => document.mimeType?.toLowerCase() || document.url.match(/^data:([^;,]+)/i)?.[1]?.toLowerCase() || ''
  const isImage = (document: Document) => fileType(document).startsWith('image/')
  const isPdf = (document: Document) => fileType(document) === 'application/pdf' || /\.pdf(?:$|[?#])/i.test(document.originalName || document.title)
  const canPreview = (document: Document) => isImage(document) || isPdf(document)

  if (loading) return <div className="card flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
  if (error) return <div className="card text-center"><p className="font-medium text-red-600">{error}</p><button onClick={() => void onRetry()} className="btn-secondary mt-4 px-4 py-2">{t('إعادة المحاولة', 'Try again')}</button></div>

  return <section className="space-y-5" dir={ar ? 'rtl' : 'ltr'}>
    <header className="relative overflow-hidden rounded-3xl border border-primary-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="absolute inset-y-0 start-0 w-1.5 bg-gradient-to-b from-primary-500 to-emerald-400" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4"><div className="rounded-2xl bg-primary-50 p-3 text-primary-700"><FolderOpen className="h-7 w-7" /></div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">QHSSE CONSULTANT</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{t('بنك المعلومات', 'Knowledge bank')}</h2><p className="mt-1 text-sm text-slate-500">{t('استعرض ملفات مؤسستك داخل مجلدات منظمة.', 'Browse your organization files in organized folders.')}</p></div></div>
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"><div className="border-l border-slate-200 px-5 py-3 text-center"><p className="text-2xl font-bold text-primary-700">{folders.length}</p><p className="text-xs font-medium text-slate-500">{t('مجلدات', 'folders')}</p></div><div className="px-5 py-3 text-center"><p className="text-2xl font-bold text-slate-800">{documents.length}</p><p className="text-xs font-medium text-slate-500">{t('ملفات', 'files')}</p></div></div>
      </div>
    </header>
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="border-b border-slate-200 bg-slate-50/70 p-4 lg:border-b-0 lg:border-l"><div className="mb-4 rounded-2xl bg-primary-700 px-4 py-4 text-white"><p className="text-xs font-medium text-primary-100">{t('مساحة المستندات', 'Document space')}</p><p className="mt-1 font-bold">{t('ملفات مؤسستك', 'Your organization files')}</p></div><p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-slate-400">{t('التنقل', 'Explore')}</p><button onClick={() => setSelected(root)} className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm font-semibold transition ${selected === root ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-primary-200'}`}><Home className="h-4 w-4" />{t('كل الملفات', 'All files')}<span className="ms-auto rounded-md bg-black/10 px-2 py-0.5 text-xs">{documents.length}</span></button><div className="space-y-1">{folders.map((folder) => <button key={folder.id} onClick={() => setSelected(folder.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm transition ${selected === folder.id ? 'bg-primary-50 font-bold text-primary-700 ring-1 ring-primary-100' : 'text-slate-600 hover:bg-white'}`} style={{ paddingInlineStart: `${12 + path(folder.id).length * 8}px` }}><Folder className={`h-4 w-4 shrink-0 ${selected === folder.id ? 'text-primary-600' : 'text-amber-500'}`} /><span className="min-w-0 flex-1 truncate">{folder.name}</span><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{fileCount(folder.id)}</span></button>)}</div></aside>
      <main className="min-w-0 p-5 sm:p-7">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500"><button onClick={() => setSelected(root)} className="flex items-center gap-1 font-medium hover:text-primary-700"><Home className="h-4 w-4" />{t('بنك المعلومات', 'Knowledge bank')}</button>{currentPath.map((name, index) => <span key={`${name}-${index}`} className="flex items-center gap-2"><ChevronLeft className={`h-4 w-4 ${ar ? '' : 'rotate-180'}`} /><span className={index === currentPath.length - 1 ? 'font-semibold text-slate-900' : ''}>{name}</span></span>)}</div>
        <div className="mb-5 flex items-center justify-between"><div><h3 className="text-xl font-bold text-slate-900">{currentPath.at(-1) || t('كل الملفات', 'All files')}</h3><p className="mt-1 text-sm text-slate-500">{t('افتح مجلدًا أو عاين الملف مباشرة داخل النظام.', 'Open a folder or preview a file within the system.')}</p></div><span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">{childFolders.length + fileList.length} {t('عنصر', 'items')}</span></div>
        {childFolders.length > 0 && <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{childFolders.map((folder) => <button key={folder.id} onClick={() => setSelected(folder.id)} className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 text-right transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"><div className="flex items-start justify-between"><FolderOpen className="h-8 w-8 text-amber-500" /><span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">{fileCount(folder.id)} {t('ملف', 'files')}</span></div><p className="mt-5 font-bold text-slate-900">{folder.name}</p><p className="mt-1 text-xs font-medium text-primary-700">{folder.category}</p></button>)}</div>}
        {fileList.length > 0 ? <div className="overflow-hidden rounded-2xl border border-slate-200"><div className="hidden grid-cols-[minmax(0,1fr)_120px_170px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500 sm:grid"><span>{t('اسم الملف', 'File name')}</span><span>{t('التصنيف', 'Category')}</span><span>{t('الحجم', 'Size')}</span></div>{fileList.map((document) => <article key={document.id} className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_120px_170px] sm:items-center sm:px-5"><div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-red-50 p-2.5 text-red-600"><FileText className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate font-bold text-slate-900">{document.title}</p><p className="mt-0.5 text-xs text-slate-500">{new Date(document.createdAt).toLocaleDateString(ar ? 'ar-EG' : 'en-US')}</p></div></div><p className="text-sm text-slate-600">{document.category || t('مستند', 'Document')}</p><div className="flex items-center justify-between gap-2"><span className="text-sm text-slate-500">{size(document.size)}</span>{canPreview(document) && <button onClick={() => setPreview(document)} className="rounded-lg border border-primary-200 p-2 text-primary-700 hover:bg-primary-50" title={t('معاينة مباشرة', 'Preview')}><Eye className="h-4 w-4" /></button>}<a href={document.url} download={document.originalName || undefined} target="_blank" rel="noopener noreferrer" className="btn-primary shrink-0 px-3 py-2 text-xs"><Download className="h-4 w-4" />{t('تحميل', 'Download')}</a></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 py-14 text-center"><FolderOpen className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">{t('لا توجد ملفات في هذا المجلد', 'This folder has no files')}</p><p className="mt-1 text-sm text-slate-500">{t('يمكنك فتح مجلد آخر من القائمة الجانبية.', 'Choose another folder from the sidebar.')}</p></div>}
      </main>
    </div>
    {preview && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={t('معاينة الملف', 'File preview')}><div className="flex h-[min(86vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4"><div className="min-w-0"><p className="truncate font-bold text-slate-900">{preview.title}</p><p className="mt-0.5 text-xs text-slate-500">{t('معاينة آمنة داخل النظام', 'Secure in-system preview')}</p></div><div className="flex items-center gap-2"><a href={preview.url} download={preview.originalName || undefined} className="btn-primary px-3 py-2 text-xs"><Download className="h-4 w-4" />{t('تحميل', 'Download')}</a><button onClick={() => setPreview(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label={t('إغلاق', 'Close')}><X className="h-5 w-5" /></button></div></header><div className="min-h-0 flex-1 bg-slate-100 p-3 sm:p-5">{isImage(preview) ? <img src={preview.url} alt={preview.title} className="h-full w-full rounded-xl object-contain" /> : <iframe title={preview.title} src={preview.url} sandbox="" className="h-full w-full rounded-xl border border-slate-200 bg-white" />}</div></div></div>}
  </section>
}
