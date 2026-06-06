'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useBranding } from '@/hooks/useBranding';
import Link from 'next/link';

export default function SupportChatPage() {
  const { token, wallet } = useAuthStore();
  const branding = useBranding();
  const [messages, setMessages] = useState([
    { role: 'bot', text: `Hi! I'm your ${branding.product_name} assistant. How can I help?` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setInput('');
    if (!token) {
      setMessages((m) => [...m, { role: 'bot', text: 'Please login to use support chat.' }]);
      return;
    }
    setLoading(true);
    try {
      const res = await api('/api/v1/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: msg }),
      });
      setMessages((m) => [...m, { role: 'bot', text: res.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'bot', text: e.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header wallet={wallet ?? undefined} />
      <main className="mx-auto flex max-w-lg flex-1 flex-col px-4 py-6">
        <h1 className="text-xl font-bold">Live Support</h1>
        <div className="card-glass mt-4 flex min-h-[400px] flex-1 flex-col p-4">
          <div className="flex-1 space-y-3 overflow-y-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'ml-auto bg-brand-500 text-surface-900'
                    : 'bg-surface-700 text-slate-200'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-white/10 bg-surface-700 px-3 py-2 text-white"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => send()}
              className="rounded-lg bg-brand-500 px-4 py-2 font-semibold text-surface-900 disabled:opacity-50"
            >
              Send
            </button>
          </div>
          {!token ? (
            <p className="mt-3 text-center text-sm text-slate-500">
              <Link href="/login" className="text-brand-400">Login</Link> for full support
            </p>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
