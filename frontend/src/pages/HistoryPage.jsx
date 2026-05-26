import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, Trash2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = React.useState(() =>
    JSON.parse(localStorage.getItem('neuronex_history') || '[]')
  );

  const clearHistory = () => {
    localStorage.removeItem('neuronex_history');
    setHistory([]);
  };

  const openResult = (item) => {
    navigate('/results', { state: { result: item.result, query: item.query } });
  };

  return (
    <div className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Query History</h1>
          <p className="text-sm text-slate-400 mt-1">Your last {history.length} analyses (stored locally)</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-24">
          <Clock className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 text-sm mb-4">No history yet. Run a query to see it here.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Run Your First Query
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const score = item.score ?? 0;
            const ScoreIcon = score >= 0.8 ? CheckCircle : score >= 0.6 ? AlertTriangle : XCircle;
            const scoreColor = score >= 0.8 ? 'text-emerald-500' : score >= 0.6 ? 'text-amber-500' : 'text-red-500';
            const date = new Date(item.timestamp);
            const timeAgo = getTimeAgo(date);

            return (
              <button
                key={item.id}
                onClick={() => openResult(item)}
                className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm mb-1 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      "{item.query}"
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{item.verdict}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`flex items-center gap-1 text-sm font-bold ${scoreColor}`}>
                        <ScoreIcon className="w-4 h-4" />
                        {(score * 100).toFixed(0)}%
                      </div>
                      <p className="text-xs text-slate-400 font-mono">{timeAgo}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
                {item.trl && (
                  <div className="mt-2">
                    <span className="text-[10px] font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                      {item.trl}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
