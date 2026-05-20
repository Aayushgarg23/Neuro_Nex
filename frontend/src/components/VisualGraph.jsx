import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network';

export default function VisualGraph({ graphData }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current ||!graphData) return;

    // Map extracted entities to graph nodes
    const nodes = graphData.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      title: `${node.type}: ${node.label}`,
      color: {
        background: node.type === 'Drug'? '#10B981' : node.type === 'Gene'? '#3B82F6' : '#6B7280',
        border: '#111827',
      },
      font: { color: '#F3F4F6' }
    }));

    // Draw relationships, highlighting contradictions in red 
    const edges = graphData.relationships.map((rel) => ({
      from: rel.source,
      to: rel.target,
      label: rel.type,
      arrows: 'to',
      color: {
        color: rel.type === 'CONTRADICTS'? '#EF4444' : '#10B981',
        highlight: rel.type === 'CONTRADICTS'? '#F87171' : '#34D399',
      },
      font: { size: 10, fill: '#FFFFFF', strokeWidth: 0, color: '#9CA3AF' }
    }));

    const options = {
      physics: {
        stabilization: true,
        barnesHut: { gravitationalConstant: -2000, centralGravity: 0.3, springLength: 95 }
      },
      interaction: { hover: true, tooltipDelay: 100 }
    };

    const network = new Network(containerRef.current, { nodes, edges }, options);
    return () => network.destroy();
  },);

  return (
    <div className="w-full h-full bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg">
        <span className="text-xs font-semibold text-slate-400">Interactive Subgraph Canvas </span>
      </div>
      <div ref={containerRef} className="w-full h-full min-h-[400px]" />
    </div>
  );
}
