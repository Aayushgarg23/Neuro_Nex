import React from 'react';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';

export default function IBCTChain({ chain = [] }) {
  if (!chain.length) return null;

  const eventColors = {
    GENESIS: '#1A73E8', // Google Blue
    QUERY_RECEIVED: '#1E8E3E', // Google Green
    COUNCIL_SYNTHESIS: '#8B5CF6',
    GRAPH_WRITEBACK: '#F9AB00', // Google Yellow
  };

  return (
    <div className="clean-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-brand-500" />
        <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-200">IBCT Provenance Chain</h3>
        <span className="badge badge-brand ml-auto">{chain.length} blocks</span>
        {chain.every(b => b.verified) ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
            <CheckCircle className="w-3.5 h-3.5" /> Verified
          </span>
        ) : (
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5" /> Tampered
          </span>
        )}
      </div>
      <div className="space-y-2">
        {chain.map((block, idx) => (
          <div key={idx} className="flex items-start gap-3 group">
            {/* Chain line */}
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                   style={{ background: eventColors[block.event_type] || '#475569' }} />
              {idx < chain.length - 1 && (
                <div className="w-px flex-1 min-h-[20px] mt-1 bg-slate-200 dark:bg-slate-700 group-hover:bg-brand-200 dark:group-hover:bg-brand-800 transition-colors" />
              )}
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono font-semibold" style={{ color: eventColors[block.event_type] || '#94A3B8' }}>
                  {block.event_type}
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded ml-auto font-mono">
                  #{block.index}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {block.hash_prefix}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
