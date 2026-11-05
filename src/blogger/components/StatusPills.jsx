import React from 'react';

/**
 * StatusPills - Reusable status filter tabs component
 * @param {string[]} statuses - Array of status values
 * @param {string} activeStatus - Currently selected status
 * @param {Object} counts - Object with counts for each status
 * @param {Function} onStatusChange - Callback when status changes
 */
export function StatusPills({ statuses, activeStatus, counts, onStatusChange }) {
    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'var(--success)';
            case 'rejected': return 'var(--error)';
            case 'pending': return 'var(--warning)';
            case 'waiting': return 'var(--primary-cyan)'; // Using primary-cyan for waiting/blue
            default: return 'var(--color-primary)'; // "All" tab – brand colour
        }
    };

    return (
        <div className="premium-card p-2 inline-flex gap-2 animate-fadeIn flex-wrap">
            {statuses.map((status) => {
                const isActive = activeStatus === status;

                // Determine active style dynamically based on status color
                // Ideally this would be cleaner with CSS modules or styled components but inline style works for dynamic colors
                const activeStyle = isActive ? {
                    backgroundColor: `color-mix(in srgb, ${getStatusColor(status)}, white 10%)`,
                    color: 'white',
                    boxShadow: `0 4px 12px -2px ${getStatusColor(status)}`
                } : {
                    color: 'var(--text-secondary)'
                };

                return (
                    <button
                        key={status}
                        onClick={() => onStatusChange(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 ${isActive ? 'scale-105' : 'hover:bg-[var(--text-primary)]/5'
                            }`}
                        style={activeStyle}
                    >
                        {status === 'all' ? 'All Orders' : status.charAt(0).toUpperCase() + status.slice(1)}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20' : 'bg-[var(--background-dark)] border border-[var(--border)]'}`}>
                            {counts[status] ?? 0}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
