'use client'

import { Download, FileText, FolderOpen, Loader2 } from 'lucide-react'

type Document = {
  id: string
  folderId?: string | null
  title: string
  category: string
  url: string
  originalName?: string | null
  size?: number | null
  createdAt: string
}

type Folder = { id: string; parentId?: string | null; name: string; category: string }

export default function ClientKnowledgeBank({ documents, folders, loading, error, language, onRetry }: {
  documents: Document[]
  folders: Folder[]
  loading: boolean
  error: string
  language: string
  onRetry: () => Promise<void>
}) {
  const isArabic = language === 'ar'
  const folderById = new Map(folders.map((folder) => [folder.id, folder]))
  const folderPath = (folderId?: string | null) => {
    const folder = folderId ? folderById.get(folderId) : undefined
    if (!folder) return isArabic ? 'ملفات عامة' : 'General files'
    const parent = folder.parentId ? folderById.get(folder.parentId) : undefined
    return parent ? `${parent.name} / ${folder.name}` : folder.name
  }
  const sizeLabel = (size?: number | null) => {
    if (!size) return isArabic ? 'حجم غير محدد' : 'Size unavailable'
    return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  return <section className="space-y-6">
    <header className="rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="mb-3 inline-flex rounded-2xl bg-primary-100 p-3 text-primary-700"><FolderOpen className="h-6 w-6" /></div><h2 className="text-2xl font-bold text-slate-900">{isArabic ? 'بنك المعلومات والملفات' : 'Knowledge bank & files'}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{isArabic ? 'المجلدات والملفات التي يشاركها فريق الاستشارات مع مؤسستك.' : 'Folders and files shared with your organization by the consulting team.'}</p></div>
        <div className="grid grid-cols-2 gap-3 text-center"><div className="rounded-2xl border border-primary-100 bg-white px-4 py-3"><p className="text-xl font-bold text-primary-700">{folders.length}</p><p className="text-xs text-slate-500">{isArabic ? 'مجلدات' : 'folders'}</p></div><div className="rounded-2xl border border-primary-100 bg-white px-4 py-3"><p className="text-xl font-bold text-primary-700">{documents.length}</p><p className="text-xs text-slate-500">{isArabic ? 'ملفات' : 'files'}</p></div></div>
      </div>
    </header>
    {loading ? <div className="card flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div> : error ? <div className="card text-center"><p className="font-medium text-red-600">{error}</p><button onClick={() => void onRetry()} className="btn-secondary mt-4 px-4 py-2">{isArabic ? 'إعادة المحاولة' : 'Try again'}</button></div> : folders.length === 0 && documents.length === 0 ? <div className="card py-16 text-center"><FolderOpen className="mx-auto h-14 w-14 text-slate-300" /><h3 className="mt-4 text-lg font-bold text-slate-900">{isArabic ? 'لا توجد ملفات مشتركة حتى الآن' : 'No shared files yet'}</h3></div> : <>
      <section className="card"><div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 font-bold text-slate-900"><FolderOpen className="h-5 w-5 text-primary-600" />{isArabic ? 'المجلدات' : 'Folders'}</h3><span className="text-sm text-slate-500">{folders.length}</span></div>{folders.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{folders.map((folder) => <article key={folder.id} className="rounded-2xl border border-primary-100 bg-primary-50/40 p-4"><div className="flex items-start justify-between gap-3"><FolderOpen className="h-6 w-6 text-primary-600" /><span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">{documents.filter((document) => document.folderId === folder.id).length} {isArabic ? 'ملف' : 'files'}</span></div><h4 className="mt-3 font-bold text-slate-900">{folderPath(folder.id)}</h4><p className="mt-1 text-xs font-medium text-primary-700">{folder.category}</p></article>)}</div> : <p className="text-sm text-slate-500">{isArabic ? 'لا توجد مجلدات منظمة بعد.' : 'No folders yet.'}</p>}</section>
      {documents.length > 0 && <div className="grid gap-4 md:grid-cols-2">{documents.map((document) => <article key={document.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-4"><div className="rounded-xl bg-primary-50 p-3 text-primary-700"><FileText className="h-6 w-6" /></div><div className="min-w-0 flex-1"><p className="mb-1 truncate text-xs font-semibold text-primary-700">{folderPath(document.folderId)}</p><h3 className="truncate font-bold text-slate-900">{document.title}</h3><p className="mt-1 text-sm text-slate-500">{document.category || (isArabic ? 'مستند' : 'Document')}</p><div className="mt-3 flex gap-4 text-xs text-slate-500"><span>{sizeLabel(document.size)}</span><span>{new Date(document.createdAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}</span></div></div></div><a href={document.url} download={document.originalName || undefined} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-5 flex w-full justify-center px-4 py-2 text-sm"><Download className="h-4 w-4" />{isArabic ? 'عرض / تحميل الملف' : 'View / download file'}</a></article>)}</div>}
    </>}
  </section>
}
