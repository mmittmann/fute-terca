import {
  pgTable, pgEnum, serial, text, integer, boolean, date, timestamp, primaryKey,
} from 'drizzle-orm/pg-core'

export const entryType = pgEnum('entry_type', [
  'mensal', 'avulso', 'quadra', 'goleiro', 'evento', 'camisa', 'outro',
])

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  aliases: text('aliases').array().notNull().default([]),
  isMonthlyActive: boolean('is_monthly_active').notNull().default(false),
})

export const yearSettings = pgTable('year_settings', {
  year: integer('year').primaryKey(),
  avulsoFeeCents: integer('avulso_fee_cents').notNull(),
  courtFeePerGameCents: integer('court_fee_per_game_cents').notNull(),
  goalkeeperFeePerGameCents: integer('goalkeeper_fee_per_game_cents').notNull(),
})

export const monthlyFeeTable = pgTable('monthly_fee_table', {
  year: integer('year').notNull(),
  gamesCount: integer('games_count').notNull(),
  feeCents: integer('fee_cents').notNull(),
}, (t) => [primaryKey({ columns: [t.year, t.gamesCount] })])

export const months = pgTable('months', {
  year: integer('year').notNull(),
  month: integer('month').notNull(), // 1-12
  gamesCount: integer('games_count').notNull(),
}, (t) => [primaryKey({ columns: [t.year, t.month] })])

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  date: date('date'),
})

export const entries = pgTable('entries', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  playerId: integer('player_id').references(() => players.id),
  type: entryType('type').notNull(),
  amountCents: integer('amount_cents').notNull(), // + receita / - despesa
  eventId: integer('event_id').references(() => events.id),
  description: text('description'),
  gameDate: date('game_date'), // terça do jogo (opcional); null = sem jogo específico
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const shirts = pgTable('shirts', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id),
  size: text('size').notNull(), // P | M | G | GG
  valueCents: integer('value_cents').notNull(),
  note: text('note'),
  paidEntryId: integer('paid_entry_id').references(() => entries.id),
})

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(), // group_name, pix_key
  value: text('value').notNull(),
})
