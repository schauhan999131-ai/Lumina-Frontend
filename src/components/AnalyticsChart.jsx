import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend
} from 'recharts'

// Custom premium trading tooltip with multi-line metrics
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</p>
        {payload.map((item, idx) => (
          <p key={idx} className="text-xs font-black flex items-center gap-1.5" style={{ color: item.stroke }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: item.stroke }}></span>
            {item.name}: {item.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function AnalyticsChart({ data }) {
  // Check if data contains pillars completed history keys
  const hasPillars = data.some(d => d.pillarsCompleted !== undefined)

  return (
    <div className="w-full h-[280px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            {/* Gradient for Tasks Completed */}
            <linearGradient id="tasksGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0.0} />
            </linearGradient>

            {/* Gradient for Focus Pillars Checked */}
            <linearGradient id="pillarsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0.0} />
            </linearGradient>

            {/* Glowing neon SVG filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
          
          <XAxis 
            dataKey="label" 
            stroke="#475569" 
            fontSize={10}
            fontWeight={600}
            tickLine={false} 
            axisLine={false} 
            dy={8}
          />
          
          <YAxis 
            stroke="#475569" 
            fontSize={10}
            fontWeight={600}
            tickLine={false} 
            axisLine={false} 
            allowDecimals={false}
            dx={-8}
          />
          
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255, 255, 255, 0.05)', strokeWidth: 1 }} />
          
          {/* Main Tasks Done area line */}
          <Area 
            type="monotone" 
            name="Tasks Completed"
            dataKey="tasksCompleted" 
            stroke="#818cf8" 
            fill="url(#tasksGradient)" 
            strokeWidth={3} 
            filter="url(#neonGlow)"
            activeDot={{ r: 5, stroke: '#090d16', strokeWidth: 2, fill: '#818cf8' }}
          />

          {/* Conditional Habit Pillars Checked area line */}
          {hasPillars && (
            <Area 
              type="monotone" 
              name="Focus Pillars Checked"
              dataKey="pillarsCompleted" 
              stroke="#a855f7" 
              fill="url(#pillarsGradient)" 
              strokeWidth={3} 
              filter="url(#neonGlow)"
              activeDot={{ r: 5, stroke: '#090d16', strokeWidth: 2, fill: '#a855f7' }}
            />
          )}

          {hasPillars && (
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8' }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
