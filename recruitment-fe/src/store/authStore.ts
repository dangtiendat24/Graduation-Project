import { create } from 'zustand'

export interface AuthUser {
  id: string
  fullName: string
  email: string
  role: 'recruiter' | 'candidate'
  avatarUrl?: string | null
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
}

function loadFromStorage(): Pick<AuthState, 'user' | 'token'> {
  try {
    const token = localStorage.getItem('access_token')
    const raw = localStorage.getItem('user')
    const user: AuthUser | null = raw ? JSON.parse(raw) : null
    return { user, token }
  } catch {
    return { user: null, token: null }
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadFromStorage(),
  setAuth(user, token) {
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token })
  },
  clearAuth() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },
}))
