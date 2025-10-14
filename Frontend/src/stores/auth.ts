import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: null
  }),
  actions: {
    async login(email, password) {
      try {
        const response = await fetch(`http://localhost:3001/api/auth/sign-in?email=${email}&password=${password}`);
        const data = await response.json()

        if (data.success && data.data.token) {
          this.token = data.data.token
          this.user = data.data.user
          localStorage.setItem('token', data.data.token)
          return true
        }
        return false
      } catch (error) {
        console.error('Login failed:', error)
        return false
      }
    },
    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('token')
    }
  },
  getters: {
    isAuthenticated: (state) => !!state.token
  }
})
