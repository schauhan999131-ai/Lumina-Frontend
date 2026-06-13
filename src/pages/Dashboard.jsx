import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AnalyticsChart from '../components/AnalyticsChart'
import { useAppStore } from '../store'

const occupationBadges = {
  Developer: 'Verified Developer',
  Scholar: 'Verified Scholar',
  Designer: 'Verified Designer',
  Writer: 'Verified Creator',
  Researcher: 'Verified Scholar',
  General: 'Verified Deep Worker'
}

const occupationFloatingEmojis = {
  Developer: '💻',
  Scholar: '🎓',
  Designer: '🎨',
  Writer: '✍️',
  Researcher: '🔬',
  General: '⚡'
}

const motivationalQuotes = [
  { text: "Focus is a muscle, and deep work is the ultimate training ground.", author: "Lumina Workspace" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Clean code always looks like it was written by someone who cares.", author: "Michael Feathers" },
  { text: "One deep-focus session can outperform a week of distracted building.", author: "Lumina Workspace" },
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
  { text: "Strive for progress, not perfection. Push code, learn, refine.", author: "Dev Motivation" },
  { text: "Refactor relentlessly. Simple designs are resilient designs.", author: "Software Design" },
  { text: "Great developers are not born; they are forged in uninterrupted flow.", author: "Lumina Companion" }
]

// Updated 6 Core Focus Pillars including the user's Office Job
const focusPillarsList = [
  { id: 1, title: "🗣️ English & Communication", desc: "1.5 Hour target for speaking, writing & technical explanations." },
  { id: 2, title: "🌐 Servers & Network Deployment", desc: "Managing website hosting, clusters, hardware & software stacks." },
  { id: 3, title: "📐 Architecture & System Design", desc: "Modeling architecture topologies, explaining APIs & efficiency." },
  { id: 4, title: "🏋️ Physical Fitness (Body Fit)", desc: "Gym sessions, cardio, posture checks, and active movement." },
  { id: 5, title: "🏢 Office Work & Job Sprints", desc: "Focusing on office sprint tickets, team code syncs, and company goals." },
  { id: 6, title: "💼 Side Business, Freelance & YT", desc: "Replying to client proposals, marketing projects & writing video scripts." }
]

// Professional vocabulary for English practice
const technicalVocab = [
  { word: "Idempotency", definition: "An operation that produces the same result no matter how many times it is executed.", example: "Designing API endpoints to be idempotent prevents duplicate database entries." },
  { word: "Decoupling", definition: "Separating system components so that they can evolve, scale, and function independently.", example: "Message queues allow decoupling the frontend from slow email processing services." },
  { word: "Latency", definition: "The delay or time elapsed between a client request and the server response.", example: "Adding a Redis cache layer helps minimize network latency for database queries." },
  { word: "Scalability", definition: "The capability of a system to handle a growing amount of work by adding computational resources.", example: "Horizontal scaling and load balancers improve the server's scalability." },
  { word: "Asynchronous", definition: "Processes that execute independently of the main program flow, without blocking execution.", example: "Executing background mail triggers asynchronously keeps the UI fast and fluid." },
  { word: "Consensus", definition: "Agreement among distributed nodes in a network regarding a specific data value or state.", example: "Raft and Paxos are standard consensus algorithms used in cloud datastores." }
]

// Tech writing prompts for Daily English Practice
const writingPrompts = [
  "Explain in English how you resolved the last complex bug in your codebase.",
  "Draft a freelance proposal explaining to a client why they should hire you for a full website migration.",
  "Write an outline explaining the difference between Monolithic and Microservices architectures in simple English.",
  "Describe your body fitness target and your daily physical workout plan.",
  "Draft a script for a short YouTube video explaining how DNS lookup works under 2 minutes.",
  "Describe the system architecture of this Lumina app and how state changes sync with the database."
]


export default function Dashboard() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const occupation = useAppStore((state) => state.occupation) || 'Developer'
  
  const tasks = useAppStore((state) => state.tasks)
  const taskStats = useAppStore((state) => state.taskStats)
  const getTasks = useAppStore((state) => state.getTasks)
  const getTaskStats = useAppStore((state) => state.getTaskStats)
  const updateTask = useAppStore((state) => state.updateTask)
  const removeTask = useAppStore((state) => state.removeTask)
  
  const theme = useAppStore((state) => state.theme) || 'dark'
  const setTheme = useAppStore((state) => state.setTheme)
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chartRange, setChartRange] = useState('daily') // 'daily', 'weekly', 'monthly', 'yearly'

  // Task Filter State
  const [taskSearch, setTaskSearch] = useState('')
  const [timescaleFilter, setTimescaleFilter] = useState('All') // 'All', 'Daily', 'Weekly', 'Yearly'
  const [statusFilter, setStatusFilter] = useState('Active') // 'Active', 'All', 'Not Started', 'Pending', 'Completed'

  // Motivation Quote State
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)
  const [bgError, setBgError] = useState(false)

  // Dynamic Core Focus Pillars States
  const todayKey = useMemo(() => new Date().toDateString(), [])
  const [pillars, setPillars] = useState(() => {
    const saved = localStorage.getItem('lumina_custom_pillars')
    return saved ? JSON.parse(saved) : focusPillarsList
  })
  const [checkedPillars, setCheckedPillars] = useState({})

  // Habit Grid Completion History
  const [history, setHistory] = useState({})



  // English Lab States
  const [englishText, setEnglishText] = useState('')
  const [englishTimerSeconds, setEnglishTimerSeconds] = useState(5400) // 1.5 Hours = 5400 Seconds
  const [timerRunning, setTimerRunning] = useState(false)
  const [vocabIndex, setVocabIndex] = useState(0)
  const [promptIndex, setPromptIndex] = useState(0)

  // Pillar Customization Form States
  const [isCustomizeMode, setIsCustomizeMode] = useState(false)
  const [editingPillarId, setEditingPillarId] = useState(null)
  const [pillarTitle, setPillarTitle] = useState('')
  const [pillarDesc, setPillarDesc] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([
          getTasks(),
          getTaskStats(),
        ])
      } catch (err) {
        setError(err.message || 'Failed to load study dashboard data')
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated) {
      loadData()
    }
    
    // Load Core Pillars checklist for today
    const savedPillars = localStorage.getItem(`lumina_pillars_${todayKey}`)
    if (savedPillars) {
      try { setCheckedPillars(JSON.parse(savedPillars)) } catch (e) {}
    }

    // Load history
    const savedHistory = localStorage.getItem('lumina_pillars_history')
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)) } catch (e) {}
    }

    // Load English notepad text
    const savedText = localStorage.getItem('lumina_eng_text')
    if (savedText) setEnglishText(savedText)



    // Load/Reset English timer (handles resets across days)
    const savedSecs = localStorage.getItem('lumina_eng_secs')
    const savedRunning = localStorage.getItem('lumina_eng_running') === 'true'
    const savedTime = localStorage.getItem('lumina_eng_timestamp')
    const savedTimerDate = localStorage.getItem('lumina_eng_timer_date')
    
    let initialSecs = 5400
    let initialRunning = false
    
    if (savedTimerDate === todayKey) {
      initialSecs = savedSecs ? parseInt(savedSecs, 10) : 5400
      initialRunning = savedRunning
    } else {
      localStorage.setItem('lumina_eng_secs', '5400')
      localStorage.setItem('lumina_eng_running', 'false')
      localStorage.setItem('lumina_eng_timer_date', todayKey)
    }
    
    setEnglishTimerSeconds(initialSecs)
    setTimerRunning(initialSecs > 0 ? initialRunning : false)
    
    setCurrentQuoteIndex(Math.floor(Math.random() * motivationalQuotes.length))
    setVocabIndex(Math.floor(Math.random() * technicalVocab.length))
    setPromptIndex(Math.floor(Math.random() * writingPrompts.length))
  }, [isAuthenticated, getTasks, getTaskStats, todayKey])

  // Save English text on change
  const handleTextChange = (e) => {
    const txt = e.target.value
    setEnglishText(txt)
    localStorage.setItem('lumina_eng_text', txt)
  }

  // Ticking English Timer
  useEffect(() => {
    let interval = null
    if (timerRunning && englishTimerSeconds > 0) {
      interval = setInterval(() => {
        setEnglishTimerSeconds((prev) => {
          const nextSecs = prev - 1
          localStorage.setItem('lumina_eng_secs', nextSecs.toString())
          localStorage.setItem('lumina_eng_timestamp', Date.now().toString())
          
          if (nextSecs <= 0) {
            setTimerRunning(false)
            localStorage.setItem('lumina_eng_running', 'false')
            handleTogglePillar(1, true) // Complete English pillar checkbox
            return 0
          }
          return nextSecs
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerRunning, englishTimerSeconds])

  // Toggle timer state
  const handleToggleTimer = () => {
    const nextRunning = !timerRunning
    setTimerRunning(nextRunning)
    localStorage.setItem('lumina_eng_running', nextRunning.toString())
    localStorage.setItem('lumina_eng_timestamp', Date.now().toString())
  }

  // Reset timer
  const handleResetTimer = () => {
    setTimerRunning(false)
    setEnglishTimerSeconds(5400)
    localStorage.setItem('lumina_eng_running', 'false')
    localStorage.setItem('lumina_eng_secs', '5400')
  }

  // Toggle Core Focus Pillars check state
  const handleTogglePillar = (id, forceValue = null) => {
    setCheckedPillars((prev) => {
      const nextValue = forceValue !== null ? forceValue : !prev[id]
      const updated = { ...prev, [id]: nextValue }
      localStorage.setItem(`lumina_pillars_${todayKey}`, JSON.stringify(updated))
      
      // Update history logs (only check currently existing custom pillars)
      const completedCount = pillars.filter(p => updated[p.id]).length
      setHistory(prevHist => {
        const nextHist = { ...prevHist, [todayKey]: completedCount }
        localStorage.setItem('lumina_pillars_history', JSON.stringify(nextHist))
        return nextHist
      })

      return updated
    })
  }

  const savePillars = (updatedPillars) => {
    setPillars(updatedPillars)
    localStorage.setItem('lumina_custom_pillars', JSON.stringify(updatedPillars))
  }

  const handleAddPillar = (e) => {
    e.preventDefault()
    if (!pillarTitle.trim()) return
    const newPillar = {
      id: Date.now().toString(),
      title: pillarTitle.trim(),
      desc: pillarDesc.trim()
    }
    const updated = [...pillars, newPillar]
    savePillars(updated)
    setPillarTitle('')
    setPillarDesc('')
  }

  const handleDeletePillar = (id, e) => {
    e.stopPropagation()
    const updated = pillars.filter(p => p.id !== id)
    savePillars(updated)
    
    const updatedChecked = { ...checkedPillars }
    delete updatedChecked[id]
    setCheckedPillars(updatedChecked)
    localStorage.setItem(`lumina_pillars_${todayKey}`, JSON.stringify(updatedChecked))
    
    const completedCount = updated.filter(p => updatedChecked[p.id]).length
    setHistory(prevHist => {
      const nextHist = { ...prevHist, [todayKey]: completedCount }
      localStorage.setItem('lumina_pillars_history', JSON.stringify(nextHist))
      return nextHist
    })
  }

  const startEditPillar = (pillar, e) => {
    e.stopPropagation()
    setEditingPillarId(pillar.id)
    setPillarTitle(pillar.title)
    setPillarDesc(pillar.desc)
  }

  const handleSaveEditPillar = (e) => {
    e.preventDefault()
    if (!pillarTitle.trim()) return
    const updated = pillars.map(p => 
      p.id === editingPillarId 
        ? { ...p, title: pillarTitle.trim(), desc: pillarDesc.trim() } 
        : p
    )
    savePillars(updated)
    setEditingPillarId(null)
    setPillarTitle('')
    setPillarDesc('')
  }

  const cancelEditPillar = () => {
    setEditingPillarId(null)
    setPillarTitle('')
    setPillarDesc('')
  }



  // Streak & Gamified Developer Level Calculations
  const gamifiedStreak = useMemo(() => {
    let currentStreak = 0
    let checkDate = new Date()
    
    while (true) {
      const dateStr = checkDate.toDateString()
      const count = history[dateStr] || 0
      
      if (count >= 3) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        if (dateStr === new Date().toDateString()) {
          checkDate.setDate(checkDate.getDate() - 1)
          const yesterdayStr = checkDate.toDateString()
          const yesterdayCount = history[yesterdayStr] || 0
          if (yesterdayCount >= 3) {
            continue
          }
        }
        break
      }
    }

    let levelName = 'Focus Initiate'
    let levelEmoji = '🥚'
    let nextLevelDays = 3
    let progress = 0

    if (currentStreak >= 15) {
      levelName = 'Antigravity Architect'
      levelEmoji = '🌌'
      nextLevelDays = 0
      progress = 100
    } else if (currentStreak >= 7) {
      levelName = 'Flow State Master'
      levelEmoji = '⚡'
      nextLevelDays = 15 - currentStreak
      progress = Math.round(((currentStreak - 7) / 8) * 100)
    } else if (currentStreak >= 3) {
      levelName = 'Consistency Builder'
      levelEmoji = '🌱'
      nextLevelDays = 7 - currentStreak
      progress = Math.round(((currentStreak - 3) / 4) * 100)
    } else {
      levelName = 'Focus Initiate'
      levelEmoji = '🥚'
      nextLevelDays = 3 - currentStreak
      progress = Math.round((currentStreak / 3) * 100)
    }

    return {
      streak: currentStreak,
      levelName,
      levelEmoji,
      nextLevelDays,
      progress
    }
  }, [history])

  // Get last 28 days array for GitHub contributions style grid
  const last28Days = useMemo(() => {
    const dates = []
    for (let i = 27; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push({
        dateStr: d.toDateString(),
        dayNum: d.getDate(),
        monthLabel: d.toLocaleDateString('en-US', { month: 'short' }),
        formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      })
    }
    return dates
  }, [])

  // Cycle Quote, Vocab, Prompts
  const handleNextQuote = () => setCurrentQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length)
  const handleNextVocab = () => setVocabIndex((prev) => (prev + 1) % technicalVocab.length)
  const handleNextPrompt = () => setPromptIndex((prev) => (prev + 1) % writingPrompts.length)

  // Focus Minutes
  const focusMinutes = useMemo(() => {
    const saved = localStorage.getItem('study_focus_minutes')
    return saved ? parseInt(saved, 10) : 0
  }, [taskStats])

  // Chart Data: Integrates both TasksCompleted and local FocusPillarsChecked logs for dual-line drawing
  const chartData = useMemo(() => {
    if (!taskStats) return []
    
    let rawData = []
    if (chartRange === 'daily') rawData = taskStats.daily || []
    else if (chartRange === 'weekly') rawData = taskStats.weekly || []
    else if (chartRange === 'monthly') rawData = taskStats.monthly || []
    else if (chartRange === 'yearly') rawData = taskStats.yearly || []
    
    if (chartRange === 'daily' && rawData.length > 0) {
      return rawData.map((item, index) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - index))
        const dateKey = d.toDateString()
        const pillarsCount = history[dateKey] || 0
        
        return {
          ...item,
          tasksCompleted: item.count,
          pillarsCompleted: pillarsCount
        }
      })
    }

    if (chartRange === 'weekly' && rawData.length > 0) {
      return rawData.map((item, index) => {
        const now = new Date()
        const start = new Date(now)
        start.setDate(now.getDate() - ((3 - index + 1) * 7 - 1))
        start.setHours(0, 0, 0, 0)
        
        const end = new Date(now)
        end.setDate(now.getDate() - (3 - index) * 7)
        end.setHours(23, 59, 59, 999)
        
        let pillarsCount = 0
        const checkDate = new Date(start)
        while (checkDate <= end) {
          const key = checkDate.toDateString()
          pillarsCount += (history[key] || 0)
          checkDate.setDate(checkDate.getDate() + 1)
        }
        
        return {
          ...item,
          tasksCompleted: item.count,
          pillarsCompleted: pillarsCount
        }
      })
    }
    
    return rawData.map(item => ({ ...item, tasksCompleted: item.count }))
  }, [taskStats, chartRange, history])

  // Task filtering
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(taskSearch.toLowerCase())
      const matchesTimescale = timescaleFilter === 'All' || task.category === timescaleFilter
      
      let matchesStatus = true
      if (statusFilter === 'Active') {
        matchesStatus = task.status !== 'Completed'
      } else if (statusFilter !== 'All') {
        matchesStatus = task.status === statusFilter
      }

      return matchesSearch && matchesTimescale && matchesStatus
    })
  }, [tasks, taskSearch, timescaleFilter, statusFilter])

  const sortedTasks = useMemo(() => {
    const priorityWeight = { High: 3, Medium: 2, Low: 1 }
    return [...filteredTasks].sort((a, b) => {
      const aComp = a.status === 'Completed' ? 1 : 0
      const bComp = b.status === 'Completed' ? 1 : 0
      if (aComp !== bComp) return aComp - bComp
      return (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2)
    })
  }, [filteredTasks])

  // Task controllers
  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus })
    } catch (err) {
      setError(err.message || 'Failed to update task status')
    }
  }

  const handleDeleteTask = async (taskId) => {
    try {
      await removeTask(taskId)
    } catch (err) {
      setError(err.message || 'Failed to delete task')
    }
  }

  // Dashboard Stats Calculations
  const statusDetails = useMemo(() => {
    const total = tasks.length
    if (total === 0) return { notStartedPct: 0, pendingPct: 0, completedPct: 0, total: 0 }
    
    const notStarted = tasks.filter(t => t.status === 'Not Started').length
    const pending = tasks.filter(t => t.status === 'Pending').length
    const completed = tasks.filter(t => t.status === 'Completed').length
    
    return {
      notStarted,
      pending,
      completed,
      notStartedPct: Math.round((notStarted / total) * 100),
      pendingPct: Math.round((pending / total) * 100),
      completedPct: Math.round((completed / total) * 100),
      total
    }
  }, [tasks])

  const priorityDetails = useMemo(() => {
    const active = tasks.filter(t => t.status !== 'Completed')
    return {
      high: active.filter(t => t.priority === 'High').length,
      medium: active.filter(t => t.priority === 'Medium').length,
      low: active.filter(t => t.priority === 'Low').length,
      totalActive: active.length
    }
  }, [tasks])

  const pillarsProgress = useMemo(() => {
    if (pillars.length === 0) return 0
    const completedCount = pillars.filter(p => checkedPillars[p.id]).length
    return Math.round((completedCount / pillars.length) * 100)
  }, [checkedPillars, pillars])

  const formatTimerDisplay = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6 text-slate-200 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-xl flex items-center justify-between min-h-[150px]">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-indigo-500/10 via-purple-600/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="space-y-3.5 z-10 max-w-lg">
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Welcome to your Focus Workspace!</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Uninterrupted building and learning starts here. Plan, record notes, and block deep work timers.
          </p>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-[10px] font-bold text-emerald-400">
            <span>🛡️</span> {occupationBadges[occupation] || 'Verified Deep Worker'}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-3.5 z-10">
          <div className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-950/60 border border-slate-800 text-3xl shadow-inner animate-bounce-slow">
            {occupationFloatingEmojis[occupation] || '⚡'}
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[10px] font-black text-slate-300 hover:text-slate-100 transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-md hover:border-slate-700/80 transition duration-300 flex flex-col justify-between h-[130px] group relative overflow-hidden">
          <div className="flex items-center justify-between z-10">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Completed Today</h3>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="mt-2 z-10">
            <p className="text-3xl font-extrabold text-slate-100 leading-none tracking-tight">{taskStats?.todayCompletedCount || 0}</p>
            <p className="text-[10px] text-emerald-400 mt-2 font-semibold">Done in this day planning</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-md hover:border-slate-700/80 transition duration-300 flex flex-col justify-between h-[130px] group relative overflow-hidden">
          <div className="flex items-center justify-between z-10">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Deep Work Streak</h3>
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 z-10">
            <p className="text-3xl font-extrabold text-slate-100 leading-none tracking-tight">{gamifiedStreak.streak} {gamifiedStreak.streak === 1 ? 'day' : 'days'}</p>
            <p className="text-[10px] text-amber-500 mt-2 font-semibold">Habit streak active!</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-md hover:border-slate-700/80 transition duration-300 flex flex-col justify-between h-[130px] group relative overflow-hidden">
          <div className="flex items-center justify-between z-10">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Focus Time</h3>
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 z-10">
            <p className="text-3xl font-extrabold text-slate-100 leading-none tracking-tight">{focusMinutes}m</p>
            <p className="text-[10px] text-indigo-400 mt-2 font-semibold">Total focus work completed</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-md hover:border-slate-700/80 transition duration-300 flex flex-col justify-between h-[130px] group relative overflow-hidden">
          <div className="flex items-center justify-between z-10">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">All-time Completed</h3>
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-110 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 z-10">
            <p className="text-3xl font-extrabold text-slate-100 leading-none tracking-tight">{taskStats?.totalCompletedCount || 0}</p>
            <p className="text-[10px] text-purple-400 mt-2 font-semibold">Workspace targets accomplished</p>
          </div>
        </div>
      </div>



      {/* Main Graphs & Statistics Blocks */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trading-style Analytics Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg flex flex-col justify-between min-h-[380px]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight">Task & Habit Performance</h3>
              <p className="text-xs text-slate-500 mt-0.5">Dual-metric glowing contributions chart.</p>
            </div>
            
            <div className="flex rounded-xl border border-slate-800/80 bg-slate-950 p-1 self-start select-none">
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
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition duration-150 leading-none ${
                    chartRange === btn.range
                      ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 shadow-md shadow-indigo-600/5'
                      : 'text-slate-400 border border-transparent hover:text-slate-200'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <AnalyticsChart 
              data={chartData} 
            />
          </div>
        </div>

        {/* Task status & priority distribution columns */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg flex flex-col justify-between gap-6 min-h-[380px]">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight">Workspace Status</h3>
              <p className="text-xs text-slate-500 mt-0.5">Task completion distribution statistics.</p>
            </div>

            {statusDetails.total === 0 ? (
              <p className="text-xs text-slate-600 italic py-4">No planning logs available.</p>
            ) : (
              <div className="space-y-3.5 pt-2">
                <div className="w-full bg-slate-950 rounded-full h-3.5 overflow-hidden border border-slate-850 flex">
                  {statusDetails.completed > 0 && (
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500 glow-emerald" 
                      style={{ width: `${statusDetails.completedPct}%` }}
                      title={`Completed: ${statusDetails.completedPct}%`}
                    ></div>
                  )}
                  {statusDetails.pending > 0 && (
                    <div 
                      className="bg-amber-500 h-full transition-all duration-500 glow-amber" 
                      style={{ width: `${statusDetails.pendingPct}%` }}
                      title={`Pending: ${statusDetails.pendingPct}%`}
                    ></div>
                  )}
                  {statusDetails.notStarted > 0 && (
                    <div 
                      className="bg-slate-700 h-full transition-all duration-500" 
                      style={{ width: `${statusDetails.notStartedPct}%` }}
                      title={`Not Started: ${statusDetails.notStartedPct}%`}
                    ></div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                    <span>Start: {statusDetails.notStarted}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Pending: {statusDetails.pending}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Done: {statusDetails.completed}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-slate-800/80 pt-5">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Active Priorities</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Priority counts for active (non-done) tasks.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-950/60 border border-rose-500/10 rounded-xl p-3 text-center">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-rose-500">High</span>
                <span className="block text-xl font-black text-rose-400 mt-1">{priorityDetails.high}</span>
              </div>
              <div className="bg-slate-950/60 border border-amber-500/10 rounded-xl p-3 text-center">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-500">Medium</span>
                <span className="block text-xl font-black text-amber-400 mt-1">{priorityDetails.medium}</span>
              </div>
              <div className="bg-slate-950/60 border border-sky-500/10 rounded-xl p-3 text-center">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-sky-500">Low</span>
                <span className="block text-xl font-black text-sky-400 mt-1">{priorityDetails.low}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gamified Habit Tracker & English Practice Section (4 Columns) */}
      <div className="grid gap-6 lg:grid-cols-4 items-stretch">
        
        {/* Column 1: Daily Focus Pillars Checklist */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg flex flex-col justify-between gap-4 lg:col-span-1 min-h-[360px]">
          <div className="space-y-1.5 border-b border-slate-800/80 pb-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>🎯</span> Daily Pillars
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomizeMode(!isCustomizeMode)
                    cancelEditPillar()
                  }}
                  className={`text-[8px] font-black px-1.5 py-0.5 rounded transition ${
                    isCustomizeMode 
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' 
                      : 'bg-slate-950 text-slate-500 border border-slate-900/40 hover:text-slate-350'
                  }`}
                  title="Customize Pillars List"
                >
                  ⚙️ {isCustomizeMode ? 'Editing On' : 'Edit'}
                </button>
              </h3>
              <span className="text-[10px] font-black text-purple-400">{pillarsProgress}% Done</span>
            </div>
            
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850 mt-1">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${pillarsProgress}%` }}
              ></div>
            </div>
          </div>

          {isCustomizeMode && (
            <form 
              onSubmit={editingPillarId ? handleSaveEditPillar : handleAddPillar} 
              className="bg-slate-950/80 border border-slate-850 p-2.5 rounded-xl space-y-2 text-left mb-1 animate-fade-in"
            >
              <span className="block text-[8px] font-extrabold uppercase tracking-widest text-slate-500">
                {editingPillarId ? '✏️ Edit Pillar' : '➕ Add Custom Pillar'}
              </span>
              <div className="space-y-1">
                <input
                  type="text"
                  required
                  value={pillarTitle}
                  onChange={(e) => setPillarTitle(e.target.value)}
                  placeholder="e.g. 💻 Coding Practice"
                  className="w-full rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-[9px] text-slate-100 placeholder-slate-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={pillarDesc}
                  onChange={(e) => setPillarDesc(e.target.value)}
                  placeholder="e.g. 1 hour focus daily"
                  className="w-full rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-[9px] text-slate-100 placeholder-slate-600 focus:outline-none"
                />
              </div>
              <div className="flex gap-1.5">
                {editingPillarId && (
                  <button
                    type="button"
                    onClick={cancelEditPillar}
                    className="flex-1 py-1 rounded bg-slate-900 border border-slate-800 text-[8px] font-bold text-slate-400"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-1 rounded bg-purple-600 text-white text-[8px] font-bold shadow"
                >
                  {editingPillarId ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] pr-1">
            {pillars.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic py-6 text-center">No focus pillars. Click edit to add!</p>
            ) : (
              pillars.map((pillar) => {
                const isChecked = checkedPillars[pillar.id]
                return (
                  <div 
                    key={pillar.id}
                    onClick={() => !isCustomizeMode && handleTogglePillar(pillar.id)}
                    className={`p-2.5 rounded-xl border transition duration-150 flex items-start gap-2.5 select-none relative group ${
                      isCustomizeMode ? 'cursor-default' : 'cursor-pointer'
                    } ${
                      isChecked 
                        ? 'bg-purple-950/10 border-purple-500/20 text-slate-400 opacity-60' 
                        : 'bg-slate-950 border-slate-850 hover:border-slate-700'
                    }`}
                  >
                    {!isCustomizeMode && (
                      <input
                        type="checkbox"
                        checked={!!isChecked}
                        readOnly
                        className="mt-0.5 accent-purple-500 cursor-pointer w-3.5 h-3.5"
                      />
                    )}
                    <div className="space-y-0.5 pr-12 min-w-0 flex-1">
                      <span className={`block text-[10px] font-extrabold tracking-tight leading-tight truncate ${isChecked ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                        {pillar.title}
                      </span>
                      {pillar.desc && (
                        <span className="block text-[8px] text-slate-500 leading-normal font-medium truncate">
                          {pillar.desc}
                        </span>
                      )}
                    </div>
                    {isCustomizeMode && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => startEditPillar(pillar, e)}
                          className="p-1 rounded bg-slate-900 hover:bg-slate-850 text-[8px]"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePillar(pillar.id, e)}
                          className="p-1 rounded bg-rose-500/15 border border-rose-500/20 text-[8px] text-rose-400"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* Column 2: Focus Consistency Heatmap & Levels */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg flex flex-col justify-between gap-4 lg:col-span-1 min-h-[360px]">
          <div className="space-y-1.5 border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">Consistency Grid</h3>
            <p className="text-[10px] text-slate-500">28 days tracking contribution grids.</p>
          </div>

          <div className="grid grid-cols-7 gap-1.5 bg-slate-950 p-3 rounded-2xl border border-slate-850 justify-center">
            {last28Days.map((day) => {
              const count = history[day.dateStr] || 0
              
              let cellColor = 'bg-slate-900 border-slate-950'
              if (count === 1 || count === 2) {
                cellColor = 'bg-purple-950/50 border-purple-900/40 text-purple-400'
              } else if (count === 3 || count === 4) {
                cellColor = 'bg-purple-700/30 border-purple-500/30 text-purple-300 shadow-sm shadow-purple-900/10'
              } else if (count >= 5) {
                cellColor = 'bg-purple-500/40 border-purple-400/40 text-purple-100 shadow shadow-purple-500/20'
              }

              const isToday = day.dateStr === todayKey

              return (
                <div
                  key={day.dateStr}
                  className={`w-6 h-6 rounded border flex items-center justify-center text-[8px] font-bold transition-all ${cellColor} ${
                    isToday ? 'ring-1.5 ring-purple-500 scale-105' : ''
                  }`}
                  title={`${day.formatted}: ${count} Focus completed`}
                >
                  {day.dayNum}
                </div>
              )
            })}
          </div>

          <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-2xl flex flex-col justify-center gap-1.5 select-none">
            <div className="flex items-center gap-2 justify-between">
              <span className="text-[10px] font-black text-slate-300">Level Rank:</span>
              <span className="text-[10px] font-black text-indigo-400 flex items-center gap-1">
                <span>{gamifiedStreak.levelEmoji}</span>
                <span>{gamifiedStreak.levelName}</span>
              </span>
            </div>
            <div className="space-y-1">
              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all" style={{ width: `${gamifiedStreak.progress}%` }}></div>
              </div>
              <span className="block text-[8px] text-slate-500 font-bold text-right">
                {gamifiedStreak.nextLevelDays > 0 ? `Level Up in ${gamifiedStreak.nextLevelDays} active days` : 'Max Rank Reached'}
              </span>
            </div>
          </div>
        </section>

        {/* Column 3: English & Communication Practice Lab (2 Columns) */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg space-y-4 flex flex-col justify-between lg:col-span-2 min-h-[360px]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">🗣️ English Practice Lab</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Write technical logs & talk specs in English.</p>
            </div>

            {/* 1.5 Hour Timer */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-xl">
              <span className={`w-1.5 h-1.5 rounded-full ${timerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="text-[10px] font-mono font-black text-slate-100 tracking-wider">
                {formatTimerDisplay(englishTimerSeconds)}
              </span>
              
              <button 
                type="button"
                onClick={handleToggleTimer}
                className={`text-[8px] font-bold px-1.5 py-0.5 rounded transition leading-none ${
                  timerRunning ? 'bg-rose-500/15 border border-rose-500/20 text-rose-400' : 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400'
                }`}
              >
                {timerRunning ? 'Pause' : 'Start'}
              </button>
              
              <button
                type="button"
                onClick={handleResetTimer}
                className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition leading-none"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid gap-3.5 md:grid-cols-2 flex-1">
            {/* Notepad area */}
            <div className="space-y-1.5 flex flex-col">
              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                <span>Practice Journal</span>
                <span className="text-indigo-400">{englishText.trim().split(/\s+/).filter(Boolean).length} Words</span>
              </div>
              <textarea
                value={englishText}
                onChange={handleTextChange}
                placeholder="Write your logs, summarize systems, or draft freelance proposals in English here. Target 1.5 hours of focus..."
                className="w-full flex-1 rounded-xl border border-slate-850 bg-slate-950 px-3 py-2 text-[10px] text-slate-250 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans resize-none min-h-[120px]"
              />
            </div>

            {/* Prompts & Vocab sidebar */}
            <div className="space-y-3 flex flex-col justify-between">
              {/* Prompt Box */}
              <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl relative space-y-1 text-left">
                <div className="flex justify-between items-center text-[8px] font-extrabold uppercase tracking-widest text-slate-500">
                  <span>Practice Prompt</span>
                  <button type="button" onClick={handleNextPrompt} className="hover:text-slate-350 text-indigo-400 transition">Next ➡️</button>
                </div>
                <p className="text-[10px] font-bold text-slate-250 leading-relaxed">
                  {writingPrompts[promptIndex]}
                </p>
              </div>

              {/* Vocab Box */}
              <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl relative space-y-1 text-left">
                <div className="flex justify-between items-center text-[8px] font-extrabold uppercase tracking-widest text-slate-500">
                  <span>Tech Vocabulary</span>
                  <button type="button" onClick={handleNextVocab} className="hover:text-slate-350 text-indigo-400 transition">Cycle ➡️</button>
                </div>
                <span className="block text-[10px] font-black text-indigo-400">{technicalVocab[vocabIndex]?.word}</span>
                <p className="text-[9px] text-slate-450 leading-relaxed font-semibold">
                  <strong>Def:</strong> {technicalVocab[vocabIndex]?.definition}
                </p>
                <p className="text-[8px] text-slate-500 leading-normal italic">
                  "{technicalVocab[vocabIndex]?.example}"
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Motivation Banner Widget */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 min-h-[160px] flex flex-col justify-center p-8 shadow-xl">
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-300"
          style={{
            backgroundImage: bgError 
              ? 'linear-gradient(135deg, rgba(88, 28, 135, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)' 
              : 'url("/src/assets/motivation_cover.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        {!bgError && (
          <img 
            src="/src/assets/motivation_cover.png" 
            className="hidden" 
            onError={() => setBgError(true)} 
            alt="Check"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent pointer-events-none"></div>

        <div className="z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-[9px] font-extrabold text-purple-400 uppercase tracking-widest">
              ⚡ Focus Motivation
            </span>
            <p className="text-base font-extrabold text-slate-100 italic leading-relaxed tracking-tight">
              "{motivationalQuotes[currentQuoteIndex]?.text}"
            </p>
            <p className="text-xs text-slate-500 font-bold">— {motivationalQuotes[currentQuoteIndex]?.author}</p>
          </div>
          
          <button
            type="button"
            onClick={handleNextQuote}
            className="self-start md:self-auto rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 transition"
          >
            🔄 Cycle Quote
          </button>
        </div>
      </div>

      {/* Interactive Planner Panel on Dashboard */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <h3 className="text-base font-bold text-slate-100 tracking-tight">Workspace Tasks Check-list</h3>
            <p className="text-xs text-slate-500 mt-0.5">Inspect and toggle status of planning tasks directly from the dashboard.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              placeholder="Search workspace tasks..."
              className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 min-w-[180px] h-9"
            />

            <select
              value={timescaleFilter}
              onChange={(e) => setTimescaleFilter(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 h-9"
            >
              <option value="All">All Planning</option>
              <option value="Daily">📆 Daily Tasks</option>
              <option value="Weekly">📅 Weekly Goals</option>
              <option value="Yearly">🏆 Yearly Milestones</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 h-9"
            >
              <option value="Active">Active Tasks</option>
              <option value="All">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl mb-3 text-slate-500">
              📋
            </div>
            <p className="text-xs text-slate-400 font-semibold">No tasks found matching current filters.</p>
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="mt-4 rounded-xl border border-indigo-500/20 hover:border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2 text-xs font-bold text-indigo-300 transition duration-200"
            >
              Go to Planner
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedTasks.map((task) => {
              const isCompleted = task.status === 'Completed'
              
              let priorityBadge = 'border-slate-800 bg-slate-950/50 text-slate-400'
              if (task.priority === 'High') {
                priorityBadge = 'border-rose-500/25 bg-rose-500/10 text-rose-400 shadow shadow-rose-500/5'
              } else if (task.priority === 'Medium') {
                priorityBadge = 'border-amber-500/25 bg-amber-500/10 text-amber-400'
              } else if (task.priority === 'Low') {
                priorityBadge = 'border-sky-500/25 bg-sky-500/10 text-sky-400'
              }

              let timescaleEmoji = '📆'
              if (task.category === 'Weekly') timescaleEmoji = '📅'
              if (task.category === 'Yearly') timescaleEmoji = '🏆'

              return (
                <div 
                  key={task._id} 
                  className={`p-4 rounded-2xl bg-slate-950 border transition-all duration-200 flex flex-col justify-between gap-4 ${
                    isCompleted 
                      ? 'border-slate-850 opacity-50' 
                      : 'border-slate-800/80 hover:border-indigo-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <p className={`text-xs font-bold leading-relaxed break-words ${isCompleted ? 'line-through text-slate-600' : 'text-slate-200'}`}>
                        {task.title}
                      </p>
                      
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className={`inline-flex items-center gap-1 text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full border ${priorityBadge}`}>
                          {task.priority === 'High' && <span className="w-1.5.h-1.5 rounded-full bg-rose-500 animate-pulse"></span>}
                          {task.priority}
                        </span>
                        
                        <span className="inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-slate-800 bg-slate-900/40 text-slate-400">
                          {timescaleEmoji} {task.category}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task._id)}
                      className="text-slate-700 hover:text-rose-400 text-xs transition p-1 leading-none"
                      title="Delete task"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-900 p-1 border border-slate-850 select-none">
                    {[
                      { statusName: 'Not Started', label: 'Start', activeColor: 'bg-slate-800 text-slate-100 border-slate-700' },
                      { statusName: 'Pending', label: 'Pending', activeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/20' },
                      { statusName: 'Completed', label: 'Done', activeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' }
                    ].map((btn) => {
                      const isActive = task.status === btn.statusName
                      return (
                        <button
                          key={btn.statusName}
                          type="button"
                          onClick={() => handleUpdateStatus(task._id, btn.statusName)}
                          className={`py-1 text-[8px] font-bold rounded-lg border transition-all leading-none ${
                            isActive 
                              ? `${btn.activeColor} border` 
                              : 'text-slate-500 hover:text-slate-300 border-transparent'
                          }`}
                        >
                          {btn.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
