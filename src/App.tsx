import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { House, Plus, Sparkles, Trophy, type LucideIcon } from 'lucide-react'
import { useStore } from './lib/store'
import type { Action } from './lib/types'
import { Today } from './screens/Today'
import { Log } from './screens/Log'
import { Found } from './screens/Found'
import { League } from './screens/League'

type Tab = 'today' | 'log' | 'found' | 'league'

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [toast, setToast] = useState<Action | null>(null)
  const { state } = useStore()

  function logged(a: Action) {
    setToast(a)
    setTab('today')
    setTimeout(() => setToast(null), 2200)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className="flex-1 px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))]">
        {/* Enter-only transition: a "wait" exit would block tab changes whenever frames pause. */}
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          {tab === 'today' && <Today go={setTab} />}
          {tab === 'log' && <Log done={logged} />}
          {tab === 'found' && <Found />}
          {tab === 'league' && <League />}
        </motion.div>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 bottom-28 z-30 mx-auto w-fit rounded-full bg-ink px-5 py-2.5 text-sm text-bg shadow-lg"
          >
            <span className={`num mr-2 font-semibold ${toast.points >= 0 ? 'text-sage' : 'text-ember'}`}>
              {toast.points >= 0 ? '+' : '−'}{Math.abs(toast.points)}
            </span>
            {toast.points >= 0 ? 'Nice. You breathed lighter.' : 'Logged. Honesty counts.'}
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg">
        <div className="mx-auto flex max-w-md items-center justify-around px-4">
          <NavItem icon={House} label="Today" active={tab === 'today'} onClick={() => setTab('today')} />
          <NavItem icon={Sparkles} label="Found" active={tab === 'found'} onClick={() => setTab('found')} badge={state.pending.length} />
          <button onClick={() => setTab('log')} aria-label="Log action" className={`-mt-6 grid h-14 w-14 place-items-center rounded-full shadow-lg transition ${tab === 'log' ? 'bg-ink text-bg' : 'bg-clay text-white'}`}>
            <Plus size={26} />
          </button>
          <NavItem icon={Trophy} label="League" active={tab === 'league'} onClick={() => setTab('league')} />
        </div>
      </nav>
    </div>
  )
}

function NavItem({ icon: Icon, label, active, onClick, badge }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button onClick={onClick} className={`relative flex w-16 flex-col items-center gap-0.5 text-[11px] font-medium ${active ? 'text-ink' : 'text-muted'}`}>
      <Icon size={22} strokeWidth={active ? 2.2 : 1.7} />
      {label}
      {!!badge && <span className="num absolute -top-1 right-3 grid h-4 min-w-4 place-items-center rounded-full bg-clay px-1 text-[10px] text-white">{badge}</span>}
    </button>
  )
}
