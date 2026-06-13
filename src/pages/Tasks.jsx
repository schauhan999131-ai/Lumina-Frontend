import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '../store'

export default function Tasks() {
  const tasks = useAppStore((state) => state.tasks)
  const getTasks = useAppStore((state) => state.getTasks)
  const addTask = useAppStore((state) => state.addTask)
  const updateTask = useAppStore((state) => state.updateTask)
  const removeTask = useAppStore((state) => state.removeTask)

  // Navigation Tabs: 'boards' | 'modeler'
  const [activeTab, setActiveTab] = useState('boards')

  // Standard Task Form State
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Daily') // 'Daily', 'Weekly', 'Yearly'
  const [priority, setPriority] = useState('Medium') // 'High', 'Medium', 'Low'
  
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  // Architecture Modeler State
  const [projectName, setProjectName] = useState('')
  const [techStack, setTechStack] = useState('React, Node, Express, MongoDB')
  const [routesInput, setRoutesInput] = useState('/, /login, /dashboard, /settings')
  const [endpointsInput, setEndpointsInput] = useState('POST /api/auth/login, GET /api/tasks, PUT /api/tasks/:id')
  const [collectionsInput, setCollectionsInput] = useState('users, tasks, logs')
  const [featuresInput, setFeaturesInput] = useState('JWT Authentication, Real-time notification, Theme toggle')
  
  const [modeledProject, setModeledProject] = useState(null)
  const [generatedTasks, setGeneratedTasks] = useState([])
  const [importLoading, setImportLoading] = useState(false)
  const [modelSuccessMsg, setModelSuccessMsg] = useState('')

  useEffect(() => {
    setLoading(true)
    getTasks()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [getTasks])

  // Filter tasks into columns
  const dailyTasks = useMemo(() => tasks.filter(t => t.category === 'Daily'), [tasks])
  const weeklyTasks = useMemo(() => tasks.filter(t => t.category === 'Weekly'), [tasks])
  const yearlyTasks = useMemo(() => tasks.filter(t => t.category === 'Yearly'), [tasks])

  const handleAddTask = async (event) => {
    event.preventDefault()
    if (!title.trim()) return
    setError(null)
    try {
      await addTask({
        title: title.trim(),
        category,
        priority,
        status: 'Not Started'
      })
      setTitle('')
    } catch (err) {
      setError(err.message || 'Failed to add task.')
    }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus })
    } catch (err) {
      setError(err.message || 'Failed to update task status.')
    }
  }

  const handleDelete = async (taskId) => {
    try {
      await removeTask(taskId)
    } catch (err) {
      setError(err.message || 'Failed to delete task.')
    }
  }

  // Sort helper: High priority first, then Medium, then Low. Group completed at the bottom.
  const sortTasks = (taskList) => {
    const priorityWeight = { High: 3, Medium: 2, Low: 1 }
    return [...taskList].sort((a, b) => {
      const aComp = a.status === 'Completed' ? 1 : 0
      const bComp = b.status === 'Completed' ? 1 : 0
      if (aComp !== bComp) return aComp - bComp
      return (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2)
    })
  }

  // Generate Architecture Map and Tasks
  const handleModelProject = (e) => {
    e.preventDefault()
    if (!projectName.trim()) return

    const routes = routesInput.split(',').map(r => r.trim()).filter(Boolean)
    const endpoints = endpointsInput.split(',').map(e => e.trim()).filter(Boolean)
    const collections = collectionsInput.split(',').map(c => c.trim()).filter(Boolean)
    const features = featuresInput.split(',').map(f => f.trim()).filter(Boolean)

    const project = {
      name: projectName.trim(),
      techStack: techStack.trim(),
      routes,
      endpoints,
      collections,
      features
    }

    // Generate smart setup task suggestions
    const tasksList = []
    
    // 1. Database Collections setup
    collections.forEach((col) => {
      tasksList.push({
        id: `db-${col}`,
        title: `Database: Design Mongoose schema and index validations for [${col}]`,
        category: 'Weekly',
        priority: 'High',
        checked: true
      })
    })

    // 2. Frontend Routes setup
    routes.forEach((route) => {
      tasksList.push({
        id: `fe-${route}`,
        title: `Frontend: Build layout view and controller bindings for route [${route}]`,
        category: 'Daily',
        priority: 'Medium',
        checked: true
      })
    })

    // 3. Backend API Endpoints setup
    endpoints.forEach((ep) => {
      tasksList.push({
        id: `be-${ep}`,
        title: `Backend: Write endpoint route controller logic for [${ep}]`,
        category: 'Weekly',
        priority: 'High',
        checked: true
      })
    })

    // 4. Feature implementation
    features.forEach((feat) => {
      tasksList.push({
        id: `ft-${feat}`,
        title: `Feature: Code the workflow logic and run tests for [${feat}]`,
        category: 'Daily',
        priority: 'Medium',
        checked: true
      })
    })

    setModeledProject(project)
    setGeneratedTasks(tasksList)
    setModelSuccessMsg('Website structure modeled successfully! Check the generated checklist below.')
    setTimeout(() => setModelSuccessMsg(''), 4000)
  }

  // Toggle checklist checkboxes
  const handleToggleTaskCheck = (taskId) => {
    setGeneratedTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, checked: !t.checked } : t)
    )
  }

  // Update dynamic task priority/category in checklist
  const handleModifyGeneratedTask = (taskId, field, value) => {
    setGeneratedTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, [field]: value } : t)
    )
  }

  // Batch import selected generated tasks onto boards
  const handleImportTasks = async () => {
    const importable = generatedTasks.filter(t => t.checked)
    if (importable.length === 0) return

    setImportLoading(true)
    setError(null)
    try {
      // Create all tasks in sequence
      for (const t of importable) {
        await addTask({
          title: `${modeledProject.name} - ${t.title}`,
          category: t.category,
          priority: t.priority,
          status: 'Not Started'
        })
      }
      // Reset form and model states
      setProjectName('')
      setModeledProject(null)
      setGeneratedTasks([])
      setActiveTab('boards') // Route back to planner boards to show imports
    } catch (err) {
      setError(err.message || 'Failed to import architecture tasks.')
    } finally {
      setImportLoading(false)
    }
  }

  const renderTaskCard = (task) => {
    const isCompleted = task.status === 'Completed'
    
    let priorityBadge = 'border-slate-800 bg-slate-900/50 text-slate-400'
    if (task.priority === 'High') {
      priorityBadge = 'border-rose-500/20 bg-rose-500/10 text-rose-400 shadow shadow-rose-500/5'
    } else if (task.priority === 'Medium') {
      priorityBadge = 'border-amber-500/20 bg-amber-500/10 text-amber-400'
    } else if (task.priority === 'Low') {
      priorityBadge = 'border-sky-500/20 bg-sky-500/10 text-sky-400'
    }

    return (
      <div 
        key={task._id} 
        className={`p-4 rounded-2xl bg-slate-900 border transition-all duration-200 group flex flex-col justify-between gap-4 ${
          isCompleted 
            ? 'border-slate-850 opacity-60' 
            : 'border-slate-800/80 hover:border-purple-500/30'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className={`text-sm font-semibold leading-relaxed break-words ${isCompleted ? 'line-through text-slate-500' : 'text-slate-100'}`}>
              {task.title}
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${priorityBadge}`}>
                {task.priority === 'High' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>}
                {task.priority} Priority
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleDelete(task._id)}
            className="text-slate-600 hover:text-rose-400 text-xs transition p-1"
            title="Delete task"
          >
            ✕
          </button>
        </div>

        {/* Status Toggle Button Bar */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950 p-1 border border-slate-850/50 select-none">
          {[
            { statusName: 'Not Started', label: 'Start', color: 'text-slate-400 hover:text-slate-200 border-transparent', activeColor: 'bg-slate-800 text-slate-100 border-slate-700' },
            { statusName: 'Pending', label: 'Pending', color: 'text-amber-500/60 hover:text-amber-400 border-transparent', activeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/20' },
            { statusName: 'Completed', label: 'Done', color: 'text-emerald-500/60 hover:text-emerald-400 border-transparent', activeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' }
          ].map((btn) => {
            const isActive = task.status === btn.statusName
            return (
              <button
                key={btn.statusName}
                type="button"
                onClick={() => handleStatusChange(task._id, btn.statusName)}
                className={`py-1.5 text-[9px] font-bold rounded-lg border transition-all leading-none ${
                  isActive ? btn.activeColor : btn.color
                }`}
              >
                {btn.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-slate-200">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg shadow-slate-950/20 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Deep Work Task Planner</h2>
          <p className="mt-2 text-sm text-slate-400">
            Structure your day, align your weekly sprints, and map out your yearly milestones.
          </p>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex rounded-2xl border border-slate-800 bg-slate-950 p-1 self-start select-none">
          <button
            type="button"
            onClick={() => setActiveTab('boards')}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'boards'
                ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300 shadow-md shadow-purple-600/5'
                : 'text-slate-400 border border-transparent hover:text-slate-200'
            }`}
          >
            <span>📋</span> Planner Boards
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('modeler')}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'modeler'
                ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300 shadow-md shadow-purple-600/5'
                : 'text-slate-400 border border-transparent hover:text-slate-200'
            }`}
          >
            <span>🏗️</span> Architecture Modeler
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* VIEW 1: Planner Boards Tab */}
      {activeTab === 'boards' && (
        <>
          {/* Creator Form */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg animate-fade-in">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400 mb-4">Add Planning Task</h3>
            <form onSubmit={handleAddTask} className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto] items-end">
              <label className="block text-xs font-semibold text-slate-300">
                Task Description
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="e.g. Architect API gateway or design landing page mockups"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-300">
                Planning Type
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="Daily">Today Planning</option>
                  <option value="Weekly">Weekly Planning</option>
                  <option value="Yearly">Yearly Planning</option>
                </select>
              </label>

              <label className="block text-xs font-semibold text-slate-300">
                Task Priority
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="High">🔴 High Priority</option>
                  <option value="Medium">🟡 Medium Priority</option>
                  <option value="Low">🔵 Low Priority</option>
                </select>
              </label>

              <button
                type="submit"
                className="rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/15 hover:from-purple-600 hover:to-indigo-700 transition"
              >
                Create Task
              </button>
            </form>
          </section>

          {/* 3 Column Planning Grid */}
          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-12 text-center text-slate-400">
              Loading planning boards...
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3 animate-fade-in">
              {/* Column 1: Daily Planning */}
              <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/50 p-5 min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <span>📆</span> Daily Tasks
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-bold">
                    {dailyTasks.length}
                  </span>
                </div>
                
                {dailyTasks.length === 0 ? (
                  <p className="text-xs text-slate-600 italic py-6 text-center">No daily tasks scheduled.</p>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[500px]">
                    {sortTasks(dailyTasks).map(renderTaskCard)}
                  </div>
                )}
              </div>

              {/* Column 2: Weekly Planning */}
              <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/50 p-5 min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <span>📅</span> Weekly Goals
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-bold">
                    {weeklyTasks.length}
                  </span>
                </div>
                
                {weeklyTasks.length === 0 ? (
                  <p className="text-xs text-slate-600 italic py-6 text-center">No weekly goals scheduled.</p>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[500px]">
                    {sortTasks(weeklyTasks).map(renderTaskCard)}
                  </div>
                )}
              </div>

              {/* Column 3: Yearly Planning */}
              <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/50 p-5 min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <span>🏆</span> Yearly Milestones
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-bold">
                    {yearlyTasks.length}
                  </span>
                </div>
                
                {yearlyTasks.length === 0 ? (
                  <p className="text-xs text-slate-600 italic py-6 text-center">No yearly milestones scheduled.</p>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[500px]">
                    {sortTasks(yearlyTasks).map(renderTaskCard)}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* VIEW 2: Architecture Modeler Tab */}
      {activeTab === 'modeler' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] items-start animate-fade-in">
          {/* Blueprint Form */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg space-y-5">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Architecture Modeler</h3>
              <p className="text-xs text-slate-500 mt-1">Design sitemaps & schemas for any project.</p>
            </div>

            {modelSuccessMsg && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 font-semibold">
                {modelSuccessMsg}
              </div>
            )}

            <form onSubmit={handleModelProject} className="space-y-4">
              <label className="block text-xs font-semibold text-slate-300">
                Website / App Name
                <input
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  placeholder="e.g. Portfolio site, E-Commerce platform"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-300">
                Target Technology Stack
                <input
                  required
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  placeholder="e.g. React, Express, MongoDB, Node"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-300">
                Client Page Routes (Comma separated)
                <textarea
                  rows={2}
                  required
                  value={routesInput}
                  onChange={(e) => setRoutesInput(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  placeholder="/, /login, /dashboard"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-300">
                Server Endpoints (Comma separated)
                <textarea
                  rows={2}
                  required
                  value={endpointsInput}
                  onChange={(e) => setEndpointsInput(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  placeholder="GET /api/users, POST /api/tasks"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-300">
                Database Tables / Collections (Comma separated)
                <textarea
                  rows={2}
                  required
                  value={collectionsInput}
                  onChange={(e) => setCollectionsInput(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  placeholder="users, products, logs"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-300">
                Core Features / Middleware (Comma separated)
                <textarea
                  rows={2}
                  required
                  value={featuresInput}
                  onChange={(e) => setFeaturesInput(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  placeholder="Stripe Payment, Password Hashing"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg hover:from-purple-600 hover:to-indigo-700 transition"
              >
                Model Website & Generate Tasks
              </button>
            </form>
          </section>

          {/* Topology Preview & Checklist importer */}
          <div className="space-y-6">
            {!modeledProject ? (
              <div className="rounded-3xl border border-slate-800 border-dashed p-16 text-center text-slate-500 bg-slate-950/20">
                <div className="text-3xl mb-4">🏗️</div>
                <h4 className="text-sm font-semibold text-slate-400">Empty Topology Slate</h4>
                <p className="text-xs text-slate-600 mt-2 max-w-[280px] mx-auto leading-relaxed">
                  Fill in the architecture specs on the left and click submit to map the sitemap and generate checklist tasks.
                </p>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                {/* Visual System Topology Map */}
                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl space-y-5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-400">Topology Map</span>
                    <span className="text-[10px] font-bold text-slate-500">Stack: {modeledProject.techStack}</span>
                  </div>
                  <h4 className="text-base font-black text-slate-100 leading-none">{modeledProject.name}</h4>

                  {/* Flow Map Blocks */}
                  <div className="grid gap-4 md:grid-cols-3 items-stretch relative mt-4">
                    {/* Block A: Client */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
                      <span className="block text-[8px] font-extrabold uppercase tracking-widest text-slate-500">Client UI (Routes)</span>
                      <div className="mt-2.5 space-y-1">
                        {modeledProject.routes.map(r => (
                          <span key={r} className="block text-[10px] font-mono text-purple-300 truncate bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">{r}</span>
                        ))}
                      </div>
                    </div>

                    {/* Block B: API Server */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between relative">
                      <span className="block text-[8px] font-extrabold uppercase tracking-widest text-slate-500">API Gateway (Endpoints)</span>
                      <div className="mt-2.5 space-y-1">
                        {modeledProject.endpoints.map(ep => (
                          <span key={ep} className="block text-[10px] font-mono text-emerald-300 truncate bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">{ep}</span>
                        ))}
                      </div>
                    </div>

                    {/* Block C: Datastore */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
                      <span className="block text-[8px] font-extrabold uppercase tracking-widest text-slate-500">DB Datastore (Collections)</span>
                      <div className="mt-2.5 space-y-1">
                        {modeledProject.collections.map(col => (
                          <span key={col} className="block text-[10px] font-mono text-amber-300 truncate bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">{col}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Features Panel */}
                  <div className="border-t border-slate-850/80 pt-4 flex flex-wrap gap-2">
                    {modeledProject.features.map(f => (
                      <span key={f} className="text-[9px] font-bold px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        ⚙️ {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* generated task list checklist selector */}
                <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300">Generated Implementation Tasks</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Customize timeframes and import checklist to boards.</p>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-slate-950 font-bold border border-slate-850 text-indigo-400">
                      {generatedTasks.filter(t => t.checked).length} Selected
                    </span>
                  </div>

                  {/* Tasks items scroll view */}
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {generatedTasks.map((t) => (
                      <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-850/60 transition">
                        <input
                          type="checkbox"
                          checked={t.checked}
                          onChange={() => handleToggleTaskCheck(t.id)}
                          className="mt-1.5 cursor-pointer accent-purple-500"
                        />
                        <div className="flex-1 space-y-2 min-w-0">
                          <p className={`text-xs font-bold leading-relaxed ${t.checked ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                            {t.title}
                          </p>
                          
                          {/* Modifiers */}
                          <div className="flex flex-wrap gap-2">
                            {/* Category Selector */}
                            <select
                              value={t.category}
                              disabled={!t.checked}
                              onChange={(e) => handleModifyGeneratedTask(t.id, 'category', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[8px] font-bold text-slate-400 focus:outline-none disabled:opacity-50"
                            >
                              <option value="Daily">Daily Board</option>
                              <option value="Weekly">Weekly Board</option>
                              <option value="Yearly">Yearly Board</option>
                            </select>

                            {/* Priority Selector */}
                            <select
                              value={t.priority}
                              disabled={!t.checked}
                              onChange={(e) => handleModifyGeneratedTask(t.id, 'priority', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[8px] font-bold text-slate-400 focus:outline-none disabled:opacity-50"
                            >
                              <option value="High">🔴 High Priority</option>
                              <option value="Medium">🟡 Medium Priority</option>
                              <option value="Low">🔵 Low Priority</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Importer Action */}
                  <button
                    type="button"
                    disabled={importLoading || generatedTasks.filter(t => t.checked).length === 0}
                    onClick={handleImportTasks}
                    className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-purple-500/15 hover:from-purple-600 hover:to-indigo-700 transition disabled:opacity-50"
                  >
                    {importLoading ? 'Importing Tasks to Board...' : `Import Checked Tasks to Planner Boards`}
                  </button>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
