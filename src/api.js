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
      throw new Error(`Failed to connect to backend at ${API_BASE}. Make sure backend is running.`, { cause: error })
    }
    throw error
  }
}

// Auth API
const AUTH_STORAGE_KEY = 'lumina_auth_session'

const writeStoredAuthSession = (user) => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
  } catch (error) {
    console.error('Failed to persist auth session:', error)
  }
}

const clearStoredAuthSession = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear auth session:', error)
  }
}

export const signup = async (email, password, role = 'Staff', plan = 'Free') => {
  if (!email || !password) {
    throw new Error('Email and password are required.')
  }

  const result = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, role, plan }),
  })
  const user = result.user
  writeStoredAuthSession(user)
  return { user }
}

export const login = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email and password are required.')
  }

  const result = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const user = result.user
  writeStoredAuthSession(user)
  return { user }
}

export const logout = async () => {
  try {
    await request('/api/auth/logout', { method: 'POST' })
  } catch (error) {
    console.warn('Could not clear server auth session:', error)
  } finally {
    clearStoredAuthSession()
  }
  return { message: 'Logged out successfully.' }
}

export const getCurrentUser = async () => {
  const result = await request('/api/auth/me')
  writeStoredAuthSession(result.user)
  return result
}

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

// Vocabulary is stored in MongoDB and mirrored to npoint as a backup.
export const NPOINT_VOCAB_URL =
  import.meta.env.VITE_NPOINT_VOCAB_URL || 'https://api.npoint.io/b3908c6fc2b575c85637'

const fetchNpointVocab = async () => {
  const response = await fetch(NPOINT_VOCAB_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch vocabulary from npoint: HTTP ${response.status}`)
  }
  const result = await response.json()
  return Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : [])
}

const writeNpointVocab = async (words) => {
  const response = await fetch(NPOINT_VOCAB_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: words }),
  })
  if (!response.ok) {
    throw new Error(`Failed to save vocabulary to npoint: HTTP ${response.status}`)
  }
}

const vocabKey = (word) => String(word?.word || word?._id || word?.id || '').trim().toLowerCase()
let npointWriteQueue = Promise.resolve()

const updateNpointVocab = (transform) => {
  const operation = npointWriteQueue.then(async () => {
    const current = await fetchNpointVocab()
    const next = transform(current)
    await writeNpointVocab(next)
    return next
  })
  npointWriteQueue = operation.catch(() => {})
  return operation
}

const mergeVocab = (...lists) => {
  const merged = new Map()
  lists.flat().forEach((word) => {
    if (word?.word) merged.set(vocabKey(word), { ...(merged.get(vocabKey(word)) || {}), ...word })
  })
  return Array.from(merged.values())
}

export const fetchVocab = async () => {
  let databaseError
  try {
    const databaseResult = await request('/api/vocab')
    const databaseWords = databaseResult.data || []
    try {
      const backupWords = await fetchNpointVocab()
      const combined = mergeVocab(backupWords, databaseWords)
      const knownWords = new Set(databaseWords.map((word) => String(word.word).trim().toLowerCase()))
      const missing = backupWords.filter((word) => word?.word && !knownWords.has(String(word.word).trim().toLowerCase()))
      if (missing.length) {
        const migrated = await request('/api/vocab', {
          method: 'POST',
          body: JSON.stringify(missing.map((word) => {
            const payload = { ...word }
            delete payload._id
            delete payload.id
            return payload
          })),
        })
        const migratedWords = migrated.data || []
        const synchronized = mergeVocab(backupWords, databaseWords, migratedWords)
        await writeNpointVocab(synchronized)
        return { data: synchronized }
      }
      await writeNpointVocab(combined)
      return { data: combined }
    } catch (backupError) {
      console.warn('Could not read vocabulary backup from npoint:', backupError)
      return { data: databaseWords }
    }
  } catch (error) {
    databaseError = error
  }

  try {
    return { data: await fetchNpointVocab() }
  } catch (backupError) {
    throw new Error(`Could not load vocabulary from MongoDB (${databaseError.message}) or npoint (${backupError.message}).`, { cause: backupError })
  }
}

export const createVocab = async (vocabData) => {
  const input = Array.isArray(vocabData) ? vocabData : [vocabData]
  let created
  let databaseError
  let backupSaved = false
  try {
    const result = await request('/api/vocab', {
      method: 'POST',
      body: JSON.stringify(vocabData),
    })
    created = result.data || []
  } catch (error) {
    databaseError = error
    created = input.map((item) => ({
      ...item,
      _id: item._id || item.id || `vocab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: item.status || 'learning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
  }

  try {
    await updateNpointVocab((existing) => mergeVocab(existing, created))
    backupSaved = true
  } catch (backupError) {
    if (databaseError) throw new Error(`Could not save vocabulary to MongoDB (${databaseError.message}) or npoint (${backupError.message}).`, { cause: backupError })
    console.warn('Vocabulary saved to MongoDB but npoint backup failed:', backupError)
  }
    if (databaseError) console.warn('Vocabulary saved to npoint, but MongoDB save failed:', databaseError)
    return {
      data: Array.isArray(vocabData) ? created : created[0],
      databaseSaved: !databaseError,
      backupSaved,
    }
}

export const updateVocab = async (vocabId, updateData) => {
  let updated
  let databaseError
  try {
    const result = await request(`/api/vocab/${encodeURIComponent(vocabId)}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })
    updated = result.data
  } catch (error) {
    databaseError = error
    updated = { _id: vocabId, ...updateData, updatedAt: new Date().toISOString() }
  }

  try {
    await updateNpointVocab((words) => words.map((word) =>
      String(word._id || word.id) === String(vocabId)
        ? { ...word, ...updateData, updatedAt: new Date().toISOString() }
        : word
    ))
  } catch (backupError) {
    if (databaseError) throw new Error(`Could not update vocabulary in MongoDB (${databaseError.message}) or npoint (${backupError.message}).`, { cause: backupError })
    console.warn('Vocabulary updated in MongoDB but npoint backup failed:', backupError)
  }
  return { data: updated }
}

export const deleteVocab = async (vocabId) => {
  let databaseError
  try {
    await request(`/api/vocab/${encodeURIComponent(vocabId)}`, { method: 'DELETE' })
  } catch (error) {
    databaseError = error
  }
  try {
    await updateNpointVocab((words) => words.filter((word) =>
      String(word._id || word.id) !== String(vocabId) && vocabKey(word) !== String(vocabId).toLowerCase()
    ))
  } catch (backupError) {
    if (databaseError) throw new Error(`Could not delete vocabulary from MongoDB (${databaseError.message}) or npoint (${backupError.message}).`, { cause: backupError })
    console.warn('Vocabulary deleted from MongoDB but npoint backup failed:', backupError)
  }
  return { message: 'Word deleted successfully', id: vocabId }
}

export const resetAllVocabStatus = async (status = 'learning') => {
  let databaseError
  try {
    await request('/api/vocab/batch/status', {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  } catch (error) {
    databaseError = error
  }
  try {
    await updateNpointVocab((words) => words.map((word) => ({ ...word, status })))
  } catch (backupError) {
    if (databaseError) throw new Error(`Could not reset vocabulary in MongoDB (${databaseError.message}) or npoint (${backupError.message}).`, { cause: backupError })
    console.warn('Vocabulary reset in MongoDB but npoint backup failed:', backupError)
  }
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

