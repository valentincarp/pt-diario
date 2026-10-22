import { useState } from 'react'
import { useStore } from '../store'
import { useUi } from '../ui'

const norm = (s: string) => s.trim().toLowerCase()

export function Journal() {
  const { errors, deleteError } = useStore()
  const { openError, openCard } = useUi()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'date' | 'freq'>('date')

  const freq = new Map<string, number>()
  for (const e of errors) if (e.rule) freq.set(norm(e.rule), (freq.get(norm(e.rule)) ?? 0) + 1)
  const count = (rule: string) => freq.get(norm(rule)) ?? 0

  const shown = errors
    .filter((e) => norm([e.wrote, e.correction, e.rule].join(' ')).includes(norm(q)))
    .sort((a, b) =>
      sort === 'freq'
        ? count(b.rule) - count(a.rule) || a.rule.localeCompare(b.rule) || b.date.localeCompare(a.date)
        : b.date.localeCompare(a.date),
    )

  return (
    <section className="card">
      <div className="row">
        <h2>Journal d'erreurs</h2>
        <button className="small" onClick={() => openError()}>
          + faute
        </button>
      </div>
      <div className="row">
        <input type="search" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={sort} onChange={(e) => setSort(e.target.value as 'date' | 'freq')} aria-label="Tri">
          <option value="date">Plus récentes</option>
          <option value="freq">Règles fréquentes</option>
        </select>
      </div>
      <table className="journal">
        <thead>
          <tr>
            <th>Date</th>
            <th>Écrit / dit</th>
            <th>Correction</th>
            <th>Règle</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {shown.map((e) => (
            <tr key={e.id}>
              <td data-label="Date">{e.date.slice(5).split('-').reverse().join('/')}</td>
              <td data-label="Écrit">
                <s>{e.wrote}</s>
              </td>
              <td data-label="Correction" lang="pt-PT">
                <b>{e.correction}</b>
              </td>
              <td data-label="Règle">
                {e.rule} {count(e.rule) > 1 && <span className="badge minimum">×{count(e.rule)}</span>}
              </td>
              <td className="actions">
                <button className="small ghost" onClick={() => openError(e)} aria-label="Modifier">
                  ✎
                </button>
                <button
                  className="small ghost"
                  onClick={() => openCard({ front: `Corrige : ${e.wrote}`, back: e.correction, note: e.rule, deckName: "Journal d'erreurs" })}
                >
                  + carte
                </button>
                <button className="small ghost" onClick={() => confirm('Supprimer cette faute ?') && deleteError(e.id)} aria-label="Supprimer">
                  🗑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!shown.length && <p className="muted">Aucune faute trouvée.</p>}
    </section>
  )
}
