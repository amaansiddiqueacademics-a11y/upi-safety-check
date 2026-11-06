import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Page controls under a table: total, previous / next. */
export function Pager({ page, pages, onChange, total }: { page: number; pages: number; onChange: (p: number) => void; total: number }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4 text-sm text-muted">
      <span>{total.toLocaleString('en-IN')} in total</span>
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost !min-h-9 !px-2.5" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
        <span>Page <b className="text-ink num">{page}</b> of <span className="num">{Math.max(1, pages)}</span></span>
        <button className="btn btn-ghost !min-h-9 !px-2.5" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
      </div>
    </div>
  )
}
