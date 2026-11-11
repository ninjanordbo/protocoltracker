
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PenLine, LineChart, ListChecks, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { name: 'Today', href: '/log', icon: PenLine },
  { name: 'Dashboard', href: '/dashboard', icon: LineChart },
  { name: 'Protocols', href: '/protocols', icon: ListChecks },
  { name: 'Events', href: '/events', icon: Flag },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <span className="w-7 h-7 rounded-full bg-ink flex items-center justify-center">
              <span className="flex gap-[3px]">
                <span className="w-1 h-1 rounded-full bg-butter" />
                <span className="w-1 h-1 rounded-full bg-cream" />
              </span>
            </span>
            <span className="font-black tracking-tight text-[15px]">Protocol Tracker</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 bg-paper border border-border rounded-full p-1 shadow-sm">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-extrabold transition',
                    active ? 'bg-ink text-cream' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/log"
            className="sm:hidden inline-flex items-center gap-1.5 bg-ink text-cream text-[13px] font-extrabold px-3.5 py-1.5 rounded-full"
          >
            <PenLine className="w-3.5 h-3.5" />
            Log
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1400px] mx-auto px-4 py-6 pb-28 sm:pb-10">{children}</main>

      {/* Mobile tab bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur-md border-t border-border">
        <div className="grid grid-cols-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[10px] font-extrabold transition',
                  active ? 'text-ink' : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('w-5 h-5', active && 'stroke-[2.5px]')} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
