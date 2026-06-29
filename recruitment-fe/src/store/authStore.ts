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
  /** true sau khi bootstrap() xác minh token với server */
  isReady: boolean
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
  /** Gọi 1 lần lúc app khởi động để verify token và lấy user mới nhất từ server */
  bootstrap: () => Promise<void>
}

const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

function loadFromStorage(): Pick<AuthState, 'user' | 'token'> {
  try {
    const token = localStorage.getItem('access_token')
    const raw = localStorage.getItem('user')
    const user: AuthUser | null = raw ? (JSON.parse(raw) as AuthUser) : null
    return { user, token }
  } catch {
    return { user: null, token: null }
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...loadFromStorage(),
  isReady: false,

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

  async bootstrap() {
    const { token } = get()

    if (!token) {
      set({ isReady: true })
      return
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        // Token hết hạn hoặc không hợp lệ → xóa auth
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        set({ user: null, token: null, isReady: true })
        return
      }

      const data = (await res.json()) as {
        id: string
        email: string
        fullName: string
        role: 'recruiter' | 'candidate'
        avatarUrl?: string | null
      }

      // Ghi đè user bằng dữ liệu authoritative từ server
      const freshUser: AuthUser = {
        id: data.id,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        avatarUrl: data.avatarUrl,
      }
      localStorage.setItem('user', JSON.stringify(freshUser))
      set({ user: freshUser, isReady: true })
    } catch {
      // Lỗi mạng → giữ state hiện tại để không bị logout khi offline
      set({ isReady: true })
    }
  },
}))
