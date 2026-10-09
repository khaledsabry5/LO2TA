import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function DashboardHome() {
  const { isManager } = useAuth()
  return <Navigate to={isManager ? '/dashboard/overview' : '/dashboard/products'} replace />
}
