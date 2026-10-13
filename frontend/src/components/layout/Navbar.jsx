import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Menu, ShoppingBag, User } from 'lucide-react'
import Logo from '../Logo'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import './Navbar.css'

export default function Navbar({ onMenuClick }) {
  const { count, bump } = useCart()
  const { user, isStaff } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')

  useEffect(() => {
    setQ(params.get('q') || '')
  }, [params])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop')
  }

  return (
    <header className={`app-navbar-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="app-navbar-container">
        <div className="app-navbar-grid">
          {/* Top Row: Right in RTL (Start) - Hamburger Menu Icon */}
          <div className="app-navbar-start">
            <button
              id="menu-button"
              type="button"
              onClick={onMenuClick}
              className="app-navbar-menu-btn"
              aria-label="القائمة الرئيسية"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          {/* Top Row: Center - Brand Logo */}
          <div className="app-navbar-center">
            <Logo to="/" />
          </div>

          {/* End Cluster: Single Search Bar + Actions (User & Cart) */}
          <div className="app-navbar-end">
            {/* The single Search Bar element (inline on desktop, drops to Row 2 on mobile via CSS) */}
            <div className="app-navbar-search">
              <form
                role="search"
                className="navbar-minimal-search"
                onSubmit={handleSearchSubmit}
              >
                <input
                  id="navbar-search-input"
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="بحث"
                  aria-label="بحث في المتجر"
                  className="navbar-minimal-search-input"
                />
              </form>
            </div>

            {/* User and Cart Icons */}
            <div className="app-navbar-actions">
              {user ? (
                <Link
                  to={isStaff ? "/dashboard" : "/orders"}
                  className="app-navbar-action-btn"
                  aria-label={isStaff ? "لوحة التحكم" : "حسابي"}
                  title={user.full_name}
                >
                  <User className="h-5 w-5 stroke-[1.75]" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="app-navbar-action-btn"
                  aria-label="تسجيل الدخول"
                  title="تسجيل الدخول"
                >
                  <User className="h-5 w-5 stroke-[1.75]" />
                </Link>
              )}

              <Link
                id="cart-button"
                to="/cart"
                className="app-navbar-action-btn"
                aria-label="سلة المشتريات"
                title="سلة المشتريات"
              >
                <ShoppingBag className={`h-5 w-5 stroke-[1.75] ${bump ? 'animate-pop' : ''}`} />
                {count > 0 && (
                  <span className="app-navbar-cart-badge">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
