'use client'

import { useActionState } from 'react'
import { login } from '@/auth/actions'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null)
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-center text-2xl font-bold">🔒 Área do admin</h1>
      <form action={action} className="flex flex-col gap-3">
        <label htmlFor="password" className="sr-only">Senha</label>
        <input
          id="password"
          type="password"
          name="password"
          placeholder="Senha"
          required
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        {state?.error && <p role="status" aria-live="polite" className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-green-600 py-2 font-semibold text-white disabled:opacity-50"
        >
          Entrar
        </button>
      </form>
    </main>
  )
}
