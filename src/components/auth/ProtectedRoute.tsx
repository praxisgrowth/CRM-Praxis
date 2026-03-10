// src/components/auth/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../lib/database.types'

interface Props {
  children: React.ReactNode
  /**
   * If provided, only users whose role is in this array can access.
   * Absence of a session (no auth) is treated as ADMIN for backward compat.
   */
  allowedRoles?: UserRole[]
  /** Where to redirect unauthorized users (default: '/') */
  redirectTo?: string
}

export function ProtectedRoute({ children, allowedRoles, redirectTo = '/' }: Props) {
  const { loading, user, profile } = useAuth()

  // While resolving auth state, render nothing to avoid flash-redirects
  if (loading) return null

  // No session → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If role restriction exists, check it
  if (allowedRoles) {
    const role: UserRole = profile?.role ?? 'MEMBER'
    if (!allowedRoles.includes(role)) {
      return <Navigate to={redirectTo} replace />
    }
  }

  return <>{children}</>
}
