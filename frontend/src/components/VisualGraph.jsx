import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

const LEGEND = [
  { type: 'Drug', color: '#00D4AA' },
  { type: 'Protein', color: '#3B82F6' },
  { type: 'Pathway', color: '#8B5CF6' },
  { type: 'Disease', color: '#F59E0B' },
  { type: 'Gene', color: '#10B981' },
  { type: 'Entity', color: '#6B7280' },
];

const NODE_COLORS = {
  Drug: { background: '#00D4AA', border: '#00D4AA88' },
  Protein: { background: '#3B82F6', border: '#3B82F688' },
  Pathway: { background: '#8B5CF6', border: '#8B5CF688' },
  Disease: { background: '#F59E0B', border: '#F59E0B88' },
  Gene: { background: '#10B981', border: '#10B98188' },
  Entity: { background: '#6B7280', border: '#6B728088' },
};

export default function VisualGraph({ graphData }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    if (!containerRef.current || !graphData?.nodes?.length) return;

    const nodes = new DataSet(graphData.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      title: `<div style="font-family:Inter;font-size:12px;color:#F8FAFC;background:#0F172A;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1)">
        <strong style="color:${NODE_COLORS[node.type]?.background || '#94A3B8'}">${node.label}</strong><br/>
        <span style="color:#475569">${node.type}</span></div>`,
      color: NODE_COLORS[node.type] || NODE_COLORS.Entity,
      font: { color: '#F8FAFC', size: 12, face: 'Inter' },
      shape: node.type === 'Drug' ? 'box' : node.type === 'Disease' ? 'diamond' : 'ellipse',
      borderWidth: 2,
      shadow: { enabled: true, color: (NODE_COLORS[node.type]?.background || '#000000') + '44', size: 10 },
    })));

    const edges = new DataSet(graphData.relationships.map((rel, idx) => ({
      id: idx,
      from: rel.source,
      to: rel.target,
      label: rel.type,
      arrows: { to: { enabled: true, scaleFactor: 0.8 } },
      color: {
        color: rel.type === 'CONTRADICTS' ? '#EF4444' : rel.type === 'SIMILAR_TO' ? '#F59E0B' : '#00D4AA44',
        highlight: rel.type === 'CONTRADICTS' ? '#F87171' : '#00D4AA',
        hover: '#00D4AA',
      },
      font: { size: 10, color: '#475569', strokeWidth: 0 },
      smooth: { type: 'curvedCW', roundness: 0.15 },
      dashes: rel.type === 'CONTRADICTS',
      width: rel.confidence > 0.8 ? 2 : 1,
    })));

    const options = {
      physics: {
        stabilization: { iterations: 150 },
        barnesHut: {
          gravitationalConstant: -3000,
          centralGravity: 0.3,
          springLength: 120,
          damping: 0.09,
        },
      },
      interaction: { hover: true, tooltipDelay: 150, hideEdgesOnDrag: false },
      nodes: { margin: 8 },
      edges: { selectionWidth: 2 },
    };

    if (networkRef.current) networkRef.current.destroy();
    const network = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current = network;

    network.on('hoverNode', ({ node }) => setHoveredNode(node));
    network.on('blurNode', () => setHoveredNode(null));

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [graphData]);

  return (
    <div className="w-full h-full glass-card relative overflow-hidden" style={{ minHeight: 400 }}>
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 flex items-center justify-between"
           style={{ background: 'linear-gradient(180deg, rgba(2,8,23,0.9) 0%, transparent 100%)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: '#00D4AA', boxShadow: '0 0 6px #00D4AA' }} />
          <span className="text-xs font-bold font-mono text-slate-300">KNOWLEDGE GRAPH CANVAS</span>
        </div>
        <span className="text-xs text-slate-600 font-mono">
          {graphData?.nodes?.length || 0}N · {graphData?.relationships?.length || 0}E
        </span>
      </div>
      {/* Scan line */}
      <div className="scan-line" />
      {/* Network container */}
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: 400 }} />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-1.5">
        {LEGEND.map(({ type, color }) => (
          <div key={type} className="flex items-center gap-1 px-2 py-1 rounded-md"
               style={{ background: 'rgba(2,8,23,0.85)', border: `1px solid ${color}33` }}>
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-[10px] font-mono" style={{ color }}>{type}</span>
          </div>
        ))}
      </div>
      {/* Contradiction indicator */}
      <div className="absolute bottom-3 right-3 z-10 px-2 py-1 rounded-md"
           style={{ background: 'rgba(2,8,23,0.85)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <span className="text-[10px] font-mono text-red-400">--- CONTRADICTS</span>
      </div>
    </div>
  );
}
