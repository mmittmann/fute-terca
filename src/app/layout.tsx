import type { Metadata, Viewport } from 'next'
import { Anton, Archivo } from 'next/font/google'
import './globals.css'
import { BottomNav } from '@/components/bottom-nav'

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton' })
const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo' })

export const metadata: Metadata = {
  title: 'Controle Futebol',
  description: 'Controle financeiro da pelada',
}

export const viewport: Viewport = { themeColor: '#0a140e' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${anton.variable} ${archivo.variable}`}>
      <body className="font-sans antialiased">
        <div className="mx-auto min-h-dvh max-w-md pb-24">{children}</div>
        <BottomNav />
      </body>
    </html>
  )
}
