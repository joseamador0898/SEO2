import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { BADGES, CHALLENGES, daysAgo, INBOX, LEVELS, MOTION, WALLET } from './data'
import { inferFromEmail, inferFromMotion, inferFromWallet } from './inference'
import { meal, points, transport } from './carbon'
import type { Action, SourceId } from './types'

interface State {
  actions: Action[]
  /** inferred actions waiting for the user to confirm */
  pending: Action[]
  connected: SourceId[]
  dismissed: string[]
  claimed: string[]
}

type Msg =
  | { type: 'add'; action: Action }
  | { type: 'remove'; id: string }
  | { type: 'connect'; source: SourceId }
  | { type: 'disconnect'; source: SourceId }
  | { type: 'confirm'; id: string }
  | { type: 'dismiss'; id: string }
  | { type: 'confirmAll' }
  | { type: 'claim'; id: string; reward: number; title: string }
  | { type: 'reset' }

const KEY = 'se-o2/v1'

function seed(): State {
  const bike = transport('bike', 5.5)
  const veg = meal('vegetarian')
  return {
    actions: [
      { id: 'seed-1', category: 'transport', title: 'Bike ride · 5.5 km', detail: 'Logged manually', date: daysAgo(1, 8), ...bike, points: points(bike), source: 'manual' },
      { id: 'seed-2', category: 'food', title: 'Vegetarian lunch', detail: 'Logged manually', date: daysAgo(1, 14), ...veg, points: points(veg), source: 'manual' },
    ],
    pending: [],
    connected: [],
    dismissed: [],
    claimed: [],
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...seed(), ...JSON.parse(raw) }
  } catch {
    /* storage unavailable: fall back to seed */
  }
  return seed()
}

/** Everything a connector would find, minus what the user already saw. */
function scan(source: SourceId, s: State): Action[] {
  const seen = new Set([...s.actions, ...s.pending].map((a) => a.id).concat(s.dismissed))
  let found: Action[] = []
  if (source === 'gmail' || source === 'rides') {
    let fashionOrders = s.actions.filter((a) => a.category === 'shopping' && a.points < 0).length
    for (const e of [...INBOX].sort((a, b) => +new Date(a.date) - +new Date(b.date))) {
      const a = inferFromEmail(e, fashionOrders)
      if (!a) continue
      if (a.category === 'shopping' && a.points < 0) fashionOrders++
      if (source === 'rides' && a.source !== 'rides') continue
      found.push(a)
    }
  }
  if (source === 'iphone') found = MOTION.map(inferFromMotion)
  if (source === 'wallet') found = WALLET.map(inferFromWallet).filter((a): a is Action => a !== null)
  return found.filter((a) => !seen.has(a.id))
}

function reducer(s: State, m: Msg): State {
  switch (m.type) {
    case 'add':
      return { ...s, actions: [m.action, ...s.actions] }
    case 'remove':
      return { ...s, actions: s.actions.filter((a) => a.id !== m.id) }
    case 'connect': {
      const next = { ...s, connected: [...new Set([...s.connected, m.source])] }
      const pending = [...scan(m.source, next), ...s.pending].sort((a, b) => +new Date(b.date) - +new Date(a.date))
      return { ...next, pending }
    }
    case 'disconnect':
      return { ...s, connected: s.connected.filter((c) => c !== m.source) }
    case 'confirm': {
      const a = s.pending.find((p) => p.id === m.id)
      return a ? { ...s, pending: s.pending.filter((p) => p.id !== m.id), actions: [a, ...s.actions] } : s
    }
    case 'dismiss':
      return { ...s, pending: s.pending.filter((p) => p.id !== m.id), dismissed: [...s.dismissed, m.id] }
    case 'confirmAll':
      return { ...s, pending: [], actions: [...s.pending, ...s.actions] }
    case 'claim':
      if (s.claimed.includes(m.id)) return s
      return {
        ...s,
        claimed: [...s.claimed, m.id],
        actions: [{ id: `claim-${m.id}`, category: 'transport', title: `Challenge: ${m.title}`, detail: 'Bonus points', date: new Date().toISOString(), emittedG: 0, baselineG: m.reward * 100, points: m.reward, source: 'manual' }, ...s.actions],
      }
    case 'reset':
      return seed()
  }
}

const dayKey = (iso: string) => new Date(iso).toDateString()

export function derive(s: State) {
  const today = s.actions.filter((a) => dayKey(a.date) === new Date().toDateString())
  const week = s.actions.filter((a) => Date.now() - +new Date(a.date) < 7 * 864e5)
  const total = s.actions.reduce((n, a) => n + a.points, 0)
  const lifetime = Math.max(0, total)
  const levelIdx = LEVELS.findLastIndex((l) => lifetime >= l.min)
  const level = LEVELS[levelIdx]
  const nextLevel = LEVELS[levelIdx + 1]

  // Streak: consecutive days with a net-positive score, ending today or yesterday.
  const byDay = new Map<string, number>()
  for (const a of s.actions) byDay.set(dayKey(a.date), (byDay.get(dayKey(a.date)) ?? 0) + a.points)
  let streak = 0
  const d = new Date()
  if (!((byDay.get(d.toDateString()) ?? 0) > 0)) d.setDate(d.getDate() - 1)
  while ((byDay.get(d.toDateString()) ?? 0) > 0) {
    streak++
    d.setDate(d.getDate() - 1)
  }

  return {
    today,
    todayPoints: today.reduce((n, a) => n + a.points, 0),
    weekPoints: week.reduce((n, a) => n + a.points, 0),
    weekSavedG: week.reduce((n, a) => n + Math.max(0, a.baselineG - a.emittedG), 0),
    weekEmittedG: week.reduce((n, a) => n + a.emittedG, 0),
    total,
    level,
    levelIdx,
    nextLevel,
    streak,
    badges: BADGES.map((b) => ({ ...b, has: b.earned(s.actions) })),
    challenges: CHALLENGES.map((c) => ({ ...c, prog: c.progress(s.actions), claimed: s.claimed.includes(c.id) })),
  }
}

const Ctx = createContext<{ state: State; dispatch: (m: Msg) => void; d: ReturnType<typeof derive> } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])
  const d = useMemo(() => derive(state), [state])
  return <Ctx.Provider value={{ state, dispatch, d }}>{children}</Ctx.Provider>
}

export function useStore() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStore outside provider')
  return c
}
