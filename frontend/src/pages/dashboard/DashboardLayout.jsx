import { NavLink, Outlet, Link } from 'react-router-dom'
import { BarChart3, Boxes, ClipboardList, LogOut, Receipt, Store, UserCog, Users } from 'lucide-react'
import Logo from '../../components/Logo'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS } from '../../lib/format'

const LINKS = [
  { to: '/dashboard/overview', label: 'المبيعات', icon: BarChart3, roles: ['manager'] },
  { to: '/dashboard/products', label: 'المنتجات', icon: Boxes, roles: ['manager', 'admin'] },
  { to: '/dashboard/orders', label: 'الطلبات', icon: ClipboardList, roles: ['manager', 'admin'] },
  { to: '/dashboard/sales', label: 'سجل المبيعات', icon: Receipt, roles: ['manager'] },
  { to: '/dashboard/customers', label: 'العملاء', icon: Users, roles: ['manager'] },
  { to: '/dashboard/staff', label: 'المشرفين', icon: UserCog, roles: ['manager'] },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const links = LINKS.filter((l) => l.roles.includes(user.role))

  return (
    <div className="min-h-screen bg-[#fbfaf7] lg:flex">
      {/* Sidebar – desktop (cream, like the reference) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-cream lg:flex">
        <div className="p-6 text-center"><Logo to="/dashboard" /></div>
        <nav className="flex-1 space-y-1 px-3">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  isActive ? 'bg-white text-ink shadow-sm border-e-4 border-ink' : 'text-ink/70 hover:bg-white/60 hover:text-ink'
                }`
              }
            >
              <Icon className="h-5 w-5" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 p-3">
          <Link to="/" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-ink/70 hover:bg-white/60"><Store className="h-5 w-5" /> عرض المتجر</Link>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-ink/70 hover:bg-white/60"><LogOut className="h-5 w-5" /> تسجيل الخروج</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/5 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <div className="lg:hidden"><Logo to="/dashboard" /></div>
            <span className="hidden text-lg font-extrabold lg:block">لوحة التحكم</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-end leading-tight">
              <p className="text-sm font-bold">{user.full_name}</p>
              <p className="text-xs text-ink-muted">{ROLE_LABELS[user.role]}</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-cream font-extrabold">{user.full_name[0]}</span>
            <button onClick={logout} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-cream-100 lg:hidden" aria-label="خروج"><LogOut className="h-5 w-5" /></button>
          </div>
        </header>

        <main className="flex-1 p-4 pb-28 sm:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom tab bar – mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-black/5 bg-white/95 pb-safe backdrop-blur lg:hidden">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `flex flex-1 flex-col items-center gap-1 pt-2 text-[0.62rem] font-bold ${isActive ? 'text-ink' : 'text-ink/45'}`}
          >
            {({ isActive }) => (
              <>
                <span className={`grid h-8 w-12 place-items-center rounded-full transition ${isActive ? 'bg-cream' : ''}`}><Icon className="h-5 w-5" /></span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
