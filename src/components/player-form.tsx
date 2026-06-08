'use client'

import { useRef, useState, useTransition } from 'react'
import { createPlayer } from '@/app/admin/actions'

export function PlayerForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [pending, start] = useTransition()

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          const r = await createPlayer(fd)
          if (r.ok) {
            setMsg({ kind: 'ok', text: 'Jogador cadastrado ✓' })
            formRef.current?.reset()
          } else {
            setMsg({ kind: 'err', text: r.error })
          }
        })
      }
      className="flex flex-col gap-2.5"
    >
      <div className="flex items-center gap-2">
        <input name="name" required placeholder="Nome do jogador" className="input flex-1" />
        <button disabled={pending} className="btn-volt shrink-0 !px-4 !py-2">
          Cadastrar
        </button>
      </div>
      {msg && (
        <p role="status" aria-live="polite"
          className={`text-xs font-bold ${msg.kind === 'ok' ? 'text-volt' : 'text-clay'}`}>
          {msg.text}
        </p>
      )}
    </form>
  )
}
