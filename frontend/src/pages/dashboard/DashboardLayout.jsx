import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { LogOut, Menu } from 'lucide-react'
import Logo from '../../components/Logo'
import SubFooter from '../../components/layout/SubFooter'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS } from '../../lib/format'
import AdminSidebar from './AdminSidebar'
import './AdminLayout.css'

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div className="admin-layout-wrapper">
      {/* Global Off-canvas Drawer Sidebar (Overlay for all screen sizes) */}
      <AdminSidebar drawerOpen={drawerOpen} closeDrawer={closeDrawer} />

      {/* Main Container - Expands 100% full width */}
      <div className="admin-main-wrapper">
        {/* Top Header */}
        <header className="admin-top-header">
          <div className="admin-header-start">
            <button
              type="button"
              className="admin-hamburger-btn"
              onClick={() => setDrawerOpen((prev) => !prev)}
              aria-label="تبديل القائمة الجانبية"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="admin-header-logo">
              <Logo to="/dashboard" />
            </div>
            <span className="admin-header-title">لوحة التحكم</span>
          </div>

          <div className="admin-header-end">
            <div className="admin-user-profile-badge">
              <p className="admin-user-name">{user?.full_name || 'مدير المتجر'}</p>
              <p className="admin-user-role">{ROLE_LABELS[user?.role] || ''}</p>
            </div>
            <span className="admin-user-avatar">
              {user?.full_name?.[0] || 'م'}
            </span>
            <button
              type="button"
              onClick={logout}
              className="admin-header-logout-btn"
              aria-label="تسجيل الخروج"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Dashboard Main Content */}
        <main className="admin-content-area">
          <div className="admin-content-body">
            <Outlet />
          </div>
          <div className="admin-subfooter-wrapper">
            <SubFooter />
          </div>
        </main>
      </div>
    </div>
  )
}
