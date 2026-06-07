'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function BallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-[22px]">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.2l3.6 2.6-1.4 4.3H9.8L8.4 10.8 12 8.2z" strokeLinejoin="round" />
      <path d="M12 3.5v4.7M5 7.5l3.4 3.3M19 7.5l-3.4 3.3M7.8 19.4l2-4.3M16.2 19.4l-2-4.3" strokeLinecap="round" />
    </svg>
  )
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-[22px]">
      <path
        d="M12 21c-3.6 0-6-2.3-6-5.6 0-2.6 1.6-4.4 3-6 1.2-1.3 2.3-2.6 2.6-4.4 2.3 1.6 6.4 5.6 6.4 10.4 0 3.3-2.4 5.6-6 5.6z"
        strokeLinejoin="round"
      />
      <path d="M12 21c-1.7 0-2.8-1.1-2.8-2.8 0-1.6 1.4-2.7 2.8-4.2 1.4 1.5 2.8 2.6 2.8 4.2 0 1.7-1.1 2.8-2.8 2.8z" strokeLinejoin="round" />
    </svg>
  )
}

function ShirtIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-[22px]">
      <path
        d="M15.5 4L20 6.8l-1.8 3.7-2.2-1v10H8V9.5l-2.2 1L4 6.8 8.5 4c.8 1.2 2 1.8 3.5 1.8S14.7 5.2 15.5 4z"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-[22px]">
      <path d="M5 20v-7M12 20V5M19 20v-10" strokeLinecap="round" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-[22px]">
      <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
      <path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

const items = [
  { href: '/', label: 'Mensal', Icon: BallIcon },
  { href: '/jogos', label: 'Jogos', Icon: CalendarIcon },
  { href: '/eventos', label: 'Eventos', Icon: FlameIcon },
  { href: '/camisas', label: 'Camisas', Icon: ShirtIcon },
  { href: '/historico', label: 'Histórico', Icon: ChartIcon },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md border-t border-line bg-pitch/85 backdrop-blur-md">
      {items.map(({ href, label, Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-1 flex-col items-center gap-1 pb-3 pt-2.5 transition-colors ${
              isActive ? 'text-volt' : 'text-moss/70 hover:text-moss'
            }`}
          >
            {isActive && (
              <span className="absolute -top-px h-0.5 w-9 rounded-full bg-volt shadow-[0_0_10px_rgba(198,245,66,0.8)]" />
            )}
            <Icon />
            <span className={`text-[9px] uppercase tracking-[0.14em] ${isActive ? 'font-bold' : 'font-semibold'}`}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
