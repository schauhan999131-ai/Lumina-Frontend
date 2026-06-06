import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '../store'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend
} from 'recharts'

export default function WealthVault() {
  const wealthEntries = useAppStore((state) => state.wealthEntries)
  const getWealthEntries = useAppStore((state) => state.getWealthEntries)
  const addWealthEntry = useAppStore((state) => state.addWealthEntry)
  const removeWealthEntry = useAppStore((state) => state.removeWealthEntry)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Form State
  const [type, setType] = useState('earning')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [formSuccess, setFormSuccess] = useState(null)

  // Chart Range state: 'daily', 'weekly', 'monthly', 'yearly'
  const [chartRange, setChartRange] = useState('daily')

  useEffect(() => {
    const loadWealth = async () => {
      try {
        await getWealthEntries()
      } catch (err) {
        setError('Failed to load wealth ledger entries')
      } finally {
        setLoading(false)
      }
    }
    loadWealth()
  }, [getWealthEntries])

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalEarnings = 0
    let totalSavings = 0
    let totalExpenses = 0

    wealthEntries.forEach((entry) => {
      if (entry.type === 'earning') {
        totalEarnings += entry.amount
      } else if (entry.type === 'savings') {
        totalSavings += entry.amount
      } else if (entry.type === 'expense') {
        totalExpenses += entry.amount
      }
    })

    const netWorth = totalEarnings + totalSavings - totalExpenses
    
    // Earning Rate / Focus Time linkage
    const focusMinutes = (() => {
      const saved = localStorage.getItem('study_focus_minutes')
      return saved ? parseInt(saved, 10) : 0
    })()
    
    const focusHours = focusMinutes / 60
    const hourlyRate = focusHours > 0 ? (totalEarnings / focusHours).toFixed(2) : '0.00'

    // Savings Rate formula: (Savings + Earnings - Expenses) / (Savings + Earnings)
    const inflows = totalEarnings + totalSavings
    const savingsRate = inflows > 0 ? Math.round(((inflows - totalExpenses) / inflows) * 100) : 0

    return {
      totalEarnings,
      totalSavings,
      totalExpenses,
      netWorth,
      focusMinutes,
      focusHours: focusHours.toFixed(1),
      hourlyRate,
      savingsRate
    }
  }, [wealthEntries])

  // Chart Data: cumulative trend chart grouped by selected range window
  const chartData = useMemo(() => {
    const sorted = [...wealthEntries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    let dataPoints = []

    if (chartRange === 'daily') {
      // Last 7 days
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        days.push({
          dateKey: d.toDateString(),
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })
      }

      // Calculate initial baseline from transactions BEFORE the start of the 7 days
      const startOfWindow = new Date()
      startOfWindow.setDate(startOfWindow.getDate() - 6)
      startOfWindow.setHours(0, 0, 0, 0)

      let cumulativeInflows = 0
      let cumulativeOutflows = 0

      sorted.forEach(entry => {
        if (new Date(entry.createdAt) < startOfWindow) {
          if (entry.type === 'earning' || entry.type === 'savings') {
            cumulativeInflows += entry.amount
          } else if (entry.type === 'expense') {
            cumulativeOutflows += entry.amount
          }
        }
      })

      // Now iterate through the 7 days window
      days.forEach(day => {
        const dayEntries = sorted.filter(e => new Date(e.createdAt).toDateString() === day.dateKey)
        dayEntries.forEach(entry => {
          if (entry.type === 'earning' || entry.type === 'savings') {
            cumulativeInflows += entry.amount
          } else if (entry.type === 'expense') {
            cumulativeOutflows += entry.amount
          }
        })

        dataPoints.push({
          label: day.label,
          NetWorth: cumulativeInflows - cumulativeOutflows,
          CumulativeInflows: cumulativeInflows,
          CumulativeOutflows: cumulativeOutflows
        })
      })

      // Prepend a baseline starting point if there is only one data point, to form a sloping line chart
      if (wealthEntries.length === 1 && dataPoints.length > 0) {
        const firstEntryDate = sorted.length > 0 ? new Date(sorted[0].createdAt) : new Date()
        const prevDate = new Date(firstEntryDate)
        prevDate.setDate(prevDate.getDate() - 1)
        const prevDateLabel = prevDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
        
        dataPoints.unshift({
          label: prevDateLabel,
          NetWorth: 0,
          CumulativeInflows: 0,
          CumulativeOutflows: 0
        })
      }
    } 
    else if (chartRange === 'weekly') {
      // Last 4 weeks
      const weeks = []
      const now = new Date()
      for (let i = 3; i >= 0; i--) {
        const start = new Date(now)
        start.setDate(now.getDate() - (i + 1) * 7)
        const end = new Date(now)
        end.setDate(now.getDate() - i * 7)
        weeks.push({
          start,
          end,
          label: i === 0 ? 'This Wk' : `Wk -${i}`
        })
      }

      const startOfWindow = weeks[0].start
      let cumulativeInflows = 0
      let cumulativeOutflows = 0

      sorted.forEach(entry => {
        if (new Date(entry.createdAt) < startOfWindow) {
          if (entry.type === 'earning' || entry.type === 'savings') {
            cumulativeInflows += entry.amount
          } else if (entry.type === 'expense') {
            cumulativeOutflows += entry.amount
          }
        }
      })

      weeks.forEach(wk => {
        const wkEntries = sorted.filter(e => {
          const d = new Date(e.createdAt)
          return d >= wk.start && d < wk.end
        })
        wkEntries.forEach(entry => {
          if (entry.type === 'earning' || entry.type === 'savings') {
            cumulativeInflows += entry.amount
          } else if (entry.type === 'expense') {
            cumulativeOutflows += entry.amount
          }
        })

        dataPoints.push({
          label: wk.label,
          NetWorth: cumulativeInflows - cumulativeOutflows,
          CumulativeInflows: cumulativeInflows,
          CumulativeOutflows: cumulativeOutflows
        })
      })
    } 
    else if (chartRange === 'monthly') {
      // Last 6 months
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        months.push({
          month: d.getMonth(),
          year: d.getFullYear(),
          label: d.toLocaleDateString('en-US', { month: 'short' })
        })
      }

      const startOfWindow = new Date()
      startOfWindow.setMonth(startOfWindow.getMonth() - 5)
      startOfWindow.setDate(1)
      startOfWindow.setHours(0, 0, 0, 0)

      let cumulativeInflows = 0
      let cumulativeOutflows = 0

      sorted.forEach(entry => {
        if (new Date(entry.createdAt) < startOfWindow) {
          if (entry.type === 'earning' || entry.type === 'savings') {
            cumulativeInflows += entry.amount
          } else if (entry.type === 'expense') {
            cumulativeOutflows += entry.amount
          }
        }
      })

      months.forEach(m => {
        const mEntries = sorted.filter(e => {
          const d = new Date(e.createdAt)
          return d.getMonth() === m.month && d.getFullYear() === m.year
        })
        mEntries.forEach(entry => {
          if (entry.type === 'earning' || entry.type === 'savings') {
            cumulativeInflows += entry.amount
          } else if (entry.type === 'expense') {
            cumulativeOutflows += entry.amount
          }
        })

        dataPoints.push({
          label: m.label,
          NetWorth: cumulativeInflows - cumulativeOutflows,
          CumulativeInflows: cumulativeInflows,
          CumulativeOutflows: cumulativeOutflows
        })
      })
    } 
    else if (chartRange === 'yearly') {
      // Last 5 years
      const years = []
      const currentYear = new Date().getFullYear()
      for (let i = 4; i >= 0; i--) {
        years.push(currentYear - i)
      }

      const startYear = years[0]
      let cumulativeInflows = 0
      let cumulativeOutflows = 0

      sorted.forEach(entry => {
        if (new Date(entry.createdAt).getFullYear() < startYear) {
          if (entry.type === 'earning' || entry.type === 'savings') {
            cumulativeInflows += entry.amount
          } else if (entry.type === 'expense') {
            cumulativeOutflows += entry.amount
          }
        }
      })

      years.forEach(yr => {
        const yrEntries = sorted.filter(e => new Date(e.createdAt).getFullYear() === yr)
        yrEntries.forEach(entry => {
          if (entry.type === 'earning' || entry.type === 'savings') {
            cumulativeInflows += entry.amount
          } else if (entry.type === 'expense') {
            cumulativeOutflows += entry.amount
          }
        })

        dataPoints.push({
          label: yr.toString(),
          NetWorth: cumulativeInflows - cumulativeOutflows,
          CumulativeInflows: cumulativeInflows,
          CumulativeOutflows: cumulativeOutflows
        })
      })
    }

    if (dataPoints.length === 0) {
      return [
        { label: 'Start', NetWorth: 0, CumulativeInflows: 0, CumulativeOutflows: 0 },
        { label: 'Now', NetWorth: 0, CumulativeInflows: 0, CumulativeOutflows: 0 }
      ]
    }

    return dataPoints
  }, [wealthEntries, chartRange])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount greater than zero.')
      return
    }
    if (!category.trim()) {
      setError('Please select or write a category.')
      return
    }

    setError(null)
    try {
      await addWealthEntry({
        type,
        amount: parseFloat(amount),
        category: category.trim(),
        description: description.trim()
      })
      setAmount('')
      setCategory('')
      setDescription('')
      setFormSuccess('Transaction recorded in Wealth Vault!')
      setTimeout(() => setFormSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Failed to record entry')
    }
  }

  const handleDelete = async (id) => {
    try {
      await removeWealthEntry(id)
    } catch (err) {
      setError('Failed to delete transaction')
    }
  }

  // Pre-populated suggestions
  const quickCategories = ['SaaS Subscription', 'Freelance Contract', 'Domain Name', 'Coffee / Coding Fuel', 'Server Hosting', 'Gumroad Sale']

  // Format Y Axis ticks cleanly as currency ($20k, $0, -$10k)
  const formatYAxis = (val) => {
    if (val === 0) return '$0'
    if (Math.abs(val) >= 1000) {
      return `${val < 0 ? '-' : ''}$${(Math.abs(val) / 1000).toFixed(0)}k`
    }
    return `${val < 0 ? '-' : ''}$${Math.abs(val)}`
  }

  // Custom tooltips
  const CustomFinanceTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-800 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</p>
          {payload.map((item, idx) => (
            <p key={idx} className="text-xs font-black flex items-center gap-1.5" style={{ color: item.stroke }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: item.stroke }}></span>
              {item.name}: ${item.value.toFixed(2)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 text-slate-200 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-xl flex items-center justify-between min-h-[150px]">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-emerald-500/10 via-teal-600/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="space-y-3 z-10 max-w-lg">
          <h2 className="text-2xl font-bold text-white tracking-tight">Lumina Wealth Vault 💵</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Monitor earnings velocity, track target micro-expenses, and accelerate your hourly developer value index.
          </p>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-[10px] font-bold text-emerald-400">
            <span>🚀</span> Personal Wealth & Savings Ledger
          </div>
        </div>
        
        <div className="hidden md:flex items-center justify-center w-24 h-24 rounded-2xl bg-slate-950/60 border border-slate-800 text-4xl shadow-inner z-10 mr-4">
          💰
        </div>
      </div>

      {/* Top Ledger Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Net Wealth */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-md flex flex-col justify-between h-[130px] relative overflow-hidden group hover:border-emerald-500/20 transition duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Net Wealth Index</h3>
            <span className="text-xs">🏦</span>
          </div>
          <div className="mt-2">
            <p className={`text-2xl font-black leading-none tracking-tight ${metrics.netWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${metrics.netWorth.toFixed(2)}
            </p>
            <p className="text-[9px] text-slate-500 mt-2 font-bold">Total assets minus expenses</p>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-md flex flex-col justify-between h-[130px] relative overflow-hidden group hover:border-indigo-500/20 transition duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Savings Rate</h3>
            <span className="text-xs">📈</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-indigo-400 leading-none tracking-tight">
              {metrics.savingsRate}%
            </p>
            <p className="text-[9px] text-slate-500 mt-2 font-bold">Income saved percentage</p>
          </div>
        </div>

        {/* Focus Timer Hours */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-md flex flex-col justify-between h-[130px] relative overflow-hidden group hover:border-purple-500/20 transition duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Deep Focus Timer</h3>
            <span className="text-xs">⏱️</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-purple-400 leading-none tracking-tight">
              {metrics.focusHours}h
            </p>
            <p className="text-[9px] text-slate-500 mt-2 font-bold">Total Pomodoro work logged</p>
          </div>
        </div>

        {/* Earning Accelerator */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-md flex flex-col justify-between h-[130px] relative overflow-hidden group hover:border-amber-500/20 transition duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Earning Accelerator</h3>
            <span className="text-xs">⚡</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-amber-400 leading-none tracking-tight">
              ${metrics.hourlyRate}/hr
            </p>
            <p className="text-[9px] text-slate-500 mt-2 font-bold">Hourly valuation of focus time</p>
          </div>
        </div>
      </div>

      {/* Main Graphs & Manual Input Blocks */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cumulative Ledger Area Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg flex flex-col justify-between min-h-[380px]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Ledger Velocity Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Cumulative cash inflow and net wealth index.</p>
            </div>

            <div className="flex rounded-xl border border-slate-850 bg-slate-950 p-1 self-start select-none">
              {[
                { range: 'daily', label: 'Daily' },
                { range: 'weekly', label: 'Weekly' },
                { range: 'monthly', label: 'Monthly' },
                { range: 'yearly', label: 'Yearly' }
              ].map((btn) => (
                <button
                  key={btn.range}
                  type="button"
                  onClick={() => setChartRange(btn.range)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold transition duration-150 leading-none h-6 ${
                    chartRange === btn.range
                      ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 shadow-md'
                      : 'text-slate-500 border border-transparent hover:text-slate-350'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="w-full h-[280px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="inflowsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0.0} />
                    </linearGradient>
                    <filter id="neonFinanceGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.02)" vertical={false} />
                  <XAxis dataKey="label" stroke="#475569" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} dy={8} />
                  <YAxis stroke="#475569" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} dx={-8} tickFormatter={formatYAxis} />
                  
                  <Tooltip content={<CustomFinanceTooltip />} cursor={{ stroke: 'rgba(255, 255, 255, 0.04)', strokeWidth: 1 }} />
                  
                  <Area 
                    type="monotone" 
                    name="Net Wealth" 
                    dataKey="NetWorth" 
                    stroke="#34d399" 
                    fill="url(#netWorthGradient)" 
                    strokeWidth={3} 
                    filter="url(#neonFinanceGlow)"
                    activeDot={{ r: 5, stroke: '#090d16', strokeWidth: 2, fill: '#34d399' }} 
                  />
                  <Area 
                    type="monotone" 
                    name="Total Inflows" 
                    dataKey="CumulativeInflows" 
                    stroke="#818cf8" 
                    fill="url(#inflowsGradient)" 
                    strokeWidth={2.5} 
                    activeDot={{ r: 4, stroke: '#090d16', strokeWidth: 2, fill: '#818cf8' }} 
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8' }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Log wealth manual form */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Record Transaction</h3>
            <p className="text-xs text-slate-500 mt-0.5">Quick ledger logs bypass markdown notes.</p>
          </div>

          {formSuccess && (
            <div className="my-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              {formSuccess}
            </div>
          )}
          {error && (
            <div className="my-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-3 flex-1 flex flex-col justify-end">
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-850">
              {[
                { typeKey: 'earning', label: 'Earning', activeColor: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-300' },
                { typeKey: 'savings', label: 'Saving', activeColor: 'bg-indigo-500/15 border-indigo-500/20 text-indigo-300' },
                { typeKey: 'expense', label: 'Expense', activeColor: 'bg-rose-500/15 border-rose-500/20 text-rose-300' }
              ].map((btn) => (
                <button
                  key={btn.typeKey}
                  type="button"
                  onClick={() => setType(btn.typeKey)}
                  className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                    type === btn.typeKey ? btn.activeColor : 'text-slate-500 border-transparent hover:text-slate-350'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 h-10"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
              <input
                type="text"
                required
                list="quick-category-suggestions"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Select or type..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 h-10"
              />
              <datalist id="quick-category-suggestions">
                {quickCategories.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. gumroad template sale"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 h-10"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/15 hover:from-emerald-600 hover:to-teal-700 transition"
            >
              Record to Vault
            </button>
          </form>
        </div>
      </div>

      {/* Interactive Ledger log details */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Ledger Logs</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manual logs & parsed transactions from the Knowledge Vault notes.</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-950 border border-slate-850 rounded-xl text-slate-400">
            {wealthEntries.length} Items Logged
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 italic py-6 text-center">Syncing Ledger entries...</p>
        ) : wealthEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl mb-3 text-slate-500">
              💵
            </div>
            <p className="text-xs text-slate-400 font-semibold">Wealth ledger ledger is empty.</p>
            <p className="text-[10px] text-slate-500 mt-1">Add a manual log above or type inline note transactions in the Knowledge Vault.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 hidden md:table-cell">Source Note / Info</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-xs font-medium">
                {wealthEntries.map((entry) => {
                  let badge = 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  let typeLabel = 'Expense'
                  let prefix = '-'
                  
                  if (entry.type === 'earning') {
                    badge = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    typeLabel = 'Earning'
                    prefix = '+'
                  } else if (entry.type === 'savings') {
                    badge = 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                    typeLabel = 'Saving'
                    prefix = '+'
                  }

                  return (
                    <tr key={entry._id} className="hover:bg-slate-950/20 transition duration-150">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-450 font-bold">
                        {new Date(entry.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full border text-[9px] uppercase tracking-wider font-extrabold ${badge}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className={`py-3 px-4 font-black ${entry.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {prefix}${entry.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-bold">
                        {entry.category}
                      </td>
                      <td className="py-3 px-4 text-slate-400 italic hidden md:table-cell">
                        {entry.description || (entry.sourceNoteId ? `Parsed from Vault note` : 'Manual log')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(entry._id)}
                          className="rounded-lg border border-slate-800 hover:border-rose-500/30 hover:bg-rose-500/5 px-2.5 py-1 text-[10px] font-bold text-slate-450 hover:text-rose-400 transition"
                        >
                          ✕ Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
