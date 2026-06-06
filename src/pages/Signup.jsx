import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('Staff')
  const [plan, setPlan] = useState('Free')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const signup = useAppStore((state) => state.signup)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    if (!email || !password || !confirmPassword) {
      setError('All fields are required.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    try {
      await signup(email, password, role, plan)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-purple-900 flex items-center justify-center px-4 py-6 relative overflow-hidden">
      <div className="w-full max-w-md">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-slate-900/80 to-purple-900/50 backdrop-blur-xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-gradient-to-br from-purple-500 to-emerald-500 rounded-full mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Create account</h1>
              <p className="text-slate-300">Get started with your business management platform</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  Confirm Password
                </label>
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
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
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-purple-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
              </div>
            </form>

            {/* Footer */}
            <p className="text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link className="font-medium text-purple-400 hover:text-purple-300 transition" to="/login">
                Sign in
              </Link>
            </p>
          </div>

          {/* Footer text */}
          <p className="text-center text-xs text-slate-500 mt-4">
            Your data is secure • Encrypted authentication
          </p>
        </div>
      </div>
    </div>
  )
}
