'use client';

import Link from 'next/link';
import { Download } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-surface-700 bg-[#0a0a0a] text-slate-300 pt-16 pb-8">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-surface-800 p-2 rounded">
                {/* Logo Box Placeholder */}
                <div className="flex flex-col items-center leading-none tracking-tighter w-16 h-12 justify-center">
                  <span className="text-sm font-black italic text-brand-500">DOLLARA</span>
                </div>
              </div>
              <span className="text-xl font-bold text-white">DOLLARA</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              <strong className="text-white">dollara</strong> is the best platform for live and uninterrupted online betting for sports. Live 24hr betting with a wide spectrum of sports such as Cricket, Soccer, Horse Racing, Kabaddi, <span className="text-brand-500">Aviator Predictor</span>, Hockey, Basketball, <span className="text-brand-500">Andar Bahar Game</span> and many more.
            </p>
          </div>

          {/* Quick Navigation */}
          <div>
            <h3 className="text-xs font-bold text-white tracking-widest uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
              QUICK NAVIGATION
            </h3>
            <ul className="space-y-3 text-sm font-medium">
              {['Live Betting', 'Cricket Hub', 'Casino Lobby', 'Direct Support', 'Promotions', 'Get App'].map((link) => (
                <li key={link}>
                  <Link href="#" className="hover:text-brand-500 transition-colors">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Safe & Instant Payments */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase mb-4">
              100% SAFE & INSTANT PAYMENTS
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              You can make payments and receive earnings instantly via your UPI ID.
            </p>
            <div className="flex gap-2 mb-6">
              <span className="bg-surface-800 border border-surface-700 text-[10px] text-red-500 font-bold px-3 py-1.5 rounded">18+ ONLY</span>
              <span className="bg-surface-800 border border-surface-700 text-[10px] text-slate-300 font-bold px-3 py-1.5 rounded">G</span>
              <span className="bg-surface-800 border border-surface-700 text-[10px] text-slate-300 font-bold px-3 py-1.5 rounded">GT</span>
            </div>
            <button className="flex items-center gap-2 bg-[#00d26a] hover:bg-[#00b35a] text-surface-900 font-bold text-sm px-6 py-2.5 rounded shadow-[0_0_15px_rgba(0,210,106,0.3)] transition-all">
              <Download className="w-4 h-4" />
              GET APP
            </button>
          </div>

          {/* Payment Modes */}
          <div>
            <h3 className="text-xs font-bold text-white tracking-widest uppercase mb-6 text-center">
              ACCEPTED MODES OF PAYMENTS
            </h3>
            <div className="bg-surface-800/50 rounded-xl p-6 flex flex-wrap justify-center gap-4 border border-surface-700/50">
              {/* Payment placeholders */}
              <div className="text-white font-bold italic text-lg">UPI</div>
              <div className="text-blue-500 font-bold text-lg">G<span className="text-green-500">Pay</span></div>
              <div className="text-indigo-500 font-bold text-lg">PhonePe</div>
              <div className="text-blue-400 font-bold text-lg">Pay<span className="text-cyan-400">tm</span></div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-surface-800 pt-8 flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[10px] font-bold tracking-widest uppercase text-slate-400">
            <span>© COPYRIGHT 2024 DOLLARA</span>
            <Link href="#" className="hover:text-white transition-colors">RESPONSIBLE GAMBLING</Link>
            <Link href="#" className="hover:text-white transition-colors">TERMS & CONDITION</Link>
            <Link href="#" className="hover:text-white transition-colors">KYC POLICY</Link>
          </div>
          <p className="text-[10px] font-bold tracking-widest text-brand-500 uppercase">
            GAMBLING CAN BE ADDICTIVE. PLEASE PLAY RESPONSIBLY
          </p>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      <a
        href="#"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xl hover:scale-110 transition-transform"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#25D366" className="w-8 h-8">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
        </svg>
      </a>
    </footer>
  );
}
