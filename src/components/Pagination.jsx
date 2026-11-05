import React from 'react';

export function Pagination({
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange = () => {},
  onPageSizeChange = () => {},
  pageSizeOptions = [20, 50],
}) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  const pages = (() => {
    const arr = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
      return arr;
    }
    const add = (x) => arr.push(x);
    add(1);
    if (page > 4) add('…');
    const startP = Math.max(2, page - 1);
    const endP = Math.min(totalPages - 1, page + 1);
    for (let i = startP; i <= endP; i++) add(i);
    if (page < totalPages - 3) add('…');
    add(totalPages);
    return arr;
  })();

  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--card-background)' }}>
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {`Showing ${start} to ${end} of ${total} results`}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span>Per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md px-2 py-1"
            style={{ backgroundColor: 'var(--background-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="px-2 h-8 rounded-md disabled:opacity-50"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Prev
          </button>
          {pages.map((p, idx) => (
            p === '…' ? (
              <span key={`dots-${idx}`} className="px-2 text-sm" style={{ color: 'var(--text-muted)' }}>…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`px-3 h-8 rounded-md text-sm ${p === page ? 'font-semibold' : ''}`}
                style={{ border: '1px solid var(--border)', color: p === page ? 'white' : 'var(--text-secondary)', background: p === page ? 'var(--color-primary)' : 'transparent', borderColor: p === page ? 'var(--color-primary)' : 'var(--border)' }}
              >
                {p}
              </button>
            )
          ))}
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="px-2 h-8 rounded-md disabled:opacity-50"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
