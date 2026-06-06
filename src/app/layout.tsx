import type { Metadata, Viewport } from 'next'
import './globals.css'
import { BottomNav } from '@/components/bottom-nav'

export const metadata: Metadata = {
  title: 'Controle Futebol',
  description: 'Controle financeiro da pelada',
}

export const viewport: Viewport = { themeColor: '#16a34a' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <div className="mx-auto min-h-dvh max-w-md pb-16">{children}</div>
        <BottomNav />
      </body>
    </html>
  )
}
