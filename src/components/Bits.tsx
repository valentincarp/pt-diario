import { addDays, diffDays, mondayOf, today } from '../logic/dates'
import { isAnki, taskFor, taskKey } from '../logic/plan'
import { statusOf } from '../logic/streak'
import { useStore } from '../store'
import { useUi } from '../ui'
import type { ErrorEntry, Pos } from '../types'

/** Sous-tâches cochables d'une tâche du plan. */
export function Subtasks({ pos }: { pos: Pos }) {
  const { settings, tasks, toggleSubtask } = useStore()
  const setSession = useUi((u) => u.setSession)
  const checked = tasks[taskKey(pos)]?.checked ?? []
  return (
    <ul className="subtasks">
      {taskFor(pos, settings).subtasks.map((label) => (
        <li key={label}>
          <label className="check">
            <input type="checkbox" checked={checked.includes(label)} onChange={() => toggleSubtask(pos, label)} />
            <span>{label}</span>
          </label>
          {isAnki(label) && !checked.includes(label) && (
            <button className="small" onClick={() => setSession(true)}>
              Lancer
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Calendrier façon GitHub : une colonne par semaine, du début du plan à la semaine 12. */
export function Heatmap() {
  const { days, tasks, settings } = useStore()
  const t = today()
  const first = [settings.planStart, ...Object.keys(days)].sort()[0]
  const start = mondayOf(first)
  const lastPlanDay = addDays(settings.planStart, 83)
  const end = addDays(mondayOf(diffDays(lastPlanDay, t) > 0 ? lastPlanDay : t), 6)
  const cells = Array.from({ length: diffDays(end, start) + 1 }, (_, i) => addDays(start, i))
  return (
    <div className="heatmap" role="img" aria-label="Calendrier des jours travaillés">
      {cells.map((d) => {
        const st = diffDays(d, t) > 0 ? 'future' : (statusOf(d, days, tasks) ?? 'vide')
        return <span key={d} className={`cell ${st} ${d === t ? 'today' : ''}`} title={`${d} : ${st}`} />
      })}
    </div>
  )
}

/** Liste de fautes avec actions (modifier, créer une carte). */
export function ErrorList({ errors }: { errors: ErrorEntry[] }) {
  const { openError, openCard } = useUi()
  if (!errors.length) return null
  return (
    <ul className="errors">
      {errors.map((e) => (
        <li key={e.id}>
          <div>
            <s>{e.wrote}</s> → <b lang="pt-PT">{e.correction}</b>
            {e.rule && <small> · {e.rule}</small>}
          </div>
          <div className="actions">
            <button className="small ghost" onClick={() => openError(e)} aria-label="Modifier">
              ✎
            </button>
            <button
              className="small ghost"
              onClick={() => openCard({ front: `Corrige : ${e.wrote}`, back: e.correction, note: e.rule, deckName: "Journal d'erreurs" })}
            >
              + carte
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
