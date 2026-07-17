'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Download, FileText, Folder, FolderOpen, Home, Loader2 } from 'lucide-react'

type Document = { id: string; folderId?: string | null; title: string; category: string; url: string; originalName?: string | null; size?: number | null; createdAt: string }
type FolderItem = { id: string; parentId?: string | null; name: string; category: string }

export default function ClientKnowledgeBank({ documents, folders, loading, error, language, onRetry }: {
  documents: Document[]
  folders: FolderItem[]
  loading: boolean
  error: string
  language: string
  onRetry: () => Promise<void>
}) {
  const isArabic = language === 'ar'
  const rootId = '__root__'
  const [selectedFolderId, setSelectedFolderId] = useState(rootId)
  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders])

  useEffect(() => {
    if (selectedFolderId !== rootId && !folderById.has(selectedFolderId)) setSelectedFolderId(rootId)
  }, [folderById, selectedFolderId])

  const folderPath = (folderId?: string | null) => {
    const parts: string[] = []
    let current = folderId ? folderById.get(folderId) : undefined
    while (current) { parts.unshift(current.name); current = current.parentId ? folderById.get(current.parentId) : undefined }
    return parts
  }
  const currentPath = selectedFolderId === rootId ? [] : folderPath(selectedFolderId)
  const selectedFolders = selectedFolderId === rootId ? folders.filter((folder) => !folder.parentId) : folders.filter((folder) => folder.parentId === selectedFolderId)
  const selectedDocuments = selectedFolderId === rootId ? documents.filter((document) => !document.folderId) : documents.filter((document) => document.folderId === selectedFolderId)
  const countFiles = (folderId: string) => documents.filter((document) => document.folderId === folderId).length
  const sizeLabel = (size?: number | null) => !size ? (isArabic ? 'حجم غير محدد' : 'Size unavailable') : size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`
  const label = (ar: string, en: string) => isArabic ? ar : en

  if (loading) return <div className="card flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
  if (error) return <div className="card text-center"><p className="font-medium text-red-600">{error}</p><button onClick={() => void onRetry()} className="btn-secondary mt-4 px-4 py-2">{label('إعادة المحاولة', 'Try again')}</button></div>

  return <section className="space-y-5" dir={isArabic ? 'rtl' : 'ltr'}>
    <header className="overflow-hidden rounded-3xl border border-primary-100 bg-gradient-to-l from-primary-700 via-primary-600 to-primary-800 px-6 py-7 text-white shadow-sm"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="mb-3 inline-flex rounded-xl bg-white/15 p-3"><FolderOpen className="h-6 w-6" /></div><h2 className="text-2xl font-bold">{label('بنك المعلومات', 'Knowledge bank')}</h2><p className="mt-1 text-sm text-primary-100">{label('استعرض ملفات مؤسستك داخل مجلدات منظمة.', 'Browse your organization files in organized folders.')}</p></div><div className="flex gap-3"><div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center"><p className="text-xl font-bold">{folders.length}</p><p className="text-xs text-primary-100">{label('مجلدات', 'folders')}</p></div><div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center"><p className="text-xl font-bold">{documents.length}</p><p className="text-xs text-primary-100">{label('ملفات', 'files')}</p></div></div></div></header>

    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-slate-200 bg-slate-50/80 p-4 lg:border-b-0 lg:border-l"><p className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-400">{label('المجلدات', 'Folders')}</p><button onClick={() => setSelectedFolderId(rootId)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm font-semibold transition ${selectedFolderId === rootId ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white'}`}><Home className="h-4 w-4" />{label('كل الملفات', 'All files')}</button><div className="space-y-1">{folders.map((folder) => <button key={folder.id} onClick={() => setSelectedFolderId(folder.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm transition ${selectedFolderId === folder.id ? 'bg-primary-50 font-bold text-primary-700' : 'text-slate-600 hover:bg-white'}`} style={{ paddingInlineStart: `${12 + folderPath(folder.id).length * 8}px` }}><Folder className="h-4 w-4 shrink-0 text-primary-600" /><span className="min-w-0 flex-1 truncate">{folder.name}</span><span className="text-xs opacity-70">{countFiles(folder.id)}</span></button>)}</div></aside>
      <main className="min-w-0 p-5 sm:p-7"><div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500"><button onClick={() => setSelectedFolderId(rootId)} className="flex items-center gap-1 hover:text-primary-700"><Home className="h-4 w-4" />{label('بنك المعلومات', 'Knowledge bank')}</button>{currentPath.map((part, index) => <span key={`${part}-${index}`} className="flex items-center gap-2"><ChevronLeft className={`h-4 w-4 ${isArabic ? '' : 'rotate-180'}`} /><span className={index === currentPath.length - 1 ? 'font-semibold text-slate-900' : ''}>{part}</span></span>)}</div><div className="mb-5 flex items-center justify-between"><div><h3 className="text-xl font-bold text-slate-900">{currentPath.at(-1) || label('كل الملفات', 'All files')}</h3><p className="mt-1 text-sm text-slate-500">{label('اختر مجلدًا لعرض محتوياته وفتح الملفات.', 'Select a folder to view its contents and open files.')}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{selectedFolders.length + selectedDocuments.length} {label('عنصر', 'items')}</span></div>
        {selectedFolders.length > 0 && <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{selectedFolders.map((folder) => <button key={folder.id} onClick={() => setSelectedFolderId(folder.id)} className="group rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"><div className="flex items-start justify-between"><FolderOpen className="h-8 w-8 text-amber-500" /><span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">{countFiles(folder.id)} {label('ملف', 'files')}</span></div><p className="mt-5 font-bold text-slate-900">{folder.name}</p><p className="mt-1 text-xs font-medium text-primary-700">{folder.category}</p></button>)}</div>}
        {selectedDocuments.length > 0 ? <div className="overflow-hidden rounded-2xl border border-slate-200"><div className="hidden grid-cols-[minmax(0,1fr)_120px_110px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500 sm:grid"><span>{label('اسم الملف', 'File name')}</span><span>{label('التصنيف', 'Category')}</span><span>{label('الحجم', 'Size')}</span></div>{selectedDocuments.map((document) => <article key={document.id} className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_120px_110px] sm:items-center sm:px-5"><div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-red-50 p-2.5 text-red-600"><FileText className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate font-bold text-slate-900">{document.title}</p><p className="mt-0.5 text-xs text-slate-500">{new Date(document.createdAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}</p></div></div><p className="text-sm text-slate-600">{document.category || label('مستند', 'Document')}</p><div className="flex items-center justify-between gap-3"><span className="text-sm text-slate-500">{sizeLabel(document.size)}</span><a href={document.url} download={document.originalName || undefined} target="_blank" rel="noopener noreferrer" className="btn-primary shrink-0 px-3 py-2 text-xs"><Download className="h-4 w-4" />{label('فتح', 'Open')}</a></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 py-14 text-center"><FolderOpen className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">{label('لا توجد ملفات في هذا المجلد', 'This folder has no files')}</p><p className="mt-1 text-sm text-slate-500">{label('يمكنك فتح مجلد آخر من القائمة الجانبية.', 'Choose another folder from the sidebar.')}</p></div>}
      </main>
    </div>
  </section>
}
