"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Users, Search, Download, Mail, Phone, CalendarDays, MessageSquare, Flame } from 'lucide-react';
import { toast } from 'sonner';
import Loader from '@/components/Loader';
import { useAuth } from '@/contexts/AuthContext';

const STATUSES = ['new', 'contacted', 'won', 'lost'];
const TEMPS = ['all', 'hot', 'warm', 'cold'];

const tempStyles = {
    hot: 'bg-red-500/10 text-red-400 border-red-500/20',
    warm: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    cold: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
};

const statusStyles = {
    new: 'text-orange-400',
    contacted: 'text-blue-400',
    won: 'text-green-400',
    lost: 'text-gray-500'
};

const SOURCE_LABELS = { flow: 'Flow email', chat: 'AI chat', 'live-chat': 'Live chat', booking: 'Booking' };

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function LeadsPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [temp, setTemp] = useState('all');
    const [status, setStatus] = useState('any');
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!id || !user) return;
        (async () => {
            try {
                const token = await user.getIdToken();
                const res = await fetch(`/api/leads/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                const data = await res.json();
                if (data.success) setLeads(data.data);
                else toast.error(data.message || 'Failed to load leads');
            } catch (err) {
                toast.error('Failed to load leads');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, user]);

    const updateLead = async (leadId, updates) => {
        const previous = leads;
        setLeads(ls => ls.map(l => l.id === leadId ? { ...l, ...updates } : l)); // optimistic
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/leads/${id}/${leadId}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
        } catch (err) {
            setLeads(previous);
            toast.error('Could not update lead');
        }
    };

    const counts = useMemo(() => ({
        all: leads.length,
        hot: leads.filter(l => l.temperature === 'hot').length,
        warm: leads.filter(l => l.temperature === 'warm').length,
        cold: leads.filter(l => l.temperature === 'cold').length,
        toContact: leads.filter(l => l.status === 'new').length,
        won: leads.filter(l => l.status === 'won').length
    }), [leads]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const order = { hot: 0, warm: 1, cold: 2 };
        return leads
            .filter(l => temp === 'all' || l.temperature === temp)
            .filter(l => status === 'any' || l.status === status)
            .filter(l => !q || [l.name, l.email, l.phone, l.notes, l.lastMessage, l.visitorId].some(v => v && String(v).toLowerCase().includes(q)))
            .sort((a, b) => (order[a.temperature] ?? 3) - (order[b.temperature] ?? 3) || (b.createdAt || '').localeCompare(a.createdAt || ''));
    }, [leads, temp, status, query]);

    const exportCsv = () => {
        const header = ['Name', 'Email', 'Phone', 'Temperature', 'Status', 'Source', 'Booking', 'Notes', 'Last message', 'Created'];
        const rows = filtered.map(l => [
            l.name, l.email, l.phone, l.temperature, l.status, SOURCE_LABELS[l.source] || l.source,
            l.booking ? `${l.booking.date} ${l.booking.time}` : '', l.notes, l.lastMessage, l.createdAt
        ]);
        const csv = [header, ...rows]
            .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    const stats = [
        { label: 'All leads', value: counts.all, color: 'text-white' },
        { label: 'Hot', value: counts.hot, color: 'text-red-500', hint: 'phone + buying intent' },
        { label: 'To contact', value: counts.toContact, color: 'text-orange-500', hint: 'status: new' },
        { label: 'Won', value: counts.won, color: 'text-green-500' }
    ];

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
            <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Leads</h1>
                    <p className="text-gray-400 max-w-2xl">Visitors who shared their contact details or showed buying interest. Hot leads first: call them today.</p>
                </div>
                <button
                    onClick={exportCsv}
                    disabled={filtered.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors"
                >
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {stats.map(s => (
                    <div key={s.label} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{s.label}</div>
                        <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                        {s.hint && <div className="text-xs text-gray-500 mt-1">{s.hint}</div>}
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex bg-[#0a0a0a] border border-white/10 rounded-xl p-1">
                    {TEMPS.map(t => (
                        <button
                            key={t}
                            onClick={() => setTemp(t)}
                            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${temp === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            {t} ({t === 'all' ? counts.all : counts[t]})
                        </button>
                    ))}
                </div>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="bg-[#0a0a0a] border border-white/10 rounded-xl px-3 text-sm text-white outline-none focus:border-blue-500/50"
                >
                    <option value="any">Any status</option>
                    {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s[0].toUpperCase() + s.slice(1)}</option>)}
                </select>
                <div className="flex-1 min-w-[220px] relative">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search name, phone, email, notes"
                        className="w-full h-full min-h-[42px] bg-[#0a0a0a] border border-white/10 rounded-xl pl-10 pr-4 text-sm text-white placeholder:text-gray-500 outline-none focus:border-blue-500/50"
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-[#0a0a0a] border border-dashed border-white/10 rounded-2xl py-16 px-6 text-center">
                    <Users className="w-10 h-10 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-white font-semibold mb-1">{leads.length === 0 ? 'No leads yet' : 'No leads match these filters'}</h3>
                    <p className="text-sm text-gray-500 max-w-lg mx-auto">
                        {leads.length === 0
                            ? 'When visitors answer an Email node in your flow, book a slot, or share a phone number or email in chat, they appear here.'
                            : 'Try a different filter or search.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(lead => (
                        <div key={lead.id} className="bg-[#0a0a0a] border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-colors">
                            <div className="flex flex-wrap items-start gap-4">
                                <div className="flex-1 min-w-[240px]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold uppercase ${tempStyles[lead.temperature] || tempStyles.cold}`}>
                                            {lead.temperature === 'hot' && <Flame className="w-3 h-3" />}{lead.temperature}
                                        </span>
                                        <span className="text-white font-medium truncate">{lead.name || lead.email || lead.phone || lead.visitorId}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-400">
                                        {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-white"><Mail className="w-3.5 h-3.5" />{lead.email}</a>}
                                        {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-white"><Phone className="w-3.5 h-3.5" />{lead.phone}</a>}
                                        {lead.booking && <span className="flex items-center gap-1.5 text-cyan-400"><CalendarDays className="w-3.5 h-3.5" />{lead.booking.date} {lead.booking.time}</span>}
                                    </div>
                                    {lead.lastMessage && <p className="text-sm text-gray-500 mt-2 line-clamp-2">"{lead.lastMessage}"</p>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right text-xs text-gray-500">
                                        <div>{SOURCE_LABELS[lead.source] || lead.source}</div>
                                        <div>{formatDate(lead.createdAt)}</div>
                                    </div>
                                    <select
                                        value={lead.status || 'new'}
                                        onChange={(e) => updateLead(lead.id, { status: e.target.value })}
                                        className={`bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none capitalize ${statusStyles[lead.status] || 'text-white'}`}
                                    >
                                        {STATUSES.map(s => <option key={s} value={s} className="bg-[#111] text-white">{s[0].toUpperCase() + s.slice(1)}</option>)}
                                    </select>
                                    <Link
                                        href={`/conversations/${id}`}
                                        title="Open conversations"
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                            <input
                                defaultValue={lead.notes || ''}
                                onBlur={(e) => e.target.value !== (lead.notes || '') && updateLead(lead.id, { notes: e.target.value })}
                                placeholder="Add a note…"
                                className="mt-3 w-full bg-transparent border-t border-white/5 pt-3 text-sm text-gray-300 placeholder:text-gray-600 outline-none"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
