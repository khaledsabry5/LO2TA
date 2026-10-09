import { Link } from 'react-router-dom'

export default function Logo({ className = '', to = '/' }) {
  return (
    <Link to={to} dir="ltr" className={`group inline-flex flex-col items-center leading-none ${className}`} aria-label="Lo2ta - الرئيسية">
      <span className="font-logo text-[1.9rem] font-bold tracking-tight text-ink transition-transform duration-300 group-hover:scale-105">
        Lo2ta
      </span>
      <span className="mt-0.5 text-[0.5rem] font-medium uppercase tracking-[0.3em] text-ink-muted">Accessories Store</span>
    </Link>
  )
}
