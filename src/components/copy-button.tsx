'use client'

import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          alert('Não foi possível copiar — selecione o texto manualmente.')
        }
      }}
      className="btn-volt w-full"
    >
      {copied ? 'Copiado ✓' : 'Copiar cobrança'}
    </button>
  )
}
