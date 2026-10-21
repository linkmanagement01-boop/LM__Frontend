import React, { useState, useEffect } from 'react';
import { BookOpen, ExternalLink, PlayCircle, RefreshCw } from 'lucide-react';
import { bloggerAPI } from '../../lib/api';

/**
 * Guides – the help videos the admin adds under More Links → Videos (active ones only).
 * Clicking a guide opens its link.
 */
export function Guides() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchGuides = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await bloggerAPI.getGuides();
      setGuides(data.guides || []);
    } catch (err) {
      setError(err.message || 'Failed to load guides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGuides(); }, []);

  // Only real web links are opened (never javascript: or similar)
  const safeLink = (link) => (/^https?:\/\//i.test(String(link || '').trim()) ? String(link).trim() : null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <BookOpen className="h-6 w-6" style={{ color: 'var(--primary-cyan)' }} />
          Guides
        </h2>
        <button
          onClick={fetchGuides}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl text-sm text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          {error}
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}>
        {loading ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading guides...</div>
        ) : guides.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No guides available yet.</div>
        ) : (
          <ul>
            {guides.map((g) => {
              const link = safeLink(g.link);
              return (
                <li key={g.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <a
                    href={link || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { if (!link) e.preventDefault(); }}
                    className={`flex items-center gap-4 px-6 py-4 transition-colors ${link ? 'hover:bg-[var(--card-hover)] cursor-pointer' : 'cursor-default opacity-60'}`}
                  >
                    <PlayCircle className="h-6 w-6 shrink-0" style={{ color: 'var(--primary-cyan)' }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{g.title}</div>
                      <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {link || 'Link not available'}
                      </div>
                    </div>
                    {link && <ExternalLink className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Guides;
