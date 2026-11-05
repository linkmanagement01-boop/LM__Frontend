import React from 'react';
import { FileText, Calendar, Globe, Play, Send, Eye } from 'lucide-react';

/**
 * TaskNotificationCard - Display individual task notification
 */
export function TaskNotificationCard({ task, onStartWriting, onViewDetails, onSubmitContent }) {
    const getStatusInfo = (status) => {
        switch (status) {
            case 'ASSIGNED_TO_WRITER':
                return { label: 'New Assignment', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)' };
            case 'WRITING_IN_PROGRESS':
                return { label: 'In Progress', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)' };
            default:
                return { label: status || 'Pending', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)' };
        }
    };

    const statusInfo = getStatusInfo(task.current_status);
    const canStart = task.current_status === 'ASSIGNED_TO_WRITER';
    const canSubmit = task.current_status === 'WRITING_IN_PROGRESS';

    return (
        <div
            className="rounded-2xl p-5 transition-all duration-200 hover:shadow-lg"
            style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}
                    >
                        <FileText className="h-6 w-6" style={{ color: '#7C3AED' }} />
                    </div>
                    <div>
                        <span
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                                border: '1px solid rgba(124, 58, 237, 0.3)',
                                color: '#7C3AED'
                            }}
                        >
                            TASK-{task.id}
                        </span>
                        <h3 className="text-lg font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
                            {task.website_domain || 'Writing Assignment'}
                        </h3>
                    </div>
                </div>
                <span
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
                >
                    {statusInfo.label}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Globe className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    {task.website_domain || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Calendar className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    {new Date(task.created_at).toLocaleDateString()}
                </div>
            </div>

            {task.content_instructions && (
                <div
                    className="p-3 rounded-xl mb-4 text-sm"
                    style={{ backgroundColor: 'var(--background-dark)', color: 'var(--text-secondary)' }}
                >
                    <strong className="block mb-1" style={{ color: 'var(--text-muted)' }}>Instructions:</strong>
                    {task.content_instructions.slice(0, 150)}
                    {task.content_instructions.length > 150 ? '...' : ''}
                </div>
            )}

            <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                    onClick={() => onViewDetails(task)}
                    className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors hover:bg-white/10"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                    <Eye className="h-4 w-4" />
                    View Details
                </button>

                {canStart && (
                    <button
                        onClick={() => onStartWriting(task)}
                        className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:opacity-80"
                        style={{ backgroundColor: '#8B5CF6', color: 'white' }}
                    >
                        <Play className="h-4 w-4" />
                        Start Writing
                    </button>
                )}

                {canSubmit && (
                    <button
                        onClick={() => onSubmitContent(task)}
                        className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:opacity-80"
                        style={{
                            background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                            color: '#FFFFFF'
                        }}
                    >
                        <Send className="h-4 w-4" />
                        Submit Content
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * TaskNotificationsList - List of task notification cards
 */
export function TaskNotificationsList({ tasks, loading, onStartWriting, onViewDetails, onSubmitContent }) {
    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary-cyan)' }}></div>
                <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading tasks...</p>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div
                className="rounded-2xl flex items-center justify-center py-16"
                style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
            >
                <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks assigned</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {tasks.map(task => (
                <TaskNotificationCard
                    key={task.id}
                    task={task}
                    onStartWriting={onStartWriting}
                    onViewDetails={onViewDetails}
                    onSubmitContent={onSubmitContent}
                />
            ))}
        </div>
    );
}
