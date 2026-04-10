import { useGoogleLogin } from '@react-oauth/google'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export default function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      setError('')
      try {
        // Exchange access_token for user info, then send to backend
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })

        // Get ID token via implicit flow workaround: use access token to get profile
        // For production use authorization_code flow — here we use access token + profile
        const res = await axios.post(`${API_BASE}/auth/google-access-token`, {
          access_token: tokenResponse.access_token,
          email: userInfo.data.email,
          name: userInfo.data.name,
          picture: userInfo.data.picture,
          google_sub: userInfo.data.sub,
        })

        localStorage.setItem('token', res.data.access_token)
        localStorage.setItem('user', JSON.stringify({
          name: res.data.user_name,
          email: res.data.user_email,
          picture: res.data.user_picture,
          is_admin: res.data.is_admin,
        }))
        navigate('/', { replace: true })
      } catch (e: any) {
        const msg = e.response?.data?.detail || 'Erro ao autenticar. Verifique se seu e-mail tem acesso.'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    onError: () => setError('Login com Google cancelado ou falhou.'),
    scope: 'openid email profile',
  })

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-end gap-1 h-12 mb-3">
            <div className="w-2.5 h-6 rounded bg-gold-500" />
            <div className="w-2.5 h-9 rounded bg-gold-400" />
            <div className="w-2.5 h-12 rounded bg-gold-300" />
            <div className="w-2.5 h-7 rounded bg-gold-500" />
          </div>
          <p className="text-silver-400 font-bold text-2xl tracking-widest uppercase leading-none">Lima</p>
          <p className="text-white/50 text-xs tracking-[0.4em] uppercase mt-0.5">Cálculos</p>
          <div className="h-px w-32 bg-gold-gradient opacity-60 mt-4" />
          <p className="text-dark-400 text-sm mt-3">Simples Nacional — Declarações PGDAS-D</p>
        </div>

        {/* Card */}
        <div className="card-gold p-8">
          <h2 className="text-dark-100 font-semibold text-lg mb-1">Acesso restrito</h2>
          <p className="text-dark-400 text-sm mb-6">
            Use a conta Google do escritório para entrar.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={() => login()}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium px-4 py-3 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
            )}
            {loading ? 'Entrando...' : 'Entrar com Google'}
          </button>
        </div>

        <p className="text-dark-600 text-xs text-center mt-6">
          Somente e-mails autorizados têm acesso.
        </p>
      </div>
    </div>
  )
}
