import { useState, useMemo } from 'react'
import { useAppStore } from '../store'

const initialNotes = [
  { id: 1, title: 'Clean Architecture Patterns', subject: 'Software Engineering', content: '### 🌐 Clean Architecture Outline\nConcentric layers:\n- **Entities**: Core business objects\n- **Use Cases**: App-specific rules\n- **Interface Adapters**: Controllers, presenters, gateways\n- **Frameworks & Drivers**: Web, DB, UI.\n\nMaintains strict decoupling from database drivers and UI components.' },
  { id: 2, title: 'OS Kernel Scheduler & Multi-tasking', subject: 'Backend Systems', content: '### ⚙️ Process Scheduler Specs\nManages active processor execution loops. Implements scheduling filters:\n- **Round Robin**: Equal time-slicing\n- **FIFO**: First-in first-out queues\n- **Multi-Level Feedback**: Dynamically shifts queue priorities to optimize CPU throughput.' },
]

const subjectSuggestions = [
  'Software Engineering',
  'System Design',
  'Frontend Engineering',
  'Backend Systems',
  'Database Design',
  'DevOps & Cloud',
  'Machine Learning / AI',
  'Product Design',
  'General Notes'
]

// Ready-to-use Markdown Templates for planning
const noteTemplates = {
  websitePlan: `### 🌐 Project Overview
*Describe how this website/application works under the hood and what key problems it solves.*

### 🛠️ Technology Stack
- **Frontend**: React (Vite / Next.js)
- **Backend API**: Node.js (Express / NestJS)
- **Database Datastore**: MongoDB / PostgreSQL
- **Real-time Engine**: Socket.io / WebSockets

### 🗺️ Client Routing & Sitemap
- \`/\` - Landing page and feature list.
- \`/login\` & \`/signup\` - JWT Auth gateways.
- \`/dashboard\` - Main authenticated command panel.

### 🗄️ Database Schemas & Collections
- **users**: { id, email, password, profilePic, occupation }
- **projects**: { id, title, description, category, completedAt }`,

  businessModel: `### 💼 Business Model & Scaling Strategy
*How the website generates revenue, structures pricing tiers, and grows.*

### 🎯 Core Value Proposition
- Target users: Indie hackers, SaaS developers, and freelance programmers.
- Value added: Double productivity metrics & trace cash flow from study sessions.

### 💳 Monetization & Pricing Tiers
- **Free Account**: Limited boards.
- **Developer Premium**: Unlimited vault records and advanced graphs.

### 📣 Marketing & Growth Hooks
- Share sitemaps generated in sitemaps modeler on Twitter/LinkedIn to attract clients.

### 💰 Active Ledger Transactions (Auto-Syncs to Wealth Vault on Save)
[earning: 49.00 | cat: UI Package | desc: Gumroad sale of Lumina Boilerplate]
[expense: 15.00 | cat: Server | desc: AWS hosting monthly fee]
[saving: 29.00 | cat: SaaS | desc: Cancelled unused cursor subscription]

### 🥗 Health & Nutrition Tracker (Auto-Syncs to Health Vault on Save)
[protein: 30 | cal: 400 | food: Chicken Breast]
[protein: 24 | cal: 120 | food: Whey Protein Shake]`,
}

export default function StudyNotes() {
  const parseNoteWealth = useAppStore((state) => state.parseNoteWealth)
  const parseNoteHealth = useAppStore((state) => state.parseNoteHealth)
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('lumina_notes')
    return saved ? JSON.parse(saved) : initialNotes
  })
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Software Engineering')
  const [content, setContent] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [message, setMessage] = useState(null)

  // Dynamically compute subjects from current notes
  const uniqueSubjects = useMemo(() => {
    const subs = new Set()
    notes.forEach((n) => {
      if (n.subject) subs.add(n.subject)
    })
    // Seed with common defaults if list is short
    subjectSuggestions.forEach(s => {
      if (subs.size < 8) subs.add(s)
    })
    return Array.from(subs)
  }, [notes])

  const handleCreateNote = (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setMessage('Please enter a note title and details.')
      return
    }

    const note = {
      id: Date.now(),
      title: title.trim(),
      subject,
      content: content.trim(),
    }

    const updatedNotes = [note, ...notes]
    setNotes(updatedNotes)
    localStorage.setItem('lumina_notes', JSON.stringify(updatedNotes))
    
    // Auto-parse note transactions to Wealth Ledger
    parseNoteWealth(note.id, note.content).catch((err) => console.error(err))

    // Auto-parse note transactions to Health Ledger
    parseNoteHealth(note.id, note.content).catch((err) => console.error(err))

    setTitle('')
    setContent('')
    setMessage('Note created and ledger synced!')
    setTimeout(() => setMessage(null), 3000)
  }

  const handleDeleteNote = (id) => {
    const updatedNotes = notes.filter((n) => n.id !== id)
    setNotes(updatedNotes)
    localStorage.setItem('lumina_notes', JSON.stringify(updatedNotes))
    
    // Clear ledger entries parsed from this note
    parseNoteWealth(id, '').catch((err) => console.error(err))

    // Clear health entries parsed from this note
    parseNoteHealth(id, '').catch((err) => console.error(err))

    setMessage('Note deleted.')
    setTimeout(() => setMessage(null), 3000)
  }

  // Load a planning template directly into the textarea
  const handleLoadTemplate = (type) => {
    if (type === 'website') {
      setContent(noteTemplates.websitePlan)
      if (!title) setTitle('New Website Architecture Plan')
      setSubject('System Design')
    } else if (type === 'business') {
      setContent(noteTemplates.businessModel)
      if (!title) setTitle('New Project Monetization Plan')
      setSubject('Product Design')
    } else {
      setContent('')
    }
  }

  const filteredNotes = notes.filter(
    (n) => selectedSubject === 'All' || n.subject === selectedSubject,
  )

  return (
    <div className="space-y-6 text-slate-200">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg shadow-slate-950/20">
        <h2 className="text-lg font-semibold text-slate-100">Knowledge Vault</h2>
        <p className="mt-2 text-sm text-slate-400">
          Write documentation, log design guides, and compile concepts for future reference.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.3fr]">
        {/* Creator block */}
        <section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg self-start">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-900 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Create Knowledge Note</h3>
            
            {/* Template Selector Controls */}
            <div className="flex gap-1.5 select-none">
              <button
                type="button"
                onClick={() => handleLoadTemplate('website')}
                className="rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/20 px-2 py-1 text-[9px] font-bold text-slate-300 hover:text-purple-300 transition"
                title="Load sitemap / database setup template"
              >
                🌐 Web Plan
              </button>
              <button
                type="button"
                onClick={() => handleLoadTemplate('business')}
                className="rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/20 px-2 py-1 text-[9px] font-bold text-slate-300 hover:text-purple-300 transition"
                title="Load pricing / strategy template"
              >
                💼 Business Plan
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateNote} className="space-y-4">
            <label className="block text-sm text-slate-300">
              Note Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                placeholder="e.g. Microservices Architecture Design"
              />
            </label>

            <label className="block text-sm text-slate-300">
              Topic / Category Area
              <input
                list="note-subject-suggestions"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                placeholder="Select or type a topic (e.g. System Design)"
              />
              <datalist id="note-subject-suggestions">
                {subjectSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>

            <label className="block text-sm text-slate-300">
              Note Contents (Markdown compatible)
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                placeholder="e.g. Define API gateway middleware routing controls..."
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleLoadTemplate('clear')}
                className="rounded-2xl border border-slate-705 bg-slate-950 hover:bg-slate-900 px-4 py-3 text-sm font-semibold transition"
              >
                Clear
              </button>
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-purple-600 hover:to-indigo-700 shadow-lg shadow-purple-500/15"
              >
                Save Note
              </button>
            </div>
          </form>
        </section>

        {/* Saved List block */}
        <section className="space-y-6">
          {/* Subject filters */}
          <div className="flex flex-wrap gap-2">
            {['All', ...uniqueSubjects].map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${
                  selectedSubject === sub
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {message && (
            <div className="rounded-2xl border border-purple-500/20 bg-purple-950/30 p-4 text-sm text-purple-200">
              {message}
            </div>
          )}

          {filteredNotes.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8 text-center text-slate-500">
              No notes found for this subject area.
            </div>
          ) : (
            <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
              {filteredNotes.map((note) => (
                <div key={note.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-md hover:border-purple-500/15 transition relative group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      {note.subject}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20"
                    >
                      Delete
                    </button>
                  </div>
                  <h4 className="text-base font-bold text-slate-100 mb-2">{note.title}</h4>
                  <div className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed font-sans prose prose-invert max-w-none">
                    {note.content.split('\n').map((line, i) => {
                      if (line.startsWith('###')) {
                        return <h4 key={i} className="text-sm font-bold text-slate-100 mt-4 mb-2">{line.replace('###', '').trim()}</h4>
                      }
                      if (line.startsWith('-')) {
                        return <li key={i} className="ml-4 list-disc text-slate-350">{line.replace('-', '').trim()}</li>
                      }
                      return <p key={i} className="my-1.5">{line}</p>
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
