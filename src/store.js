import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as api from './api'

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Auth State
      isAuthenticated: false,
      userEmail: '',
      userId: null,
      role: 'Staff',
      plan: 'Free',
      planStatus: 'Active',
      profilePicture: '',
      occupation: 'Developer',
      isSubscribedYoutube: false,
      
      // Data State
      tasks: [],
      taskStats: null,
      adminUsers: [],
      wealthEntries: [],
      healthEntries: [],
      monitoringMetrics: {
        throughput: 0,
        latency: 0,
        health: 'idle',
        alerts: [],
      },
      
      // Auth Actions
      login: async (email, password) => {
        try {
          const response = await api.login(email, password)
          set({
            isAuthenticated: true,
            userEmail: response.user.email,
            userId: response.user._id,
            role: response.user.role,
            plan: response.user.plan || 'Free',
            planStatus: response.user.planStatus || 'Active',
            profilePicture: response.user.profilePicture || '',
            occupation: response.user.occupation || 'Developer',
            isSubscribedYoutube: response.user.isSubscribedYoutube || false,
          })
          return response
        } catch (error) {
          throw error
        }
      },
      
      signup: async (email, password, role = 'Staff') => {
        try {
          const response = await api.signup(email, password, role)
          set({
            isAuthenticated: true,
            userEmail: response.user.email,
            userId: response.user._id,
            role: response.user.role,
            plan: response.user.plan || 'Free',
            planStatus: response.user.planStatus || 'Active',
            profilePicture: response.user.profilePicture || '',
            occupation: response.user.occupation || 'Developer',
            isSubscribedYoutube: response.user.isSubscribedYoutube || false,
          })
          return response
        } catch (error) {
          throw error
        }
      },
      
      logout: async () => {
        try {
          await api.logout()
          set({
            isAuthenticated: false,
            userEmail: '',
            userId: null,
            role: 'Staff',
            plan: 'Free',
            planStatus: 'Active',
            profilePicture: '',
            occupation: 'Developer',
            isSubscribedYoutube: false,
            tasks: [],
            taskStats: null,
            adminUsers: [],
          })
        } catch (error) {
          console.error('Logout error:', error)
          set({
            isAuthenticated: false,
            userEmail: '',
            userId: null,
          })
        }
      },
      
      checkAuth: async () => {
        try {
          const response = await api.getCurrentUser()
          set({
            isAuthenticated: true,
            userEmail: response.user.email,
            userId: response.user._id,
            role: response.user.role,
            plan: response.user.plan || 'Free',
            planStatus: response.user.planStatus || 'Active',
            profilePicture: response.user.profilePicture || '',
            occupation: response.user.occupation || 'Developer',
            isSubscribedYoutube: response.user.isSubscribedYoutube || false,
          })
          return true
        } catch (error) {
          set({
            isAuthenticated: false,
            userEmail: '',
            userId: null,
          })
          return false
        }
      },
      
      // Data Actions
      setRole: (role) => set({ role }),
      setTasks: (tasks) => set({ tasks }),
      setTaskStats: (taskStats) => set({ taskStats }),
      setWealthEntries: (wealthEntries) => set({ wealthEntries }),

      getWealthEntries: async () => {
        try {
          const response = await api.fetchWealthEntries()
          set({ wealthEntries: response.data || [] })
          return response.data
        } catch (error) {
          console.error('Fetch wealth entries error:', error)
          throw error
        }
      },

      addWealthEntry: async (entryData) => {
        try {
          const response = await api.createWealthEntry(entryData)
          await get().getWealthEntries()
          return response.data
        } catch (error) {
          console.error('Add wealth entry error:', error)
          throw error
        }
      },

      removeWealthEntry: async (entryId) => {
        try {
          const response = await api.deleteWealthEntry(entryId)
          await get().getWealthEntries()
          return response
        } catch (error) {
          console.error('Delete wealth entry error:', error)
          throw error
        }
      },

      parseNoteWealth: async (noteId, content) => {
        try {
          const response = await api.parseNoteWealthEntries(noteId, content)
          await get().getWealthEntries()
          return response
        } catch (error) {
          console.error('Parse note wealth error:', error)
          throw error
        }
      },

      setHealthEntries: (healthEntries) => set({ healthEntries }),

      getHealthEntries: async () => {
        try {
          const response = await api.fetchHealthEntries()
          set({ healthEntries: response.data || [] })
          return response.data
        } catch (error) {
          console.error('Fetch health entries error:', error)
          throw error
        }
      },

      addHealthEntry: async (entryData) => {
        try {
          const response = await api.createHealthEntry(entryData)
          await get().getHealthEntries()
          return response.data
        } catch (error) {
          console.error('Add health entry error:', error)
          throw error
        }
      },

      removeHealthEntry: async (entryId) => {
        try {
          const response = await api.deleteHealthEntry(entryId)
          await get().getHealthEntries()
          return response
        } catch (error) {
          console.error('Delete health entry error:', error)
          throw error
        }
      },

      parseNoteHealth: async (noteId, content) => {
        try {
          const response = await api.parseNoteHealthEntries(noteId, content)
          await get().getHealthEntries()
          return response
        } catch (error) {
          console.error('Parse note health error:', error)
          throw error
        }
      },
      setMonitoringMetrics: (monitoringMetrics) => set({ monitoringMetrics }),

      getTasks: async () => {
        try {
          const response = await api.fetchTasks()
          set({ tasks: response.data || [] })
          return response.data
        } catch (error) {
          console.error('Fetch tasks error:', error)
          throw error
        }
      },

      addTask: async (taskData) => {
        try {
          const response = await api.createTask(taskData)
          await get().getTasks()
          await get().getTaskStats().catch(() => null)
          return response.data
        } catch (error) {
          console.error('Add task error:', error)
          throw error
        }
      },

      updateTask: async (taskId, updateData) => {
        try {
          const response = await api.updateTask(taskId, updateData)
          await get().getTasks()
          await get().getTaskStats().catch(() => null)
          return response.data
        } catch (error) {
          console.error('Update task error:', error)
          throw error
        }
      },

      removeTask: async (taskId) => {
        try {
          const response = await api.deleteTask(taskId)
          await get().getTasks()
          await get().getTaskStats().catch(() => null)
          return response
        } catch (error) {
          console.error('Delete task error:', error)
          throw error
        }
      },

      getTaskStats: async () => {
        try {
          const response = await api.fetchTaskStats()
          set({ taskStats: response || null })
          return response
        } catch (error) {
          console.error('Fetch task stats error:', error)
          throw error
        }
      },
      
      // Self-upgrade plan
      upgradePlan: async (plan) => {
        try {
          const response = await api.updateMyPlan(plan)
          set({
            plan: response.user.plan,
            planStatus: response.user.planStatus,
          })
          return response
        } catch (error) {
          console.error('Upgrade plan error:', error)
          throw error
        }
      },

      updateProfile: async (profileData) => {
        try {
          const response = await api.updateProfile(profileData)
          set({
            profilePicture: response.user.profilePicture || '',
            occupation: response.user.occupation || 'Developer',
          })
          return response
        } catch (error) {
          console.error('Update profile error:', error)
          throw error
        }
      },

      subscribeYoutube: async () => {
        try {
          const response = await api.subscribeYoutube()
          set({
            isSubscribedYoutube: response.user.isSubscribedYoutube || false,
          })
          return response
        } catch (error) {
          console.error('YouTube subscribe error:', error)
          throw error
        }
      },

      // Admin actions
      getAdminUsers: async () => {
        try {
          const response = api.fetchAdminUsers ? await api.fetchAdminUsers() : null
          set({ adminUsers: response?.users || [] })
          return response?.users
        } catch (error) {
          console.error('Fetch admin users error:', error)
          throw error
        }
      },

      createAdminUser: async (userData) => {
        try {
          const response = await api.adminCreateUser(userData)
          await get().getAdminUsers()
          return response
        } catch (error) {
          console.error('Admin create user error:', error)
          throw error
        }
      },

      updateAdminUserPlan: async (userId, plan, planStatus) => {
        try {
          const response = await api.adminUpdateUserPlan(userId, plan, planStatus)
          await get().getAdminUsers()
          return response
        } catch (error) {
          console.error('Admin update user plan error:', error)
          throw error
        }
      },

      deleteAdminUser: async (userId) => {
        try {
          const response = await api.adminDeleteUser(userId)
          await get().getAdminUsers()
          return response
        } catch (error) {
          console.error('Admin delete user error:', error)
          throw error
        }
      },
    }),
    {
      name: 'app-store',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userEmail: state.userEmail,
        userId: state.userId,
        role: state.role,
        plan: state.plan,
        planStatus: state.planStatus,
        profilePicture: state.profilePicture,
        occupation: state.occupation,
        isSubscribedYoutube: state.isSubscribedYoutube,
      }),
    }
  )
)
