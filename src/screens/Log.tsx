import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Bike, Bus, Car, Footprints, Leaf, Plane, ShoppingBag, Train, Users, Utensils, Zap, type LucideIcon } from 'lucide-react'
import {
  bikeRidesToRecover, fastFashion, flight, formatKg, GARMENT_G, haversineKm, meal, minutesToKm, MODES, points, secondHand, transport,
  type CabinClass, type Footprint, type Meal, type TransportMode,
} from '../lib/carbon'
import { useStore } from '../lib/store'
import type { Action, Category } from '../lib/types'
import { Button, Card, Pts, Segmented } from '../components/ui'

const MODE_ICON: Record<TransportMode, LucideIcon> = {
  walk: Footprints, bike: Bike, ebike: Zap, scooter: Zap, metro: Train, metrobus: Bus, bus: Bus,
  carpool: Users, ev: Zap, car: Car, ride_shared: Users, ride_solo: Car,
}

const CITIES: Record<string, { name: string; at: [number, number] }> = {
  MEX: { name: 'Mexico City', at: [19.436, -99.072] },
  CUN: { name: 'Cancún', at: [21.037, -86.877] },
  GDL: { name: 'Guadalajara', at: [20.522, -103.311] },
  MTY: { name: 'Monterrey', at: [25.779, -100.107] },
  OAX: { name: 'Oaxaca', at: [16.999, -96.727] },
  LAX: { name: 'Los Angeles', at: [33.942, -118.408] },
  JFK: { name: 'New York', at: [40.641, -73.778] },
  MAD: { name: 'Madrid', at: [40.472, -3.561] },
}

export function Log({ done }: { done: (a: Action) => void }) {
  const { state, dispatch } = useStore()
  const [cat, setCat] = useState<Category>('transport')

  // transport
  const [mode, setMode] = useState<TransportMode>('bike')
  const [minutes, setMinutes] = useState(25)
  const [occupants, setOccupants] = useState(2)
  // flight
  const [from, setFrom] = useState('MEX')
  const [to, setTo] = useState('CUN')
  const [cabin, setCabin] = useState<CabinClass>('economy')
  const [roundTrip, setRoundTrip] = useState(true)
  // shopping
  const [shopKind, setShopKind] = useState<'fast' | 'second'>('fast')
  const [items, setItems] = useState(2)
  // food
  const [mealKind, setMealKind] = useState<Meal>('vegetarian')

  const recentFashion = state.actions.filter((a) => a.category === 'shopping' && a.points < 0 && Date.now() - +new Date(a.date) < 30 * 864e5).length

  const draft = useMemo((): { fp: Footprint; title: string; detail: string } => {
    if (cat === 'transport') {
      const km = Math.round(minutesToKm(mode, minutes) * 10) / 10
      const shared = MODES[mode].shared
      return {
        fp: transport(mode, km, occupants),
        title: `${MODES[mode].label} · ${km} km`,
        detail: `${minutes} min${shared ? ` · ${occupants} people` : ''}`,
      }
    }
    if (cat === 'flight') {
      const km = haversineKm(CITIES[from].at, CITIES[to].at)
      return {
        fp: flight(km, cabin, roundTrip),
        title: `Flight ${from} → ${to}${roundTrip ? ' ↺' : ''}`,
        detail: `${Math.round(km).toLocaleString()} km · ${cabin}${roundTrip ? ' · round trip' : ''}`,
      }
    }
    if (cat === 'shopping') {
      return shopKind === 'fast'
        ? { fp: fastFashion(GARMENT_G.other * items, recentFashion), title: `Fast fashion · ${items} item${items > 1 ? 's' : ''}`, detail: recentFashion >= 3 ? '3+ orders this month (×1.5)' : 'New garments' }
        : { fp: secondHand(items), title: `Second-hand · ${items} item${items > 1 ? 's' : ''}`, detail: 'Pre-loved instead of new' }
    }
    const names: Record<Meal, string> = { beef: 'Beef meal', chicken: 'Chicken meal', vegetarian: 'Vegetarian meal', vegan: 'Vegan meal' }
    return { fp: meal(mealKind), title: names[mealKind], detail: 'vs. an average meal' }
  }, [cat, mode, minutes, occupants, from, to, cabin, roundTrip, shopKind, items, mealKind, recentFashion])

  const pts = points(draft.fp)

  function submit() {
    const a: Action = {
      id: `m-${Date.now()}`,
      category: cat,
      title: draft.title,
      detail: draft.detail,
      date: new Date().toISOString(),
      emittedG: Math.round(draft.fp.emittedG),
      baselineG: Math.round(draft.fp.baselineG),
      points: pts,
      source: 'manual',
    }
    dispatch({ type: 'add', action: a })
    done(a)
  }

  return (
    <div>
      <h1 className="px-1 pt-2 font-serif text-3xl font-medium tracking-tight">Log an action</h1>
      <p className="px-1 text-sm text-muted">Points move with every choice. Try a few.</p>

      <div className="mt-5">
        <Segmented
          value={cat}
          onChange={setCat}
          options={[
            { id: 'transport', label: 'Move', icon: Bike },
            { id: 'flight', label: 'Fly', icon: Plane },
            { id: 'shopping', label: 'Shop', icon: ShoppingBag },
            { id: 'food', label: 'Eat', icon: Utensils },
          ]}
        />
      </div>

      <Card className="mt-4">
        {cat === 'transport' && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(MODES) as TransportMode[]).map((m) => {
                const Icon = MODE_ICON[m]
                const p = points(transport(m, 5, occupants))
                return (
                  <button key={m} onClick={() => setMode(m)} className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 text-center transition ${mode === m ? 'border-clay bg-clay-soft' : 'border-line hover:bg-sunk'}`}>
                    <Icon size={18} className={p > 0 ? 'text-sage' : p < 0 ? 'text-ember' : 'text-muted'} />
                    <span className="text-[11px] leading-tight">{MODES[m].label}</span>
                  </button>
                )
              })}
            </div>
            <Field label="Duration" value={`${minutes} min · ${minutesToKm(mode, minutes).toFixed(1)} km`}>
              <input type="range" min={5} max={120} step={5} value={minutes} onChange={(e) => setMinutes(+e.target.value)} className="w-full" />
            </Field>
            {MODES[mode].shared && (
              <Field label="People in the car" value={`${occupants}`}>
                <Stepper value={occupants} min={1} max={5} onChange={setOccupants} />
              </Field>
            )}
          </>
        )}

        {cat === 'flight' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Select label="From" value={from} onChange={setFrom} />
              <Select label="To" value={to} onChange={setTo} />
            </div>
            <div className="mt-4">
              <Segmented value={cabin} onChange={setCabin} options={[{ id: 'economy', label: 'Economy' }, { id: 'premium', label: 'Premium' }, { id: 'business', label: 'Business' }]} />
            </div>
            <label className="mt-4 flex items-center justify-between text-sm">
              Round trip
              <Toggle on={roundTrip} onChange={setRoundTrip} />
            </label>
          </>
        )}

        {cat === 'shopping' && (
          <>
            <Segmented value={shopKind} onChange={setShopKind} options={[{ id: 'fast', label: 'Fast fashion' }, { id: 'second', label: 'Second-hand' }]} />
            <Field label="Items" value={`${items}`}>
              <Stepper value={items} min={1} max={20} onChange={setItems} />
            </Field>
            {shopKind === 'fast' && <p className="mt-3 text-xs text-muted">Zara, Shein, H&M, Bershka, Pull&Bear, Primark, Temu… Connect email and these get logged for you.</p>}
          </>
        )}

        {cat === 'food' && (
          <div className="grid grid-cols-2 gap-2">
            {(['vegan', 'vegetarian', 'chicken', 'beef'] as Meal[]).map((m) => {
              const p = points(meal(m))
              return (
                <button key={m} onClick={() => setMealKind(m)} className={`rounded-2xl border p-3 text-left transition ${mealKind === m ? 'border-clay bg-clay-soft' : 'border-line hover:bg-sunk'}`}>
                  <p className="font-medium capitalize">{m}</p>
                  <p className="num text-sm text-muted">{p > 0 ? '+' : ''}{p} pts</p>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      <motion.div layout className="mt-4 rounded-3xl bg-ink p-5 text-bg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-70">{draft.title}</p>
            <p className="num mt-1 font-serif text-4xl font-medium">
              <motion.span key={pts} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }}>{pts > 0 ? '+' : ''}{pts}</motion.span>
              <span className="ml-1.5 text-base opacity-60">pts</span>
            </p>
          </div>
          {pts > 0 && <Leaf size={32} className="text-sage" />}
        </div>
        <p className="num mt-2 text-sm opacity-75">
          Emits {formatKg(draft.fp.emittedG)}
          {draft.fp.baselineG > 0 && ` · vs ${formatKg(draft.fp.baselineG)} ${cat === 'transport' ? 'by solo car' : 'on average'}`}
        </p>
        {pts < -20 && <p className="mt-2 text-sm text-clay">Earning this back takes about {bikeRidesToRecover(pts)} bike commutes.</p>}
        <Button className="mt-4 w-full !bg-bg !text-ink" onClick={submit}>
          Log it <Pts value={pts} />
        </Button>
      </motion.div>
    </div>
  )
}

function Field({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="num font-medium">{value}</span>
      </div>
      {children}
    </div>
  )
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: Math.min(max, 5) - min + 1 }, (_, i) => i + min).map((n) => (
        <button key={n} onClick={() => onChange(n)} className={`num h-10 flex-1 rounded-xl text-sm font-medium transition ${value === n ? 'bg-ink text-bg' : 'bg-sunk hover:bg-line'}`}>{n}</button>
      ))}
      {max > 5 && (
        <button onClick={() => onChange(value >= 5 ? Math.min(max, value + 1) : 6)} className={`num h-10 flex-1 rounded-xl text-sm font-medium ${value > 5 ? 'bg-ink text-bg' : 'bg-sunk'}`}>{value > 5 ? value : '6+'}</button>
      )}
    </div>
  )
}

function Select({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm">
        {Object.entries(CITIES).map(([k, c]) => <option key={k} value={k}>{c.name} ({k})</option>)}
      </select>
    </label>
  )
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative h-7 w-12 rounded-full transition-colors ${on ? 'bg-sage' : 'bg-line'}`}>
      <motion.span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow" initial={false} animate={{ x: on ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
    </button>
  )
}
