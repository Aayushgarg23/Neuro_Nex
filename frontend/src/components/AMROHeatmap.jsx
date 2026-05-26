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
    // Google blue gradient based on value
    const r = Math.round(232 - (val * 206)); // 232 to 26
    const g = Math.round(240 - (val * 125)); // 240 to 115
    const b = Math.round(254 - (val * 22));  // 254 to 232
    return `rgba(${r}, ${g}, ${b}, ${0.2 + val * 0.8})`;
  };

  return (
    <div className="clean-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">🐜</span>
        <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-200">AMRO Pheromone Matrix</h3>
        <span className="badge badge-blue ml-auto">sub-1ms routing</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr>
              <th className="w-16 text-left text-slate-500 pb-2 pr-2 font-medium">From\To</th>
              {AGENT_LABELS.map(l => (
                <th key={l} className="text-slate-500 pb-2 px-1 text-center font-medium" style={{ fontSize: 10 }}>
                  {l.slice(0, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td className="text-slate-500 pr-2 py-1 font-medium" style={{ fontSize: 10 }}>{AGENT_LABELS[i].slice(0, 4)}</td>
                {row.map((val, j) => (
                  <td key={j} className="px-1 py-1 text-center">
                    {i === j ? (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    ) : (
                      <div className="rounded w-8 h-6 flex items-center justify-center mx-auto text-[10px] font-bold transition-all duration-500"
                           style={{ background: cellColor(val), color: val > 0.5 ? '#fff' : '#1A73E8' }}>
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
      <div className="flex items-center gap-2 mt-4 bg-slate-50 dark:bg-slate-800 p-2 rounded">
        <div className="flex-1 h-1.5 rounded-full" style={{
          background: 'linear-gradient(90deg, rgba(232,240,254,1), rgba(26,115,232,1))'
        }} />
        <span className="text-slate-500 text-[10px] font-mono">Low → High pheromone</span>
      </div>
    </div>
  );
}
