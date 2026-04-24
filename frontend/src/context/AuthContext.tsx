import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../api/client'

interface AuthCtx {
  token: string | null
  role: string
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

function parseRole(token: string): string {
  const payload = parseJwtPayload(token)
  if (!payload) return 'VIEWER'
  return (payload.role as string) ?? (payload.roles as string[])?.[0] ?? 'VIEWER'
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(atob(parts[1]))
  } catch {
    return null
  }
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token)
  if (!payload?.exp) return false  // not a real JWT → let the API decide
  return (payload.exp as number) * 1000 < Date.now()
}

function loadValidToken(): string | null {
  const t = localStorage.getItem('token')
  if (!t || isTokenExpired(t)) {
    localStorage.removeItem('token')
    return null
  }
  return t
}

export const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(loadValidToken)

  const role = token ? parseRole(token) : 'VIEWER'

  // Auto-logout when a valid JWT expires mid-session
  useEffect(() => {
    if (!token) return
    const payload = parseJwtPayload(token)
    if (!payload?.exp) return  // not a real JWT (e.g. test mock) – skip
    const msUntilExpiry = (payload.exp as number) * 1000 - Date.now()
    if (msUntilExpiry <= 0) { logout(); return }
    const timer = setTimeout(logout, msUntilExpiry)
    return () => clearTimeout(timer)
  }, [token])

  async function login(username: string, password: string) {
    const { data } = await api.post<{ token: string }>('/auth/login', { username, password })
    localStorage.setItem('token', data.token)
    setToken(data.token)
  }

  function logout() {
    localStorage.removeItem('token')
    setToken(null)
  }

  return <AuthContext.Provider value={{ token, role, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
