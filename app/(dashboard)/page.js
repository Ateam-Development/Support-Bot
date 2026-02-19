"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatbotList from '@/components/ChatbotList';
import Loader from '@/components/Loader';

import { MessageSquare, Users, Zap, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-black/50">
        <Loader />
      </div>
    );
  }

  if (!user) return null;

  const stats = [
    { title: 'Total Conversations', value: '1,234', change: '+12%', icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Active Users', value: '856', change: '+5%', icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Avg. Response Time', value: '1.2s', change: '-8%', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { title: 'Satisfaction Rate', value: '98%', change: '+2%', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="p-8 overflow-y-auto h-full custom-scrollbar">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back! Manage your AI assistants.</p>
      </header>

      <ChatbotList />
    </div>
  );
}
