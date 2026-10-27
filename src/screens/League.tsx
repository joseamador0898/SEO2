import { motion } from 'motion/react'
import { Award, Flame, RotateCcw } from 'lucide-react'
import { FRIENDS } from '../lib/data'
import { useStore } from '../lib/store'
import { Button, Card, SectionTitle } from '../components/ui'

export function League() {
  const { d, dispatch } = useStore()
  const board = [...FRIENDS.map((f) => ({ ...f, you: false })), { name: 'You', initials: 'TÚ', weekPoints: d.weekPoints, streak: d.streak, hue: 18, you: true }]
    .sort((a, b) => b.weekPoints - a.weekPoints)
  const rank = board.findIndex((b) => b.you) + 1
  const top = board.slice(0, 3)
  const podium = [top[1], top[0], top[2]].filter(Boolean)

  return (
    <div>
      <h1 className="px-1 pt-2 font-serif text-3xl font-medium tracking-tight">Weekly league</h1>
      <p className="px-1 text-sm text-muted">You're #{rank} of {board.length} this week. Resets Monday.</p>

      <Card className="mt-5 !pb-0">
        <div className="flex items-end justify-center gap-3">
          {podium.map((p) => {
            const place = top.indexOf(p) + 1
            const h = { 1: 112, 2: 84, 3: 64 }[place as 1 | 2 | 3]
            return (
              <div key={p.name} className="flex w-24 flex-col items-center">
                <Avatar initials={p.initials} hue={p.hue} you={p.you} big={place === 1} />
                <p className="mt-1.5 truncate text-sm font-medium">{p.name}</p>
                <p className="num text-xs text-muted">{p.weekPoints} pts</p>
                <motion.div
                  initial={{ height: 0 }} animate={{ height: h }} transition={{ type: 'spring', stiffness: 80, damping: 16, delay: place * 0.08 }}
                  className={`mt-2 grid w-full place-items-start justify-center rounded-t-2xl pt-2 font-serif text-2xl ${place === 1 ? 'bg-clay text-white' : 'bg-sunk text-muted'}`}
                >
                  {place}
                </motion.div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="mt-3 !py-1">
        {board.map((p, i) => (
          <div key={p.name} className={`flex items-center gap-3 border-b border-line py-3 last:border-0 ${p.you ? '-mx-5 bg-clay-soft px-5' : ''}`}>
            <span className="num w-5 text-sm text-muted">{i + 1}</span>
            <Avatar initials={p.initials} hue={p.hue} you={p.you} />
            <div className="flex-1">
              <p className="font-medium">{p.name}</p>
              <p className="inline-flex items-center gap-1 text-xs text-muted"><Flame size={11} /> {p.streak}-day streak</p>
            </div>
            <span className={`num font-semibold ${p.weekPoints < 0 ? 'text-ember' : ''}`}>{p.weekPoints}</span>
          </div>
        ))}
      </Card>

      <SectionTitle right={<span className="num text-sm text-muted">{d.badges.filter((b) => b.has).length}/{d.badges.length}</span>}>Badges</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {d.badges.map((b) => (
          <div key={b.id} className={`rounded-3xl border p-3 text-center ${b.has ? 'border-line bg-surface' : 'border-dashed border-line opacity-55'}`}>
            <div className={`mx-auto grid h-11 w-11 place-items-center rounded-full ${b.has ? 'bg-clay-soft text-clay' : 'bg-sunk text-muted'}`}>
              <Award size={20} />
            </div>
            <p className="mt-2 text-sm font-medium leading-tight">{b.name}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted">{b.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Button variant="quiet" onClick={() => confirm('Reset all demo data?') && dispatch({ type: 'reset' })}>
          <RotateCcw size={14} /> Reset demo
        </Button>
      </div>
    </div>
  )
}

function Avatar({ initials, hue, you, big }: { initials: string; hue: number; you?: boolean; big?: boolean }) {
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${big ? 'h-14 w-14 text-base' : 'h-10 w-10 text-xs'} ${you ? 'ring-2 ring-clay ring-offset-2 ring-offset-surface' : ''}`}
      style={{ background: `oklch(0.88 0.05 ${hue})`, color: `oklch(0.38 0.08 ${hue})` }}
    >
      {initials}
    </div>
  )
}
