import { useCallback, useEffect, useRef, useState } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  ConnectionMode,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import * as api from '../../api'
import { useAppStore } from '../../store'
import { LIFE_MAP_TEMPLATES } from '../../lib/lifeMapTemplates'
import MapNode from './MapNode'

const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const nodeTypes = { mapNode: MapNode }

const KIND_OPTIONS = [
  { kind: 'goal', label: 'Goal', icon: '🎯' },
  { kind: 'task', label: 'Task', icon: '✅' },
  { kind: 'avoid', label: 'Avoid', icon: '🚫' },
  { kind: 'note', label: 'Note', icon: '📝' },
]

const EDGE_STYLE = { stroke: '#64748b', strokeWidth: 1.5 }
const EDGE_MARKER = { type: MarkerType.ArrowClosed, color: '#64748b', width: 14, height: 14 }
const BOARD_CATEGORY = { goal: 'Yearly', task: 'Daily', avoid: 'Weekly', note: 'Weekly' }

// Converts a saved {id,label,kind,x,y} record into a ReactFlow node, wiring
// up the label-edit/delete callbacks that live on the parent component.
function toFlowNode(record, onLabelChange, onDelete, onToggleComplete, autoEdit = false) {
  return {
    id: record.id,
    type: 'mapNode',
    position: { x: record.x, y: record.y },
    data: { label: record.label, kind: record.kind, completed: !!record.completed, onLabelChange, onDelete, onToggleComplete, autoEdit },
  }
}

function toFlowEdge(record) {
  return { ...record, style: EDGE_STYLE, markerEnd: EDGE_MARKER }
}

function CanvasEditor() {
  const addTask = useAppStore((state) => state.addTask)
  const { screenToFlowPosition } = useReactFlow()
  const wrapperRef = useRef(null)

  const [title, setTitle] = useState('')
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [currentMapId, setCurrentMapId] = useState(null)
  // fitView only auto-fits ReactFlow's viewport once, on first mount — bumping
  // this key forces a clean remount (and a fresh fit) whenever a whole new map
  // is loaded, so nodes from the new map can never end up outside the view.
  const [loadKey, setLoadKey] = useState(0)

  const [savedMaps, setSavedMaps] = useState([])
  const [savedLoading, setSavedLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved'
  const [error, setError] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')

  // Tracks the payload we last persisted, so the auto-save effect can skip
  // re-saving data that hasn't actually changed (e.g. right after a load).
  const lastSavedSignatureRef = useRef('')
  const hasAutoLoadedRef = useRef(false)

  const flashStatus = useCallback((msg) => {
    setStatusMsg(msg)
    setTimeout(() => setStatusMsg(''), 4000)
  }, [])

  const handleDeleteNode = useCallback((id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
  }, [])

  const handleLabelChange = useCallback((id, label) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label, autoEdit: false } } : n)))
  }, [])

  const handleToggleComplete = useCallback((id) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, completed: !n.data.completed } } : n)))
  }, [])

  const refreshSavedMaps = useCallback(async () => {
    setSavedLoading(true)
    try {
      const res = await api.fetchLifeGoals()
      const list = res.data || []
      setSavedMaps(list)
      return list
    } catch (err) {
      setError(err.message || 'Failed to load saved life maps.')
      return []
    } finally {
      setSavedLoading(false)
    }
  }, [])

  const buildPayload = useCallback(() => ({
    title: title.trim(),
    nodes: nodes.map((n) => ({ id: n.id, label: n.data.label, kind: n.data.kind, x: n.position.x, y: n.position.y, completed: !!n.data.completed })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  }), [title, nodes, edges])

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), [])
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), [])
  const onConnect = useCallback((connection) => {
    setEdges((eds) => addEdge({ ...connection, id: genId(), style: EDGE_STYLE, markerEnd: EDGE_MARKER }, eds))
  }, [])

  const addNode = useCallback((kind, position) => {
    setNodes((nds) => [
      ...nds,
      toFlowNode({ id: genId(), label: `New ${kind}`, kind, x: position.x, y: position.y }, handleLabelChange, handleDeleteNode, handleToggleComplete, true),
    ])
  }, [handleLabelChange, handleDeleteNode, handleToggleComplete])

  const handleToolbarAdd = (kind) => {
    // Drop the new node near the center of the current viewport, nudged so
    // repeated adds don't stack exactly on top of each other.
    const base = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2.5 })
    addNode(kind, { x: base.x + (nodes.length % 5) * 24, y: base.y + (nodes.length % 5) * 24 })
  }

  const handleWrapperDoubleClick = (event) => {
    // Ignore double-clicks that originated on a node (it opens its own inline
    // editor and stops propagation) — this only fires for empty canvas space.
    addNode('note', screenToFlowPosition({ x: event.clientX, y: event.clientY }))
  }

  const handleLoadTemplate = (template) => {
    setError(null)
    setTitle(template.name)
    setNodes(template.nodes.map((n) => toFlowNode(n, handleLabelChange, handleDeleteNode, handleToggleComplete)))
    setEdges(template.edges.map(toFlowEdge))
    setCurrentMapId(null)
    setLoadKey((k) => k + 1)
    flashStatus(`Loaded "${template.name}" — drag nodes apart, rename, delete, or connect more.`)
  }

  const handleLoadSaved = useCallback(async (mapSummary) => {
    setError(null)
    try {
      const res = await api.fetchLifeGoal(mapSummary._id)
      const full = res.data
      setTitle(full.title)
      setNodes((full.nodes || []).map((n) => toFlowNode(n, handleLabelChange, handleDeleteNode, handleToggleComplete)))
      setEdges((full.edges || []).map(toFlowEdge))
      setCurrentMapId(full._id)
      setLoadKey((k) => k + 1)
      lastSavedSignatureRef.current = JSON.stringify({
        title: full.title,
        nodes: full.nodes || [],
        edges: (full.edges || []).map((e) => ({ id: e.id, source: e.source, target: e.target })),
      })
      flashStatus(`Loaded "${full.title}".`)
    } catch (err) {
      setError(err.message || 'Failed to load life map.')
    }
  }, [handleLabelChange, handleDeleteNode, handleToggleComplete, flashStatus])

  // On first mount, silently restore whatever you were last working on — so
  // opening the tab on another device, or after a refresh, shows your map
  // instead of a blank canvas.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const list = await refreshSavedMaps()
      if (!cancelled && !hasAutoLoadedRef.current && list.length > 0) {
        hasAutoLoadedRef.current = true
        await handleLoadSaved(list[0])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshSavedMaps, handleLoadSaved])

  const handleDeleteSaved = async (id) => {
    setError(null)
    try {
      await api.deleteLifeGoal(id)
      if (id === currentMapId) setCurrentMapId(null)
      await refreshSavedMaps()
    } catch (err) {
      setError(err.message || 'Failed to delete life map.')
    }
  }

  const handleNew = () => {
    setTitle('')
    setNodes([])
    setEdges([])
    setCurrentMapId(null)
    setAutoSaveStatus('idle')
    lastSavedSignatureRef.current = ''
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Give your life map a title before saving.')
      return
    }
    setSaveLoading(true)
    setError(null)
    try {
      const payload = buildPayload()
      if (currentMapId) {
        const res = await api.updateLifeGoal(currentMapId, payload)
        setCurrentMapId(res.data._id)
      } else {
        const res = await api.createLifeGoal(payload)
        setCurrentMapId(res.data._id)
      }
      lastSavedSignatureRef.current = JSON.stringify(payload)
      await refreshSavedMaps()
      flashStatus('Life map saved — it will now survive a refresh.')
    } catch (err) {
      setError(err.message || 'Failed to save life map.')
    } finally {
      setSaveLoading(false)
    }
  }

  // Auto-save: once there's a title and at least one node, persist changes
  // ~1.5s after the last edit — so templates, drags, renames, and new nodes
  // all survive a refresh/close without needing an explicit Save click.
  useEffect(() => {
    if (!title.trim() || nodes.length === 0) return undefined

    const payload = buildPayload()
    const signature = JSON.stringify(payload)
    if (signature === lastSavedSignatureRef.current) return undefined

    const timeout = setTimeout(async () => {
      setAutoSaveStatus('saving')
      try {
        if (currentMapId) {
          await api.updateLifeGoal(currentMapId, payload)
        } else {
          const res = await api.createLifeGoal(payload)
          setCurrentMapId(res.data._id)
        }
        lastSavedSignatureRef.current = signature
        await refreshSavedMaps()
        setAutoSaveStatus('saved')
      } catch (err) {
        setError(err.message || 'Auto-save failed.')
        setAutoSaveStatus('idle')
      }
    }, 1500)

    return () => clearTimeout(timeout)
  }, [title, nodes, edges, currentMapId, buildPayload, refreshSavedMaps])

  const handleSendToBoard = async (node) => {
    setError(null)
    try {
      await addTask({
        title: node.data.label,
        category: BOARD_CATEGORY[node.data.kind],
        priority: 'Medium',
        status: 'Not Started',
      })
      flashStatus(`Sent "${node.data.label}" to the planner boards.`)
    } catch (err) {
      setError(err.message || 'Failed to send node to planner board.')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}
      {statusMsg && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 font-semibold">
          {statusMsg}
        </div>
      )}

      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Life Architecture Planner</h3>
            <p className="text-xs text-slate-500 mt-1">Drag, drop, and connect your own life goals — build the map by hand.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Name this life map..."
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              disabled={saveLoading}
              onClick={handleSave}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2 text-[10px] font-bold text-white shadow disabled:opacity-50 whitespace-nowrap"
            >
              {saveLoading ? 'Saving...' : currentMapId ? 'Update Map' : 'Save Map'}
            </button>
            <button type="button" onClick={handleNew} className="text-[10px] font-bold text-slate-500 hover:text-slate-300 transition whitespace-nowrap">
              + New
            </button>
          </div>
        </div>
        {autoSaveStatus !== 'idle' && (
          <p className="text-[10px] text-slate-600 -mt-2">
            {autoSaveStatus === 'saving' ? 'Auto-saving...' : 'All changes saved — safe to close or switch devices.'}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mr-1">Add:</span>
          {KIND_OPTIONS.map((opt) => (
            <button
              key={opt.kind}
              type="button"
              onClick={() => handleToolbarAdd(opt.kind)}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:border-purple-500/40 transition"
            >
              {opt.icon} {opt.label}
            </button>
          ))}
          <span className="text-[10px] text-slate-600 ml-2">or double-click empty canvas to drop a note</span>

          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-auto mr-1">Examples:</span>
          {LIFE_MAP_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleLoadTemplate(template)}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:border-purple-500/40 transition"
            >
              {template.icon} {template.name}
            </button>
          ))}
        </div>

        {!savedLoading && savedMaps.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mr-1">Saved:</span>
            {savedMaps.map((map) => (
              <div
                key={map._id}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-semibold ${
                  map._id === currentMapId ? 'border-purple-500/40 bg-purple-500/10 text-purple-300' : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <button type="button" onClick={() => handleLoadSaved(map)} className="hover:text-slate-100 transition">
                  {map.title}
                </button>
                <button type="button" onClick={() => handleDeleteSaved(map._id)} className="text-slate-600 hover:text-rose-400 transition" title="Delete">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div ref={wrapperRef} onDoubleClick={handleWrapperDoubleClick} className="h-[560px] rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden">
        {nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-6">
            <div>
              <div className="text-3xl mb-4">🧭</div>
              <h4 className="text-sm font-semibold text-slate-400">Empty Canvas</h4>
              <p className="text-xs text-slate-600 mt-2 max-w-[280px] mx-auto leading-relaxed">
                Click "+ Goal" above, or load a real example, to start placing nodes you can drag and connect.
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            key={loadKey}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            connectionMode={ConnectionMode.Loose}
            zoomOnDoubleClick={false}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background color="#1e293b" gap={20} />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>

      {nodes.length > 0 && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-3">
          <h4 className="text-sm font-semibold text-slate-300">Send Nodes To Your Planner Boards</h4>
          <div className="flex flex-wrap gap-2">
            {nodes.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleSendToBoard(n)}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-indigo-300 hover:border-indigo-500/40 transition"
              >
                {n.data.label} →
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default function LifeMapCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasEditor />
    </ReactFlowProvider>
  )
}
