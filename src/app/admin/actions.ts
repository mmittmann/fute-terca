'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db/client'
import {
  appSettings, entries, events, monthlyFeeTable, months, players, shirts, yearSettings,
} from '@/db/schema'
import { parseToCents } from '@/lib/money'
import { signError } from '@/lib/entry-sign'
import { requireAdmin } from '@/auth/require-admin'

export type ActionResult = { ok: true } | { ok: false; error: string; needsConfirm?: boolean }

export type CreatePlayerResult =
  | { ok: true; player: { id: number; name: string } }
  | { ok: false; error: string }

function revalidateAll() {
  revalidatePath('/', 'layout')
}

const entrySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  type: z.enum(['mensal', 'avulso', 'quadra', 'goleiro', 'evento', 'camisa', 'outro']),
  amount: z.string().min(1),
  playerId: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
  eventId: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
  description: z.string().trim().max(200).optional(),
  gameDate: z.string().optional(), // 'YYYY-MM-DD' ou '' (sem jogo)
  confirmed: z.literal('true').transform(() => true).optional(),
})

export async function createEntry(formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const parsed = entrySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Dados inválidos' }
  const d = parsed.data

  const amountCents = parseToCents(d.amount)
  if (amountCents === null || amountCents === 0) return { ok: false, error: 'Valor inválido' }

  const sErr = signError(d.type, amountCents)
  if (sErr) return { ok: false, error: sErr }

  if (d.type === 'mensal' && d.playerId && !d.confirmed) {
    const dup = await db
      .select({ id: entries.id })
      .from(entries)
      .where(and(
        eq(entries.year, d.year), eq(entries.month, d.month),
        eq(entries.playerId, d.playerId), eq(entries.type, 'mensal'),
      ))
    if (dup.length > 0) {
      return { ok: false, needsConfirm: true, error: 'Já existe mensalidade deste jogador neste mês. Confirmar mesmo assim?' }
    }
  }

  await db.insert(entries).values({
    year: d.year, month: d.month, type: d.type, amountCents,
    playerId: d.playerId ?? null, eventId: d.eventId ?? null,
    description: d.description || null,
    gameDate: d.gameDate || null,
  })
  revalidateAll()
  return { ok: true }
}

export async function deleteEntry(id: number): Promise<ActionResult> {
  await requireAdmin()
  await db.transaction(async (tx) => {
    await tx.update(shirts).set({ paidEntryId: null }).where(eq(shirts.paidEntryId, id))
    await tx.delete(entries).where(eq(entries.id, id))
  })
  revalidateAll()
  return { ok: true }
}

const playerSchema = z.object({
  name: z.string().trim().min(1).max(60),
})

export async function createPlayer(formData: FormData): Promise<CreatePlayerResult> {
  await requireAdmin()
  const parsed = playerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Nome inválido' }
  const rows = await db
    .insert(players)
    .values({ name: parsed.data.name })
    .onConflictDoNothing()
    .returning({ id: players.id })
  if (rows.length === 0) return { ok: false, error: 'Jogador já existe' }
  revalidateAll()
  return { ok: true, player: { id: rows[0].id, name: parsed.data.name } }
}

const monthSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  gamesCount: z.coerce.number().int().min(1).max(6),
})

export async function upsertMonth(formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const parsed = monthSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Dados inválidos' }
  const d = parsed.data
  await db
    .insert(months)
    .values(d)
    .onConflictDoUpdate({ target: [months.year, months.month], set: { gamesCount: d.gamesCount } })
  revalidateAll()
  return { ok: true }
}

const yearSettingsSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  avulsoFee: z.string(),
  courtFeePerGame: z.string(),
  goalkeeperFeePerGame: z.string(),
})

export async function upsertYearSettings(formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const parsed = yearSettingsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Dados inválidos' }
  const d = parsed.data
  const vals = {
    avulsoFeeCents: parseToCents(d.avulsoFee),
    courtFeePerGameCents: parseToCents(d.courtFeePerGame),
    goalkeeperFeePerGameCents: parseToCents(d.goalkeeperFeePerGame),
  }
  if (Object.values(vals).some((v) => v === null)) return { ok: false, error: 'Valor inválido' }
  const safeVals = vals as { avulsoFeeCents: number; courtFeePerGameCents: number; goalkeeperFeePerGameCents: number }
  await db
    .insert(yearSettings)
    .values({ year: d.year, ...safeVals })
    .onConflictDoUpdate({ target: yearSettings.year, set: safeVals })
  revalidateAll()
  return { ok: true }
}

const feeRowSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  gamesCount: z.coerce.number().int().min(1).max(6),
  fee: z.string(),
})

export async function upsertMonthlyFee(formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const parsed = feeRowSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Dados inválidos' }
  const feeCents = parseToCents(parsed.data.fee)
  if (feeCents === null) return { ok: false, error: 'Valor inválido' }
  const { year, gamesCount } = parsed.data
  await db
    .insert(monthlyFeeTable)
    .values({ year, gamesCount, feeCents })
    .onConflictDoUpdate({ target: [monthlyFeeTable.year, monthlyFeeTable.gamesCount], set: { feeCents } })
  revalidateAll()
  return { ok: true }
}

const eventSchema = z.object({
  name: z.string().trim().min(1).max(80),
  date: z.string().optional(),
})

export async function createEvent(formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const parsed = eventSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Nome inválido' }
  await db.insert(events).values({ name: parsed.data.name, date: parsed.data.date || null })
  revalidateAll()
  return { ok: true }
}

const shirtSchema = z.object({
  playerId: z.coerce.number().int(),
  size: z.enum(['P', 'M', 'G', 'GG']),
  value: z.string(),
  note: z.string().trim().max(100).optional(),
})

export async function createShirt(formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const parsed = shirtSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Dados inválidos' }
  const valueCents = parseToCents(parsed.data.value)
  if (valueCents === null) return { ok: false, error: 'Valor inválido' }
  const { playerId, size, note } = parsed.data
  await db.insert(shirts).values({ playerId, size, valueCents, note: note || null })
  revalidateAll()
  return { ok: true }
}

export async function markShirtPaid(shirtId: number, year: number, month: number): Promise<ActionResult> {
  await requireAdmin()
  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(shirts).where(eq(shirts.id, shirtId))
    const shirt = rows[0]
    if (!shirt) return { ok: false as const, error: 'Camisa não encontrada' }
    if (shirt.paidEntryId) return { ok: false as const, error: 'Camisa já paga' }
    const inserted = await tx.insert(entries).values({
      year, month, type: 'camisa', amountCents: shirt.valueCents,
      playerId: shirt.playerId, description: `Camisa ${shirt.size}`,
    }).returning({ id: entries.id })
    await tx.update(shirts).set({ paidEntryId: inserted[0].id }).where(eq(shirts.id, shirtId))
    return { ok: true as const }
  })
  if (result.ok) revalidateAll()
  return result
}

const settingSchema = z.object({
  key: z.enum(['group_name', 'pix_key']),
  value: z.string().trim().max(200),
})

export async function saveSetting(formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  const parsed = settingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Dados inválidos' }
  const { key, value } = parsed.data
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } })
  revalidateAll()
  return { ok: true }
}
