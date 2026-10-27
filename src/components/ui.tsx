import { motion } from 'motion/react'
import {
  Bike, Bus, Calendar, Car, CreditCard, Footprints, Mail, PenLine, Plane, ShoppingBag,
  Smartphone, Sparkles, Train, Trash2, Users, Utensils, Zap, type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { formatKg } from '../lib/carbon'
import type { Action, SourceId } from '../lib/types'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line bg-surface p-5 ${className}`}>{children}</div>
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-baseline justify-between px-1">
      <h2 className="font-serif text-xl font-medium tracking-tight">{children}</h2>
      {right}
    </div>
  )
}

export function Pts({ value, size = 'md' }: { value: number; size?: 'md' | 'lg' }) {
  const good = value >= 0
  return (
    <span
      className={`num inline-flex items-center rounded-full font-semibold ${size === 'lg' ? 'px-3 py-1 text-base' : 'px-2.5 py-0.5 text-sm'} ${good ? 'bg-sage-soft text-sage' : 'bg-ember-soft text-ember'}`}
    >
      {good ? '+' : '−'}
      {Math.abs(value).toLocaleString()}
    </span>
  )
}

export const SOURCE_ICON: Record<SourceId | 'manual', LucideIcon> = {
  iphone: Smartphone, gmail: Mail, rides: Car, wallet: CreditCard, calendar: Calendar, manual: PenLine,
}

export function actionIcon(a: Action): LucideIcon {
  if (a.category === 'flight') return Plane
  if (a.category === 'shopping') return ShoppingBag
  if (a.category === 'food') return Utensils
  if (/challenge/i.test(a.title)) return Sparkles
  if (/bike|ecobici/i.test(a.title)) return Bike
  if (/walk/i.test(a.title)) return Footprints
  if (/metro|transit/i.test(a.title)) return Train
  if (/bus/i.test(a.title)) return Bus
  if (/shared|carpool/i.test(a.title)) return Users
  if (/e-?scooter|electric/i.test(a.title)) return Zap
  return Car
}

export function IconBubble({ icon: Icon, tone }: { icon: LucideIcon; tone: 'good' | 'bad' | 'neutral' }) {
  const cls = tone === 'good' ? 'bg-sage-soft text-sage' : tone === 'bad' ? 'bg-ember-soft text-ember' : 'bg-sunk text-muted'
  return (
    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${cls}`}>
      <Icon size={20} strokeWidth={1.8} />
    </div>
  )
}

export function ActionRow({ a, onRemove, children }: { a: Action; onRemove?: () => void; children?: ReactNode }) {
  const SrcIcon = SOURCE_ICON[a.source]
  const net = a.baselineG - a.emittedG
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }} className="flex gap-3 py-3">
      <IconBubble icon={actionIcon(a)} tone={a.points >= 0 ? 'good' : 'bad'} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium leading-snug">{a.title}</p>
          <Pts value={a.points} />
        </div>
        <p className="mt-0.5 text-sm leading-snug text-muted">{a.detail}</p>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <SrcIcon size={12} /> {a.source === 'manual' ? 'You' : a.evidence ? 'Inferred' : a.source}
          </span>
          <span className="num">{net >= 0 ? `${formatKg(net)} avoided` : `${formatKg(a.emittedG)} emitted`}</span>
          {onRemove && (
            <button onClick={onRemove} className="ml-auto inline-flex items-center gap-1 hover:text-ember" aria-label="Remove">
              <Trash2 size={12} />
            </button>
          )}
        </div>
        {children}
      </div>
    </motion.div>
  )
}

/** Concentric "breath" ring: outer = today vs goal, inner = weekly saved vs emitted. */
export function Ring({ value, goal, inner, children }: { value: number; goal: number; inner: number; children: ReactNode }) {
  const r = 92
  const c = 2 * Math.PI * r
  const ri = 74
  const ci = 2 * Math.PI * ri
  const p = Math.max(0, Math.min(1, value / goal))
  const negative = value < 0
  return (
    <div className="relative mx-auto h-56 w-56">
      <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
        <circle cx="110" cy="110" r={r} fill="none" stroke="var(--sunk)" strokeWidth="14" />
        <motion.circle
          cx="110" cy="110" r={r} fill="none"
          stroke={negative ? 'var(--ember)' : 'var(--clay)'} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: negative ? c * (1 - Math.min(1, -value / goal)) : c * (1 - p) }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        />
        <circle cx="110" cy="110" r={ri} fill="none" stroke="var(--sunk)" strokeWidth="6" />
        <motion.circle
          cx="110" cy="110" r={ri} fill="none" stroke="var(--sage)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={ci}
          initial={{ strokeDashoffset: ci }}
          animate={{ strokeDashoffset: ci * (1 - Math.max(0, Math.min(1, inner))) }}
          transition={{ type: 'spring', stiffness: 50, damping: 18, delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; icon?: LucideIcon }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-sunk p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition-colors ${value === o.id ? 'text-ink' : 'text-muted hover:text-ink'}`}
        >
          {value === o.id && <motion.span layoutId="seg" className="absolute inset-0 rounded-xl bg-surface shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <span className="relative inline-flex items-center gap-1.5">
            {o.icon && <o.icon size={15} />} {o.label}
          </span>
        </button>
      ))}
    </div>
  )
}

export function Button({ children, onClick, variant = 'primary', className = '', disabled }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'quiet'; className?: string; disabled?: boolean }) {
  const v = {
    primary: 'bg-ink text-bg hover:opacity-90',
    ghost: 'border border-line bg-surface hover:bg-sunk',
    quiet: 'text-muted hover:text-ink hover:bg-sunk',
  }[variant]
  return (
    <button disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-40 ${v} ${className}`}>
      {children}
    </button>
  )
}
