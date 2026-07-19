'use client';

// Theme5 Support — shared AI chat endpoint, light portal style.

import { useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useBranding } from '@/hooks/useBranding';
import { T5Card, t5Input, T5FormPage } from '../components/ui';

export default function Theme5Support() {
  const { token } = useAuthStore();
  const branding = useBranding();
  const [messages, setMessages] = useState([
    { role: 'bot', text: `Hi! I'm your ${branding.product_name || 'DOLLARA'} assistant. How can I help?` },
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <T5FormPage title="Live Support" maxWidth="max-w-lg">
      <T5Card className="mt-4 flex min-h-[400px] flex-1 flex-col p-4">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === 'user' ? 'ml-auto bg-[#101c33] text-white' : 'bg-[#f1f4f8] text-[#0f1b33]'
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
            className={t5Input}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => send()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#101c33] text-white transition hover:bg-[#1b2a48] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {!token ? (
          <p className="mt-3 text-center text-sm text-[#94a3b8]">
            <Link href="/login" className="font-bold text-[#1d4ed8]">Login</Link> for full support
          </p>
        ) : null}
      </T5Card>
    </T5FormPage>
  );
}
