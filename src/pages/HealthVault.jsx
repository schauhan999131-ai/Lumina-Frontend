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

export default function HealthVault() {
  const healthEntries = useAppStore((state) => state.healthEntries)
  const getHealthEntries = useAppStore((state) => state.getHealthEntries)
  const addHealthEntry = useAppStore((state) => state.addHealthEntry)
  const removeHealthEntry = useAppStore((state) => state.removeHealthEntry)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Daily target config state (persisted in localStorage)
  const [targetCalories, setTargetCalories] = useState(() => {
    const saved = localStorage.getItem('lumina_target_calories')
    return saved ? parseInt(saved, 10) : 2200
  })
  const [targetProtein, setTargetProtein] = useState(() => {
    const saved = localStorage.getItem('lumina_target_protein')
    return saved ? parseInt(saved, 10) : 140
  })
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  // Form State
  const [food, setFood] = useState('')
  const [protein, setProtein] = useState('')
  const [calories, setCalories] = useState('')
  const [formSuccess, setFormSuccess] = useState(null)

  // Chart range view: 'daily', 'weekly', 'monthly', 'yearly'
  const [chartRange, setChartRange] = useState('daily')

  useEffect(() => {
    const loadHealth = async () => {
      try {
        await getHealthEntries()
      } catch (err) {
        setError('Failed to load health tracker logs')
      } finally {
        setLoading(false)
      }
    }
    loadHealth()
  }, [getHealthEntries])

  // Save targets
  const handleSaveTargets = (e) => {
    e.preventDefault()
    localStorage.setItem('lumina_target_calories', targetCalories.toString())
    localStorage.setItem('lumina_target_protein', targetProtein.toString())
    setIsConfigOpen(false)
    setFormSuccess('Daily targets updated successfully!')
    setTimeout(() => setFormSuccess(null), 3000)
  }

  // Today's Date String
  const todayKey = useMemo(() => new Date().toDateString(), [])

  // Aggregate Metrics for Today
  const todayMetrics = useMemo(() => {
    let caloriesIntake = 0
    let proteinIntake = 0

    healthEntries.forEach((entry) => {
      if (new Date(entry.createdAt).toDateString() === todayKey) {
        caloriesIntake += entry.calories
        proteinIntake += entry.protein
      }
    })

    const caloriesProgress = targetCalories > 0 ? Math.round((caloriesIntake / targetCalories) * 100) : 0
    const proteinProgress = targetProtein > 0 ? Math.round((proteinIntake / targetProtein) * 100) : 0

    return {
      caloriesIntake,
      proteinIntake,
      caloriesProgress,
      proteinProgress,
      remainingCalories: Math.max(0, targetCalories - caloriesIntake),
      remainingProtein: Math.max(0, targetProtein - proteinIntake)
    }
  }, [healthEntries, todayKey, targetCalories, targetProtein])

  // Chart Data: dynamically aggregates values
  const chartData = useMemo(() => {
    const sorted = [...healthEntries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
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

      days.forEach(day => {
        let dailyProtein = 0
        let dailyCalories = 0

        const dayEntries = sorted.filter(e => new Date(e.createdAt).toDateString() === day.dateKey)
        dayEntries.forEach(entry => {
          dailyProtein += entry.protein
          dailyCalories += entry.calories
        })

        dataPoints.push({
          label: day.label,
          Calories: dailyCalories,
          Protein: dailyProtein
        })
      })

      // Prepend baseline starting date if only one data point exists
      if (healthEntries.length === 1 && dataPoints.length > 0) {
        const firstEntryDate = sorted.length > 0 ? new Date(sorted[0].createdAt) : new Date()
        const prevDate = new Date(firstEntryDate)
        prevDate.setDate(prevDate.getDate() - 1)
        const prevDateLabel = prevDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
        dataPoints.unshift({
          label: prevDateLabel,
          Calories: 0,
          Protein: 0
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

      weeks.forEach(wk => {
        let wkProtein = 0
        let wkCalories = 0

        const wkEntries = sorted.filter(e => {
          const d = new Date(e.createdAt)
          return d >= wk.start && d < wk.end
        })
        
        wkEntries.forEach(entry => {
          wkProtein += entry.protein
          wkCalories += entry.calories
        })

        // Average per day in that week
        dataPoints.push({
          label: wk.label,
          Calories: Math.round(wkCalories / 7),
          Protein: Math.round(wkProtein / 7)
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

      months.forEach(m => {
        let mProtein = 0
        let mCalories = 0

        const mEntries = sorted.filter(e => {
          const d = new Date(e.createdAt)
          return d.getMonth() === m.month && d.getFullYear() === m.year
        })
        
        mEntries.forEach(entry => {
          mProtein += entry.protein
          mCalories += entry.calories
        })

        // Average daily intake during that month
        dataPoints.push({
          label: m.label,
          Calories: Math.round(mCalories / 30),
          Protein: Math.round(mProtein / 30)
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

      years.forEach(yr => {
        let yrProtein = 0
        let yrCalories = 0

        const yrEntries = sorted.filter(e => new Date(e.createdAt).getFullYear() === yr)
        yrEntries.forEach(entry => {
          yrProtein += entry.protein
          yrCalories += entry.calories
        })

        // Average daily intake during that year
        dataPoints.push({
          label: yr.toString(),
          Calories: Math.round(yrCalories / 365),
          Protein: Math.round(yrProtein / 365)
        })
      })
    }

    if (dataPoints.length === 0) {
      return [
        { label: 'Start', Calories: 0, Protein: 0 },
        { label: 'Now', Calories: 0, Protein: 0 }
      ]
    }

    return dataPoints
  }, [healthEntries, chartRange])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!food.trim()) {
      setError('Please enter food name.')
      return
    }
    if (!protein || isNaN(parseFloat(protein)) || parseFloat(protein) < 0) {
      setError('Please enter a valid protein amount.')
      return
    }
    if (!calories || isNaN(parseFloat(calories)) || parseFloat(calories) < 0) {
      setError('Please enter valid calories.')
      return
    }

    setError(null)
    try {
      await addHealthEntry({
        food: food.trim(),
        protein: parseFloat(protein),
        calories: parseFloat(calories)
      })
      setFood('')
      setProtein('')
      setCalories('')
      setFormSuccess('Food logged successfully!')
      setTimeout(() => setFormSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Failed to log food')
    }
  }

  const handleDelete = async (id) => {
    try {
      await removeHealthEntry(id)
    } catch (err) {
      setError('Failed to delete log')
    }
  }

  // Ticks formatting
  const formatCaloriesYAxis = (val) => (val === 0 ? '0' : `${val} kcal`)
  const formatProteinYAxis = (val) => (val === 0 ? '0' : `${val}g`)

  // Custom hover tooltips
  const CustomHealthTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-800 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</p>
          {payload.map((item, idx) => {
            const unit = item.name === 'Calories' ? ' kcal' : 'g'
            return (
              <p key={idx} className="text-xs font-black flex items-center gap-1.5" style={{ color: item.stroke }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: item.stroke }}></span>
                {item.name}: {item.value}{unit}
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 text-slate-200 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-xl flex items-center justify-between min-h-[150px]">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-purple-500/10 via-pink-600/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="space-y-3 z-10 max-w-lg">
          <h2 className="text-2xl font-bold text-white tracking-tight">Lumina Health Vault 🥗</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Track protein intake, manage calorie goals, and optimize your fitness fuel layout.
          </p>
          
          <div className="flex gap-2 items-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-[10px] font-bold text-purple-400">
              <span>🥑</span> Fitness & Nutrition Tracker
            </div>
            <button
              type="button"
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-slate-950 border border-slate-800 hover:text-white transition"
            >
              ⚙️ Config Goals
            </button>
          </div>
        </div>
        
        <div className="hidden md:flex items-center justify-center w-24 h-24 rounded-2xl bg-slate-950/60 border border-slate-800 text-4xl shadow-inner z-10 mr-4">
          🥗
        </div>
      </div>

      {/* Target Config Dropdown */}
      {isConfigOpen && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg animate-fade-in text-left">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-3.5">Configure Target Goals</h3>
          <form onSubmit={handleSaveTargets} className="grid gap-4 sm:grid-cols-3 items-end">
            <label className="block text-xs font-semibold text-slate-350">
              Daily Calories Target (kcal)
              <input
                type="number"
                required
                value={targetCalories}
                onChange={(e) => setTargetCalories(parseInt(e.target.value, 10))}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs focus:outline-none focus:border-purple-500 h-9"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-350">
              Daily Protein Target (grams)
              <input
                type="number"
                required
                value={targetProtein}
                onChange={(e) => setTargetProtein(parseInt(e.target.value, 10))}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs focus:outline-none focus:border-purple-500 h-9"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold shadow"
              >
                Save
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Health Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Calories Intake */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-md flex flex-col justify-between h-[130px] relative overflow-hidden group hover:border-purple-500/20 transition duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Calories Intake</h3>
            <span className="text-[10px] text-purple-400 font-bold">{todayMetrics.caloriesProgress}% Target</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-purple-400 leading-none tracking-tight">
              {todayMetrics.caloriesIntake} <span className="text-xs font-bold text-slate-500">kcal</span>
            </p>
            <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-900 mt-2">
              <div className="bg-purple-500 h-full transition-all" style={{ width: `${Math.min(100, todayMetrics.caloriesProgress)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Protein Intake */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-md flex flex-col justify-between h-[130px] relative overflow-hidden group hover:border-pink-500/20 transition duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Protein Intake</h3>
            <span className="text-[10px] text-pink-400 font-bold">{todayMetrics.proteinProgress}% Target</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-pink-400 leading-none tracking-tight">
              {todayMetrics.proteinIntake} <span className="text-xs font-bold text-slate-500">g</span>
            </p>
            <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-900 mt-2">
              <div className="bg-pink-500 h-full transition-all" style={{ width: `${Math.min(100, todayMetrics.proteinProgress)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Remaining Calories */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-md flex flex-col justify-between h-[130px] relative overflow-hidden group hover:border-sky-500/20 transition duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Remaining Calories</h3>
            <span className="text-xs">🔥</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-sky-400 leading-none tracking-tight">
              {todayMetrics.remainingCalories} <span className="text-xs font-bold text-slate-500">kcal</span>
            </p>
            <p className="text-[9px] text-slate-500 mt-2 font-bold">Limit target: {targetCalories} kcal</p>
          </div>
        </div>

        {/* Remaining Protein */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-md flex flex-col justify-between h-[130px] relative overflow-hidden group hover:border-amber-500/20 transition duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Remaining Protein</h3>
            <span className="text-xs">💪</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-amber-400 leading-none tracking-tight">
              {todayMetrics.remainingProtein} <span className="text-xs font-bold text-slate-500">g</span>
            </p>
            <p className="text-[9px] text-slate-500 mt-2 font-bold">Daily target: {targetProtein}g</p>
          </div>
        </div>
      </div>

      {/* Graph and form panels */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recharts Health Graph */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg flex flex-col justify-between min-h-[380px]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Nutrition Velocity</h3>
              <p className="text-xs text-slate-500 mt-0.5">Dual-axis calories and protein intake trend.</p>
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
                      ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300 shadow-md'
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
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="caloriesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="proteinGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity={0.0} />
                    </linearGradient>
                    <filter id="neonHealthGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.02)" vertical={false} />
                  <XAxis dataKey="label" stroke="#475569" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} dy={8} />
                  <YAxis yAxisId="left" stroke="#a855f7" fontSize={9} fontWeight={600} tickLine={false} axisLine={false} tickFormatter={formatCaloriesYAxis} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ec4899" fontSize={9} fontWeight={600} tickLine={false} axisLine={false} tickFormatter={formatProteinYAxis} />
                  
                  <Tooltip content={<CustomHealthTooltip />} cursor={{ stroke: 'rgba(255, 255, 255, 0.04)', strokeWidth: 1 }} />
                  
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    name="Calories" 
                    dataKey="Calories" 
                    stroke="#a855f7" 
                    fill="url(#caloriesGradient)" 
                    strokeWidth={3} 
                    filter="url(#neonHealthGlow)"
                    activeDot={{ r: 5, stroke: '#090d16', strokeWidth: 2, fill: '#a855f7' }} 
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    name="Protein" 
                    dataKey="Protein" 
                    stroke="#ec4899" 
                    fill="url(#proteinGradient)" 
                    strokeWidth={2.5} 
                    activeDot={{ r: 4, stroke: '#090d16', strokeWidth: 2, fill: '#ec4899' }} 
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

        {/* Record Food Manual Input Form */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Log Fuel Intake</h3>
            <p className="text-xs text-slate-500 mt-0.5">Quick nutrition entries bypass note logs.</p>
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
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Food / Log Name</label>
              <input
                type="text"
                required
                value={food}
                onChange={(e) => setFood(e.target.value)}
                placeholder="e.g. Eggs, Oats, Chicken Breast"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 h-10"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Protein (grams)</label>
              <input
                type="number"
                required
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="e.g. 30"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 h-10"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Calories (kcal)</label>
              <input
                type="number"
                required
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="e.g. 400"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 h-10"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-purple-500/15 hover:from-purple-600 hover:to-indigo-700 transition"
            >
              Log Food Fuel
            </button>
          </form>
        </div>
      </div>

      {/* Interactive logs details */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Nutrition Logs</h3>
            <p className="text-xs text-slate-500 mt-0.5">Food entries parsed from markdown notes & logged manually.</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-950 border border-slate-850 rounded-xl text-slate-400">
            {healthEntries.length} Food Logged
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 italic py-6 text-center">Loading Food logs...</p>
        ) : healthEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl mb-3 text-slate-500">
              🥑
            </div>
            <p className="text-xs text-slate-400 font-semibold">No food logs recorded today.</p>
            <p className="text-[10px] text-slate-500 mt-1">Add manual entries above or parse transactions from the Knowledge Vault notes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Food</th>
                  <th className="py-3 px-4">Protein (g)</th>
                  <th className="py-3 px-4">Calories (kcal)</th>
                  <th className="py-3 px-4 hidden md:table-cell">Source / Info</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-xs font-medium">
                {healthEntries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-slate-950/20 transition duration-150">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-450 font-bold">
                      {new Date(entry.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-bold">
                      {entry.food}
                    </td>
                    <td className="py-3 px-4 font-black text-pink-400">
                      {entry.protein}g
                    </td>
                    <td className="py-3 px-4 font-black text-purple-400">
                      {entry.calories} kcal
                    </td>
                    <td className="py-3 px-4 text-slate-400 italic hidden md:table-cell">
                      {entry.sourceNoteId ? `Parsed from Vault note` : 'Manual log'}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
