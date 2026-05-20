import React, { useState } from 'react';
import VisualGraph from './components/VisualGraph';
import StreamPanel from './components/StreamPanel';

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const = useState(null);
  const [verdict, setVerdict] = useState('');
  const = useState({});

  // Mock initial graph state for visualization
  const = useState({
    nodes:,
    relationships:
  });

  const handleResearchSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, thread_id: `thread_${Date.now()}` }),
      });
      const result = await response.json();
      
      setScore(result.score);
      setVerdict(result.data.consensus_verdict);
      setReviews(result.data.peer_evaluations_compiled || {});
    } catch (err) {
      console.error("System failed to execute deep research pipeline:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-900 bg-slate-950/50 backdrop-blur sticky top-0 z-50 px-8 py-4 flex items-center">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 w-3 h-3 rounded-full animate-pulse" />
          <h1 className="text-md font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            NEURONEX WORKSPACE
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Interactive Workspace Column */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-6">
            <h2 className="text-md font-bold mb-4">Initialize Cognitive Search Pipeline</h2>
            <form onSubmit={handleResearchSubmit} className="space-y-4">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter scientific query (e.g., 'Is Compound_X efficient at activating Pathway_Y via Receptor_Z?')"
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-700"
              />
              <button
                type="submit"
                disabled={loading ||!query}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-3 rounded-xl transition duration-200 text-sm"
              >
                {loading? 'Executing Multi-Agent Deliberations...' : 'Execute Deep Search'}
              </button>
            </form>
          </div>

          {score!== null && (
            <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consensus Score</span>
                <span className="text-lg font-mono font-bold text-emerald-400">{(score * 100).toFixed(1)}%</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{verdict}</p>
            </div>
          )}

          {Object.keys(reviews).length > 0 && (
            <StreamPanel reviews={reviews} />
          )}
        </div>

        {/* Right Graphical Workspace Column */}
        <div className="h-[600px] lg:h-auto">
          <VisualGraph graphData={graphData} />
        </div>
      </main>
    </div>
  );
}
