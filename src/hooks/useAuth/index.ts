import { useState, useEffect } from 'react'

export interface UserProfile {
  username: string
  tags: string[]
  clusterUrl?: string
  loggedInAt: string
}

const AUTH_KEY = 'rabbitdash-auth'

const DEFAULT_USER: UserProfile = {
  username: 'guest',
  tags: ['administrator'],
  clusterUrl: 'http://localhost:15672',
  loggedInAt: new Date().toISOString(),
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return DEFAULT_USER
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) {
      try {
        return JSON.parse(stored) as UserProfile
      } catch {
        return DEFAULT_USER
      }
    }
    return DEFAULT_USER
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(AUTH_KEY)
    }
  }, [user])

  const login = (username: string, _password?: string, clusterUrl?: string) => {
    const profile: UserProfile = {
      username,
      tags: username === 'guest' ? ['administrator'] : ['management'],
      clusterUrl: clusterUrl || 'http://localhost:15672',
      loggedInAt: new Date().toISOString(),
    }
    setUser(profile)
    return profile
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(AUTH_KEY)
  }

  return {
    user,
    isAuthenticated: !!user,
    login,
    logout,
  }
}

export default useAuth
