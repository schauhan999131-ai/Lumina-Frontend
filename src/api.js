export const API_BASE = import.meta.env.PROD
  ? ''
  : (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:4000')


async function request(path, options = {}) {
  try {
    let response
    const maxAttempts = 7
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      response = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (![429, 502, 503, 504].includes(response.status) || attempt === maxAttempts - 1) break
      const retryDelay = Math.min(2000 * (attempt + 1), 10000)
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }

    const body = await response.json().catch(() => null)
    
    if (!response.ok) {
      if ([429, 502, 503, 504].includes(response.status)) {
        throw new Error('The backend is waking up or temporarily busy. Please try again in a moment.')
      }
      throw new Error(body?.error || body?.message || `HTTP ${response.status}: ${response.statusText}`)
    }
    
    return body
  } catch (error) {
    // Better error messages
    if (error instanceof TypeError) {
      throw new Error(`Failed to connect to backend at ${API_BASE}. Make sure backend is running.`)
    }
    throw error
  }
}

// Auth API
export const signup = (email, password, role = 'Staff', plan = 'Free') =>
  request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, role, plan }),
  })

export const login = (email, password) =>
  request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const logout = () =>
  request('/api/auth/logout', {
    method: 'POST',
  })

export const getCurrentUser = () =>
  request('/api/auth/me')

// Tasks API
export const fetchTasks = () =>
  request('/api/tasks')

export const createTask = (taskData) =>
  request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData),
  })

export const updateTask = (taskId, updateData) =>
  request(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  })

export const deleteTask = (taskId) =>
  request(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
  })

export const fetchTaskStats = () =>
  request('/api/tasks/stats')

// Admin API
export const fetchAdminUsers = () =>
  request('/api/admin/users')

export const adminCreateUser = (userData) =>
  request('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  })

export const adminUpdateUserPlan = (userId, plan, planStatus) =>
  request(`/api/admin/users/${encodeURIComponent(userId)}/plan`, {
    method: 'PUT',
    body: JSON.stringify({ plan, planStatus }),
  })

export const adminDeleteUser = (userId) =>
  request(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })

// User Plan Upgrade API
export const updateMyPlan = (plan) =>
  request('/api/auth/plan', {
    method: 'PUT',
    body: JSON.stringify({ plan }),
  })

// User Profile Update API
export const updateProfile = (profileData) =>
  request('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  })

export const subscribeYoutube = () =>
  request('/api/auth/youtube-subscribe', {
    method: 'PUT',
  })

// Wealth Ledger API
export const fetchWealthEntries = () =>
  request('/api/wealth')

export const createWealthEntry = (entryData) =>
  request('/api/wealth', {
    method: 'POST',
    body: JSON.stringify(entryData),
  })

export const deleteWealthEntry = (entryId) =>
  request(`/api/wealth/${encodeURIComponent(entryId)}`, {
    method: 'DELETE',
  })

export const parseNoteWealthEntries = (noteId, content) =>
  request('/api/wealth/parse-note', {
    method: 'POST',
    body: JSON.stringify({ noteId, content }),
  })

// Health Tracker API
export const fetchHealthEntries = () =>
  request('/api/health-tracker')

export const createHealthEntry = (entryData) =>
  request('/api/health-tracker', {
    method: 'POST',
    body: JSON.stringify(entryData),
  })

export const deleteHealthEntry = (entryId) =>
  request(`/api/health-tracker/${encodeURIComponent(entryId)}`, {
    method: 'DELETE',
  })

export const parseNoteHealthEntries = (noteId, content) =>
  request('/api/health-tracker/parse-note', {
    method: 'POST',
    body: JSON.stringify({ noteId, content }),
  })

export const getTimerState = () =>
  request('/api/auth/timer')

export const updateTimerState = (timerData) =>
  request('/api/auth/timer', {
    method: 'PUT',
    body: JSON.stringify(timerData),
  })

// Notes API
export const fetchNotes = () =>
  request('/api/notes')

// Fetch a single full note including its (heavy) images, loaded on demand.
export const fetchNote = (noteId) =>
  request(`/api/notes/${encodeURIComponent(noteId)}`)

export const createNote = (noteData) =>
  request('/api/notes', {
    method: 'POST',
    body: JSON.stringify(noteData),
  })

export const updateNote = (noteId, updateData) =>
  request(`/api/notes/${encodeURIComponent(noteId)}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  })

export const deleteNote = (noteId) =>
  request(`/api/notes/${encodeURIComponent(noteId)}`, {
    method: 'DELETE',
  })

// Vocabulary API - Direct npoint.io integration (No Render backend server needed!)
export const NPOINT_VOCAB_URL =
  import.meta.env.VITE_NPOINT_VOCAB_URL || 'https://api.npoint.io/b3908c6fc2b575c85637'

export const fetchVocab = async () => {
  const response = await fetch(NPOINT_VOCAB_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch vocabulary from npoint: HTTP ${response.status}`)
  }
  const result = await response.json()
  // npoint wraps the data in { "data": [ ... ] }
  const words = Array.isArray(result) ? result : (result?.data || [])
  return { data: words }
}

export const createVocab = async (vocabData) => {
  const items = Array.isArray(vocabData) ? vocabData : [vocabData]
  const formatted = items.map((item) => ({
    _id: item._id || item.id || `vocab_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    status: item.status || 'learning',
    category: item.category || 'Coding Term',
    difficulty: item.difficulty || 'Medium',
    partOfSpeech: item.partOfSpeech || 'Noun',
    example: item.example || '',
    codeContext: item.codeContext || '',
    mnemonic: item.mnemonic || '',
    image: item.image || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...item,
  }))
  return { data: Array.isArray(vocabData) ? formatted : formatted[0] }
}

export const updateVocab = async (vocabId, updateData) => {
  return { data: { _id: vocabId, ...updateData, updatedAt: new Date().toISOString() } }
}

export const deleteVocab = async (vocabId) => {
  return { message: 'Word deleted successfully', id: vocabId }
}

export const resetAllVocabStatus = async (status = 'learning') => {
  return { message: `All words reset to ${status}` }
}

// Life Architecture Planner API
export const fetchLifeGoals = () =>
  request('/api/life-goals')

export const fetchLifeGoal = (lifeGoalId) =>
  request(`/api/life-goals/${encodeURIComponent(lifeGoalId)}`)

export const createLifeGoal = (lifeGoalData) =>
  request('/api/life-goals', {
    method: 'POST',
    body: JSON.stringify(lifeGoalData),
  })

export const updateLifeGoal = (lifeGoalId, updateData) =>
  request(`/api/life-goals/${encodeURIComponent(lifeGoalId)}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  })

export const deleteLifeGoal = (lifeGoalId) =>
  request(`/api/life-goals/${encodeURIComponent(lifeGoalId)}`, {
    method: 'DELETE',
  })

