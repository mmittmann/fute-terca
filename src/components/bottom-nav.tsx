'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/', label: 'Mensal', icon: '⚽' },
  { href: '/eventos', label: 'Eventos', icon: '🍖' },
  { href: '/camisas', label: 'Camisas', icon: '👕' },
  { href: '/historico', label: 'Histórico', icon: '📊' },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md border-t border-slate-200 bg-white">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`flex flex-1 flex-col items-center py-2 text-xs ${
            pathname === it.href ? 'font-bold text-green-600' : 'text-slate-500'
          }`}
        >
          <span className="text-base">{it.icon}</span>
          {it.label}
        </Link>
      ))}
    </nav>
  )
}
