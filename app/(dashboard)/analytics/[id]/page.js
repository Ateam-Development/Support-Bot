"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Table2, BarChart3 } from 'lucide-react';
import Loader from '@/components/Loader';
import { useAuth } from '@/contexts/AuthContext';

const RANGES = [7, 30, 90];
const COLORS = { conversations: '#3b82f6', leads: '#f97316', bookings: '#22d3ee' };

function formatDay(key) {
    return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function formatHour(h) {
    return `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`;
}

function BarChart({ series }) {
    const [hover, setHover] = useState(null);
    const max = Math.max(2, ...series.map(d => Math.max(d.conversations, d.leads, d.bookings)));
    const ticks = [0, Math.ceil(max / 2), Math.ceil(max / 2) * 2];
    const top = ticks[2];
    const labelEvery = Math.ceil(series.length / 12);

    return (
        <div className="relative">
            <div className="flex">
                <div className="flex flex-col justify-between h-56 pr-2 text-[11px] text-gray-500 text-right w-8">
                    {[...ticks].reverse().map(t => <span key={t}>{t}</span>)}
                </div>
                <div className="flex-1 relative h-56">
                    {ticks.map(t => (
                        <div key={t} className="absolute left-0 right-0 border-t border-white/5" style={{ bottom: `${(t / top) * 100}%` }} />
                    ))}
                    <div className="absolute inset-0 flex items-end gap-[2px]">
                        {series.map((d, i) => (
                            <div
                                key={d.date}
                                className="flex-1 h-full flex items-end justify-center gap-[1px] rounded-t hover:bg-white/[0.03] cursor-default"
                                onMouseEnter={() => setHover(i)}
                                onMouseLeave={() => setHover(null)}
                            >
                                {['conversations', 'leads', 'bookings'].map(k => (
                                    <div
                                        key={k}
                                        className="flex-1 max-w-[14px] rounded-t-sm transition-all duration-300"
                                        style={{ height: `${(d[k] / top) * 100}%`, backgroundColor: COLORS[k], minHeight: d[k] ? 3 : 0 }}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                    {hover !== null && (
                        <div
                            className="absolute -top-2 z-10 pointer-events-none bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl -translate-x-1/2 -translate-y-full"
                            style={{ left: `${((hover + 0.5) / series.length) * 100}%` }}
                        >
                            <div className="text-white font-medium mb-1">{formatDay(series[hover].date)}</div>
                            <div className="text-gray-400">Conversations: <span className="text-white">{series[hover].conversations}</span></div>
                            <div className="text-gray-400">Leads: <span className="text-white">{series[hover].leads}</span></div>
                            <div className="text-gray-400">Bookings: <span className="text-white">{series[hover].bookings}</span></div>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex ml-8 mt-2">
                {series.map((d, i) => (
                    <div key={d.date} className="flex-1 text-center text-[10px] text-gray-500 whitespace-nowrap overflow-visible">
                        {i % labelEvery === 0 ? formatDay(d.date) : ''}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [botFilter, setBotFilter] = useState(id);
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTable, setShowTable] = useState(false);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const token = await user.getIdToken();
                const res = await fetch(`/api/analytics?chatbotId=${botFilter}&days=${days}`, { headers: { Authorization: `Bearer ${token}` } });
                const json = await res.json();
                if (!cancelled && json.success) setData(json.data);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user, botFilter, days]);

    if (!data) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    const { totals, series, hours, topQuestions } = data;
    const maxHour = Math.max(1, ...hours.map(h => h.messages));
    const maxQuestion = Math.max(1, ...topQuestions.map(q => q.count));

    const cards = [
        { label: 'Conversations', value: totals.conversations, color: 'text-white', hint: `${totals.visitorMessages} visitor messages` },
        { label: 'Leads', value: totals.leads, color: 'text-orange-500', hint: `${totals.leadRate}% of conversations · ${totals.hotLeads} hot` },
        { label: 'Bookings', value: totals.bookings, color: 'text-cyan-400', hint: `${totals.upcomingBookings} upcoming` },
        { label: 'Live chats', value: totals.liveChats, color: 'text-green-500', hint: `${totals.wonLeads} leads won` }
    ];

    return (
        <div className={`p-8 h-full overflow-y-auto custom-scrollbar transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
                    <p className="text-gray-400">How your bots are doing: conversations, leads and bookings.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <select
                        value={botFilter}
                        onChange={(e) => setBotFilter(e.target.value)}
                        className="bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50 min-w-[180px]"
                    >
                        <option value="all">All bots</option>
                        {data.bots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <div className="flex bg-[#0a0a0a] border border-white/10 rounded-xl p-1">
                        {RANGES.map(r => (
                            <button
                                key={r}
                                onClick={() => setDays(r)}
                                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${days === r ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                {r} days
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {cards.map(c => (
                    <div key={c.label} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{c.label}</div>
                        <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{c.hint}</div>
                    </div>
                ))}
            </div>

            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Conversations and leads per day (last {days} days)</h2>
                    <button onClick={() => setShowTable(v => !v)} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
                        {showTable ? <><BarChart3 className="w-4 h-4" /> Show chart</> : <><Table2 className="w-4 h-4" /> Show table</>}
                    </button>
                </div>
                <div className="flex gap-5 mb-4 text-sm text-gray-400">
                    {Object.entries(COLORS).map(([k, color]) => (
                        <span key={k} className="flex items-center gap-2 capitalize">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />{k}
                        </span>
                    ))}
                </div>
                {showTable ? (
                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm">
                            <thead className="text-gray-500 text-xs uppercase sticky top-0 bg-[#0a0a0a]">
                                <tr><th className="text-left py-2">Day</th><th className="text-right">Conversations</th><th className="text-right">Leads</th><th className="text-right">Bookings</th></tr>
                            </thead>
                            <tbody>
                                {[...series].reverse().map(d => (
                                    <tr key={d.date} className="border-t border-white/5 text-gray-300">
                                        <td className="py-2">{formatDay(d.date)}</td>
                                        <td className="text-right">{d.conversations}</td>
                                        <td className="text-right">{d.leads}</td>
                                        <td className="text-right">{d.bookings}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <BarChart series={series} />
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Busiest hours (IST)</h2>
                    <div className="flex items-end gap-1 h-40">
                        {hours.map(h => (
                            <div key={h.hour} className="flex-1 h-full flex items-end group relative">
                                <div
                                    className="w-full rounded-t-sm bg-blue-500/80 group-hover:bg-blue-400 transition-colors"
                                    style={{ height: `${(h.messages / maxHour) * 100}%`, minHeight: h.messages ? 3 : 0 }}
                                />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap bg-[#111] border border-white/10 rounded px-2 py-1 text-[11px] text-white z-10">
                                    {formatHour(h.hour)}: {h.messages}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 mt-2">
                        <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
                    </div>
                </div>

                <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Most asked questions</h2>
                    {topQuestions.length === 0 ? (
                        <p className="text-sm text-gray-500">No questions in this period yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {topQuestions.map(q => (
                                <div key={q.question}>
                                    <div className="flex justify-between gap-4 text-sm mb-1">
                                        <span className="text-gray-200 truncate">{q.question}</span>
                                        <span className="text-gray-400 flex-none">{q.count}×</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500/70 rounded-full" style={{ width: `${(q.count / maxQuestion) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
