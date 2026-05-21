import React from 'react';
import { Zap, Brain } from 'lucide-react';

export default function SystemRouter({ activeSystem = 2, latencyMs = null }) {
  return (
    <div className="glass-card p-4">
      <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Cognitive Router</div>
      <div className="flex gap-3">
        {/* System 1 */}
        <div className={`flex-1 rounded-xl p-3 border transition-all duration-500 ${
          activeSystem === 1
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-slate-800 bg-slate-900/30 opacity-40'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5" style={{ color: '#00D4AA' }} />
            <span className="text-xs font-bold font-display text-slate-200">System 1</span>
          </div>
          <div className="text-[10px] text-slate-500 leading-relaxed">Fast Path</div>
          <div className="text-[10px] text-slate-500">Vector lookup &lt;50ms</div>
          {activeSystem === 1 && latencyMs && (
            <div className="mt-2 text-xs font-mono" style={{ color: '#00D4AA' }}>{latencyMs}ms</div>
          )}
        </div>
        {/* System 2 */}
        <div className={`flex-1 rounded-xl p-3 border transition-all duration-500 ${
          activeSystem === 2
            ? 'border-violet-600 bg-violet-600/10'
            : 'border-slate-800 bg-slate-900/30 opacity-40'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} />
            <span className="text-xs font-bold font-display text-slate-200">System 2</span>
          </div>
          <div className="text-[10px] text-slate-500 leading-relaxed">MAV + GraphRAG</div>
          <div className="text-[10px] text-slate-500">ToT + QISA synthesis</div>
          {activeSystem === 2 && (
            <div className="mt-2 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#7C3AED' }} />
              <span className="text-[10px] font-mono text-violet-400">ACTIVE</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
