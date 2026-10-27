export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-24" role="status" aria-live="polite">
      <div className="w-full max-w-md space-y-4">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-xl bg-slate-200" />
        <div className="mx-auto h-4 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="mx-auto h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="grid grid-cols-3 gap-3 pt-4">
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  )
}
