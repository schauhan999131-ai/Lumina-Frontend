import { useEffect, useRef, useState } from 'react'
import { Handle, Position } from 'reactflow'

const KIND_STYLE = {
  goal: { background: 'rgba(168,85,247,0.16)', border: '1px solid rgba(168,85,247,0.5)', color: '#e9d5ff' },
  task: { background: 'rgba(16,185,129,0.16)', border: '1px solid rgba(16,185,129,0.5)', color: '#a7f3d0' },
  avoid: { background: 'rgba(244,63,94,0.16)', border: '1px solid rgba(244,63,94,0.5)', color: '#fecdd3' },
  note: { background: 'rgba(99,102,241,0.16)', border: '1px solid rgba(99,102,241,0.5)', color: '#c7d2fe' },
}

const HANDLE_CLASS = '!w-2.5 !h-2.5 !border-2 !border-slate-950 !bg-slate-500'

// A freeform mind-map node: double-click to rename in place, drag from any
// edge handle to connect to another node, hover to reveal the delete button.
export default function MapNode({ id, data }) {
  // Freshly-added nodes start in edit mode so you can type the label right away.
  const [editing, setEditing] = useState(!!data.autoEdit)
  const [draft, setDraft] = useState(data.label)
  const inputRef = useRef(null)

  // The HTML `autoFocus` attribute alone loses a race against the browser's
  // native double-click text-selection behavior (the event that puts this
  // node into edit mode in the first place), so focus explicitly once the
  // input is actually in the DOM.
  useEffect(() => {
    if (editing) {
      const frame = requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
      return () => cancelAnimationFrame(frame)
    }
    return undefined
  }, [editing])

  const commit = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== data.label) {
      data.onLabelChange(id, trimmed)
    } else {
      setDraft(data.label)
    }
  }

  return (
    <div
      className="group relative px-4 py-2.5 rounded-2xl text-xs font-semibold min-w-[130px] max-w-[220px] shadow-lg cursor-grab active:cursor-grabbing"
      style={KIND_STYLE[data.kind]}
      onDoubleClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
    >
      <Handle type="target" position={Position.Top} className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />

      {editing ? (
        <input
          ref={inputRef}
          className="nodrag w-full bg-transparent border-none outline-none text-xs font-semibold"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setDraft(data.label)
              setEditing(false)
            }
          }}
        />
      ) : (
        <span className="break-words">{data.label}</span>
      )}

      <button
        type="button"
        onClick={() => data.onDelete(id)}
        className="nodrag absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition text-[10px] flex items-center justify-center"
        title="Delete node"
      >
        ✕
      </button>
    </div>
  )
}
