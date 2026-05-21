import React from 'react';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';

export default function IBCTChain({ chain = [] }) {
  if (!chain.length) return null;

  const eventColors = {
    GENESIS: '#00D4AA',
    QUERY_RECEIVED: '#3B82F6',
    COUNCIL_SYNTHESIS: '#8B5CF6',
    GRAPH_WRITEBACK: '#F59E0B',
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4" style={{ color: '#00D4AA' }} />
        <h3 className="text-sm font-bold font-display text-slate-200">IBCT Provenance Chain</h3>
        <span className="badge badge-brand ml-auto">{chain.length} blocks</span>
        {chain.every(b => b.verified) ? (
          <span className="flex items-center gap-1 text-emerald-400 text-xs">
            <CheckCircle className="w-3 h-3" /> Verified
          </span>
        ) : (
          <span className="flex items-center gap-1 text-red-400 text-xs">
            <AlertCircle className="w-3 h-3" /> Tampered
          </span>
        )}
      </div>
      <div className="space-y-2">
        {chain.map((block, idx) => (
          <div key={idx} className="flex items-start gap-3">
            {/* Chain line */}
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                   style={{ background: eventColors[block.event_type] || '#475569' }} />
              {idx < chain.length - 1 && (
                <div className="w-px flex-1 min-h-[16px] mt-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono font-semibold" style={{ color: eventColors[block.event_type] || '#94A3B8' }}>
                  {block.event_type}
                </span>
                <span className="text-xs text-slate-600 font-mono ml-auto">
                  #{block.index}
                </span>
              </div>
              <div className="text-xs text-slate-600 font-mono truncate">
                {block.hash_prefix}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
