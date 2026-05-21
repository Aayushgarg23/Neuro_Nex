import React, { useState, useEffect } from 'react';
import VisualGraph from './components/VisualGraph';
import StreamPanel from './components/StreamPanel';
import MetricCard from './components/MetricCard';
import ConsensusGauge from './components/ConsensusGauge';
import IBCTChain from './components/IBCTChain';
import AMROHeatmap from './components/AMROHeatmap';
import SystemRouter from './components/SystemRouter';
import { Search, Activity, Database, Cpu, ChevronRight, Zap } from 'lucide-react';

const DEMO_GRAPH = {
  nodes: [
    { id: 'compound_a', label: 'Compound_A', type: 'Drug' },
    { id: 'receptor_z', label: 'Receptor_Z', type: 'Protein' },
    { id: 'pathway_y', label: 'Pathway_Y', type: 'Pathway' },
    { id: 'disease_c', label: 'Disease_C', type: 'Disease' },
    { id: 'gene_mapk', label: 'MAPK/ERK', type: 'Gene' },
    { id: 'compound_b', label: 'Imatinib', type: 'Drug' },
  ],
  relationships: [
    { source: 'compound_a', target: 'receptor_z', type: 'ACTIVATES', confidence: 0.92 },
    { source: 'receptor_z', target: 'pathway_y', type: 'TRIGGERS', confidence: 0.88 },
    { source: 'pathway_y', target: 'disease_c', type: 'LINKED_TO', confidence: 0.75 },
    { source: 'gene_mapk', target: 'pathway_y', type: 'REGULATES', confidence: 0.95 },
    { source: 'compound_a', target: 'compound_b', type: 'SIMILAR_TO', confidence: 0.78 },
    { source: 'compound_b', target: 'disease_c', type: 'CONTRADICTS', confidence: 0.61 },
  ],
};

const EXAMPLE_QUERIES = [
  'Is Compound_A efficient at activating Pathway_Y via Receptor_Z?',
  'What is the clinical translation risk for MAPK/ERK inhibition in Disease_C?',
  'Find non-obvious connections between Imatinib and Pathway_Y via graph traversal.',
];

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(null);
  const [verdict, setVerdict] = useState('');
  const [reviews, setReviews] = useState({});
  const [graphData, setGraphData] = useState(DEMO_GRAPH);
  const [ibctChain, setIbctChain] = useState([]);
  const [amroLog, setAmroLog] = useState([]);
  const [qaoa, setQaoa] = useState([]);
  const [tokenBudget, setTokenBudget] = useState(null);
  const [trl, setTrl] = useState('');
  const [elapsed, setElapsed] = useState(null);
  const [activeTab, setActiveTab] = useState('council');

  // Load live graph data on mount
  useEffect(() => {
    fetch('/api/v1/graph')
      .then(r => r.json())
      .then(d => { if (d.data) setGraphData(d.data); })
      .catch(() => {/* Backend not yet running — use demo graph */});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setScore(null);
    setVerdict('');
    setReviews({});
    setIbctChain([]);
    setAmroLog([]);
    setElapsed(null);
    const startTime = Date.now();

    try {
      const response = await fetch('/api/v1/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, thread_id: `thread_${Date.now()}` }),
      });
      const result = await response.json();
      setElapsed(((Date.now() - startTime) / 1000).toFixed(2));
      setScore(result.score ?? 0);
      setVerdict(result.data?.consensus_verdict ?? '');
      setTrl(result.data?.trl_assessment ?? '');
      setReviews(result.peer_evaluations_compiled ?? {});
      setIbctChain(result.ibct_chain ?? []);
      setAmroLog(result.amro_log ?? []);
      setQaoa(result.qaoa_schedule ?? []);
      setTokenBudget(result.token_budget ?? null);

      // Refresh graph with new data
      const graphRes = await fetch('/api/v1/graph');
      const graphJson = await graphRes.json();
      if (graphJson.data) setGraphData(graphJson.data);
    } catch (err) {
      console.error('Pipeline error:', err);
      setVerdict('⚠️ Connection error — ensure the FastAPI backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ===== STICKY HEADER ===== */}
      <header className="sticky top-0 z-50 border-b"
              style={{
                background: 'rgba(2,8,23,0.9)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderColor: 'rgba(255,255,255,0.05)',
              }}>
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #00D4AA22, #7C3AED22)', border: '1px solid #00D4AA44' }}>
                <Cpu className="w-4 h-4" style={{ color: '#00D4AA' }} />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
                   style={{ background: '#00D4AA', boxShadow: '0 0 6px #00D4AA' }} />
            </div>
            <div>
              <h1 className="text-sm font-bold font-display"
                  style={{ background: 'linear-gradient(135deg, #00D4AA, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                NEURONEX
              </h1>
              <div className="text-[9px] text-slate-600 font-mono tracking-widest">COGNITIVE RESEARCH PLATFORM</div>
            </div>
          </div>

          {/* System badges */}
          <div className="hidden md:flex items-center gap-3">
            {['GraphRAG', 'QISA v2', 'AMRO', 'IBCT'].map((label) => (
              <div key={label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                   style={{ background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.15)' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00D4AA' }} />
                <span className="text-[10px] font-mono text-slate-400">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-mono">System 2 · Active</span>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#7C3AED' }} />
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-screen-2xl mx-auto px-6 py-6">

        {/* Top Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Active Verifier Agents" value={4} unit="agents" icon="🤖" color="#00D4AA" />
          <MetricCard label="IBCT Block Overhead" value={0.22} unit="ms" icon="🔐" color="#7C3AED" />
          <MetricCard label="AMRO Routing Speed" value={0.87} unit="ms" icon="🐜" color="#3B82F6" />
          <MetricCard label="QAOA Schedule Energy" value={2.41} unit="J" icon="⚛️" color="#8B5CF6" />
        </div>

        {/* 3-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

          {/* ===== LEFT COLUMN ===== */}
          <div className="xl:col-span-4 space-y-4">

            {/* Query Panel */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4" style={{ color: '#00D4AA' }} />
                <h2 className="text-sm font-bold font-display text-slate-100">Deep Research Query</h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <textarea
                  id="research-query-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter scientific hypothesis or query..."
                  rows={4}
                  className="w-full rounded-xl p-4 text-sm resize-none transition-all duration-200"
                  style={{
                    background: 'rgba(2,8,23,0.8)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#F8FAFC',
                    fontFamily: 'Inter',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,212,170,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />

                {/* Example queries */}
                <div className="space-y-1">
                  {EXAMPLE_QUERIES.map((q, i) => (
                    <button key={i} type="button" onClick={() => setQuery(q)}
                            className="w-full text-left text-[11px] px-3 py-1.5 rounded-lg transition-all duration-200 flex items-start gap-2"
                            style={{ color: '#475569', background: 'transparent' }}
                            onMouseEnter={e => {
                              e.currentTarget.style.color = '#00D4AA';
                              e.currentTarget.style.background = 'rgba(0,212,170,0.04)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = '#475569';
                              e.currentTarget.style.background = 'transparent';
                            }}>
                      <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="truncate">{q}</span>
                    </button>
                  ))}
                </div>

                <button id="execute-research-btn" type="submit"
                        disabled={loading || !query.trim()}
                        className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Executing MAV Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Execute System 2 Analysis</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Cognitive Router */}
            <SystemRouter activeSystem={2} />

            {/* Consensus Result Card */}
            {score !== null && (
              <div className="glass-card p-5 gradient-border">
                <div className="flex justify-center mb-4">
                  <ConsensusGauge score={score} size={180} />
                </div>
                {trl && (
                  <div className="flex items-center justify-center mb-3">
                    <span className="badge badge-violet">{trl}</span>
                  </div>
                )}
                {verdict && (
                  <p className="text-xs text-slate-400 leading-relaxed text-center">{verdict}</p>
                )}
                {elapsed && (
                  <div className="flex items-center justify-center gap-1.5 mt-3">
                    <Activity className="w-3 h-3 text-slate-600" />
                    <span className="text-xs text-slate-600 font-mono">Completed in {elapsed}s</span>
                  </div>
                )}
              </div>
            )}

            {/* Token Budget */}
            {tokenBudget && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-bold font-display text-slate-400">Token Budget</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500">Used</span>
                    <span style={{ color: '#00D4AA' }}>{tokenBudget.tokens_used?.toLocaleString()} tokens</span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                         style={{
                           width: `${tokenBudget.utilization_pct}%`,
                           background: 'linear-gradient(90deg, #00D4AA, #7C3AED)',
                         }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                    <span>{tokenBudget.utilization_pct?.toFixed(1)}% utilized</span>
                    <span>Model: {tokenBudget.current_tier}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===== CENTER COLUMN: Tabs ===== */}
          <div className="xl:col-span-4 space-y-4">
            {/* Tab Switcher */}
            <div className="glass-card px-4 py-2 flex gap-1">
              {[
                { id: 'council', label: 'Council', icon: '🤖' },
                { id: 'ibct', label: 'Provenance', icon: '🔐' },
                { id: 'amro', label: 'AMRO', icon: '🐜' },
                { id: 'qaoa', label: 'QAOA', icon: '⚛️' },
              ].map(tab => (
                <button key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-display font-medium transition-all duration-200"
                        style={{
                          background: activeTab === tab.id ? 'rgba(0,212,170,0.1)' : 'transparent',
                          color: activeTab === tab.id ? '#00D4AA' : '#475569',
                          border: activeTab === tab.id ? '1px solid rgba(0,212,170,0.2)' : '1px solid transparent',
                        }}>
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'council' && (
              Object.keys(reviews).length > 0
                ? <StreamPanel reviews={reviews} />
                : (
                  <div className="glass-card p-8 flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight: 200 }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                         style={{ background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.1)' }}>
                      <Cpu className="w-6 h-6" style={{ color: '#00D4AA', opacity: 0.4 }} />
                    </div>
                    <p className="text-sm text-slate-600 font-display">Agent council awaiting activation</p>
                    <p className="text-xs text-slate-700">Submit a query to trigger the MAV pipeline</p>
                  </div>
                )
            )}

            {activeTab === 'ibct' && (
              ibctChain.length > 0
                ? <IBCTChain chain={ibctChain} />
                : (
                  <div className="glass-card p-8 flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight: 200 }}>
                    <p className="text-sm text-slate-600 font-display">No provenance chain yet</p>
                    <p className="text-xs text-slate-700">IBCT blocks are generated after a query runs</p>
                  </div>
                )
            )}

            {activeTab === 'amro' && <AMROHeatmap amroLog={amroLog} />}

            {activeTab === 'qaoa' && (
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm">⚛️</span>
                  <h3 className="text-sm font-bold font-display text-slate-200">QAOA Execution Schedule</h3>
                </div>
                {qaoa.length > 0 ? (
                  <div className="space-y-3">
                    {qaoa.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                           style={{ background: 'rgba(2,8,23,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold"
                             style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                          S{item.slot}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-mono text-slate-300">{item.agent_id}</div>
                          {item.parallel_with?.length > 0 && (
                            <div className="text-[10px] text-slate-600 mt-0.5">∥ {item.parallel_with.join(', ')}</div>
                          )}
                        </div>
                        <span className="badge badge-violet">{item.priority?.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 text-center py-6">No schedule generated yet</p>
                )}
              </div>
            )}
          </div>

          {/* ===== RIGHT COLUMN: Knowledge Graph ===== */}
          <div className="xl:col-span-4 space-y-4">
            <div className="glass-card p-1" style={{ height: 480 }}>
              <VisualGraph graphData={graphData} />
            </div>

            {/* Graph Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Nodes', value: graphData?.nodes?.length || 0, color: '#00D4AA', icon: '◉' },
                { label: 'Edges', value: graphData?.relationships?.length || 0, color: '#3B82F6', icon: '↔' },
                { label: 'Contradictions', value: graphData?.relationships?.filter(r => r.type === 'CONTRADICTS').length || 0, color: '#EF4444', icon: '⚡' },
              ].map(stat => (
                <div key={stat.label} className="glass-card p-3 text-center">
                  <div className="text-lg font-mono font-bold" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[10px] text-slate-600 font-display mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Architecture callout */}
            <div className="glass-card p-4"
                 style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.04), rgba(124,58,237,0.04))' }}>
              <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">Architecture</div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600">
                {[
                  ['GraphRAG', 'Neo4j + Qdrant'],
                  ['Agent LLM', 'Gemini 2.0 Flash'],
                  ['Orchestration', 'LangGraph ToT'],
                  ['Consensus', 'QISA v2 Protocol'],
                  ['Provenance', 'IBCT Blockchain'],
                  ['Routing', 'AMRO Pheromone'],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <span style={{ color: '#00D4AA' }}>{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t mt-12 py-4"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="max-w-screen-2xl mx-auto px-6 flex items-center justify-between">
          <span className="text-xs text-slate-700 font-mono">
            NeuroNex Cognitive Platform · Multi-Agent GraphRAG · v2.0.0
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00D4AA' }} />
            <span className="text-xs text-slate-700 font-mono">All systems operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
