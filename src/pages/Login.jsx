import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const login = useAppStore((state) => state.login)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    if (!email || !password) {
      setError('Email and password are required.')
      setLoading(false)
      return
    }

    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-purple-900 flex items-center justify-center px-4 py-6 relative overflow-hidden">
      <div className="w-full max-w-md">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-slate-900/80 to-purple-900/50 backdrop-blur-xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
              <p className="text-slate-300">Sign in to your account to continue</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  Email Address
                </label>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-purple-500/30 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  type="email"
                  placeholder="you@example.com"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  Password
                </label>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-purple-500/30 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  type="password"
                  placeholder="••••••••"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
                <span className="text-xs text-slate-400 uppercase">or</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
              </div>

              {/* Social Login Placeholder */}
              <button
                type="button"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-700/50"
              >
                Continue with Google
              </button>
            </form>

            {/* Footer */}
            <p className="mt-6 text-center text-sm text-slate-400">
              Don't have an account?{' '}
              <Link className="font-medium text-purple-400 hover:text-purple-300 transition" to="/signup">
                Sign up
              </Link>
            </p>
          </div>

          {/* Footer text */}
          <p className="text-center text-xs text-slate-500 mt-4">
            Protected by cookies • Secure authentication
          </p>
        </div>
      </div>
    </div>
  )
}
