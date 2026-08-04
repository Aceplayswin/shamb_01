'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  LayoutDashboard, Link2, Users, GitBranch, TrendingUp,
  Wallet, BarChart2, Key, Bell, LifeBuoy, Settings, LogOut, ChevronRight
} from 'lucide-react';




const NAV = [
  { label: 'Dashboard',        icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Links & Creatives',icon: Link2,           href: '/links' },
  { label: 'Referrals',        icon: Users,           href: '/referrals' },
  { label: 'Sub-Affiliates',   icon: GitBranch,       href: '/network' },
  { label: 'Earnings',         icon: TrendingUp,      href: '/finance/earnings' },
  { label: 'Payouts',          icon: Wallet,          href: '/finance/payouts' },
  { label: 'Reports',          icon: BarChart2,       href: '/reports' },
  { label: 'API & Integration',icon: Key,             href: '/settings/api' },
  { label: 'Notifications',    icon: Bell,            href: '/notifications', badge: 3 },
  { label: 'Support',          icon: LifeBuoy,        href: '/support' },
  { label: 'Profile & Settings',icon: Settings,       href: '/settings/profile' },
];



export default function Sidebar() {
  const pathname = usePathname();

  return (

    <aside className="w-64 shrink-0 h-screen flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/95 transition-colors duration-300 overflow-y-auto">


      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <Link href="/dashboard" className="flex items-center space-x-2.5">
          <img src="/logo/image.png" alt="Dollara" className="h-7 w-auto object-contain" />
          <div>

            <span className="text-base font-black font-display text-slate-900 dark:text-slate-100 tracking-tight">DOLLARA</span>


            <span className="text-[9px] font-bold text-brand-600 uppercase tracking-[0.15em] block -mt-0.5">
              Affiliate
            </span>
          </div>
        </Link>
      </div>





      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">

        {NAV.map(({ label, icon: Icon, href, badge }) => {
          const active = pathname === href || pathname?.startsWith(href + '/');

          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-brand-500/10 text-brand-700 dark:text-brand-400 border-l-2 border-brand-500 pl-[10px]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >

              <span className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${active ? 'text-brand-600' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'}`} />
                <span>{label}</span>
              </span>


              {badge ? (
                <span className="text-[10px] font-bold bg-brand-500 text-black rounded-full w-4 h-4 flex items-center justify-center">

                  {badge}

                </span>



              ) : active ? (
                <ChevronRight className="w-3.5 h-3.5 text-brand-400" />
              ) : null

              }

            </Link>
          );
        }
        )
        
        }
      </nav>




      {/* Bottom: user info + logout */}


      <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0">

        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">

          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-black font-bold text-xs shadow-sm">
              A
            </div>

            <div>


              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Alex Morgan</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">DLR-AF7X92</p>

            </div>
          </div>


          <button
            type="button"
            onClick={() => { window.location.href = '/login'; }}
            title="Log out"
            className="text-slate-400 hover:text-red-500 transition-colors"
          >

            <LogOut className="w-4 h-4" />

          </button>



        </div>

      </div>

    </aside>







  );
}
