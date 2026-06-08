'use client'

import { useMemo, useRef, useState } from 'react'

export interface PlayerOption {
  id: number
  name: string
}

/** Campo de busca de jogador: digite para filtrar e selecione. */
export function PlayerCombobox({
  players,
  value,
  onChange,
  placeholder = 'Buscar jogador…',
}: {
  players: PlayerOption[]
  value: number | null
  onChange: (id: number | null) => void
  placeholder?: string
}) {
  const selected = players.find((p) => p.id === value) ?? null
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // texto exibido: o nome selecionado (quando fechado) ou o que está sendo digitado
  const text = open ? query : (selected?.name ?? '')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? players.filter((p) => p.name.toLowerCase().includes(q)) : players
    return list.slice(0, 8)
  }, [players, query])

  function choose(p: PlayerOption | null) {
    onChange(p?.id ?? null)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          className="input pr-8"
          onFocus={() => {
            setQuery('')
            setActive(0)
            setOpen(true)
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120)
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(0)
            if (e.target.value === '') onChange(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setOpen(true)
              setActive((a) => Math.min(a + 1, filtered.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter' && open) {
              e.preventDefault()
              if (filtered[active]) choose(filtered[active])
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        {selected && !open && (
          <button
            type="button"
            onClick={() => choose(null)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-moss/60 transition hover:text-clay"
            aria-label="Limpar jogador"
          >
            ✕
          </button>
        )}
        {!selected && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-moss/50">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.2-3.2" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul
          className="absolute z-20 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-line bg-card py-1 shadow-[0_18px_40px_rgba(0,0,0,0.5)]"
          onMouseDown={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current)
          }}
        >
          {filtered.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(p)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
                  i === active ? 'bg-volt/10 text-ink' : 'text-moss hover:text-ink'
                }`}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-pitch font-display text-[11px] tracking-wider text-moss">
                  {p.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                </span>
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && filtered.length === 0 && (
        <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm text-moss shadow-[0_18px_40px_rgba(0,0,0,0.5)]">
          Nenhum jogador encontrado.
        </div>
      )}
    </div>
  )
}
