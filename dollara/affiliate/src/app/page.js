'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchProgram } from '../services/affiliateApi';
import { inr } from '../lib/format';
import {
  TrendingUp,
  DollarSign,
  Zap,
  ArrowRight,
  Layers,
  Sparkles,
  Calculator,
  CheckCircle2,
  Lock,
  Plus,
  Minus
} from 'lucide-react';





export default function LandingPage() {


  // Inputs for the earnings calculator down in the "Calculator" section


  const [players, setPlayers] = useState(150);
  const [avgDeposit, setAvgDeposit] = useState(5000);
  const [dealType, setDealType] = useState('revshare');                 // 'revshare' | 'cpa'

  // Programme terms come from the API, so the calculator quotes the rates the
  // platform actually pays. They were hardcoded at 45% / $120, which drifted the
  // moment anyone changed the real defaults in admin.
  const [programme, setProgramme] = useState(null);

  useEffect(() => {
    fetchProgram()
      .then(setProgramme)
      .catch(() => {
        // The calculator is a nice-to-have on a marketing page — if the API is
        // unreachable it falls back to the defaults below rather than breaking
        // the page for someone who just wants to click "Apply".
      });
  }, []);

  const revShareRate = programme?.default_commission_rate ?? 30;
  const cpaAmount = programme?.default_cpa_amount ?? 500;

  // Rough estimate only, enough to give visitors a sense of scale.
  const estimatedEarnings = dealType === 'revshare'
    ? Math.round((players * avgDeposit * revShareRate) / 100)
    : players * cpaAmount;



  // Which FAQ item is expanded — index into `faqs`, -1 means none open



  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      q: 'How fast do I get approved?',
      a: 'Applications are typically reviewed and approved within 2 to 24 hours. You will gain immediate access to your partner dashboard and tracking links.'
    },
    {
      q: 'When are commission payouts processed?',
      a: 'We process payouts on a regular cycle via Bank Transfer, UPI or Crypto (USDT). The minimum threshold is shown on your payouts screen once you are approved.'
    },
    {
      q: 'Is there a negative balance carryover?',
      a: 'No, we operate on a strictly NO negative carryover policy. Your balance resets to zero at the start of each month.'
    }
  ];

  return (
    <div className="min-h-screen text-slate-800 selection:bg-brand-500 selection:text-black font-sans">


      {/* ─── Navbar ─── */}


      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">


            {/* Falls back to the icon+text lockup if /logo/image.png 404s */}



            <img src="/logo/image.png" alt="Dollara" className="h-9 w-auto object-contain"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-300 hidden items-center justify-center">
              <DollarSign className="w-5 h-5 text-black" />

            </div>
            <div>


              <span className="text-xl font-black font-display tracking-tight text-slate-900">DOLLARA</span>
              <span className="text-[9px] font-bold text-brand-600 uppercase tracking-[0.2em] block -mt-0.5">Affiliate Network</span>


            </div>
          </Link>

          <div className="flex items-center space-x-3">
            <Link href="/login" className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">
              Sign In
            </Link>

            <Link href="/apply" className="px-5 py-2 text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-500 rounded-lg shadow-md hover:scale-[1.03] transition-all flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply Now</span>
            </Link>

          </div>

        </div>
      </header>

      {/* ─── Hero ─── */}


      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border border-brand-400/30 bg-brand-400/10 mb-6">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />

            <span className="text-[10px] font-bold text-brand-800 uppercase tracking-[0.15em]">Partner Portal — Now Accepting Applications</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight text-slate-900 leading-[1.1] max-w-4xl mx-auto">
            Turn Gaming Traffic Into Weekly Commissions
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Up to <span className="text-slate-950 font-semibold">{revShareRate}% Revenue Share</span>
            · Zero negative carryover · Weekly payouts every Monday
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/apply" className="px-7 py-3.5 text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-500 rounded-xl shadow-lg hover:scale-105 transition-all flex items-center space-x-2">

              <span>Become a Partner</span>

              <ArrowRight className="w-4 h-4" />

            </Link>


            <Link href="/login" className="px-7 py-3.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center space-x-2 shadow-sm">
              <Lock className="w-3.5 h-3.5 text-brand-600" />


              <span>Partner Login</span>

            </Link>
          </div>
        </div>

      </section>

      {/* ─── Banner ─── */}



      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-2 rounded-2xl border border-slate-200 bg-white/60 shadow-md overflow-hidden">

            <div className="relative rounded-xl overflow-hidden">

              <img src="/banner-image/banner1.png" alt="Dollara Banner" className="w-full h-auto object-cover" />
            </div>

            {/* Quick Stats — static values, update here if the deal terms change */}



            <div className="grid grid-cols-4 gap-2 mt-2">
              {[
                { label: 'Rev Share', value: `Up to ${revShareRate}%`, color: 'text-brand-600' },
                { label: 'Payouts', value: 'Weekly', color: 'text-emerald-600' },
                { label: 'Carryover', value: 'None', color: 'text-slate-900' },
                { label: 'Cookie', value: '30 Days', color: 'text-sky-600' },


              ].map((s, i) => (
                <div key={i} className="py-2.5 px-3 rounded-lg bg-slate-50/80 text-center">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">{s.label}</div>
                  <div className={`text-sm font-bold font-display mt-0.5 ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>


      </section>

      {/* ─── Our Brand / Platform Preview ─── */}



      <section className="py-16 bg-white/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-[0.2em] mb-2">Our Brand</p>
            <h2 className="text-3xl font-extrabold text-slate-900 font-display">Dollara Gaming Suite</h2>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-center">


            {/* Left Content */}



            <div className="lg:col-span-5 space-y-6">
              <p className="text-base text-slate-600 leading-relaxed">
                Dollara delivers an outstanding catalog of premium iGaming products. We offer high-converting 3D Slots, Live Casino tables, and Instant Crash games backed by top software providers.
              </p>
              <p className="text-base text-slate-600 leading-relaxed">
                As a partner, you gain access to marketing tools, analytics, and promo codes designed to convert traffic into active players instantly.
              </p>
              <div>
                <a
                  href="https://deira365.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex px-6 py-3 text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-500 rounded-xl shadow-md hover:scale-[1.03] transition-all"
                >
                  Check Platform
                </a>
              </div>
            </div>



            {/* Right: Modern 3D Floating Glass Feature Cards Stack.
                This is just three absolutely-positioned cards layered over
                each other with slight rotations — no actual 3D, just
                transforms + shadows to fake depth. Hover straightens each
                card back to 0deg. */}



            <div className="lg:col-span-7 flex items-center justify-center relative min-h-[360px] sm:min-h-[400px]">


              {/* Soft glow behind the stack */}


              <div className="absolute inset-0 bg-gradient-to-tr from-brand-500/5 to-transparent blur-2xl rounded-full" />

              {/* Backing Card: Main Platform Preview */}


              <div className="absolute w-[80%] aspect-[1.6] rounded-2xl border border-slate-200 bg-white/80 shadow-md p-1.5 overflow-hidden -rotate-6 translate-y-4 translate-x-[-10px] transition-transform hover:rotate-0 duration-300">
                <img
                  src="/web/website_image.png"
                  alt="Dollara Platform Preview"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>

              {/* Floating Card 1: Games Stats (Top-Left) */}


              <div className="absolute left-4 top-8 w-56 glass p-4 shadow-xl border-white/90 translate-y-[-10px] -rotate-3 hover:rotate-0 transition-transform duration-300 z-20">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600 font-bold">🎮</div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">2,500+ Games</div>
                    <div className="text-[10px] text-slate-500">Live Slots & Casino</div>
                  </div>
                </div>
              </div>

              {/* Floating Card 2: Payout Speed (Bottom-Right) */}


              <div className="absolute right-4 bottom-8 w-56 glass p-4 shadow-xl border-white/90 translate-y-[10px] rotate-3 hover:rotate-0 transition-transform duration-300 z-20">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold">⚡</div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Avg. Payout</div>
                    <div className="text-[10px] text-emerald-600 font-bold">14 Mins Auto-Process</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Calculator ─── */}


      <section className="py-16 bg-slate-100/60 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">

            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-700 text-[10px] font-bold uppercase tracking-wider mb-4">
                <Calculator className="w-3.5 h-3.5" />

                <span>Earnings Estimator</span>

              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">

                Calculate Your Income
              </h2>

              {/* Toggle between the two deal types — this drives which
                  sliders show up on the right and which formula runs above */}



              <div className="mt-5 p-1 rounded-lg bg-slate-200/60 border border-slate-300/40 inline-flex w-full">
                <button onClick={() => setDealType('revshare')}
                  className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${dealType === 'revshare' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                  {revShareRate}% Rev Share
                </button>
                <button onClick={() => setDealType('cpa')}
                  className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${dealType === 'cpa' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                  {inr(cpaAmount)} CPA
                </button>
              </div>
            </div>

            <div className="space-y-6 p-6 rounded-2xl border border-slate-200 bg-white/80 shadow-md">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600">Players / month</span>
                  <span className="font-bold text-brand-600 font-display">{players}</span>
                </div>


                <input type="range"
                  min="10"
                  max="1000" step="10"
                  value={players}
                  onChange={(e) => setPlayers(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-brand-500" />
              </div>

              {/* Deposit slider only makes sense for revshare — CPA pays a
                  flat rate per player regardless of what they deposit */}



              {dealType === 'revshare' && (
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-600">Avg. deposit</span>
                    <span className="font-bold text-brand-600 font-display">{inr(avgDeposit)}</span>
                  </div>
                  <input type="range" min="50"
                    max="1000" step="25"
                    value={avgDeposit}


                    onChange={(e) => setAvgDeposit(Number(e.target.value))}

                    className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-brand-500" />
                </div>
              )}

              <div className="p-5 rounded-xl bg-gradient-to-br from-brand-50 to-slate-50 border border-brand-100 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Monthly Earnings</div>
                  <div className="text-3xl font-extrabold text-brand-600 font-display mt-1">
                    {inr(estimatedEarnings)}
                  </div>
                </div>
                <Link href="/apply" className="px-5 py-2.5 text-xs font-bold text-black bg-gradient-to-r from-brand-400 to-brand-500 rounded-lg shadow-md hover:scale-105 transition-all shrink-0">
                  Start Earning
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Deal Cards ─── */}



      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-slate-900 font-display mb-10">
            Choose Your Deal
          </h2>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: TrendingUp, title: 'Revenue Share', highlight: `Up to ${revShareRate}%`,
                points: ['Lifetime recurring income', 'No negative carryover', 'Tiered scaling']
              },


              {
                // Marked as "featured" so it gets the highlighted card
                // styling + "Popular" badge below



                icon: Zap, title: 'CPA Bounty', highlight: 'Flat Rate $', featured: true,
                points: ['Per-FTD payouts', 'High conversion rates', 'Custom thresholds']
              },
              {
                icon: Layers, title: 'Hybrid + Override', highlight: 'Custom + 5%',
                points: ['CPA + Rev Share mix', 'Sub-affiliate override', 'VIP Manager']
              }


            ].map((deal, idx) => (
              <div key={idx} className={`relative p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${deal.featured
                  ? 'border-brand-300 bg-white shadow-xl shadow-slate-100/80'
                  : 'border-slate-200 bg-white/60 hover:border-brand-400/40 shadow-md'

                }`}>


                {deal.featured && (
                  <div className="absolute -top-2.5 right-5 bg-gradient-to-r from-brand-400 to-brand-600 text-black font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    Popular
                  </div>
                )}


                <deal.icon className="w-7 h-7 text-brand-600 mb-4" />

                <h3 className="text-base font-bold text-slate-900">{deal.title}</h3>

                <p className="text-2xl font-extrabold text-brand-600 font-display my-2">{deal.highlight}</p>
                <ul className="space-y-2 mt-4">
                  {deal.points.map((p, i) => (
                    <li key={i} className="flex items-center space-x-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why Dollara ─── */}



      <section className="py-14 border-t border-slate-200 bg-slate-100/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold text-brand-600 uppercase tracking-[0.2em] text-center mb-8">Why Partners Choose Dollara</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '📊', title: 'Real-Time Analytics', desc: 'Track clicks, signups & earnings live' },
              { icon: '🔒', title: 'Guaranteed Payouts', desc: 'Weekly payments, never missed' },
              { icon: '🎨', title: 'Marketing Creatives', desc: 'Banners, links & QR codes ready' },
              { icon: '🤝', title: 'VIP Managers', desc: 'Dedicated 1-on-1 partner support' },
            ].map((f, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white/60 hover:border-brand-400/40 shadow-sm transition-all text-center">
                <div className="text-2xl mb-2">{f.icon}</div>
                <h4 className="text-sm font-bold text-slate-900">{f.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Software Providers ─── */}
      {/* Just a logo/name wall — plain text for now since we don't have
          the provider logo assets yet, swap these for <img> tags once we do */}



      <section className="py-10 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Integrated Software Providers</p>


          <div className="flex flex-wrap items-center justify-center gap-3">

            {['Evolution', 'NetEnt', 'Pragmatic Play', 'Playtech', 'Red Tiger', 'Microgaming', 'Ezugi', 'Spribe', 'Betsoft', 'Habanero'].map((name, i) => (
              <div key={i} className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-[10px] text-slate-600 font-bold uppercase tracking-widest hover:text-slate-900 hover:border-brand-400/40 transition-all select-none shadow-sm">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Payment Logos ─── */}


      <section className="py-12 border-t border-slate-200 bg-slate-100/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Supported Payments</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {['/payment/bhmi.png', '/payment/imps.png', '/payment/upi.png'].map((src, i) => (
              <div key={i} className="px-6 py-3 rounded-xl border border-slate-200 bg-white hover:border-brand-400/40 shadow-sm transition-all">
                <img src={src} alt="Payment" className="h-8 w-auto object-contain" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ Accordion ─── */}


      <section className="py-16 border-t border-slate-200 bg-slate-100/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-slate-900 font-display mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="glass rounded-xl overflow-hidden border-slate-200 transition-colors">


                <button
                  // Clicking the open item again closes it (sets openFaq
                  // back to -1), clicking a different one swaps to it
                  onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                  className="w-full p-5 text-left flex items-center justify-between space-x-4 font-semibold text-slate-800 hover:text-brand-700 transition-colors"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    {openFaq === index ? <Minus className="w-3.5 h-3.5 text-brand-600" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 border-t border-slate-100 pt-3 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}



      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative p-10 sm:p-14 rounded-3xl border border-white bg-white/80 text-center overflow-hidden shadow-2xl shadow-slate-200">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-display relative z-10">
              Start Earning Today
            </h2>
            <p className="text-slate-500 mt-3 text-sm max-w-md mx-auto relative z-10">
              Join top-performing partners earning weekly commissions with Dollara.
            </p>
            <Link href="/apply" className="mt-7 inline-flex px-8 py-3.5 text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-500 rounded-xl shadow-lg hover:scale-105 transition-all items-center space-x-2 relative z-10">
              <span>Apply for Partnership</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}


      <footer className="border-t border-slate-200 py-8 text-xs text-slate-500 bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <img src="/logo/image.png" alt="Dollara" className="h-6 w-auto object-contain" />
            <span className="text-sm font-bold font-display text-slate-800">DOLLARA</span>
          </div>


          {/* Auto-updates each year, no need to touch this manually */}



          <p>&copy; {new Date().getFullYear()} Dollara Gaming Network</p>
          <div className="flex items-center space-x-5">

            <Link href="/login" className="hover:text-slate-900 transition-colors">Login</Link>
            <Link href="/apply" className="hover:text-slate-900 transition-colors">Apply</Link>

          </div>
        </div>
      </footer>
    </div>
  );
}