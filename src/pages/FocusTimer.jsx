import { useEffect, useState, useMemo, useRef } from 'react'
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
      const parsed = parseInt(savedTimeLeft, 10)
      if (parsed > 0) return parsed
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

  const [acceptedDays, setAcceptedDays] = useState(() => {
    const saved = localStorage.getItem('study_accepted_days')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('study_accepted_days', JSON.stringify(acceptedDays))
  }, [acceptedDays])

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
            const itemTime = item.timestamp || item.id
            if (!itemTime) return false
            const d = new Date(itemTime)
            return d.toDateString() === targetDateStr && d.getHours() === hour
          })
          .reduce((sum, item) => sum + (item.duration || 0), 0)

        const breakMins = breakSessions
          .filter(item => {
            const itemTime = item.timestamp || item.id
            if (!itemTime) return false
            const d = new Date(itemTime)
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
          .filter(item => {
            const itemTime = item.timestamp || item.id
            return itemTime && new Date(itemTime).toDateString() === dateString
          })
          .reduce((sum, item) => sum + (item.duration || 0), 0)

        const breakMins = breakSessions
          .filter(item => {
            const itemTime = item.timestamp || item.id
            return itemTime && new Date(itemTime).toDateString() === dateString
          })
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
            const itemTime = item.timestamp || item.id
            if (!itemTime) return false
            const itemDate = new Date(itemTime)
            return itemDate >= start && itemDate <= end
          })
          .reduce((sum, item) => sum + (item.duration || 0), 0)

        const breakMins = breakSessions
          .filter(item => {
            const itemTime = item.timestamp || item.id
            if (!itemTime) return false
            const itemDate = new Date(itemTime)
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
            const itemTime = item.timestamp || item.id
            if (!itemTime) return false
            const itemDate = new Date(itemTime)
            return itemDate.getMonth() === month && itemDate.getFullYear() === year
          })
          .reduce((sum, item) => sum + (item.duration || 0), 0)

        const breakMins = breakSessions
          .filter(item => {
            const itemTime = item.timestamp || item.id
            if (!itemTime) return false
            const itemDate = new Date(itemTime)
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
    return history.filter(item => {
      const itemTime = item.timestamp || item.id
      return itemTime && new Date(itemTime).toDateString() === todayStr
    })
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
          // A locally-running timer is the source of truth for the live session.
          // If one is active we must NOT adopt the backend's mode/active/endtime below —
          // a stale backend mode would relabel an in-progress focus session as a break.
          const localActive = localStorage.getItem('study_timer_active') === 'true'
          if (localActive) {
            const endTimeStr = localStorage.getItem('study_timer_endtime')
            const timeLeftStr = localStorage.getItem('study_timer_time_left')
            syncTimerToBackend({
              studyTimerActive: true,
              studyTimerEndTime: endTimeStr ? parseInt(endTimeStr, 10) : 0,
              studyTimerTimeLeft: timeLeftStr ? parseInt(timeLeftStr, 10) : 0,
              studyTimerMode: localStorage.getItem('study_timer_mode') || 'work',
              studyTimerStartDuration: parseInt(localStorage.getItem('study_timer_start_duration') || '0', 10)
            })
          }

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
          // Live-timer fields are only adopted from the backend when there is NO active
          // local session (otherwise the running session — its mode included — wins).
          if (!localActive) {
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
              const backendTimeLeft = state.studyTimerTimeLeft
              if (backendTimeLeft > 0) {
                setTimeLeft(backendTimeLeft)
                if (state.studyTimerActive) {
                  // Active timer with no valid endTime — compute one so the timer effect can run
                  const computedEndTime = Date.now() + backendTimeLeft * 1000
                  localStorage.setItem('study_timer_endtime', computedEndTime.toString())
                  localStorage.removeItem('study_timer_time_left')
                } else {
                  localStorage.setItem('study_timer_time_left', backendTimeLeft.toString())
                }
              } else {
                const currentMode = state.studyTimerMode || mode
                let durationMins = 25
                if (currentMode === 'work') {
                  durationMins = state.studyWorkDuration !== undefined ? state.studyWorkDuration : workDuration
                } else if (currentMode === 'short') {
                  durationMins = state.studyShortDuration !== undefined ? state.studyShortDuration : shortDuration
                } else {
                  durationMins = state.studyLongDuration !== undefined ? state.studyLongDuration : longDuration
                }
                const defaultSeconds = durationMins * 60
                setTimeLeft(defaultSeconds)
                localStorage.setItem('study_timer_time_left', defaultSeconds.toString())
              }
            }
            if (state.studyTimerStartDuration !== undefined && state.studyTimerStartDuration > 0) {
              localStorage.setItem('study_timer_start_duration', state.studyTimerStartDuration.toString())
            }
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
          if (state.studyAcceptedDays !== undefined && state.studyAcceptedDays !== null) {
            try {
              const parsedAccepted = JSON.parse(state.studyAcceptedDays)
              setAcceptedDays(parsedAccepted)
              localStorage.setItem('study_accepted_days', state.studyAcceptedDays)
            } catch (e) {
              console.error('Error parsing accepted days:', e)
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch timer state from backend (running offline/fallback):', err.message)
      }
    }
    fetchBackendTimerState()
  }, [])

  const handleCompletion = (fallbackMode) => {
    // The mode the session was actually STARTED in is the single source of truth for
    // logging. The live React `mode` can be changed mid-session by a background backend
    // sync, which previously caused focus sessions to be mislabeled as breaks.
    const completedMode = localStorage.getItem('study_timer_run_mode') || fallbackMode

    // Get the scheduled completion time before clearing localStorage
    const endTimeStr = localStorage.getItem('study_timer_endtime')
    const completionTimestamp = endTimeStr
      ? new Date(parseInt(endTimeStr, 10)).toISOString()
      : new Date().toISOString()

    setIsActive(false)
    localStorage.setItem('study_timer_active', 'false')
    localStorage.removeItem('study_timer_endtime')
    localStorage.removeItem('study_timer_time_left')
    localStorage.removeItem('study_timer_run_mode')
    const startDuration = parseInt(localStorage.getItem('study_timer_start_duration') || '0', 10)
    localStorage.removeItem('study_timer_start_duration')

    let nextMode = 'work'
    let nextTimeLeft = 25 * 60
    let duration = 25
    let newSessions = sessionsCompleted
    let newMins = focusMinutes
    let newHistory = history

    if (completedMode === 'work') {
      duration = startDuration > 0 ? startDuration : parseInt(localStorage.getItem('study_work_duration') || '25', 10)
      newSessions = sessionsCompleted + 1
      newMins = focusMinutes + duration

      const historyEntry = {
        id: Date.now(),
        type: 'work',
        duration: duration,
        timestamp: completionTimestamp
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
      duration = startDuration > 0
        ? startDuration
        : completedMode === 'short'
          ? parseInt(localStorage.getItem('study_short_duration') || '5', 10)
          : parseInt(localStorage.getItem('study_long_duration') || '15', 10)
      
      const historyEntry = {
        id: Date.now(),
        type: completedMode,
        duration: duration,
        timestamp: completionTimestamp
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
      studyTimerStartDuration: 0,
      studySessionsCompleted: newSessions,
      studyFocusMinutes: newMins,
      studyFocusHistory: JSON.stringify(newHistory)
    })
  }

  const handleCompletionRef = useRef(handleCompletion)
  useEffect(() => {
    handleCompletionRef.current = handleCompletion
  })

  // Effect to run the timer when active
  useEffect(() => {
    if (!isActive) return

    const endTimeStr = localStorage.getItem('study_timer_endtime')
    if (!endTimeStr) return

    const endTime = parseInt(endTimeStr, 10)
    let finished = false
    let lastRemaining = -1

    const runTimer = () => {
      if (finished) return true
      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))

      if (remaining <= 0) {
        finished = true
        handleCompletionRef.current(mode)
        return true
      }
      // Only re-render when the displayed second actually changes. The 200ms poll keeps
      // the clock accurate without forcing 5 re-renders/sec of the chart-heavy page.
      if (remaining !== lastRemaining) {
        lastRemaining = remaining
        setTimeLeft(remaining)
      }
      return false
    }

    if (runTimer()) return

    const interval = setInterval(() => {
      if (runTimer()) clearInterval(interval)
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
    localStorage.removeItem('study_timer_start_duration')
    localStorage.removeItem('study_timer_run_mode')

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
    let plannedDur = 0

    if (newActive) {
      const isResuming = !!localStorage.getItem('study_timer_time_left')
      endTime = Date.now() + timeLeft * 1000
      localStorage.setItem('study_timer_endtime', endTime.toString())
      localStorage.removeItem('study_timer_time_left')
      // Pin the mode this run is logged under, independent of later state changes.
      localStorage.setItem('study_timer_run_mode', mode)
      if (!isResuming) {
        plannedDur = mode === 'work' ? workDuration : mode === 'short' ? shortDuration : longDuration
        localStorage.setItem('study_timer_start_duration', plannedDur.toString())
      }
    } else {
      localStorage.setItem('study_timer_time_left', timeLeft.toString())
      localStorage.removeItem('study_timer_endtime')
    }

    syncTimerToBackend({
      studyTimerActive: newActive,
      studyTimerEndTime: endTime,
      studyTimerTimeLeft: timeLeftVal,
      ...(plannedDur > 0 ? { studyTimerStartDuration: plannedDur } : {})
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

  // Calculate today's focus minutes from history
  const todayFocusMinutes = useMemo(() => {
    const todayStr = new Date().toDateString()
    return history
      .filter(item => {
        const itemTime = item.timestamp || item.id
        return itemTime && new Date(itemTime).toDateString() === todayStr && item.type === 'work'
      })
      .reduce((sum, item) => sum + (item.duration || 0), 0)
  }, [history])

  // Calculate streaks
  const streakInfo = useMemo(() => {
    if (acceptedDays.length === 0) return { currentStreak: 0, total: 0 }
    
    // Sort unique accepted days in descending chronological order
    const uniqueDates = Array.from(new Set(acceptedDays))
    const sortedDates = uniqueDates
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime())
    
    let currentStreak = 0
    let checkDate = new Date()
    checkDate.setHours(0, 0, 0, 0)
    
    const hasDateStr = (dateObj) => {
      const dateStr = dateObj.toDateString()
      return uniqueDates.includes(dateStr)
    }
    
    if (hasDateStr(checkDate)) {
      currentStreak = 1
      checkDate.setDate(checkDate.getDate() - 1)
      while (hasDateStr(checkDate)) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      }
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      if (hasDateStr(yesterday)) {
        currentStreak = 1
        yesterday.setDate(yesterday.getDate() - 1)
        while (hasDateStr(yesterday)) {
          currentStreak++
          yesterday.setDate(yesterday.getDate() - 1)
        }
      }
    }
    
    return {
      currentStreak,
      total: uniqueDates.length
    }
  }, [acceptedDays])

  // Accept and lock today's focus session
  const acceptToday = () => {
    const todayStr = new Date().toDateString()
    if (acceptedDays.includes(todayStr)) return
    
    const newAccepted = [...acceptedDays, todayStr]
    setAcceptedDays(newAccepted)
    
    triggerNotification('🏆 Today has been accepted and logged successfully!')
    
    syncTimerToBackend({
      studyAcceptedDays: JSON.stringify(newAccepted)
    })
  }

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
        <div className="fixed top-20 inset-x-4 sm:inset-x-auto sm:right-6 z-50 animate-slide-in-right sm:max-w-sm rounded-2xl border border-purple-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md flex items-center gap-3">
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
      <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 sm:p-6 shadow-lg shadow-slate-950/20">
        <h2 className="text-lg font-semibold text-slate-100">Pomodoro Focus Timer</h2>
        <p className="mt-2 text-sm text-slate-400">
          Optimize your productivity using structured blocks of study and break intervals. Customize and review your focus sessions.
        </p>
      </div>

      <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
        {/* LEFT COLUMN: Clock Visualizer & Stats Summary */}
        <div className="space-y-5 sm:space-y-6">
          {/* Clock visual card */}
          <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 sm:p-8 flex flex-col items-center justify-center min-h-[320px] sm:min-h-[350px] shadow-lg shadow-slate-950/20">
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

            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
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

          {/* 6-Hour Target & Day Acceptance Card */}
          <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg shadow-slate-950/20 space-y-4 relative overflow-hidden">
            {/* Background glowing sphere */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <span>🏆</span>
                  <span>Daily Focus Target</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Maintain 6+ hours of focus daily, even on holidays</p>
              </div>
              {streakInfo.currentStreak > 0 && (
                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-black text-amber-400 animate-pulse">
                  <span>🔥</span>
                  <span>{streakInfo.currentStreak} Day Streak</span>
                </div>
              )}
            </div>

            {/* Progress Bar Container */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Today's Progress</span>
                <span className={todayFocusMinutes >= 360 ? "text-emerald-400 font-mono" : "text-purple-400 font-mono"}>
                  {todayFocusMinutes}m / 360m ({Math.min(100, Math.round((todayFocusMinutes / 360) * 100))}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-900 border border-slate-800 rounded-full overflow-hidden relative">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    todayFocusMinutes >= 360 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                  }`}
                  style={{ width: `${Math.min(100, (todayFocusMinutes / 360) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Accept / Lock Day Button */}
            <div className="pt-2">
              {todayFocusMinutes < 360 ? (
                <div className="w-full rounded-2xl bg-slate-900/60 border border-slate-800 p-3.5 text-center space-y-1 select-none">
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 text-slate-500 py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <span>🔒</span> Lock Day (Requires 6h focus)
                  </button>
                  <p className="text-[9px] text-slate-500 font-medium">
                    Focus for {360 - todayFocusMinutes} more minutes today to unlock and accept this day.
                  </p>
                </div>
              ) : acceptedDays.includes(new Date().toDateString()) ? (
                <button
                  type="button"
                  disabled
                  className="w-full rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 py-3 text-xs font-bold flex items-center justify-center gap-2 select-none shadow-lg shadow-emerald-500/5"
                >
                  <span>✓</span> Today Accepted & Logged
                </button>
              ) : (
                <button
                  type="button"
                  onClick={acceptToday}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 py-3 text-xs font-black flex items-center justify-center gap-2 transition duration-200 hover:scale-[1.01] active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  <span>⚡</span> Accept & Lock Today
                </button>
              )}
            </div>

            {/* Accepted Days History List */}
            {acceptedDays.length > 0 && (
              <div className="border-t border-slate-800 pt-3 space-y-2">
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Accepted Days Log</span>
                <div className="flex flex-wrap gap-1.5 max-h-[70px] overflow-y-auto pr-1">
                  {/* Show recent accepted days sorted descending */}
                  {[...acceptedDays]
                    .map(d => new Date(d))
                    .sort((a, b) => b.getTime() - a.getTime())
                    .slice(0, 10)
                    .map((dateObj, idx) => {
                      const label = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                      return (
                        <div key={idx} className="flex items-center gap-1 bg-emerald-950/40 border border-emerald-900/30 text-[9px] font-bold text-emerald-400 px-2 py-0.5 rounded-lg">
                          <span>✓</span>
                          <span>{label}</span>
                        </div>
                      )
                    })
                  }
                  {acceptedDays.length > 10 && (
                    <div className="text-[9px] text-slate-500 font-bold self-center pl-1">
                      + {acceptedDays.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: Preset Select, Customize Steppers & History logs */}
        <div className="space-y-5 sm:space-y-6 flex flex-col">
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
