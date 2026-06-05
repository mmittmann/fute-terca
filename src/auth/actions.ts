'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSessionToken, SESSION_COOKIE } from './session'

// Throttle simples em memória (por instância). Suficiente para um único admin;
// reinicia a contagem a cada deploy/restart.
const attempts = { count: 0, lockedUntil: 0 }
const MAX_ATTEMPTS = 5
const LOCK_MS = 30_000

export async function login(_prev: { error?: string } | null, formData: FormData) {
  const now = Date.now()
  if (now < attempts.lockedUntil) {
    return { error: 'Muitas tentativas. Aguarde 30 segundos.' }
  }
  const password = formData.get('password')
  if (typeof password !== 'string' || password !== process.env.ADMIN_PASSWORD) {
    attempts.count += 1
    if (attempts.count >= MAX_ATTEMPTS) {
      attempts.count = 0
      attempts.lockedUntil = now + LOCK_MS
    }
    return { error: 'Senha incorreta' }
  }
  attempts.count = 0
  const jar = await cookies()
  jar.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  redirect('/admin')
}

export async function logout() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  redirect('/')
}
