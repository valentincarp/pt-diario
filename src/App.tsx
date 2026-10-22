import { useEffect, useState, useSyncExternalStore } from 'react'
import { useStore } from './store'
import { useUi, type Tab } from './ui'
import { Modals } from './components/Modals'
import { Celebrate } from './components/Motivation'
import { Today } from './screens/Today'
import { Cards, Session } from './screens/Cards'
import { Journal } from './screens/Journal'
import { Fabio } from './screens/Fabio'
import { Bilans } from './screens/Bilans'
import { Settings } from './screens/Settings'
import { Exos } from './screens/Exos'
import { Plus } from './screens/Plus'
import { Icon, type IconName } from './components/Icon'

const SCREENS: Record<Tab, () => React.ReactNode> = {
  today: Today,
  cards: Cards,
  exos: Exos,
  journal: Journal,
  plus: Plus,
  fabio: Fabio,
  bilans: Bilans,
  settings: Settings,
}

// Barre du bas : 5 entrées ; Fábio, Bilans et Réglages sont rangés dans « Plus ».
const NAV: [Tab & IconName, string][] = [
  ['today', "Aujourd'hui"],
  ['cards', 'Cartes'],
  ['exos', 'Exercices'],
  ['journal', 'Journal'],
  ['plus', 'Plus'],
]
const UNDER_PLUS: Tab[] = ['fabio', 'bilans', 'settings']

const useHydrated = () => useSyncExternalStore(useStore.persist.onFinishHydration, useStore.persist.hasHydrated)

export function App() {
  const hydrated = useHydrated()
  const { tab, setTab, session, openError, openCard } = useUi()
  const [fab, setFab] = useState(false)

  // Demande à iOS / au navigateur de ne pas effacer les données locales.
  useEffect(() => {
    navigator.storage?.persist?.()
  }, [])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  if (!hydrated) return null
  // Celebrate reste monté pendant la session, pour fêter la validation des cartes.
  if (session)
    return (
      <>
        <Session />
        <Celebrate />
      </>
    )
  const Screen = SCREENS[tab]
  const active = UNDER_PLUS.includes(tab) ? 'plus' : tab

  return (
    <>
      <main>
        {UNDER_PLUS.includes(tab) && (
          <button className="ghost back" onClick={() => setTab('plus')}>
            <Icon name="back" size={18} /> Plus
          </button>
        )}
        <Screen />
      </main>

      <div className="fab">
        {fab && (
          <>
            <button className="small" onClick={() => (setFab(false), openError())}>
              + Faute
            </button>
            <button className="small" onClick={() => (setFab(false), openCard())}>
              + Carte
            </button>
          </>
        )}
        <button className={`round ${fab ? 'open' : ''}`} onClick={() => setFab(!fab)} aria-label="Ajout rapide" aria-expanded={fab}>
          <Icon name="add" size={26} />
        </button>
      </div>

      <nav className="tabs">
        {NAV.map(([id, label]) => (
          <button key={id} className={active === id ? 'active' : ''} onClick={() => setTab(id)} aria-current={active === id} aria-label={label}>
            <Icon name={id} />
            <small>{label}</small>
          </button>
        ))}
      </nav>
      <Modals />
      <Celebrate />
    </>
  )
}
