import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

interface Props {
  children: ReactNode
  allowedRoles?: Array<'platform_owner' | 'owner' | 'admin' | 'worker'>
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}
