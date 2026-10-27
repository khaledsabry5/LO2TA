import { NavLink, Link } from 'react-router-dom'
import {
  Boxes,
  Layers,
  FolderTree,
  ClipboardList,
  Receipt,
  Users,
  UserCog,
  Store,
  LogOut,
  X,
  Coins,
} from 'lucide-react'
import Logo from '../../components/Logo'
import { useAuth } from '../../context/AuthContext'
import './AdminSidebar.css'

export const ADMIN_NAV_LINKS = [
  { to: '/dashboard/products', label: 'المنتجات', icon: Boxes, roles: ['manager', 'admin'] },
  { to: '/dashboard/departments', label: 'إدارة الفئات', icon: Layers, roles: ['manager', 'admin'] },
  { to: '/dashboard/categories', label: 'إدارة التصنيفات', icon: FolderTree, roles: ['manager', 'admin'] },
  { to: '/dashboard/orders', label: 'الطلبات', icon: ClipboardList, roles: ['manager', 'admin'] },
  { to: '/dashboard/sales', label: 'سجل المبيعات', icon: Receipt, roles: ['manager'] },
  { to: '/dashboard/expenses', label: 'المصروفات والخصومات', icon: Coins, roles: ['manager'] },
  { to: '/dashboard/customers', label: 'العملاء', icon: Users, roles: ['manager'] },
  { to: '/dashboard/staff', label: 'المشرفين', icon: UserCog, roles: ['manager', 'admin'] },
]

export default function AdminSidebar({ drawerOpen, closeDrawer }) {
  const { user, logout } = useAuth()
  const links = ADMIN_NAV_LINKS.filter((l) => l.roles.includes(user?.role))

  return (
    <>
      <div
        className={`admin-drawer-backdrop ${drawerOpen ? 'active' : ''}`}
        onClick={closeDrawer}
        aria-hidden={!drawerOpen}
      />
      <aside
        className={`admin-drawer-container ${drawerOpen ? 'active' : ''}`}
        aria-label="قائمة لوحة التحكم الجانبية"
      >
        <div className="admin-drawer-header">
          <Logo to="/dashboard" />
          <button
            type="button"
            className="admin-drawer-close-btn"
            onClick={closeDrawer}
            aria-label="إغلاق القائمة الجانبية"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="admin-drawer-nav">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `admin-drawer-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="h-5 w-5" /> {label}
            </NavLink>
          ))}

          <div className="admin-sidebar-divider" />

          <Link to="/" onClick={closeDrawer} className="admin-drawer-link">
            <Store className="h-5 w-5" /> عرض المتجر
          </Link>
          <button
            type="button"
            onClick={() => {
              closeDrawer()
              logout()
            }}
            className="admin-drawer-link admin-sidebar-logout-link"
          >
            <LogOut className="h-5 w-5" /> تسجيل الخروج
          </button>
        </nav>
      </aside>
    </>
  )
}
