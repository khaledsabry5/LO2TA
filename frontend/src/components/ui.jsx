import { Loader2 } from 'lucide-react'

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} />
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-ink-muted">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-cream-50 px-6 py-14 text-center ring-1 ring-cream">
      {Icon && (
        <span className="grid h-16 w-16 place-items-center rounded-full bg-cream text-ink">
          <Icon className="h-7 w-7" />
        </span>
      )}
      <h3 className="text-lg font-extrabold">{title}</h3>
      {text && <p className="max-w-sm text-sm text-ink-muted">{text}</p>}
      {action}
    </div>
  )
}

export function ProductSkeleton() {
  return (
    <div className="space-y-3">
      <div className="skeleton aspect-[4/5] rounded-2xl" />
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-4 w-1/2" />
    </div>
  )
}

export function Alert({ children, tone = 'error' }) {
  const cls = tone === 'error' ? 'bg-sale/10 text-sale ring-sale/20' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  return <div className={`rounded-xl px-4 py-3 text-sm font-medium ring-1 ${cls}`}>{children}</div>
}
