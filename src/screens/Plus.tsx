import { useUi, type Tab } from '../ui'
import { Icon, type IconName } from '../components/Icon'
import { PageHead } from '../components/Bits'

const ROWS: [Tab & IconName, string, string][] = [
  ['fabio', 'Cours avec Fábio', 'Prochain cours, fiches et fautes corrigées'],
  ['bilans', 'Bilans', 'Bilan de la semaine, de phase, temps passé'],
  ['settings', 'Réglages', 'Plan, horaires, calendrier, sauvegarde'],
]

export function Plus() {
  const setTab = useUi((u) => u.setTab)
  return (
    <>
      <PageHead title="Plus" />
      {ROWS.map(([id, title, desc]) => (
        <button key={id} className="tile" onClick={() => setTab(id)}>
          <span className="tile-icon">
            <Icon name={id} />
          </span>
          <span>
            <b>{title}</b>
            <small>{desc}</small>
          </span>
        </button>
      ))}
    </>
  )
}
