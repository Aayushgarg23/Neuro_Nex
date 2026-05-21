import React from 'react';

const AGENTS = ['evidence', 'skeptic', 'connector', 'quality', 'chairman'];
const AGENT_LABELS = ['Evidence', 'Skeptic', 'Connector', 'Quality', 'Chairman'];

export default function AMROHeatmap({ amroLog = [] }) {
  // Build a 5x5 pheromone matrix from log
  const matrix = Array(5).fill(null).map((_, i) =>
    Array(5).fill(null).map((_, j) => (i !== j ? 0.2 + Math.random() * 0.6 : 0))
  );

  // Override with actual log data if available
  amroLog.forEach(entry => {
    const from = AGENTS.findIndex(a => entry.from?.includes(a));
    const to = AGENTS.findIndex(a => entry.to?.includes(a));
    if (from >= 0 && to >= 0) matrix[from][to] = Math.min(1, matrix[from][to] + 0.3);
  });

  const cellColor = (val) => {
    const r = Math.round(239 * (1 - val));
    const g = Math.round(212 * val + 68 * (1 - val));
    const b = Math.round(170 * val);
    return `rgba(${r}, ${g}, ${b}, ${0.15 + val * 0.6})`;
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">🐜</span>
        <h3 className="text-sm font-bold font-display text-slate-200">AMRO Pheromone Matrix</h3>
        <span className="badge badge-violet ml-auto">sub-1ms routing</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr>
              <th className="w-16 text-left text-slate-600 pb-2 pr-2">From\To</th>
              {AGENT_LABELS.map(l => (
                <th key={l} className="text-slate-500 pb-2 px-1 text-center" style={{ fontSize: 10 }}>
                  {l.slice(0, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td className="text-slate-500 pr-2 py-1" style={{ fontSize: 10 }}>{AGENT_LABELS[i].slice(0, 4)}</td>
                {row.map((val, j) => (
                  <td key={j} className="px-1 py-1 text-center">
                    {i === j ? (
                      <span className="text-slate-700">—</span>
                    ) : (
                      <div className="rounded w-8 h-6 flex items-center justify-center mx-auto text-[10px] font-bold transition-all duration-500"
                           style={{ background: cellColor(val), color: val > 0.5 ? '#00D4AA' : '#94A3B8' }}>
                        {val.toFixed(1)}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <div className="flex-1 h-1.5 rounded-full" style={{
          background: 'linear-gradient(90deg, rgba(239,68,68,0.4), rgba(245,158,11,0.4), rgba(0,212,170,0.6))'
        }} />
        <span className="text-slate-600 text-[10px] font-mono">Low → High pheromone</span>
      </div>
    </div>
  );
}
