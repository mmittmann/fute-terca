'use client'

import { useActionState } from 'react'
import { login } from '@/auth/actions'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null)
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <div className="rise text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full border-2 border-volt/40 bg-turf shadow-[0_0_36px_rgba(198,245,66,0.2)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="#c6f542" strokeWidth="1.8" className="size-8">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 8.2l3.6 2.6-1.4 4.3H9.8L8.4 10.8 12 8.2z" strokeLinejoin="round" />
            <path d="M12 3.5v4.7M5 7.5l3.4 3.3M19 7.5l-3.4 3.3M7.8 19.4l2-4.3M16.2 19.4l-2-4.3" strokeLinecap="round" />
          </svg>
        </div>
        <p className="label mt-5">Vestiário</p>
        <h1 className="mt-1 font-display text-3xl uppercase tracking-wide text-ink">Área do admin</h1>
      </div>
      <form action={action} className="card rise rise-2 flex flex-col gap-3 p-5">
        <label htmlFor="password" className="sr-only">Senha</label>
        <input
          id="password"
          type="password"
          name="password"
          placeholder="Senha"
          required
          className="input"
        />
        {state?.error && (
          <p role="status" aria-live="polite" className="text-sm font-semibold text-clay">{state.error}</p>
        )}
        <button type="submit" disabled={pending} className="btn-volt">
          Entrar em campo
        </button>
      </form>
    </main>
  )
}
