'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Dice5,
  FileSpreadsheet,
  GitBranch,
  Layers,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { PublicFooter, PublicHeader } from './_components/PublicShell';
import { fetchProgram } from '../services/agentApi';
import { getAgentToken } from '../services/agentApi';
import { label, pct } from '../lib/format';

const FEATURES = [
  {
    icon: BarChart3,
    title: 'A live book, not a nightly report',
    body: 'Sport Analysis shows every open bet under you the moment it is struck — by sport, event and market, with the exposure and the most the book can lose on each.',
  },
  {
    icon: GitBranch,
    title: 'Your own downline',
    body: 'Open accounts beneath you, set each one’s partnership split, and push or pull credit down the tree. Every movement lands on a transfer statement you can audit.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Eight reports, one period',
    body: 'P&L by market, by agent and by event; bet list; transfers; settlements; transactions; real revenue. Every one exports to Excel.',
  },
  {
    icon: Wallet,
    title: 'Credit you control',
    body: 'Balance, exposure and available credit on every screen. Nothing you have not got can be handed down, and settled P&L is recorded rather than remembered.',
  },
  {
    icon: ShieldCheck,
    title: 'Scoped to you, strictly',
    body: 'You see yourself and everything below you. Never a peer, never your upline — enforced on the server for every single query.',
  },
  {
    icon: Dice5,
    title: 'Sports and casino together',
    body: 'Exchange markets and aggregator play reported side by side, so a player’s whole position is one row rather than two systems.',
  },
];

const STEPS = [
  {
    title: 'Apply',
    body: 'Tell us who you are, where you operate and roughly what volume you expect. If an existing agent referred you, enter their code.',
  },
  {
    title: 'Get reviewed',
    body: 'Your upline — or the operator, if you applied directly — reviews the application and sets your level, partnership split and opening credit.',
  },
  {
    title: 'Start trading',
    body: 'Sign in with the username and password you chose. Open your first accounts, push credit down, and watch the book from the dashboard.',
  },
];

const FAQS = [
  {
    q: 'How long does approval take?',
    a: 'Most applications are reviewed within a day. You can check the status at any time from the Check Status link, using the email address you applied with.',
  },
  {
    q: 'What is a partnership split?',
    a: 'The percentage of your downline’s P&L you keep; the remainder flows to your upline. It is agreed at approval and shown on every P&L report, split into member, agent and upline columns.',
  },
  {
    q: 'Do I need to deposit anything to start?',
    a: 'No. You are opened with a credit reference extended by your upline, not a deposit. What you can hand down to your own accounts is limited to your available credit — your balance less anything already at risk.',
  },
  {
    q: 'Can I open agents below me, or only players?',
    a: 'Both, depending on the level you are approved at. An account may only ever create accounts strictly below its own rung, and the panel shows you exactly which those are.',
  },
];

export default function LandingPage() {
  const [programme, setProgramme] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    // Read once on mount rather than during render — localStorage does not
    // exist on the server, and touching it in the body breaks hydration.
    setSignedIn(Boolean(getAgentToken()));

    fetchProgram()
      .then(setProgramme)
      .catch(() => {
        // Marketing copy is a nice-to-have. If the API is unreachable the page
        // falls back to the defaults below rather than breaking for someone who
        // just wants to click Apply.
      });
  }, []);

  const partnership = programme?.defaultPartnership ?? 25;
  const commission = programme?.defaultCommissionRate ?? 2;
  const reviewHours = programme?.reviewHours ?? 24;
  const levels = programme?.levels ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="border-b border-hairline bg-gradient-to-b from-shell-nav to-shell-bg">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              Now accepting agent applications
            </span>

            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
              Run your book on the same console we do
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base text-ink-muted sm:text-lg">
              The Dollara agent panel gives you a live view of every bet under
              you, a downline you control, and the reports to settle it — sports
              and casino, in one place.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/apply" className="btn-primary !px-7 !py-3 !text-base">
                Apply for an account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={signedIn ? '/dashboard' : '/login'}
                className="btn-ghost !px-7 !py-3 !text-base"
              >
                {signedIn ? 'Go to my panel' : 'Sign in'}
              </Link>
            </div>

            {/* Real programme terms, not numbers typed into the copy — those
                drift the moment anyone changes the defaults in settings. */}
            <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { term: 'Default partnership', value: pct(partnership, 0) },
                { term: 'Commission on turnover', value: pct(commission, 0) },
                { term: 'Typical review time', value: `${reviewHours} hrs` },
              ].map(({ term, value }) => (
                <div key={term} className="card px-5 py-6">
                  <dd className="text-3xl font-bold text-white">{value}</dd>
                  <dt className="mt-1 text-sm text-ink-muted">{term}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── What you get ── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">What you get</h2>
            <p className="mx-auto mt-3 max-w-2xl text-ink-muted">
              Everything below is the panel itself, not a brochure version of it.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded bg-blue-600/15 text-blue-400">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── The hierarchy ── */}
        {levels.length > 0 && (
          <section className="border-y border-hairline bg-shell-nav/40">
            <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white">Where you sit</h2>
                <p className="mx-auto mt-3 max-w-2xl text-ink-muted">
                  Accounts form a tree. Each rung can open accounts on any rung
                  below it — and can only ever see what is beneath it.
                </p>
              </div>

              <ol className="mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-3">
                {levels.map((level, index) => (
                  <li key={level.value} className="flex items-center gap-3">
                    <span
                      className={`rounded border px-4 py-2.5 text-sm ${
                        index === levels.length - 1
                          ? 'border-blue-500/50 bg-blue-500/10 font-semibold text-blue-300'
                          : 'border-hairline bg-panel text-ink-muted'
                      }`}
                    >
                      {level.label}
                    </span>
                    {index < levels.length - 1 && (
                      <ChevronDown className="h-4 w-4 -rotate-90 text-ink-faint" />
                    )}
                  </li>
                ))}
                <li className="flex items-center gap-3">
                  <ChevronDown className="h-4 w-4 -rotate-90 text-ink-faint" />
                  <span className="flex items-center gap-2 rounded border border-hairline bg-panel px-4 py-2.5 text-sm text-ink-muted">
                    <Users className="h-4 w-4" />
                    Players
                  </span>
                </li>
              </ol>

              <p className="mt-8 text-center text-sm text-ink-faint">
                Most new agents are approved at the{' '}
                <span className="text-ink">
                  {label(programme?.defaultLevel ?? 'agent')}
                </span>{' '}
                rung.
              </p>
            </div>
          </section>
        )}

        {/* ── How it works ── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">How it works</h2>
          </div>

          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ title, body }, index) => (
              <li key={title} className="card p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── FAQ ── */}
        <section className="border-t border-hairline bg-shell-nav/40">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-3xl font-bold text-white">
              Common questions
            </h2>

            <div className="mt-10 space-y-3">
              {FAQS.map(({ q, a }, index) => {
                const open = openFaq === index;
                return (
                  <div key={q} className="card overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? -1 : index)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="font-medium text-ink">{q}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${
                          open ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {open && (
                      <p className="px-5 pb-5 text-sm leading-relaxed text-ink-muted">
                        {a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Closing call to action ── */}
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <Layers className="mx-auto h-10 w-10 text-blue-400" />
          <h2 className="mt-5 text-3xl font-bold text-white">
            Ready to open your account?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-muted">
            Applications are reviewed by your upline, typically within{' '}
            {reviewHours} hours. You choose your own username and password when
            you apply — approval turns it straight into a login.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/apply" className="btn-primary !px-7 !py-3 !text-base">
              Apply now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/apply/status" className="btn-ghost !px-7 !py-3 !text-base">
              Check an application
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
