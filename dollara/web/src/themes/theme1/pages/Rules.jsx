'use client';

// Rules — general terms, fair-play and responsible-gaming rules. Static content
// (public, no auth). Registered under theme1; other themes fall back to this page.

const SECTIONS = [
  {
    title: 'General',
    items: [
      'You must be 18 years or older and legally permitted to play in your jurisdiction.',
      'Each player may hold only one account. Duplicate accounts may be suspended.',
      'All information provided during registration and KYC must be accurate.',
    ],
  },
  {
    title: 'Deposits & Withdrawals',
    items: [
      'Minimum withdrawal is ₹500. Withdrawals are processed within 2–24 hours.',
      'KYC verification is required before your first withdrawal.',
      'Funds must be wagered at least once before withdrawal.',
    ],
  },
  {
    title: 'Bonuses',
    items: [
      'Bonuses are subject to wagering requirements before they can be withdrawn.',
      'Only one welcome bonus may be claimed per account.',
      'The operator reserves the right to withdraw any bonus in case of abuse.',
    ],
  },
  {
    title: 'Fair Play & Responsible Gaming',
    items: [
      'Any form of collusion, fraud or use of prohibited software is not allowed.',
      'Set deposit and session limits in Settings to play responsibly.',
      'If gambling stops being fun, take a break or self-exclude via support.',
    ],
  },
];

export default function Theme1Rules() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Rules</h1>
      <p className="mt-1 text-sm text-slate-400">
        Please read our platform rules and responsible-gaming guidelines.
      </p>

      <div className="mt-6 space-y-4">
        {SECTIONS.map((s) => (
          <section key={s.title} className="card-glass p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              {s.title}
            </h2>
            <ul className="mt-3 space-y-2">
              {s.items.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-300">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        These rules may be updated from time to time. Continued play constitutes acceptance.
      </p>
    </main>
  );
}
