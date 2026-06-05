'use client'

import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
    >
      {copied ? 'Copiado ✓' : '📋 Copiar cobrança'}
    </button>
  )
}
