export interface PlayerAliases {
  name: string
  aliases: string[]
}

const norm = (s: string) => s.trim().toLowerCase()

export function buildAliasMap(players: PlayerAliases[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const p of players) {
    map.set(norm(p.name), p.name)
    for (const a of p.aliases) map.set(norm(a), p.name)
  }
  return map
}

export function resolveName(raw: string, map: Map<string, string>): string | null {
  return map.get(norm(raw)) ?? null
}
