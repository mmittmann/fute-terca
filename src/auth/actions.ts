'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSessionToken, SESSION_COOKIE } from './session'

export async function login(_prev: { error?: string } | null, formData: FormData) {
  const password = formData.get('password')
  if (typeof password !== 'string' || password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Senha incorreta' }
  }
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
