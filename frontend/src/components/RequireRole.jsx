import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from './ui'

/** Client-side mirror of the backend RBAC guards (the server is still the real gatekeeper). */
export default function RequireRole({ roles, redirect }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!roles.includes(user.role)) {
    const fallback = redirect || (user.role === 'customer' ? '/' : '/dashboard')
    return <Navigate to={fallback} replace />
  }
  return <Outlet />
}
