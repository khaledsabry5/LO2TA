import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { LayoutDashboard, LogIn, LogOut, Menu, Package, Search, ShoppingCart, User, X } from 'lucide-react'
import Logo from '../Logo'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'

const NAV = [
  { to: '/shop?gender=men', label: 'قسم الرجال' },
  { to: '/shop?gender=women', label: 'قسم النساء' },
  { to: '/shop?category=shoes', label: 'الأحذية' },
  { to: '/shop?category=bags', label: 'الشنط' },
  { to: '/shop?category=watches', label: 'الساعات' },
  { to: '/shop?discounted=true', label: 'العروض', accent: true },
]

function SearchBar({ className = '' }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault()
        navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop')
      }}
    >
      <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        id="search-input"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ابحث عن منتجك المفضل..."
        className="w-full rounded-2xl border-0 bg-cream-100 py-3 pe-4 ps-11 text-sm outline-none ring-1 ring-cream transition placeholder:text-ink-muted/80 focus:bg-white focus:ring-2 focus:ring-ink"
      />
    </form>
  )
}

function Header() {
  const { count, bump } = useCart()
  const { user, isStaff, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [pop, setPop] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!bump) return
    setPop(true)
    const t = setTimeout(() => setPop(false), 400)
    return () => clearTimeout(t)
  }, [bump])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  return (
    <header
      className={`sticky top-0 z-40 bg-white/85 backdrop-blur-xl transition-shadow ${scrolled ? 'shadow-[0_1px_0_rgba(0,0,0,.06)]' : ''}`}
    >
      <div className="container-x">
        <div className="flex h-16 items-center justify-between gap-3 lg:h-20">
          <button
            id="menu-button"
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl hover:bg-cream-100 lg:hidden"
            aria-label="القائمة"
          >
            <Menu className="h-6 w-6" />
          </button>

          <Logo className="lg:order-first" />

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-xl px-3 py-2 text-sm font-bold transition hover:bg-cream-100 ${n.accent ? 'text-sale' : 'text-ink'}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <SearchBar className="me-2 hidden w-64 xl:block" />
            {isStaff && (
              <Link to="/dashboard" className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold hover:bg-cream-100 lg:inline-flex">
                <LayoutDashboard className="h-4 w-4" /> لوحة التحكم
              </Link>
            )}
            {user ? (
              <button onClick={logout} className="hidden h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold hover:bg-cream-100 lg:inline-flex">
                <LogOut className="h-4 w-4" /> خروج
              </button>
            ) : (
              <Link to="/login" className="hidden h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold hover:bg-cream-100 lg:inline-flex">
                <User className="h-4 w-4" /> دخول
              </Link>
            )}
            <Link id="cart-button" to="/cart" className="relative grid h-10 w-10 place-items-center rounded-xl hover:bg-cream-100" aria-label="السلة">
              <ShoppingCart className={`h-6 w-6 ${pop ? 'animate-pop' : ''}`} />
              {count > 0 && (
                <span className="absolute -end-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[0.65rem] font-bold text-white ring-2 ring-white">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
        <div className="pb-3 xl:hidden">
          <SearchBar />
        </div>
      </div>

      {/* Mobile drawer (slides from the right in RTL) */}
      <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
        <aside
          className={`absolute inset-y-0 start-0 flex w-[82%] max-w-xs flex-col bg-white shadow-2xl transition-transform duration-300 ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-black/5 p-4">
            <Logo />
            <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-cream-100" aria-label="إغلاق">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3" onClick={() => setOpen(false)}>
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={`block rounded-xl px-4 py-3 text-base font-bold hover:bg-cream-100 ${n.accent ? 'text-sale' : ''}`}>
                {n.label}
              </Link>
            ))}
            <div className="my-3 h-px bg-black/5" />
            {user?.role === 'customer' && (
              <NavLink to="/orders" className="flex items-center gap-2 rounded-xl px-4 py-3 font-bold hover:bg-cream-100">
                <Package className="h-5 w-5" /> طلباتي
              </NavLink>
            )}
            {isStaff && (
              <NavLink to="/dashboard" className="flex items-center gap-2 rounded-xl px-4 py-3 font-bold hover:bg-cream-100">
                <LayoutDashboard className="h-5 w-5" /> لوحة التحكم
              </NavLink>
            )}
          </nav>
          <div className="border-t border-black/5 p-4 pb-safe">
            {user ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{user.full_name}</p>
                  <p className="text-xs text-ink-muted">{user.email}</p>
                </div>
                <button onClick={() => { logout(); setOpen(false) }} className="btn-outline px-3 py-2">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)} className="btn-dark w-full">
                <LogIn className="h-4 w-4" /> تسجيل الدخول
              </Link>
            )}
          </div>
        </aside>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-16 bg-ink text-white">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p dir="ltr" className="text-end font-logo text-3xl font-bold sm:text-start">Lo2ta</p>
          <p className="mt-3 text-sm leading-7 text-white/60">إكسسوارات مختارة بعناية للرجال والنساء – أحذية، شنط، وساعات بجودة عالية وأسعار مميزة.</p>
        </div>
        <div>
          <h4 className="mb-3 font-bold text-cream">الأقسام</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link to="/shop?gender=men" className="hover:text-white">قسم الرجال</Link></li>
            <li><Link to="/shop?gender=women" className="hover:text-white">قسم النساء</Link></li>
            <li><Link to="/shop?discounted=true" className="hover:text-white">العروض</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-bold text-cream">التصنيفات</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link to="/shop?category=shoes" className="hover:text-white">الأحذية</Link></li>
            <li><Link to="/shop?category=bags" className="hover:text-white">الشنط</Link></li>
            <li><Link to="/shop?category=watches" className="hover:text-white">الساعات</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-bold text-cream">خدمة العملاء</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li>شحن سريع لجميع المدن</li>
            <li>استبدال واسترجاع خلال 14 يوم</li>
            <li>الدفع عند الاستلام</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Lo2ta Accessories Store. جميع الحقوق محفوظة.
      </div>
    </footer>
  )
}

export default function StoreLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
