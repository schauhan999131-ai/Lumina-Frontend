import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import FocusTimer from './pages/FocusTimer'
import StudyNotes from './pages/StudyNotes'
import WealthVault from './pages/WealthVault'
import HealthVault from './pages/HealthVault'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { useAppStore } from './store'
import './App.css'

// Preset avatars for profile customization
export const presetAvatars = [
  { id: 'dev', emoji: '💻', bg: 'bg-purple-600/30 border-purple-500/40 text-purple-300' },
  { id: 'scholar', emoji: '🎓', bg: 'bg-indigo-600/30 border-indigo-500/40 text-indigo-300' },
  { id: 'designer', emoji: '🎨', bg: 'bg-pink-600/30 border-pink-500/40 text-pink-300' },
  { id: 'writer', emoji: '✍️', bg: 'bg-amber-600/30 border-amber-500/40 text-amber-300' },
  { id: 'scientist', emoji: '🚀', bg: 'bg-sky-600/30 border-sky-500/40 text-sky-300' },
]

export function renderAvatar(picUrl, className = "w-10 h-10") {
  if (picUrl && picUrl.startsWith('data:image')) {
    return <img src={picUrl} className={`${className} rounded-full object-cover border border-purple-500/30`} alt="Avatar" />
  }
  const preset = presetAvatars.find(p => p.id === picUrl)
  if (preset) {
    return (
      <div className={`${className} rounded-full flex items-center justify-center border ${preset.bg} text-xl select-none font-bold`}>
        {preset.emoji}
      </div>
    )
  }
  return (
    <div className={`${className} rounded-full flex items-center justify-center bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-lg select-none`}>
      👤
    </div>
  )
}

function MainLayout() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const userEmail = useAppStore((state) => state.userEmail)
  const role = useAppStore((state) => state.role)
  const profilePicture = useAppStore((state) => state.profilePicture)
  const occupation = useAppStore((state) => state.occupation)
  const isSubscribedYoutube = useAppStore((state) => state.isSubscribedYoutube)
  
  const logout = useAppStore((state) => state.logout)
  const checkAuth = useAppStore((state) => state.checkAuth)
  const updateProfile = useAppStore((state) => state.updateProfile)
  const subscribeYoutube = useAppStore((state) => state.subscribeYoutube)

  const [clickedSub, setClickedSub] = useState(false)
  const [subLoading, setSubLoading] = useState(false)

  const handleConfirmUnlock = async () => {
    setSubLoading(true)
    try {
      await subscribeYoutube()
    } catch (err) {
      console.error(err)
    } finally {
      setSubLoading(false)
    }
  }
  
  const navigate = useNavigate()
  const location = useLocation()
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
  
  // Profile Editor Form State
  const [editedPic, setEditedPic] = useState('')
  const [editedOcc, setEditedOcc] = useState('Developer')
  const [saveLoading, setSaveLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)
  
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Open profile modal and sync current state
  const openProfileModal = () => {
    setEditedPic(profilePicture || '')
    setEditedOcc(occupation || 'Developer')
    setProfileError(null)
    setIsProfileModalOpen(true)
  }

  // Handle uploaded profile picture
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        setProfileError('File size is too large. Limit is 1.5MB.')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditedPic(reader.result)
        setProfileError(null)
      }
      reader.readAsDataURL(file)
    }
  }

  // Save changes to profile
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaveLoading(true)
    setProfileError(null)
    try {
      await updateProfile({
        profilePicture: editedPic,
        occupation: editedOcc
      })
      setIsProfileModalOpen(false)
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.')
    } finally {
      setSaveLoading(false)
    }
  }

  const menuItems = useMemo(() => {
    return [
      { path: '/', label: 'Dashboard', icon: '📊' },
      { path: '/tasks', label: 'Tasks', icon: '📋' },
      { path: '/focus', label: 'Focus Timer', icon: '⏱️' },
      { path: '/vault', label: 'Knowledge Vault', icon: '📚' },
      { path: '/wealth', label: 'Wealth Vault', icon: '💵' },
      { path: '/health', label: 'Health Vault', icon: '🥗' },
    ]
  }, [])

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full text-slate-300">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
            <span className="text-xl">⚡</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Lumina</h1>
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-0.5">Deep Work Mode</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/15'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer Controls */}
      <div className="space-y-4 pt-6 border-t border-slate-900">
        <button
          type="button"
          onClick={() => {
            navigate('/focus')
            setIsMobileMenuOpen(false)
          }}
          className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3.5 text-xs font-bold shadow-lg shadow-purple-600/20 hover:scale-[1.02] active:scale-95 transition duration-200"
        >
          Start Focus Session
        </button>

        <button
          type="button"
          onClick={() => {
            setIsHelpModalOpen(true)
            setIsMobileMenuOpen(false)
          }}
          className="flex items-center gap-3 px-4 py-2 w-full text-slate-400 hover:text-slate-200 text-sm font-semibold transition"
        >
          <span>❓</span>
          <span>Help</span>
        </button>

        <button
          type="button"
          onClick={() => {
            logout()
            setIsMobileMenuOpen(false)
          }}
          className="flex items-center gap-3 px-4 py-2 w-full text-rose-400 hover:text-rose-300 text-sm font-semibold transition"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  )

  // If authenticated but not subscribed, render subscription wall
  if (isAuthenticated && !isSubscribedYoutube) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glowing background circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-md relative z-10 animate-fade-in">
          <div className="rounded-3xl border border-purple-500/20 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-4xl shadow-lg shadow-rose-500/10 animate-pulse mx-auto">
              📺
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">YouTube Subscription Required</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                To activate and unlock the **Lumina Personal Growth & Wealth Operating System**, please subscribe to the Coding Yatra YouTube channel.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl text-left space-y-3">
              <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Subscription Steps</span>
              <div className="flex gap-3 text-xs">
                <span className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">1</span>
                <p className="text-slate-300">Click the button below to visit our channel and click **Subscribe**.</p>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">2</span>
                <p className="text-slate-300">Return here and click **Confirm Subscription & Unlock** to get full workspace access.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <a
                href="https://www.youtube.com/@CodingYatrasoftware?sub_confirmation=1"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setClickedSub(true)}
                className="w-full rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white py-3.5 text-sm font-bold shadow-lg shadow-rose-600/20 active:scale-95 transition duration-200 flex items-center justify-center gap-2 animate-bounce-slow"
              >
                <span>📺</span> Subscribe to Coding Yatra
              </a>

              {clickedSub && (
                <button
                  type="button"
                  onClick={handleConfirmUnlock}
                  disabled={subLoading}
                  className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3.5 text-sm font-bold shadow-lg shadow-purple-600/20 hover:scale-[1.02] active:scale-95 transition duration-200 disabled:opacity-50"
                >
                  {subLoading ? 'Verifying subscription...' : '⚡ Confirm Subscription & Unlock'}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => logout()}
              className="text-xs text-slate-500 hover:text-slate-450 transition font-bold"
            >
              Sign out of account
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {isAuthenticated ? (
        <>
          {/* Desktop Left Sidebar */}
          <aside className="hidden lg:block w-64 h-screen sticky top-0 bg-slate-950/80 border-r border-slate-900 p-6 z-40 backdrop-blur-md">
            {sidebarContent}
          </aside>

          {/* Mobile Top Header */}
          <header className="lg:hidden flex justify-between items-center bg-slate-950/85 backdrop-blur-md border-b border-slate-900 px-6 py-4 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg border border-slate-800 text-slate-200 hover:bg-slate-900 focus:outline-none"
              >
                🍔
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-lg">⚡</span>
                <span className="text-lg font-bold text-white tracking-tight">Lumina</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button type="button" className="text-xl text-slate-400 hover:text-slate-200">
                🔔
              </button>
              
              {/* Profile Avatar Trigger */}
              <div className="relative group cursor-pointer" onClick={openProfileModal}>
                {renderAvatar(profilePicture, "w-10 h-10")}
                <div className="absolute -bottom-1 -right-1 bg-purple-600 hover:bg-purple-500 rounded-full p-1 border border-slate-950 transition duration-150">
                  <span className="block text-[8px]">✏️</span>
                </div>
              </div>
            </div>
          </header>

          {/* Mobile Drawer Overlay */}
          {isMobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 bg-black/60 z-50 flex">
              <div className="w-64 bg-slate-950 border-r border-slate-900 p-6 h-full flex flex-col justify-between animate-slide-in">
                {sidebarContent}
              </div>
              <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)}></div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Desktop Top Header */}
            <header className="hidden lg:flex justify-between items-center bg-slate-950/50 backdrop-blur-sm border-b border-slate-900 px-8 py-4 sticky top-0 z-30">
              <div className="text-xs text-slate-500 font-medium">
                Deep Work Workspace • Lumina Companion
              </div>
              
              <div className="flex items-center gap-6">
                <button type="button" className="text-xl text-slate-400 hover:text-slate-200 transition">
                  🔔
                </button>
                
                {/* Profile Picture Trigger with edit button */}
                <div className="relative group cursor-pointer" onClick={openProfileModal}>
                  {renderAvatar(profilePicture, "w-10 h-10")}
                  <div className="absolute -bottom-1 -right-1 bg-purple-600 hover:bg-purple-500 rounded-full p-1 border border-slate-950 transition duration-150 shadow shadow-purple-600/50">
                    <span className="block text-[8px] leading-none">✏️</span>
                  </div>
                </div>
              </div>
            </header>

            {/* Content Viewport */}
            <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/focus" element={<FocusTimer />} />
                <Route path="/vault" element={<StudyNotes />} />
                <Route path="/wealth" element={<WealthVault />} />
                <Route path="/health" element={<HealthVault />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </>
      ) : (
        <main className="flex-1">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      )}

      {/* Profile Editor Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in text-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Edit Profile Settings</h3>
              <button 
                type="button" 
                onClick={() => setIsProfileModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-lg"
              >
                ✕
              </button>
            </div>

            {profileError && (
              <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                {profileError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Picture Preview and File upload */}
              <div>
                <span className="block text-xs font-semibold text-slate-400 mb-2">Profile Avatar</span>
                <div className="flex items-center gap-4">
                  {renderAvatar(editedPic, "w-16 h-16")}
                  
                  <div className="space-y-2 flex-1">
                    <label className="block">
                      <span className="sr-only">Choose profile photo</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-xs text-slate-400
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-xs file:font-semibold
                          file:bg-purple-600/10 file:text-purple-300
                          file:hover:bg-purple-600/20
                          file:cursor-pointer"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500">Max size 1.5MB. PNG, JPG, or WEBP.</p>
                  </div>
                </div>
              </div>

              {/* Preset Avatar Selection */}
              <div>
                <span className="block text-xs font-semibold text-slate-400 mb-2">Or Choose a Preset Avatar</span>
                <div className="flex gap-2">
                  {presetAvatars.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setEditedPic(preset.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center border text-xl transition-all ${
                        editedPic === preset.id
                          ? 'border-purple-500 ring-2 ring-purple-500/40 scale-110'
                          : 'border-slate-800 hover:border-slate-700'
                      } ${preset.bg}`}
                    >
                      {preset.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Occupation/Field input */}
              <label className="block text-xs font-semibold text-slate-400">
                Your Professional Field / Occupation
                <select
                  value={editedOcc}
                  onChange={(e) => setEditedOcc(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="Developer">Software Developer</option>
                  <option value="Scholar">Student / Scholar</option>
                  <option value="Designer">Product Designer</option>
                  <option value="Writer">Writer / Creator</option>
                  <option value="Researcher">Academic Researcher</option>
                  <option value="General">General Deep Worker</option>
                </select>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-800 hover:border-slate-700 bg-slate-950 py-3 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 py-3 text-xs font-semibold text-white shadow-lg shadow-purple-500/10 hover:from-purple-600 hover:to-indigo-700 transition disabled:opacity-50"
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl text-slate-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>⚡</span>
                <span>Lumina Deep Work Mode Help</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setIsHelpModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed max-h-[400px] overflow-y-auto pr-1">
              <p>Welcome to <strong>Lumina</strong>! This interface is custom-designed for creators, software developers, designers, and students looking to structure study blocks and focus cycles.</p>

              <div>
                <h4 className="font-semibold text-purple-400 mb-1">📊 Study Dashboard</h4>
                <p>Monitor your performance, streaks, focus stats, and historical completion trends. The graph ranges can toggle between Daily, Monthly, and Yearly completions dynamically.</p>
              </div>

              <div>
                <h4 className="font-semibold text-purple-400 mb-1">📋 Tasks Scheduler</h4>
                <p>Plan out tasks for specific fields or subjects. Toggle completion directly in the planner, and your completion count registers in the analytics graph.</p>
              </div>

              <div>
                <h4 className="font-semibold text-purple-400 mb-1">⏱️ Focus Timer (Pomodoro)</h4>
                <p>Start Pomodoro focus cycles (25 minutes) alternating with Short Breaks (5 minutes) and Long Breaks (15 minutes). Completed sessions automatically increment your focus minutes shown on the Dashboard.</p>
              </div>

              <div>
                <h4 className="font-semibold text-purple-400 mb-1">📚 Knowledge Vault</h4>
                <p>Write documentation, log design guides, and compile concepts for future reference.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHelpModalOpen(false)}
              className="mt-6 w-full rounded-2xl bg-slate-950 hover:bg-slate-900 border border-slate-800 py-3 text-xs font-semibold transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  )
}

