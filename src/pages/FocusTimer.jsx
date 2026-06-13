import { useEffect, useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { getTimerState, updateTimerState } from '../api'

const FocusChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</p>
        {payload.map((item, idx) => (
          <p key={idx} className="text-xs font-black flex items-center gap-1.5" style={{ color: item.stroke }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: item.stroke }}></span>
            {item.name}: {item.value} mins
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function FocusTimer() {
  // Configurable durations in minutes (persisted in localStorage)
  const [workDuration, setWorkDuration] = useState(() => {
    const saved = localStorage.getItem('study_work_duration')
    return saved ? parseInt(saved, 10) : 25
  })
  const [shortDuration, setShortDuration] = useState(() => {
    const saved = localStorage.getItem('study_short_duration')
    return saved ? parseInt(saved, 10) : 5
  })
  const [longDuration, setLongDuration] = useState(() => {
    const saved = localStorage.getItem('study_long_duration')
    return saved ? parseInt(saved, 10) : 15
  })

  const [mode, setMode] = useState(() => {
    return localStorage.getItem('study_timer_mode') || 'work'
  })

  const [isActive, setIsActive] = useState(() => {
    return localStorage.getItem('study_timer_active') === 'true'
  })

  const [timeLeft, setTimeLeft] = useState(() => {
    const active = localStorage.getItem('study_timer_active') === 'true'
    const savedMode = localStorage.getItem('study_timer_mode') || 'work'
    
    // Get total duration for current mode
    let durationMins = 25
    if (savedMode === 'work') {
      const saved = localStorage.getItem('study_work_duration')
      durationMins = saved ? parseInt(saved, 10) : 25
    } else if (savedMode === 'short') {
      const saved = localStorage.getItem('study_short_duration')
      durationMins = saved ? parseInt(saved, 10) : 5
    } else {
      const saved = localStorage.getItem('study_long_duration')
      durationMins = saved ? parseInt(saved, 10) : 15
    }
    
    if (active) {
      const endTime = localStorage.getItem('study_timer_endtime')
      if (endTime) {
        const remaining = Math.ceil((parseInt(endTime, 10) - Date.now()) / 1000)
        return Math.max(0, remaining)
      }
    }
    
    const savedTimeLeft = localStorage.getItem('study_timer_time_left')
    if (savedTimeLeft) {
      return parseInt(savedTimeLeft, 10)
    }
    
    return durationMins * 60
  })
  
  const [sessionsCompleted, setSessionsCompleted] = useState(() => {
    const saved = localStorage.getItem('study_sessions_completed')
    return saved ? parseInt(saved, 10) : 0
  })
  const [focusMinutes, setFocusMinutes] = useState(() => {
    const saved = localStorage.getItem('study_focus_minutes')
    return saved ? parseInt(saved, 10) : 0
  })

  // History log of completed Pomodoros and Breaks
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('study_focus_history')
    return saved ? JSON.parse(saved) : []
  })

  const [chartRange, setChartRange] = useState('daily') // 'daily' | 'weekly' | 'monthly' | 'yearly'
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [toast, setToast] = useState(null)

  // Auto-dismiss toast notification after 5 seconds
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      setToast(null)
    }, 5000)
    return () => clearTimeout(timer)
  }, [toast])

  const triggerNotification = (msg) => {
    setToast(msg)
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav')
      audio.volume = 0.15
      audio.play().catch(() => {})
    } catch (e) {}
  }

  const chartData = useMemo(() => {
    const workSessions = history.filter(item => item.type === 'work')
    const breakSessions = history.filter(item => item.type === 'short' || item.type === 'long')

    if (chartRange === 'daily') {
      const dailyData = []
      const targetDateStr = selectedDate.toDateString()
      for (let hour = 0; hour < 24; hour++) {
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour % 12 === 0 ? 12 : hour % 12
        const label = `${displayHour} ${ampm}`
        
        const focusMins = workSessions
          .filter(item => {
            if (!item.timestamp) return false
            const d = new Date(item.timestamp)
            return d.toDateString() === targetDateStr && d.getHours() === hour
          })
          .reduce((sum, item) => sum + (item.duration || 0), 0)

        const breakMins = breakSessions
          .filter(item => {
            if (!item.timestamp) return false
            const d = new Date(item.timestamp)
            return d.toDateString() === targetDateStr && d.getHours() === hour
          })
          .reduce((sum, item) => sum + (item.duration || 0), 0)
          
        dailyData.push({ label, focus: focusMins, break: breakMins })
      }
      return dailyData
    }

    if (chartRange === 'weekly') {
      const weeklyData = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
        const dateString = d.toDateString()
        
        const focusMins = workSessions
          .filter(item => item.timestamp && new Date(item.timestamp).toDateString() === dateString)
          .reduce((sum, item) => sum + (item.duration || 0), 0)

        const breakMins = breakSessions
          .filter(item => item.timestamp && new Date(item.timestamp).toDateString() === dateString)
          .reduce((sum, item) => sum + (item.duration || 0), 0)
          
        weeklyData.push({ label: dayName, focus: focusMins, break: breakMins, dateString })
      }
      return weeklyData
    }

    if (chartRange === 'monthly') {
      const monthlyData = []
      const now = new Date()
      for (let i = 3; i >= 0; i--) {
        const start = new Date(now)
        start.setDate(now.getDate() - ((i + 1) * 7 - 1))
        start.setHours(0, 0, 0, 0)
        
        const end = new Date(now)
        end.setDate(now.getDate() - i * 7)
        end.setHours(23, 59, 59, 999)
        
        const label = i === 0 ? 'This Wk' : `Wk -${i}`
        
        const focusMins = workSessions
          .filter(item => {
            if (!item.timestamp) return false
            const itemDate = new Date(item.timestamp)
            return itemDate >= start && itemDate <= end
          })
          .reduce((sum, item) => sum + (item.duration || 0), 0)

        const breakMins = breakSessions
          .filter(item => {
            if (!item.timestamp) return false
            const itemDate = new Date(item.timestamp)
            return itemDate >= start && itemDate <= end
          })
          .reduce((sum, item) => sum + (item.duration || 0), 0)
          
        monthlyData.push({ label, focus: focusMins, break: breakMins })
      }
      return monthlyData
    }

    if (chartRange === 'yearly') {
      const yearlyData = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date()
        d.setDate(1) // Avoid day-of-month rollover bug
        d.setMonth(d.getMonth() - i)
        const monthName = d.toLocaleDateString('en-US', { month: 'short' })
        const month = d.getMonth()
        const year = d.getFullYear()
        
        const focusMins = workSessions
          .filter(item => {
            if (!item.timestamp) return false
            const itemDate = new Date(item.timestamp)
            return itemDate.getMonth() === month && itemDate.getFullYear() === year
          })
          .reduce((sum, item) => sum + (item.duration || 0), 0)

        const breakMins = breakSessions
          .filter(item => {
            if (!item.timestamp) return false
            const itemDate = new Date(item.timestamp)
            return itemDate.getMonth() === month && itemDate.getFullYear() === year
          })
          .reduce((sum, item) => sum + (item.duration || 0), 0)
          
        yearlyData.push({ label: monthName, focus: focusMins, break: breakMins })
      }
      return yearlyData
    }

    return []
  }, [history, chartRange, selectedDate])

  const todayHistory = useMemo(() => {
    const todayStr = new Date().toDateString()
    return history.filter(item => item.timestamp && new Date(item.timestamp).toDateString() === todayStr)
  }, [history])

  // Save states to LocalStorage
  useEffect(() => {
    localStorage.setItem('study_sessions_completed', sessionsCompleted.toString())
  }, [sessionsCompleted])

  useEffect(() => {
    localStorage.setItem('study_focus_minutes', focusMinutes.toString())
  }, [focusMinutes])

  useEffect(() => {
    localStorage.setItem('study_focus_history', JSON.stringify(history))
  }, [history])

  // Sync state to backend helper
  const syncTimerToBackend = async (updates) => {
    try {
      await updateTimerState(updates)
    } catch (err) {
      console.warn('Failed to sync timer state to backend:', err.message)
    }
  }

  // Fetch backend state on mount
  useEffect(() => {
    const fetchBackendTimerState = async () => {
      try {
        const state = await getTimerState()
        if (state) {
          if (state.studyWorkDuration !== undefined) {
            setWorkDuration(state.studyWorkDuration)
            localStorage.setItem('study_work_duration', state.studyWorkDuration.toString())
          }
          if (state.studyShortDuration !== undefined) {
            setShortDuration(state.studyShortDuration)
            localStorage.setItem('study_short_duration', state.studyShortDuration.toString())
          }
          if (state.studyLongDuration !== undefined) {
            setLongDuration(state.studyLongDuration)
            localStorage.setItem('study_long_duration', state.studyLongDuration.toString())
          }
          if (state.studyTimerMode !== undefined) {
            setMode(state.studyTimerMode)
            localStorage.setItem('study_timer_mode', state.studyTimerMode)
          }
          if (state.studyTimerActive !== undefined) {
            setIsActive(state.studyTimerActive)
            localStorage.setItem('study_timer_active', state.studyTimerActive.toString())
          }
          if (state.studyTimerEndTime !== undefined && state.studyTimerEndTime > 0) {
            localStorage.setItem('study_timer_endtime', state.studyTimerEndTime.toString())
            const remaining = Math.max(0, Math.ceil((state.studyTimerEndTime - Date.now()) / 1000))
            setTimeLeft(remaining)
          } else if (state.studyTimerTimeLeft !== undefined) {
            setTimeLeft(state.studyTimerTimeLeft)
            localStorage.setItem('study_timer_time_left', state.studyTimerTimeLeft.toString())
          }
          if (state.studySessionsCompleted !== undefined) {
            setSessionsCompleted(state.studySessionsCompleted)
            localStorage.setItem('study_sessions_completed', state.studySessionsCompleted.toString())
          }
          if (state.studyFocusMinutes !== undefined) {
            setFocusMinutes(state.studyFocusMinutes)
            localStorage.setItem('study_focus_minutes', state.studyFocusMinutes.toString())
          }
          if (state.studyFocusHistory !== undefined) {
            try {
              const parsedHistory = JSON.parse(state.studyFocusHistory)
              setHistory(parsedHistory)
              localStorage.setItem('study_focus_history', state.studyFocusHistory)
            } catch (e) {
              console.error('Error parsing focus history:', e)
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch timer state from backend (running offline/fallback):', err.message)
      }
    }
    fetchBackendTimerState()
  }, [])

  const handleCompletion = (completedMode) => {
    setIsActive(false)
    localStorage.setItem('study_timer_active', 'false')
    localStorage.removeItem('study_timer_endtime')
    localStorage.removeItem('study_timer_time_left')

    let nextMode = 'work'
    let nextTimeLeft = 25 * 60
    let duration = 25
    let newSessions = sessionsCompleted
    let newMins = focusMinutes
    let newHistory = history

    if (completedMode === 'work') {
      duration = parseInt(localStorage.getItem('study_work_duration') || '25', 10)
      newSessions = sessionsCompleted + 1
      newMins = focusMinutes + duration

      const historyEntry = {
        id: Date.now(),
        type: 'work',
        duration: duration,
        timestamp: new Date().toISOString()
      }
      newHistory = [historyEntry, ...history]

      setSessionsCompleted(newSessions)
      setFocusMinutes(newMins)
      setHistory(newHistory)

      triggerNotification('🎯 Focus session completed! Time for a short break.')
      
      nextMode = 'short'
      setMode('short')
      localStorage.setItem('study_timer_mode', 'short')
      const shortMins = parseInt(localStorage.getItem('study_short_duration') || '5', 10)
      nextTimeLeft = shortMins * 60
      setTimeLeft(nextTimeLeft)
    } else {
      duration = completedMode === 'short' 
        ? parseInt(localStorage.getItem('study_short_duration') || '5', 10)
        : parseInt(localStorage.getItem('study_long_duration') || '15', 10)
      
      const historyEntry = {
        id: Date.now(),
        type: completedMode,
        duration: duration,
        timestamp: new Date().toISOString()
      }
      newHistory = [historyEntry, ...history]
      setHistory(newHistory)

      triggerNotification('☀️ Break is over! Ready to focus?')

      nextMode = 'work'
      setMode('work')
      localStorage.setItem('study_timer_mode', 'work')
      const workMins = parseInt(localStorage.getItem('study_work_duration') || '25', 10)
      nextTimeLeft = workMins * 60
      setTimeLeft(nextTimeLeft)
    }

    syncTimerToBackend({
      studyTimerActive: false,
      studyTimerEndTime: 0,
      studyTimerTimeLeft: nextTimeLeft,
      studyTimerMode: nextMode,
      studySessionsCompleted: newSessions,
      studyFocusMinutes: newMins,
      studyFocusHistory: JSON.stringify(newHistory)
    })
  }

  // Effect to run the timer when active
  useEffect(() => {
    if (!isActive) return

    const endTimeStr = localStorage.getItem('study_timer_endtime')
    if (!endTimeStr) return

    const endTime = parseInt(endTimeStr, 10)

    const runTimer = () => {
      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))

      if (remaining <= 0) {
        handleCompletion(mode)
        return true
      } else {
        setTimeLeft(remaining)
        return false
      }
    }

    const completed = runTimer()
    if (completed) return

    const interval = setInterval(() => {
      runTimer()
    }, 200)

    return () => clearInterval(interval)
  }, [isActive, mode])

  // Handle manual mode changes
  const handleModeChange = (newMode) => {
    setMode(newMode)
    localStorage.setItem('study_timer_mode', newMode)
    setIsActive(false)
    localStorage.setItem('study_timer_active', 'false')
    localStorage.removeItem('study_timer_endtime')
    localStorage.removeItem('study_timer_time_left')
    
    let durationMins = 25
    if (newMode === 'work') durationMins = workDuration
    else if (newMode === 'short') durationMins = shortDuration
    else if (newMode === 'long') durationMins = longDuration
    const newTime = durationMins * 60
    setTimeLeft(newTime)

    syncTimerToBackend({
      studyTimerMode: newMode,
      studyTimerActive: false,
      studyTimerEndTime: 0,
      studyTimerTimeLeft: newTime
    })
  }

  const toggleTimer = () => {
    const newActive = !isActive
    setIsActive(newActive)
    localStorage.setItem('study_timer_active', newActive.toString())

    let endTime = 0
    let timeLeftVal = timeLeft

    if (newActive) {
      endTime = Date.now() + timeLeft * 1000
      localStorage.setItem('study_timer_endtime', endTime.toString())
      localStorage.removeItem('study_timer_time_left')
    } else {
      localStorage.setItem('study_timer_time_left', timeLeft.toString())
      localStorage.removeItem('study_timer_endtime')
    }

    syncTimerToBackend({
      studyTimerActive: newActive,
      studyTimerEndTime: endTime,
      studyTimerTimeLeft: timeLeftVal
    })
  }

  const resetTimer = () => {
    setIsActive(false)
    localStorage.setItem('study_timer_active', 'false')
    localStorage.removeItem('study_timer_endtime')
    localStorage.removeItem('study_timer_time_left')
    handleModeChange(mode)
  }

  // Stepper setters with boundary limits (1-180 minutes)
  const updateWorkDuration = (val) => {
    const newVal = Math.max(1, Math.min(180, val))
    const oldVal = workDuration
    setWorkDuration(newVal)
    localStorage.setItem('study_work_duration', newVal.toString())
    
    let finalTimeLeft = timeLeft
    let finalEndTime = 0

    if (mode === 'work') {
      if (!isActive) {
        finalTimeLeft = newVal * 60
        setTimeLeft(finalTimeLeft)
        localStorage.removeItem('study_timer_time_left')
      } else {
        const diffSeconds = (newVal - oldVal) * 60
        const endTimeStr = localStorage.getItem('study_timer_endtime')
        if (endTimeStr) {
          finalEndTime = parseInt(endTimeStr, 10) + diffSeconds * 1000
          localStorage.setItem('study_timer_endtime', finalEndTime.toString())
          finalTimeLeft = Math.max(0, timeLeft + diffSeconds)
          setTimeLeft(finalTimeLeft)
        }
      }
    }

    syncTimerToBackend({
      studyWorkDuration: newVal,
      ...(mode === 'work' ? {
        studyTimerTimeLeft: finalTimeLeft,
        studyTimerEndTime: finalEndTime
      } : {})
    })
  }

  const updateShortDuration = (val) => {
    const newVal = Math.max(1, Math.min(180, val))
    const oldVal = shortDuration
    setShortDuration(newVal)
    localStorage.setItem('study_short_duration', newVal.toString())
    
    let finalTimeLeft = timeLeft
    let finalEndTime = 0

    if (mode === 'short') {
      if (!isActive) {
        finalTimeLeft = newVal * 60
        setTimeLeft(finalTimeLeft)
        localStorage.removeItem('study_timer_time_left')
      } else {
        const diffSeconds = (newVal - oldVal) * 60
        const endTimeStr = localStorage.getItem('study_timer_endtime')
        if (endTimeStr) {
          finalEndTime = parseInt(endTimeStr, 10) + diffSeconds * 1000
          localStorage.setItem('study_timer_endtime', finalEndTime.toString())
          finalTimeLeft = Math.max(0, timeLeft + diffSeconds)
          setTimeLeft(finalTimeLeft)
        }
      }
    }

    syncTimerToBackend({
      studyShortDuration: newVal,
      ...(mode === 'short' ? {
        studyTimerTimeLeft: finalTimeLeft,
        studyTimerEndTime: finalEndTime
      } : {})
    })
  }

  const updateLongDuration = (val) => {
    const newVal = Math.max(1, Math.min(180, val))
    const oldVal = longDuration
    setLongDuration(newVal)
    localStorage.setItem('study_long_duration', newVal.toString())
    
    let finalTimeLeft = timeLeft
    let finalEndTime = 0

    if (mode === 'long') {
      if (!isActive) {
        finalTimeLeft = newVal * 60
        setTimeLeft(finalTimeLeft)
        localStorage.removeItem('study_timer_time_left')
      } else {
        const diffSeconds = (newVal - oldVal) * 60
        const endTimeStr = localStorage.getItem('study_timer_endtime')
        if (endTimeStr) {
          finalEndTime = parseInt(endTimeStr, 10) + diffSeconds * 1000
          localStorage.setItem('study_timer_endtime', finalEndTime.toString())
          finalTimeLeft = Math.max(0, timeLeft + diffSeconds)
          setTimeLeft(finalTimeLeft)
        }
      }
    }

    syncTimerToBackend({
      studyLongDuration: newVal,
      ...(mode === 'long' ? {
        studyTimerTimeLeft: finalTimeLeft,
        studyTimerEndTime: finalEndTime
      } : {})
    })
  }

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear your focus session history?')) {
      setHistory([])
      setSessionsCompleted(0)
      setFocusMinutes(0)
      
      syncTimerToBackend({
        studySessionsCompleted: 0,
        studyFocusMinutes: 0,
        studyFocusHistory: '[]'
      })
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDateTime = (isoString) => {
    const date = new Date(isoString)
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    return `${timeStr} (${dateStr})`
  }

  const handlePointClick = (data) => {
    const payload = data?.payload || data
    if (payload && payload.dateString) {
      setSelectedDate(new Date(payload.dateString))
      setChartRange('daily')
    }
  }

  const chartTitleSuffix = useMemo(() => {
    if (chartRange !== 'daily') return ''
    const todayStr = new Date().toDateString()
    if (selectedDate.toDateString() === todayStr) {
      return ' — Today'
    }
    return ` — ${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
  }, [chartRange, selectedDate])

  // Visual circular progress calculations
  const totalSeconds = mode === 'work' ? workDuration * 60 : mode === 'short' ? shortDuration * 60 : longDuration * 60
  const progressPercent = ((totalSeconds - timeLeft) / totalSeconds) * 100
  const radius = 90
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-slide-in-right max-w-sm rounded-2xl border border-purple-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 font-bold text-lg select-none">
            {toast.includes('Break') ? '☀️' : '🎯'}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-200">{toast}</p>
            <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Notification</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToast(null)} 
            className="text-slate-500 hover:text-slate-350 text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg shadow-slate-950/20">
        <h2 className="text-lg font-semibold text-slate-100">Pomodoro Focus Timer</h2>
        <p className="mt-2 text-sm text-slate-400">
          Optimize your productivity using structured blocks of study and break intervals. Customize and review your focus sessions.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* LEFT COLUMN: Clock Visualizer & Stats Summary */}
        <div className="space-y-6">
          {/* Clock visual card */}
          <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-8 flex flex-col items-center justify-center min-h-[350px] shadow-lg shadow-slate-950/20">
            <div className="relative w-52 h-52 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="104"
                  cy="104"
                  r={radius}
                  className="stroke-slate-800 fill-none"
                  strokeWidth="10"
                />
                <circle
                  cx="104"
                  cy="104"
                  r={radius}
                  className="stroke-purple-500 fill-none transition-all duration-1000 ease-linear"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-extrabold text-slate-100 font-mono tracking-wider">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">
                  {mode === 'work' ? 'focusing' : 'resting'}
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={toggleTimer}
                className={`rounded-2xl px-6 py-3 text-sm font-semibold transition shadow-md ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-purple-500/15'
                }`}
              >
                {isActive ? 'Pause Session' : 'Start Focus'}
              </button>
              <button
                type="button"
                onClick={resetTimer}
                className="rounded-2xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm text-slate-200 transition hover:border-slate-500"
              >
                Reset
              </button>
            </div>
          </section>

          {/* Stats Summary Card */}
          <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 grid grid-cols-2 gap-4 shadow-lg shadow-slate-950/20">
            <div className="space-y-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Sessions Completed</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-slate-100 font-mono">{sessionsCompleted}</span>
                <span className="text-lg">🎯</span>
              </div>
              <span className="block text-[9px] text-slate-500">Intervals completed today</span>
            </div>

            <div className="space-y-1 border-l border-slate-800 pl-4">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Total Focus Time</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-purple-400 font-mono">{focusMinutes}</span>
                <span className="text-xs font-bold text-purple-300 font-sans">mins</span>
              </div>
              <span className="block text-[9px] text-slate-500">Accumulated focus minutes</span>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Preset Select, Customize Steppers & History logs */}
        <div className="space-y-6 flex flex-col">
          {/* Preset Select */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 space-y-4 shadow-lg shadow-slate-950/20">
            <h3 className="text-base font-semibold text-slate-100">Select Interval</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'work', label: 'Pomodoro', duration: `${workDuration}m` },
                { type: 'short', label: 'Short Break', duration: `${shortDuration}m` },
                { type: 'long', label: 'Long Break', duration: `${longDuration}m` },
              ].map((btn) => (
                <button
                  key={btn.type}
                  type="button"
                  onClick={() => handleModeChange(btn.type)}
                  className={`rounded-2xl p-4 border transition flex flex-col items-center justify-center gap-1 ${
                    mode === btn.type
                      ? 'border-purple-500/30 bg-purple-900/15 text-purple-300 ring-1 ring-purple-500/20'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-semibold">{btn.label}</span>
                  <span className="text-lg font-bold">{btn.duration}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Stepper Duration Configurator */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 space-y-4 shadow-lg shadow-slate-950/20">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>⚙️</span>
              <span>Customize Durations (Minutes)</span>
            </h3>
            
            <div className="space-y-3.5">
              {/* Work Duration */}
              <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                <div>
                  <span className="text-xs font-bold text-slate-300">Pomodoro Mode</span>
                  <span className="block text-[10px] text-slate-500">Active focus session length</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => updateWorkDuration(workDuration - 1)}
                    className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/35 hover:text-purple-300 text-slate-400 font-bold flex items-center justify-center text-sm transition"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold font-mono text-slate-200 w-8 text-center">{workDuration}</span>
                  <button 
                    type="button" 
                    onClick={() => updateWorkDuration(workDuration + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/35 hover:text-purple-300 text-slate-400 font-bold flex items-center justify-center text-sm transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Short Break */}
              <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                <div>
                  <span className="text-xs font-bold text-slate-300">Short Break Mode</span>
                  <span className="block text-[10px] text-slate-500">Quick rest cycle length</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => updateShortDuration(shortDuration - 1)}
                    className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/35 hover:text-purple-300 text-slate-400 font-bold flex items-center justify-center text-sm transition"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold font-mono text-slate-200 w-8 text-center">{shortDuration}</span>
                  <button 
                    type="button" 
                    onClick={() => updateShortDuration(shortDuration + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/35 hover:text-purple-300 text-slate-400 font-bold flex items-center justify-center text-sm transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Long Break */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-300">Long Break Mode</span>
                  <span className="block text-[10px] text-slate-500">Extended rest cycle length</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => updateLongDuration(longDuration - 1)}
                    className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/35 hover:text-purple-300 text-slate-400 font-bold flex items-center justify-center text-sm transition"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold font-mono text-slate-200 w-8 text-center">{longDuration}</span>
                  <button 
                    type="button" 
                    onClick={() => updateLongDuration(longDuration + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/35 hover:text-purple-300 text-slate-400 font-bold flex items-center justify-center text-sm transition"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* FOCUS HISTORY LOG */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 space-y-4 shadow-lg shadow-slate-950/20 flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <span>📋</span>
                <span>Focus History Log</span>
              </h3>
              {todayHistory.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-[10px] font-bold text-rose-400 border border-rose-500/10 bg-rose-550/5 hover:bg-rose-550/15 px-2.5 py-1 rounded-xl transition"
                >
                  Clear History
                </button>
              )}
            </div>

            <div className="flex-1 mt-3 overflow-y-auto max-h-[220px] space-y-2 pr-1">
              {todayHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <span className="text-2xl opacity-30 select-none">⏳</span>
                  <p className="text-xs text-slate-500 mt-2 font-medium">No sessions logged today. Start working to save progress!</p>
                </div>
              ) : (
                todayHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-950/50 border border-slate-850 p-3 rounded-2xl text-xs hover:border-purple-500/10 transition duration-150 animate-fade-in">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base select-none">
                        {item.type === 'work' ? '🎯' : '☕'}
                      </span>
                      <div>
                        <span className="font-bold text-slate-200">
                          {item.type === 'work' ? 'Focus Session' : item.type === 'short' ? 'Short Break' : 'Long Break'}
                        </span>
                        <span className="block text-[9px] text-slate-500 font-mono mt-0.5">
                          {formatDateTime(item.timestamp)}
                        </span>
                      </div>
                    </div>
                    <span className={`font-extrabold font-mono text-xs ${
                      item.type === 'work' ? 'text-purple-400' : 'text-slate-400'
                    }`}>
                      +{item.duration}m
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Focus Analytics Chart Section */}
      <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg shadow-slate-950/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>📈</span>
              <span>Focus Analytics Trend{chartTitleSuffix}</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Visualize your deep work sessions and productivity intervals</p>
          </div>
          
          {/* Chart Range Selector Toggles */}
          <div className="flex bg-slate-900 border border-slate-850 p-1 rounded-xl select-none self-start sm:self-auto">
            {[
              { id: 'daily', label: 'Daily' },
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'yearly', label: 'Yearly' },
            ].map((range) => (
              <button
                key={range.id}
                type="button"
                onClick={() => {
                  setChartRange(range.id)
                  if (range.id === 'daily') {
                    setSelectedDate(new Date())
                  }
                }}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition duration-150 cursor-pointer ${
                  chartRange === range.id
                    ? 'bg-purple-600/20 border border-purple-500/35 text-purple-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="w-full h-[260px] relative select-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={chartData} 
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onClick={(state) => {
                if (state && state.activeTooltipIndex !== undefined) {
                  const clickedIndex = state.activeTooltipIndex
                  if (clickedIndex >= 0 && clickedIndex < chartData.length) {
                    const clickedPayload = chartData[clickedIndex]
                    if (clickedPayload.dateString) {
                      setSelectedDate(new Date(clickedPayload.dateString))
                      setChartRange('daily')
                    }
                  }
                }
              }}
              style={{ cursor: chartRange === 'weekly' ? 'pointer' : 'default' }}
            >
              <defs>
                <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="breakGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
                <filter id="neonGlowFocus" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              
              <XAxis 
                dataKey="label" 
                stroke="#475569" 
                fontSize={10}
                fontWeight={600}
                tickLine={false} 
                axisLine={false} 
                dy={8}
                ticks={chartRange === 'daily' ? ['12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'] : undefined}
                onClick={(e) => {
                  if (e && e.value) {
                    const clickedPayload = chartData.find(item => item.label === e.value)
                    if (clickedPayload && clickedPayload.dateString) {
                      setSelectedDate(new Date(clickedPayload.dateString))
                      setChartRange('daily')
                    }
                  }
                }}
                style={{ cursor: chartRange === 'weekly' ? 'pointer' : 'default' }}
              />
              
              <YAxis 
                stroke="#475569" 
                fontSize={10}
                fontWeight={600}
                tickLine={false} 
                axisLine={false} 
                allowDecimals={false}
                dx={-8}
                unit="m"
              />
              
              <Tooltip content={<FocusChartTooltip />} cursor={{ stroke: 'var(--chart-cursor)', strokeWidth: 1 }} />
              
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8' }}
              />

              <Area 
                type="monotone" 
                name="Focus Minutes"
                dataKey="focus" 
                stroke="#a855f7" 
                fill="url(#focusGradient)" 
                strokeWidth={3} 
                filter="url(#neonGlowFocus)"
                activeDot={{ 
                  r: 5, 
                  stroke: 'var(--chart-dot-stroke)', 
                  strokeWidth: 2, 
                  fill: '#a855f7',
                  onClick: (e, payload) => handlePointClick(payload)
                }}
                onClick={handlePointClick}
                style={{ cursor: chartRange === 'weekly' ? 'pointer' : 'default' }}
              />

              <Area 
                type="monotone" 
                name="Break Minutes"
                dataKey="break" 
                stroke="#0ea5e9" 
                fill="url(#breakGradient)" 
                strokeWidth={3} 
                filter="url(#neonGlowFocus)"
                activeDot={{ 
                  r: 5, 
                  stroke: 'var(--chart-dot-stroke)', 
                  strokeWidth: 2, 
                  fill: '#0ea5e9',
                  onClick: (e, payload) => handlePointClick(payload)
                }}
                onClick={handlePointClick}
                style={{ cursor: chartRange === 'weekly' ? 'pointer' : 'default' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
