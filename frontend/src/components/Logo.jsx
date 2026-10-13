import { Link } from 'react-router-dom'

export default function Logo({ className = '', to = '/' }) {
  return (
    <Link to={to} dir="ltr" className={`group inline-flex flex-col items-center leading-none ${className}`} aria-label="YSN - الرئيسية">
      <span className="font-logo text-3xl sm:text-4xl font-extrabold tracking-wider text-ink transition-transform duration-300 group-hover:scale-105">
        YSN
      </span>
      <span className="mt-0.5 text-[0.55rem] font-bold uppercase tracking-[0.35em] text-ink-muted">Accessories Store</span>
    </Link>
  )
}
