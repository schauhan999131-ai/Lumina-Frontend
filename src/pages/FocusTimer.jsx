import { useEffect, useState } from 'react'

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

  const [mode, setMode] = useState('work') // 'work', 'short', 'long'
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('study_work_duration')
    const mins = saved ? parseInt(saved, 10) : 25
    return mins * 60
  })
  const [isActive, setIsActive] = useState(false)
  
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

  // Countdowns effect
  useEffect(() => {
    let timer = null
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setIsActive(false)
      if (mode === 'work') {
        setSessionsCompleted((prev) => prev + 1)
        setFocusMinutes((prev) => prev + workDuration)
        
        // Log Focus entry
        setHistory((prev) => [
          {
            id: Date.now(),
            type: 'work',
            duration: workDuration,
            timestamp: new Date().toISOString()
          },
          ...prev
        ])

        alert('🎯 Focus session completed! Time for a short break.')
        setMode('short')
        setTimeLeft(shortDuration * 60)
      } else {
        // Log Break entry
        setHistory((prev) => [
          {
            id: Date.now(),
            type: mode, // 'short' or 'long'
            duration: mode === 'short' ? shortDuration : longDuration,
            timestamp: new Date().toISOString()
          },
          ...prev
        ])

        alert('☀️ Break is over! Ready to focus?')
        setMode('work')
        setTimeLeft(workDuration * 60)
      }
    }
    return () => clearInterval(timer)
  }, [isActive, timeLeft, mode, workDuration, shortDuration, longDuration])

  // Handle manual mode changes
  const handleModeChange = (newMode) => {
    setMode(newMode)
    setIsActive(false)
    if (newMode === 'work') setTimeLeft(workDuration * 60)
    else if (newMode === 'short') setTimeLeft(shortDuration * 60)
    else if (newMode === 'long') setTimeLeft(longDuration * 60)
  }

  const toggleTimer = () => {
    setIsActive(!isActive)
  }

  const resetTimer = () => {
    setIsActive(false)
    handleModeChange(mode)
  }

  // Stepper setters with boundary limits (1-180 minutes)
  const updateWorkDuration = (val) => {
    const newVal = Math.max(1, Math.min(180, val))
    setWorkDuration(newVal)
    localStorage.setItem('study_work_duration', newVal.toString())
    if (mode === 'work' && !isActive) {
      setTimeLeft(newVal * 60)
    }
  }

  const updateShortDuration = (val) => {
    const newVal = Math.max(1, Math.min(180, val))
    setShortDuration(newVal)
    localStorage.setItem('study_short_duration', newVal.toString())
    if (mode === 'short' && !isActive) {
      setTimeLeft(newVal * 60)
    }
  }

  const updateLongDuration = (val) => {
    const newVal = Math.max(1, Math.min(180, val))
    setLongDuration(newVal)
    localStorage.setItem('study_long_duration', newVal.toString())
    if (mode === 'long' && !isActive) {
      setTimeLeft(newVal * 60)
    }
  }

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear your focus session history?')) {
      setHistory([])
      setSessionsCompleted(0)
      setFocusMinutes(0)
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

  // Visual circular progress calculations
  const totalSeconds = mode === 'work' ? workDuration * 60 : mode === 'short' ? shortDuration * 60 : longDuration * 60
  const progressPercent = ((totalSeconds - timeLeft) / totalSeconds) * 100
  const radius = 90
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  return (
    <div className="space-y-6">
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
                <span className="text-2xl font-black text-white font-mono">{sessionsCompleted}</span>
                <span className="text-lg">🎯</span>
              </div>
              <span className="block text-[9px] text-slate-500">Intervals completed today</span>
            </div>

            <div className="space-y-1 border-l border-slate-900 pl-4">
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
              <div className="flex items-center justify-between border-b border-slate-950 pb-2.5">
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
              <div className="flex items-center justify-between border-b border-slate-950 pb-2.5">
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
            <div className="flex justify-between items-center border-b border-slate-950 pb-3">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <span>📋</span>
                <span>Focus History Log</span>
              </h3>
              {history.length > 0 && (
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
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <span className="text-2xl opacity-30 select-none">⏳</span>
                  <p className="text-xs text-slate-500 mt-2 font-medium">No sessions logged yet. Start working to save progress!</p>
                </div>
              ) : (
                history.map((item) => (
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
    </div>
  )
}
