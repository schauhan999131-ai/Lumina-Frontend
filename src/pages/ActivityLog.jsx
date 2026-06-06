import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

export default function ActivityLog() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_BASE || 'http://localhost:4000', {
      transports: ['websocket'],
    })

    socket.on('study:update', (payload) => {
      setLogs((prev) => [payload, ...prev].slice(0, 15)) // Keep last 15 updates
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg shadow-slate-950/20">
        <h2 className="text-lg font-semibold text-slate-100">Live Classroom Activity Feed</h2>
        <p className="mt-2 text-sm text-slate-400">
          Socket.io connects you with other users studying concurrently on the platform. Trace live updates in real time.
        </p>
      </div>

      {/* Main logs timeline */}
      <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg shadow-slate-950/20">
        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400 mb-6">Activity Stream</h3>
        
        {logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="inline-block animate-pulse rounded-full h-3 w-3 bg-purple-500 mr-2"></div>
            Waiting for live study activities...
          </div>
        ) : (
          <div className="relative border-l border-slate-800 pl-6 ml-3 space-y-6">
            {logs.map((log, index) => (
              <div key={index} className="relative transition hover:translate-x-1 duration-200">
                {/* Visual node marker */}
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-purple-500 bg-slate-950 shadow-md shadow-purple-500/30"></div>
                
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-sm font-medium text-slate-100">
                      <span className="text-purple-400 font-semibold">{log.user}</span> {log.activity} in{' '}
                      <span className="text-sky-400 font-semibold">{log.subject}</span>
                    </p>
                    <span className="text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
