import React from 'react';
import { Zap, Brain } from 'lucide-react';

export default function SystemRouter({ activeSystem = 2, latencyMs = null }) {
  return (
    <div className="clean-card p-4">
      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-3">Cognitive Router</div>
      <div className="flex gap-3">
        {/* System 1 */}
        <div className={`flex-1 rounded-xl p-3 border transition-all duration-500 ${
          activeSystem === 1
            ? 'border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20'
            : 'border-slate-200 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/30 opacity-60'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Zap className={`w-3.5 h-3.5 ${activeSystem === 1 ? 'text-brand-500' : 'text-slate-400'}`} />
            <span className="text-xs font-bold font-display text-slate-700 dark:text-slate-300">System 1</span>
          </div>
          <div className="text-[10px] text-slate-500 leading-relaxed">Fast Path</div>
          <div className="text-[10px] text-slate-500">Vector lookup &lt;50ms</div>
          {activeSystem === 1 && latencyMs && (
            <div className="mt-2 text-xs font-mono text-brand-600 dark:text-brand-400">{latencyMs}ms</div>
          )}
        </div>
        {/* System 2 */}
        <div className={`flex-1 rounded-xl p-3 border transition-all duration-500 ${
          activeSystem === 2
            ? 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20'
            : 'border-slate-200 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/30 opacity-60'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Brain className={`w-3.5 h-3.5 ${activeSystem === 2 ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
            <span className="text-xs font-bold font-display text-slate-700 dark:text-slate-300">System 2</span>
          </div>
          <div className="text-[10px] text-slate-500 leading-relaxed">MAV + GraphRAG</div>
          <div className="text-[10px] text-slate-500">ToT + QISA synthesis</div>
          {activeSystem === 2 && (
            <div className="mt-2 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400">ACTIVE</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
