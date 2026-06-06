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
            setMsg({ kind: 'ok', text: 'Jogador criado ✓' })
            formRef.current?.reset()
          } else {
            setMsg({ kind: 'err', text: r.error })
          }
        })
      }
      className="flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <input name="name" required placeholder="Nome do jogador"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <label className="flex items-center gap-1 text-xs font-semibold">
          <input type="checkbox" name="isMonthlyActive" value="true" /> Mensalista
        </label>
        <button disabled={pending} className="rounded-lg bg-green-600 px-4 text-sm font-bold text-white disabled:opacity-50">Add</button>
      </div>
      {msg && (
        <p role="status" aria-live="polite"
          className={`text-xs font-semibold ${msg.kind === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
          {msg.text}
        </p>
      )}
    </form>
  )
}
