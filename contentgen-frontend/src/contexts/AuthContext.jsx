import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem(api.TOKEN_KEY)
    setUser(null)
  }, [])

  // Validar token salvo ao inicializar
  useEffect(() => {
    const token = localStorage.getItem(api.TOKEN_KEY)
    if (!token) {
      setIsLoading(false)
      return
    }

    api.getMe()
      .then((data) => setUser(data.usuario))
      .catch(() => logout())
      .finally(() => setIsLoading(false))
  }, [logout])

  // Ouvir evento de logout automatico (401 da API)
  useEffect(() => {
    const handleLogout = () => logout()
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [logout])

  async function login(email, password) {
    const data = await api.login(email, password)
    localStorage.setItem(api.TOKEN_KEY, data.token)
    setUser(data.usuario)
    return data
  }

  async function register(email, password, name) {
    const data = await api.register(email, password, name)
    localStorage.setItem(api.TOKEN_KEY, data.token)
    setUser(data.usuario)
    return data
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
