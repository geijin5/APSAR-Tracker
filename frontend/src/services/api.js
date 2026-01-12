import axios from 'axios'

// Determine API URL based on platform
const getApiUrl = () => {
  // Use environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // For web (PWA), use relative path (proxied by Vite in dev, works in production)
  return '/api'
}

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if we're already on the login page or if it's a login request
      const isLoginRequest = error.config?.url?.includes('/auth/login')
      const isOnLoginPage = window.location.pathname === '/login'
      
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      
      // Only redirect if not already on login page and not a login request
      if (!isLoginRequest && !isOnLoginPage) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api





