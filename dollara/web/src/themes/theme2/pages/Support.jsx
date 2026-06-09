'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useBranding } from '@/hooks/useBranding';
import { T2Card, t2Input } from '../components/ui';

export default function Theme2Support() {
  const { token } = useAuthStore();
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
      const res = await api('/api/v1/ai/chat', { method: 'POST', body: JSON.stringify({ message: msg }) });
      setMessages((m) => [...m, { role: 'bot', text: res.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'bot', text: e.message }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col px-4 py-6">
      <h1 className="font-display text-xl font-black text-white">Live Support</h1>
      <T2Card className="mt-4 flex min-h-[400px] flex-1 flex-col p-4">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i}
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                m.role === 'user' ? 'ml-auto bg-gradient-to-r from-amber-400 to-amber-600 text-black' : 'bg-[#070d16] text-slate-200'
              }`}>
              {m.text}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Type a message..." className={t2Input} />
          <button type="button" disabled={loading} onClick={() => send()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
        {!token ? (
          <p className="mt-3 text-center text-sm text-slate-500">
            <Link href="/login" className="text-amber-400">Login</Link> for full support
          </p>
        ) : null}
      </T2Card>
    </div>
  );
}
