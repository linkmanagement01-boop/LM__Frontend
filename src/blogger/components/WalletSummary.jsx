import React from 'react';
import { Wallet as WalletIcon, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';

/**
 * WalletSummary - Display wallet balance cards
 * @param {Object} wallet - Wallet data from API
 * @param {boolean} loading - Loading state
 */
export function WalletSummary({ wallet, loading }) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className="rounded-2xl p-6 animate-pulse"
                        style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
                    >
                        <div className="h-4 w-20 rounded bg-white/10 mb-3"></div>
                        <div className="h-8 w-32 rounded bg-white/10"></div>
                    </div>
                ))}
            </div>
        );
    }

    const cards = [
        {
            label: 'Current Balance',
            value: `$${parseFloat(wallet?.balance || 0).toFixed(2)}`,
            icon: WalletIcon,
            color: '#7C3AED',
            bgColor: 'rgba(124, 58, 237, 0.1)',
        },
        {
            label: 'Available Balance',
            value: `$${parseFloat(wallet?.available_balance || wallet?.balance || 0).toFixed(2)}`,
            icon: DollarSign,
            color: '#22C55E',
            bgColor: 'rgba(34, 197, 94, 0.1)',
        },
        {
            label: 'Total Withdrawn',
            value: `$${parseFloat(wallet?.total_withdrawn || 0).toFixed(2)}`,
            icon: TrendingDown,
            color: '#F59E0B',
            bgColor: 'rgba(245, 158, 11, 0.1)',
        },
        {
            label: 'Pending Withdrawals',
            value: `$${parseFloat(wallet?.pending_withdrawals || 0).toFixed(2)}`,
            icon: Clock,
            color: '#3B82F6',
            bgColor: 'rgba(59, 130, 246, 0.1)',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <div
                        key={index}
                        className="rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1"
                        style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border)' }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{card.label}</span>
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: card.bgColor }}
                            >
                                <Icon className="h-5 w-5" style={{ color: card.color }} />
                            </div>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: card.color }}>
                            {card.value}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
