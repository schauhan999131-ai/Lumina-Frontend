const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:4000'


async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include', // This sends cookies automatically
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const body = await response.json().catch(() => null)
    
    if (!response.ok) {
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


