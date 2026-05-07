import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'https://autodocgen2-production-8e78.up.railway.app',
  withCredentials: true
})

export async function getMe() { return api.get('/api/me') }
export async function signUp(data) { return api.post('/auth/signup', data) }
export async function signIn(data) { return api.post('/auth/signin', data) }
export async function logout() { return api.post('/auth/logout') }
export default api
