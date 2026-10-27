import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Flame, Sparkles } from 'lucide-react'
import { DAILY_GOAL_POINTS, formatKg } from '../lib/carbon'
import { useStore } from '../lib/store'
import { ActionRow, Button, Card, Ring, SectionTitle } from '../components/ui'

export function Today({ go }: { go: (tab: 'log' | 'found') => void }) {
  const { state, dispatch, d } = useStore()
  const { level, nextLevel, total } = d
  const levelProgress = nextLevel ? (Math.max(0, total) - level.min) / (nextLevel.min - level.min) : 1
  const weekRatio = d.weekSavedG / Math.max(1, d.weekSavedG + d.weekEmittedG)
  const recent = [...state.actions].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 8)

  return (
    <div>
      <header className="flex items-center justify-between px-1 pt-2">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">
            Sé O<sub className="text-lg">2</sub>
          </h1>
          <p className="text-sm text-muted">Be the oxygen. Breathe lighter today.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5">
          <Flame size={16} className={d.streak ? 'text-clay' : 'text-muted'} fill={d.streak ? 'currentColor' : 'none'} />
          <span className="num text-sm font-semibold">{d.streak}</span>
          <span className="text-xs text-muted">day{d.streak === 1 ? '' : 's'}</span>
        </div>
      </header>

      <Card className="mt-5">
        <Ring value={d.todayPoints} goal={DAILY_GOAL_POINTS} inner={weekRatio}>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">Today</p>
            <p className={`num font-serif text-5xl font-medium ${d.todayPoints < 0 ? 'text-ember' : ''}`}>
              {d.todayPoints > 0 ? '+' : ''}
              {d.todayPoints}
            </p>
            <p className="num text-sm text-muted">of {DAILY_GOAL_POINTS} O₂ points</p>
          </div>
        </Ring>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Avoided · 7d" value={formatKg(d.weekSavedG)} tone="good" />
          <Stat label="Emitted · 7d" value={formatKg(d.weekEmittedG)} tone="bad" />
          <Stat label="Week score" value={`${d.weekPoints > 0 ? '+' : ''}${d.weekPoints}`} />
        </div>
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="font-medium">{level.name}</span>
            <span className="num text-muted">{nextLevel ? `${Math.max(0, total)} / ${nextLevel.min} → ${nextLevel.name}` : 'Max level'}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sunk">
            <motion.div className="h-full rounded-full bg-sage" initial={{ width: 0 }} animate={{ width: `${Math.max(2, levelProgress * 100)}%` }} transition={{ type: 'spring', stiffness: 60, damping: 18 }} />
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {state.pending.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            onClick={() => go('found')}
            className="mt-4 flex w-full items-center gap-3 rounded-3xl bg-clay p-4 text-left text-white"
          >
            <Sparkles size={20} />
            <div className="flex-1">
              <p className="font-medium">{state.pending.length} activities found</p>
              <p className="text-sm opacity-85">From your connected sources. Review them to score.</p>
            </div>
            <ArrowRight size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {state.connected.length === 0 && (
        <Card className="mt-4 bg-clay-soft border-transparent">
          <p className="font-serif text-lg">Let SE O₂ do the logging</p>
          <p className="mt-1 text-sm text-muted">Connect your iPhone, email and wallet. We'll spot bike rides, shared trips, flights and fast-fashion hauls for you.</p>
          <Button className="mt-3" onClick={() => go('found')}>Connect sources</Button>
        </Card>
      )}

      <SectionTitle>Weekly challenges</SectionTitle>
      <div className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
        {d.challenges.map((c) => {
          const [have, need] = c.prog
          const done = have >= need
          return (
            <Card key={c.id} className="w-60 shrink-0 snap-start !p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{c.title}</p>
                <span className="num text-xs font-semibold text-sage">+{c.reward}</span>
              </div>
              <p className="mt-0.5 text-sm text-muted">{c.desc}</p>
              <div className="mt-3 flex gap-1">
                {Array.from({ length: need }, (_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i < have ? 'bg-clay' : 'bg-sunk'}`} />
                ))}
              </div>
              {done && (
                <Button variant={c.claimed ? 'quiet' : 'primary'} disabled={c.claimed} className="mt-3 w-full !py-1.5" onClick={() => dispatch({ type: 'claim', id: c.id, reward: c.reward, title: c.title })}>
                  {c.claimed ? 'Claimed' : 'Claim reward'}
                </Button>
              )}
            </Card>
          )
        })}
      </div>

      <SectionTitle right={<button onClick={() => go('log')} className="text-sm font-medium text-clay">Log action</button>}>Recent</SectionTitle>
      <Card className="!py-1">
        <AnimatePresence initial={false}>
          {recent.map((a) => (
            <div key={a.id} className="border-b border-line last:border-0">
              <ActionRow a={a} onRemove={() => dispatch({ type: 'remove', id: a.id })} />
            </div>
          ))}
        </AnimatePresence>
        {recent.length === 0 && <p className="py-6 text-center text-sm text-muted">Nothing yet. Log your first trip.</p>}
      </Card>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-2xl bg-sunk/60 px-2 py-2.5">
      <p className={`num text-lg font-semibold ${tone === 'good' ? 'text-sage' : tone === 'bad' ? 'text-ember' : ''}`}>{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  )
}

