import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store'

export default function Admin() {
  const adminUsers = useAppStore((state) => state.adminUsers)
  const getAdminUsers = useAppStore((state) => state.getAdminUsers)
  const createAdminUser = useAppStore((state) => state.createAdminUser)
  const updateAdminUserPlan = useAppStore((state) => state.updateAdminUserPlan)
  const deleteAdminUser = useAppStore((state) => state.deleteAdminUser)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Staff')
  const [plan, setPlan] = useState('Free')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAdminUsers().catch((err) => setMessage(err.message))
  }, [getAdminUsers])

  // MRR & Subscription Math
  const metrics = useMemo(() => {
    let mrr = 0
    let freeCount = 0
    let proCount = 0
    let enterpriseCount = 0

    adminUsers.forEach((user) => {
      if (user.planStatus === 'Active') {
        if (user.plan === 'Pro') {
          mrr += 29
          proCount++
        } else if (user.plan === 'Enterprise') {
          mrr += 199
          enterpriseCount++
        } else {
          freeCount++
        }
      } else {
        freeCount++
      }
    })

    return {
      mrr,
      freeCount,
      proCount,
      enterpriseCount,
      totalUsers: adminUsers.length,
    }
  }, [adminUsers])

  const handleCreateUser = async (event) => {
    event.preventDefault()
    if (!email || !password) {
      setMessage('Email and password are required.')
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      await createAdminUser({ email, password, role, plan })
      setMessage('User account created successfully.')
      setEmail('')
      setPassword('')
      setRole('Staff')
      setPlan('Free')
      setIsModalOpen(false)
    } catch (err) {
      setMessage(err.message || 'Failed to create user.')
    } finally {
      setLoading(false)
    }
  }

  const handlePlanChange = async (userId, newPlan) => {
    try {
      await updateAdminUserPlan(userId, newPlan, 'Active')
      setMessage('User plan updated successfully.')
    } catch (err) {
      setMessage(err.message || 'Failed to update plan.')
    }
  }

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    try {
      await deleteAdminUser(userId)
      setMessage('User deleted successfully.')
    } catch (err) {
      setMessage(err.message || 'Failed to delete user.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Block */}
      <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg shadow-slate-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Plan-Based Administration</h2>
          <p className="mt-2 text-sm text-slate-400">
            Monitor accounts, trace subscription distribution, and audit monthly recurring revenue (MRR).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:from-purple-600 hover:to-indigo-700 self-start sm:self-auto shadow-lg shadow-purple-500/20"
        >
          Create User Account
        </button>
      </section>

      {/* Analytics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-purple-500/30 bg-slate-900/60 p-6 text-slate-100 shadow-md">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">Estimated MRR</p>
          <p className="mt-3 text-3xl font-bold bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">
            ${metrics.mrr.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-2">Active paid subscriptions</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-slate-100">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">Total Users</p>
          <p className="mt-3 text-3xl font-bold text-slate-100">{metrics.totalUsers}</p>
          <p className="text-xs text-slate-500 mt-2">All platform roles</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-slate-100">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">Pro Subscriptions</p>
          <p className="mt-3 text-3xl font-bold text-sky-400">{metrics.proCount}</p>
          <p className="text-xs text-slate-500 mt-2">$29/mo each</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-slate-100">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">Enterprise Subscriptions</p>
          <p className="mt-3 text-3xl font-bold text-indigo-400">{metrics.enterpriseCount}</p>
          <p className="text-xs text-slate-500 mt-2">$199/mo each</p>
        </div>
      </div>

      {/* Message feedback */}
      {message && (
        <div className="rounded-2xl border border-purple-500/20 bg-purple-950/30 p-4 text-sm text-purple-200">
          {message}
        </div>
      )}

      {/* User Accounts list */}
      <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/90 shadow-lg">
        <table className="min-w-full border-collapse text-left text-sm text-slate-300">
          <thead className="bg-slate-900/80 text-slate-400 font-medium border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">User Email</th>
              <th className="px-6 py-4 hidden sm:table-cell">Platform Role</th>
              <th className="px-6 py-4">Subscription Plan</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 hidden md:table-cell">Joined Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {adminUsers.map((user) => (
              <tr key={user._id} className="hover:bg-slate-900/30 transition">
                <td className="px-6 py-4 font-medium text-slate-100 truncate max-w-[140px] md:max-w-none" title={user.email}>{user.email}</td>
                <td className="px-6 py-4 hidden sm:table-cell">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    user.role === 'Admin' ? 'bg-purple-500/10 text-purple-300' :
                    user.role === 'Manager' ? 'bg-blue-500/10 text-blue-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={user.plan || 'Free'}
                    onChange={(e) => handlePlanChange(user._id, e.target.value)}
                    className="rounded-xl border border-slate-800 bg-slate-900 text-slate-200 px-3 py-1.5 focus:outline-none focus:border-purple-500 text-xs font-medium"
                  >
                    <option value="Free">Free ($0/mo)</option>
                    <option value="Pro">Pro ($29/mo)</option>
                    <option value="Enterprise">Enterprise ($199/mo)</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    user.planStatus === 'Active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                  }`}>
                    {user.planStatus || 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400 hidden md:table-cell">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(user._id)}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                  >
                    Delete Account
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-purple-500/30 bg-gradient-to-br from-slate-900 to-purple-950/95 p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-6">Create New user Account</h3>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <label className="block text-sm text-slate-300">
                Email Address
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500"
                  placeholder="name@company.com"
                />
              </label>

              <label className="block text-sm text-slate-300">
                Initial Password
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500"
                  placeholder="••••••••"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm text-slate-300">
                  Role
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </label>

                <label className="block text-sm text-slate-300">
                  Plan
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Free">Free ($0/mo)</option>
                    <option value="Pro">Pro ($29/mo)</option>
                    <option value="Enterprise">Enterprise ($199/mo)</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 mt-4 shadow-lg shadow-purple-500/25"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
