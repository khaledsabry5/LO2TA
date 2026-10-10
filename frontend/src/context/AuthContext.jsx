import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, tokenStore } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadMe = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null)
      setLoading(false)
      return null
    }
    try {
      const me = await api.me()
      setUser(me)
      return me
    } catch {
      tokenStore.clear()
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMe()
  }, [loadMe])

  const login = async (email, password) => {
    const { access_token } = await api.login(email, password)
    tokenStore.set(access_token)
    return loadMe()
  }

  const passwordlessLogin = async (identifier) => {
    const res = await api.passwordlessLogin(identifier)
    if (res?.access_token) {
      tokenStore.set(res.access_token)
      return loadMe()
    }
    return null
  }

  const register = async (data) => {
    const res = await api.register(data)
    if (res?.access_token) {
      tokenStore.set(res.access_token)
      return loadMe()
    }
    return null
  }

  const logout = () => {
    tokenStore.clear()
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      passwordlessLogin,
      register,
      logout,
      isManager: user?.role === 'manager',
      isAdmin: user?.role === 'admin',
      isStaff: user?.role === 'manager' || user?.role === 'admin',
      isCustomer: user?.role === 'customer',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
