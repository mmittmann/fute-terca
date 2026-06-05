import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from './client'
import {
  appSettings, entries, events, monthlyFeeTable, months, players, shirts, yearSettings,
} from './schema'

export async function getSettingsMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(appSettings)
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export function getAllPlayers() {
  return db.select().from(players).orderBy(asc(players.name))
}

export function getActivePlayers() {
  return db.select().from(players).where(eq(players.isMonthlyActive, true)).orderBy(asc(players.name))
}

export async function getMonth(year: number, month: number) {
  const rows = await db
    .select()
    .from(months)
    .where(and(eq(months.year, year), eq(months.month, month)))
  return rows[0] ?? null
}

export function getAllMonths() {
  return db.select().from(months).orderBy(asc(months.year), asc(months.month))
}

export function getMonthEntries(year: number, month: number) {
  return db
    .select()
    .from(entries)
    .where(and(eq(entries.year, year), eq(entries.month, month)))
    .orderBy(desc(entries.createdAt))
}

export function getAllEntries() {
  return db.select().from(entries).orderBy(asc(entries.year), asc(entries.month))
}

export function getFeeTable() {
  return db.select().from(monthlyFeeTable).orderBy(asc(monthlyFeeTable.year), asc(monthlyFeeTable.gamesCount))
}

export function getAllYearSettings() {
  return db.select().from(yearSettings).orderBy(asc(yearSettings.year))
}

export function getEvents() {
  return db.select().from(events).orderBy(desc(events.date))
}

export function getEventEntries() {
  return db.select().from(entries).where(eq(entries.type, 'evento'))
}

export async function getShirtsWithPlayers() {
  return db
    .select({
      id: shirts.id,
      size: shirts.size,
      valueCents: shirts.valueCents,
      note: shirts.note,
      paidEntryId: shirts.paidEntryId,
      playerName: players.name,
    })
    .from(shirts)
    .innerJoin(players, eq(shirts.playerId, players.id))
    .orderBy(asc(players.name))
}

export function getShirtEntries() {
  return db.select().from(entries).where(eq(entries.type, 'camisa'))
}
