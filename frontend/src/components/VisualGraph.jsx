import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';

/* ── Node styling by entity type ─────────────────────────────── */
const TYPE_STYLES = {
  Drug:     { bg: '#6366f1', border: '#4338ca', shape: 'box' },
  Protein:  { bg: '#10b981', border: '#059669', shape: 'ellipse' },
  Pathway:  { bg: '#8b5cf6', border: '#7c3aed', shape: 'hexagon' },
  Disease:  { bg: '#f59e0b', border: '#d97706', shape: 'diamond' },
  Gene:     { bg: '#06b6d4', border: '#0891b2', shape: 'ellipse' },
  Entity:   { bg: '#94a3b8', border: '#64748b', shape: 'dot' },
  Query:    { bg: '#f43f5e', border: '#e11d48', shape: 'star' },
  Result:   { bg: '#22d3ee', border: '#06b6d4', shape: 'ellipse' },
};

const REL_COLORS = {
  ACTIVATES_VIA: '#10b981',
  PREDICTS:      '#6366f1',
  INHIBITS:      '#ef4444',
  SIMILAR_TO:    '#f59e0b',
  CONTRADICTS:   '#dc2626',
  RELATES_TO:    '#64748b',
};

const LEGEND_ITEMS = [
  { label: 'Query/Result',  color: '#f43f5e' },
  { label: 'Drug',          color: '#6366f1' },
  { label: 'Protein/Gene',  color: '#10b981' },
  { label: 'Pathway',       color: '#8b5cf6' },
  { label: 'Disease',       color: '#f59e0b' },
  { label: 'Entity',        color: '#94a3b8' },
];

export default function VisualGraph({ graphData, isDarkMode = false }) {
  const containerRef = useRef(null);
  const networkRef   = useRef(null);
  const [info, setInfo]       = useState(null);   // hovered node details
  const [nodeCount, setNodeCount]  = useState(0);
  const [edgeCount, setEdgeCount]  = useState(0);
  const [stabilized, setStabilized] = useState(false);

  const bg   = isDarkMode ? '#0f172a' : '#f8fafc';
  const txt  = isDarkMode ? '#e2e8f0' : '#1e293b';
  const dim  = isDarkMode ? '#475569' : '#94a3b8';

  useEffect(() => {
    if (!containerRef.current || !graphData?.nodes?.length) return;

    /* ── Build nodes ── */
    const visNodes = new DataSet(
      graphData.nodes.map((n) => {
        const style = TYPE_STYLES[n.type] ?? TYPE_STYLES.Entity;
        const label = (n.label ?? n.id ?? '?').slice(0, 24);
        return {
          id:    n.id,
          label,
          title: buildTooltip(n, isDarkMode),
          shape: style.shape,
          color: {
            background: style.bg,
            border:     style.border,
            highlight:  { background: style.bg, border: '#fff' },
            hover:      { background: style.border, border: '#fff' },
          },
          font:        { color: '#ffffff', size: 13, face: 'Inter, sans-serif', bold: '600' },
          borderWidth: 2,
          size:        n.type === 'Query' ? 28 : 20,
          shadow:      { enabled: true, color: 'rgba(0,0,0,0.3)', size: 10, x: 0, y: 3 },
          mass:        n.type === 'Query' ? 3 : 1,
        };
      })
    );

    /* ── Build edges ── */
    const visEdges = new DataSet(
      (graphData.relationships ?? []).map((r, idx) => {
        const c = REL_COLORS[r.type] ?? REL_COLORS.RELATES_TO;
        return {
          id:     idx,
          from:   r.source,
          to:     r.target,
          label:  r.type?.replace(/_/g, ' '),
          arrows: { to: { enabled: true, scaleFactor: 0.9, type: 'arrow' } },
          color:  { color: c, highlight: '#fff', hover: '#fff', opacity: 0.85 },
          font:   { size: 10, color: dim, strokeWidth: 2, strokeColor: bg, align: 'middle' },
          smooth: { type: 'dynamic' },
          dashes: r.type === 'CONTRADICTS',
          width:  (r.confidence ?? 0) > 0.8 ? 2.5 : 1.5,
          selectionWidth: 3,
        };
      })
    );

    setNodeCount(graphData.nodes.length);
    setEdgeCount((graphData.relationships ?? []).length);

    const options = {
      physics: {
        enabled: true,
        stabilization: { enabled: true, iterations: 200, updateInterval: 25 },
        forceAtlas2Based: {
          gravitationalConstant: -80,
          centralGravity:        0.01,
          springLength:          160,
          springConstant:        0.08,
          damping:               0.4,
        },
        solver: 'forceAtlas2Based',
      },
      interaction: {
        hover:              true,
        tooltipDelay:       120,
        hideEdgesOnDrag:    true,
        navigationButtons:  false,
        keyboard:           false,
        multiselect:        false,
      },
      nodes:   { margin: 10 },
      edges:   { selectionWidth: 3 },
      layout:  { improvedLayout: true },
    };

    if (networkRef.current) networkRef.current.destroy();
    const net = new Network(containerRef.current, { nodes: visNodes, edges: visEdges }, options);
    networkRef.current = net;

    net.on('stabilized', () => setStabilized(true));
    net.on('hoverNode', ({ node }) => {
      const raw = graphData.nodes.find(n => n.id === node);
      setInfo(raw ?? null);
    });
    net.on('blurNode', () => setInfo(null));

    return () => {
      if (networkRef.current) { networkRef.current.destroy(); networkRef.current = null; }
    };
  }, [graphData, isDarkMode]);

  const zoomIn  = () => networkRef.current?.moveTo({ scale: (networkRef.current.getScale() * 1.3) });
  const zoomOut = () => networkRef.current?.moveTo({ scale: (networkRef.current.getScale() * 0.77) });
  const fit     = () => networkRef.current?.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700"
      style={{ height: 480, background: bg }}
    >
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-lg px-3 py-1.5 shadow-sm border border-slate-200 dark:border-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
            {nodeCount} nodes · {edgeCount} edges
          </span>
        </div>
        {!stabilized && (
          <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-400/30 rounded-lg px-3 py-1.5">
            <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
            <span className="text-[11px] font-mono text-blue-400">Laying out…</span>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        {[
          { icon: <ZoomIn className="w-3.5 h-3.5" />, fn: zoomIn, tip: 'Zoom in' },
          { icon: <ZoomOut className="w-3.5 h-3.5" />, fn: zoomOut, tip: 'Zoom out' },
          { icon: <Maximize2 className="w-3.5 h-3.5" />, fn: fit, tip: 'Fit all' },
        ].map((b, i) => (
          <button
            key={i}
            onClick={b.fn}
            title={b.tip}
            className="w-7 h-7 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {b.icon}
          </button>
        ))}
      </div>

      {/* Graph canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Hover info panel */}
      {info && (
        <div className="absolute bottom-12 left-3 z-20 max-w-xs bg-white/95 dark:bg-slate-800/95 backdrop-blur rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: TYPE_STYLES[info.type]?.bg ?? '#94a3b8' }}
            />
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{info.label}</span>
            <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded flex-shrink-0">{info.type}</span>
          </div>
          {info.confidence !== undefined && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Confidence: {(info.confidence * 100).toFixed(0)}%</p>
          )}
          {info.verdict && (
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{info.verdict}</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-1.5">
        {LEGEND_ITEMS.map(({ label, color }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildTooltip(n, dark) {
  const bg  = dark ? '#1e293b' : '#ffffff';
  const txt = dark ? '#e2e8f0' : '#1e293b';
  const dim = dark ? '#94a3b8' : '#64748b';
  const acc = TYPE_STYLES[n.type]?.bg ?? '#94a3b8';
  return `<div style="font-family:Inter,sans-serif;font-size:12px;background:${bg};color:${txt};padding:10px 14px;border-radius:10px;border:1px solid rgba(128,128,128,0.2);box-shadow:0 8px 24px rgba(0,0,0,0.15);max-width:220px;">
    <strong style="color:${acc};display:block;margin-bottom:4px">${n.label ?? n.id}</strong>
    <span style="color:${dim};font-size:11px;">${n.type ?? 'Entity'}</span>
    ${n.confidence !== undefined ? `<br><span style="color:${dim};font-size:11px;">Confidence: ${(n.confidence * 100).toFixed(0)}%</span>` : ''}
    ${n.verdict ? `<p style="margin:6px 0 0;font-size:11px;color:${txt};line-height:1.4">${String(n.verdict).slice(0, 100)}…</p>` : ''}
  </div>`;
}
