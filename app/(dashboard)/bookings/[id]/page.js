"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, Clock, Mail, Phone, GitBranch, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import Loader from '@/components/Loader';
import { useAuth } from '@/contexts/AuthContext';

const statusStyles = {
    confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    cancelled: 'bg-white/5 text-gray-500 border-white/10'
};

function formatSlot(booking) {
    const d = new Date(`${booking.date}T00:00:00Z`);
    const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    const [h, m] = booking.time.split(':').map(Number);
    return { day, time: `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` };
}

export default function BookingsPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('upcoming');

    useEffect(() => {
        if (!id || !user) return;
        (async () => {
            try {
                const token = await user.getIdToken();
                const res = await fetch(`/api/bookings/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                const data = await res.json();
                if (data.success) setBookings(data.data);
                else toast.error(data.message || 'Failed to load bookings');
            } catch (err) {
                toast.error('Failed to load bookings');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, user]);

    const setStatus = async (bookingId, status) => {
        const previous = bookings;
        setBookings(bs => bs.map(b => b.id === bookingId ? { ...b, status } : b));
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/bookings/${id}/${bookingId}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast.success(status === 'cancelled' ? 'Booking cancelled, slot is free again' : 'Booking updated');
        } catch (err) {
            setBookings(previous);
            toast.error('Could not update booking');
        }
    };

    const { upcoming, past } = useMemo(() => {
        const now = Date.now();
        const upcoming = [];
        const past = [];
        bookings.forEach(b => {
            const isPast = new Date(b.startsAt).getTime() < now || b.status === 'completed';
            (isPast ? past : upcoming).push(b);
        });
        past.reverse();
        return { upcoming, past };
    }, [bookings]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    const list = tab === 'upcoming' ? upcoming : past;

    // Group by day for a calendar-like agenda
    const groups = list.reduce((acc, b) => {
        const { day } = formatSlot(b);
        (acc[day] = acc[day] || []).push(b);
        return acc;
    }, {});

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
            <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Bookings</h1>
                    <p className="text-gray-400">Appointments visitors booked in the chat. You get an email with a calendar invite for each one.</p>
                </div>
                <Link
                    href={`/flow/${id}`}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-xl transition-colors"
                >
                    <GitBranch className="w-4 h-4" /> Booking settings
                </Link>
            </header>

            <div className="flex bg-[#0a0a0a] border border-white/10 rounded-xl p-1 w-fit mb-6">
                {[['upcoming', `Upcoming (${upcoming.filter(b => b.status !== 'cancelled').length})`], ['past', 'Past']].map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {list.length === 0 ? (
                <div className="bg-[#0a0a0a] border border-dashed border-white/10 rounded-2xl py-16 px-6 text-center">
                    <CalendarDays className="w-10 h-10 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-white font-semibold mb-1">{tab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}</h3>
                    <p className="text-sm text-gray-500">
                        Add a <span className="text-cyan-400">Booking</span> node in your{' '}
                        <Link href={`/flow/${id}`} className="text-blue-400 hover:underline">Flow</Link>; visitors can then pick a day and time in the chat widget.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groups).map(([day, items]) => (
                        <div key={day}>
                            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{day}</div>
                            <div className="space-y-2">
                                {items.map(b => {
                                    const { time } = formatSlot(b);
                                    return (
                                        <div key={b.id} className={`bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center gap-4 ${b.status === 'cancelled' ? 'opacity-60' : ''}`}>
                                            <div className="w-20 text-center">
                                                <div className="text-lg font-bold text-white">{time}</div>
                                                <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Clock className="w-3 h-3" />{b.durationMinutes} min</div>
                                            </div>
                                            <div className="flex-1 min-w-[200px] border-l border-white/10 pl-4">
                                                <div className="text-white font-medium">{b.name || b.email || b.visitorId || 'Visitor'}</div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400 mt-1">
                                                    {b.email && <a href={`mailto:${b.email}`} className="flex items-center gap-1.5 hover:text-white"><Mail className="w-3.5 h-3.5" />{b.email}</a>}
                                                    {b.phone && <a href={`tel:${b.phone}`} className="flex items-center gap-1.5 hover:text-white"><Phone className="w-3.5 h-3.5" />{b.phone}</a>}
                                                    <span className="text-gray-600">{b.timezone}</span>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full border text-xs font-medium capitalize ${statusStyles[b.status] || statusStyles.confirmed}`}>{b.status}</span>
                                            {b.status === 'confirmed' && (
                                                <div className="flex gap-2">
                                                    {tab === 'past' && (
                                                        <button onClick={() => setStatus(b.id, 'completed')} title="Mark completed" className="p-2 rounded-lg bg-white/5 hover:bg-green-500/10 text-gray-400 hover:text-green-400 transition-colors">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => setStatus(b.id, 'cancelled')} title="Cancel booking" className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
