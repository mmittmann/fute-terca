import { createHmac, timingSafeEqual } from 'node:crypto'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
export const SESSION_COOKIE = 'admin_session'

function sign(payload: string): string {
  return createHmac('sha256', process.env.AUTH_SECRET!).update(payload).digest('hex')
}

export function createSessionToken(now: number = Date.now()): string {
  const exp = now + THIRTY_DAYS_MS
  return `${exp}.${sign(String(exp))}`
}

export function verifySessionToken(token: string | undefined, now: number = Date.now()): boolean {
  if (!token) return false
  const [expStr, sig] = token.split('.')
  if (!expStr || !sig) return false
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < now) return false
  const expected = Buffer.from(sign(expStr))
  const given = Buffer.from(sig)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
