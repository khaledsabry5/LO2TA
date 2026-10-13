import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { FolderTree, Home, LayoutDashboard, LogIn, LogOut, Menu, Package, ShoppingBag, Tag, User, X } from 'lucide-react'
import Logo from '../Logo'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { api } from '../../lib/api'
import './Navbar.css'
import './Sidebar.css'

const DEFAULT_NAV = [
  { to: '/shop?gender=men', label: 'الرجال' },
  { to: '/shop?gender=women', label: 'النساء' },
  { to: '/category/1', label: 'الأحذية' },
  { to: '/category/2', label: 'الشنط' },
  { to: '/category/3', label: 'الساعات' },
  { to: '/category/4', label: 'النظارات والإكسسوارات' },
  { to: '/shop?discounted=true', label: 'العروض', accent: true },
]

import Navbar from './Navbar'
import Footer from './Footer'
import SubFooter from './SubFooter'

function Header() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const isManagerOrAdmin = Boolean(
    user && (user.role?.toLowerCase() === 'manager' || user.role?.toLowerCase() === 'admin')
  )

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])

  useEffect(() => {
    let mounted = true
    api.departments()
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setDepartments(data)
        }
      })
      .catch(() => {})
    api.categories()
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setCategories(data)
        }
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  return (
    <>
      <Navbar onMenuClick={() => setOpen(true)} />

      {/* Universal Store Sidebar Drawer */}
      <div
        className={`store-drawer-backdrop ${open ? 'active' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      <aside
        className={`store-drawer-container ${open ? 'active' : ''}`}
        aria-label="القائمة الجانبية للمتجر"
      >
        <div className="store-drawer-header">
          <Logo to="/" onClick={() => setOpen(false)} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="store-drawer-close-btn"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="store-drawer-nav">
          {/* Injected Dashboard Link for Manager & Admin */}
          {isManagerOrAdmin && (
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="store-drawer-dashboard-link"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>لوحة التحكم</span>
              <span className="store-drawer-link-badge">إدارة المتجر</span>
            </Link>
          )}

          {/* Primary Navigation Links */}
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="store-drawer-link"
          >
            <Home className="h-4 w-4 text-ink-muted" />
            <span>الرئيسية</span>
          </Link>

          {/* Dynamic Departments (الفئات) */}
          {departments.length > 0 ? (
            departments.map((dept) => {
              const targetUrl = dept.name?.includes('رجال')
                ? `/shop?gender=men&department=${dept.id}`
                : dept.name?.includes('نساء')
                ? `/shop?gender=women&department=${dept.id}`
                : `/shop?department=${dept.id}`

              return (
                <Link
                  key={dept.id}
                  to={targetUrl}
                  onClick={() => setOpen(false)}
                  className="store-drawer-link"
                >
                  <User className="h-4 w-4 text-ink-muted" />
                  <span>{dept.name}</span>
                </Link>
              )
            })
          ) : (
            <>
              <Link
                to="/shop?gender=men"
                onClick={() => setOpen(false)}
                className="store-drawer-link"
              >
                <User className="h-4 w-4 text-ink-muted" />
                <span>الرجال</span>
              </Link>
              <Link
                to="/shop?gender=women"
                onClick={() => setOpen(false)}
                className="store-drawer-link"
              >
                <User className="h-4 w-4 text-ink-muted" />
                <span>النساء</span>
              </Link>
            </>
          )}

          <Link
            to="/shop?discounted=true"
            onClick={() => setOpen(false)}
            className="store-drawer-link accent"
          >
            <Tag className="h-4 w-4" />
            <span>العروض والتخفيضات</span>
            <span className="store-drawer-link-badge">خصومات</span>
          </Link>

          {/* Vertical Dynamic Categories Section */}
          <div className="store-drawer-section-title">التصنيفات</div>
          {categories.length > 0 ? (
            categories.map((c) => (
              <Link
                key={c.id}
                to={`/category/${c.id}`}
                onClick={() => setOpen(false)}
                className="store-drawer-link"
              >
                <FolderTree className="h-4 w-4 text-ink-muted" />
                <span>{c.name}</span>
                {typeof c.products_count === 'number' && (
                  <span className="store-drawer-link-badge">{c.products_count}</span>
                )}
              </Link>
            ))
          ) : (
            DEFAULT_NAV.slice(2, 6).map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="store-drawer-link"
              >
                <FolderTree className="h-4 w-4 text-ink-muted" />
                <span>{n.label}</span>
              </Link>
            ))
          )}

          {/* Customer Orders */}
          {user?.role === 'customer' && (
            <>
              <div className="store-drawer-section-title">حسابي</div>
              <Link
                to="/orders"
                onClick={() => setOpen(false)}
                className="store-drawer-link"
              >
                <Package className="h-4 w-4 text-ink-muted" />
                <span>طلباتي</span>
              </Link>
            </>
          )}
        </nav>

        {/* Integrated Clean Drawer Footer */}
        <div className="store-drawer-footer">
          {user ? (
            <>
              <div className="store-drawer-user-info">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="store-drawer-user-avatar">
                    {user.full_name ? user.full_name[0] : 'U'}
                  </div>
                  <div className="store-drawer-user-meta">
                    <p className="store-drawer-user-name">{user.full_name}</p>
                    <p className="store-drawer-user-role">
                      {user.role === 'manager'
                        ? 'مدير المتجر'
                        : user.role === 'admin'
                        ? 'مشرف'
                        : 'عميل'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout()
                  setOpen(false)
                }}
                className="store-drawer-auth-btn store-drawer-logout-btn"
              >
                <LogOut className="h-4 w-4" />
                <span>تسجيل الخروج</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="store-drawer-auth-btn store-drawer-login-btn"
              >
                <LogIn className="h-4 w-4" />
                <span>تسجيل الدخول</span>
              </Link>
              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className="store-drawer-register-link"
              >
                ليس لديك حساب؟ إنشاء حساب جديد
              </Link>
            </>
          )}
        </div>
      </aside>
    </>
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
      <SubFooter />
    </div>
  )
}
