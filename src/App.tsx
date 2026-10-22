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

const TABS: [Tab, string, string, () => React.ReactNode][] = [
  ['today', '☀️', "Aujourd'hui", Today],
  ['cards', '🃏', 'Cartes', Cards],
  ['journal', '📕', 'Journal', Journal],
  ['fabio', '👨‍🏫', 'Fábio', Fabio],
  ['bilans', '📊', 'Bilans', Bilans],
  ['settings', '⚙️', 'Réglages', Settings],
]

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
  const Screen = TABS.find((t) => t[0] === tab)![3]

  return (
    <>
      <main>
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
        <button className="round" onClick={() => setFab(!fab)} aria-label="Ajout rapide" aria-expanded={fab}>
          {fab ? '✕' : '+'}
        </button>
      </div>

      <nav className="tabs">
        {TABS.map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)} aria-current={tab === id} aria-label={label}>
            <span aria-hidden>{icon}</span>
            <small>{label}</small>
          </button>
        ))}
      </nav>
      <Modals />
      <Celebrate />
    </>
  )
}
