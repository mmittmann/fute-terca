'use client'

import { useState } from 'react'

export function GameListCard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="label">Lista do jogo · domingo</h2>
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
          className="btn-volt !px-3.5 !py-2 !text-xs"
        >
          {copied ? 'Copiado ✓' : 'Copiar'}
        </button>
      </div>
      <pre className="whitespace-pre-wrap rounded-xl border border-line/50 bg-pitch/80 p-3.5 font-sans text-xs leading-relaxed text-moss">
        {text}
      </pre>
    </section>
  )
}
