import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Loader2, Lock, ScanText, X } from 'lucide-react'
import { SOURCES } from '../lib/data'
import { inferFromEmail } from '../lib/inference'
import { useStore } from '../lib/store'
import type { SourceId } from '../lib/types'
import { ActionRow, Button, Card, SectionTitle, SOURCE_ICON } from '../components/ui'
import { Toggle } from './Log'

const SAMPLE = `De: Zara <noreply@zara.com>
Asunto: Confirmación de tu pedido
Vestido satinado x1
Jeans mom fit x2
Total $2,397 MXN`

export function Found() {
  const { state, dispatch } = useStore()
  const [scanning, setScanning] = useState<SourceId | null>(null)
  const [paste, setPaste] = useState('')

  function toggle(id: SourceId, on: boolean) {
    if (!on) return dispatch({ type: 'disconnect', source: id })
    setScanning(id)
    // Simulated scan delay so the inference feels like work being done.
    setTimeout(() => {
      dispatch({ type: 'connect', source: id })
      setScanning(null)
    }, 1100)
  }

  const recentFashion = state.actions.filter((a) => a.category === 'shopping' && a.points < 0).length
  const preview = paste.trim()
    ? inferFromEmail({ id: `paste-${paste.length}-${paste.slice(0, 12)}`, from: paste.match(/^(?:de|from):\s*(.*)$/im)?.[1] ?? '', subject: paste.match(/^(?:asunto|subject):\s*(.*)$/im)?.[1] ?? 'Pasted receipt', body: paste, date: new Date().toISOString() }, recentFashion)
    : null

  return (
    <div>
      <h1 className="px-1 pt-2 font-serif text-3xl font-medium tracking-tight">Found for you</h1>
      <p className="px-1 text-sm text-muted">SE O₂ reads your signals and suggests what to score. Nothing counts until you confirm it.</p>

      <AnimatePresence>
        {state.pending.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SectionTitle right={<button className="text-sm font-medium text-clay" onClick={() => dispatch({ type: 'confirmAll' })}>Confirm all</button>}>
              To review · {state.pending.length}
            </SectionTitle>
            <Card className="!py-1">
              <AnimatePresence initial={false}>
                {state.pending.map((a) => (
                  <motion.div key={a.id} exit={{ opacity: 0, height: 0 }} className="border-b border-line last:border-0">
                    <ActionRow a={a}>
                      <div className="mt-2 rounded-xl bg-sunk/70 px-3 py-2 text-xs text-muted">
                        <span className="font-medium text-ink">{Math.round((a.confidence ?? 0) * 100)}% sure</span> · {a.evidence}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button className="flex-1 !py-1.5" onClick={() => dispatch({ type: 'confirm', id: a.id })}><Check size={15} /> Confirm</Button>
                        <Button variant="ghost" className="flex-1 !py-1.5" onClick={() => dispatch({ type: 'dismiss', id: a.id })}><X size={15} /> Not me</Button>
                      </div>
                    </ActionRow>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <SectionTitle>Sources</SectionTitle>
      <Card className="!py-1">
        {SOURCES.map((s) => {
          const Icon = SOURCE_ICON[s.id]
          const on = state.connected.includes(s.id)
          return (
            <div key={s.id} className="flex items-center gap-3 border-b border-line py-3.5 last:border-0">
              <div className={`grid h-11 w-11 place-items-center rounded-2xl ${on ? 'bg-clay-soft text-clay' : 'bg-sunk text-muted'}`}>
                {scanning === s.id ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} strokeWidth={1.8} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted">{scanning === s.id ? 'Scanning the last 7 days…' : s.blurb}</p>
              </div>
              <Toggle on={on || scanning === s.id} onChange={(v) => toggle(s.id, v)} />
            </div>
          )
        })}
      </Card>
      <p className="mt-2 flex items-start gap-1.5 px-1 text-xs text-muted">
        <Lock size={12} className="mt-0.5 shrink-0" />
        Demo mode: connectors scan sample data. Parsing runs on your device, and only the resulting score is kept.
      </p>

      <SectionTitle>Paste a receipt</SectionTitle>
      <Card>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="Paste an order confirmation, flight booking or ride receipt…"
          rows={5}
          className="w-full resize-none rounded-2xl border border-line bg-bg p-3 text-sm outline-none focus:border-clay"
        />
        <div className="mt-2 flex items-center justify-between">
          <button className="text-sm text-clay" onClick={() => setPaste(SAMPLE)}>Try a sample</button>
          {paste && <button className="text-sm text-muted" onClick={() => setPaste('')}>Clear</button>}
        </div>
        {paste.trim() && (
          <div className="mt-3 rounded-2xl border border-dashed border-line p-3">
            {preview ? (
              <>
                <ActionRow a={preview} />
                <Button className="w-full" onClick={() => { dispatch({ type: 'add', action: { ...preview, id: `${preview.id}-${Date.now()}`, source: 'manual' } }); setPaste('') }}>
                  <ScanText size={16} /> Add to my log
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted">No brand, airline or ride service recognised yet.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
