import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySessionToken } from './session'

export async function requireAdmin(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) throw new Error('Unauthorized')
}
