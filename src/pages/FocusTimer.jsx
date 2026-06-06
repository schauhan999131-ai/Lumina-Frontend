import { useEffect, useState } from 'react'

export default function FocusTimer() {
  const [mode, setMode] = useState('work') // 'work', 'short', 'long'
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isActive, setIsActive] = useState(false)
  const [sessionsCompleted, setSessionsCompleted] = useState(() => {
    const saved = localStorage.getItem('study_sessions_completed')
    return saved ? parseInt(saved, 10) : 0
  })

  useEffect(() => {
    localStorage.setItem('study_sessions_completed', sessionsCompleted.toString())
    localStorage.setItem('study_focus_minutes', (sessionsCompleted * 25).toString())
  }, [sessionsCompleted])

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
        alert('🎯 Focus session completed! Time for a short break.')
        handleModeChange('short')
      } else {
        alert('☀️ Break is over! Ready to focus?')
        handleModeChange('work')
      }
    }
    return () => clearInterval(timer)
  }, [isActive, timeLeft, mode])

  const handleModeChange = (newMode) => {
    setMode(newMode)
    setIsActive(false)
    if (newMode === 'work') setTimeLeft(25 * 60)
    else if (newMode === 'short') setTimeLeft(5 * 60)
    else if (newMode === 'long') setTimeLeft(15 * 60)
  }

  const toggleTimer = () => {
    setIsActive(!isActive)
  }

  const resetTimer = () => {
    setIsActive(false)
    handleModeChange(mode)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Circular progress calculations
  const totalSeconds = mode === 'work' ? 25 * 60 : mode === 'short' ? 5 * 60 : 15 * 60
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
          Optimize your productivity using structured blocks of study and break intervals.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Visual Clock Dial */}
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

        {/* Configurations & Stats */}
        <section className="space-y-6 flex flex-col justify-between">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-100">Select Interval</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'work', label: 'Pomodoro', duration: '25m' },
                { type: 'short', label: 'Short Break', duration: '5m' },
                { type: 'long', label: 'Long Break', duration: '15m' },
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
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/30 p-6 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Daily Focus Sessions</h4>
              <p className="text-xs text-slate-500 mt-1">Number of completed pomodoros today.</p>
            </div>
            <div className="rounded-full w-12 h-12 flex items-center justify-center bg-purple-500/10 border border-purple-500/20 text-xl font-bold text-purple-300">
              {sessionsCompleted}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
