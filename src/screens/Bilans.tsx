import { useState } from 'react'
import { addDays, diffDays, today } from '../logic/dates'
import { learnedCount } from '../logic/cards'
import { isPhaseWeek, phaseOf, positionOf, weekOf } from '../logic/plan'
import { plan, type PhaseReview, type WeeklyReview } from '../types'
import { useStore } from '../store'
import { PageHead } from '../components/Bits'

const hours = (min: number) => `${(min / 60).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h`

const EMPTY_WEEK: WeeklyReview = { recurring: '', words: ['', '', ''], rating: 0 }
const EMPTY_PHASE: PhaseReview = { errorsPer200: '', jtPercent: '', c1Used: '', mockScore: '', cardsLearned: 0 }

const INDICATORS: [keyof PhaseReview, string][] = [
  ['errorsPer200', 'Fautes / texte de 200 mots'],
  ['jtPercent', '% idées comprises (JT 3 min)'],
  ['cardsLearned', 'Cartes apprises'],
  ['c1Used', 'Mots de la liste C1 utilisés'],
  ['mockScore', 'Score au test blanc'],
]

export function Bilans() {
  const { settings, days, errors, cards, weekly, phases, setWeekly, setPhase } = useStore()
  const current = positionOf(today(), settings.planStart)?.week ?? 12
  const [week, setWeek] = useState(current)
  const w = weekly[week] ?? EMPTY_WEEK
  const phase = phaseOf(week)
  const p = phases[phase.n] ?? EMPTY_PHASE

  // Minutes par semaine du plan (d'après la position figée de chaque jour)
  const minutes = plan.weeks.map((wk) => Object.values(days).filter((d) => d.pos?.week === wk.n).reduce((s, d) => s + d.minutes, 0))
  const max = Math.max(60, ...minutes)
  const phaseMinutes = (n: number) => {
    const [a, b] = plan.phases[n - 1].weeks
    return minutes.slice(a - 1, b).reduce((s, m) => s + m, 0)
  }

  // Règles les plus fréquentes de la semaine, pour aider à remplir « fautes récurrentes »
  const start = addDays(settings.planStart, (week - 1) * 7)
  const weekErrors = errors.filter((e) => diffDays(e.date, start) >= 0 && diffDays(e.date, start) < 7 && e.rule)
  const byRule = new Map<string, number>()
  for (const e of weekErrors) byRule.set(e.rule, (byRule.get(e.rule) ?? 0) + 1)
  const top = [...byRule]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([rule, n]) => `${rule} (×${n})`)

  return (
    <>
      <PageHead title="Bilans" subtitle="Chaque dimanche, et à la fin de chaque phase" />
      <section className="card">
        <div className="row">
          <h2>Bilan de la semaine</h2>
          <select value={week} onChange={(e) => setWeek(Number(e.target.value))} aria-label="Semaine">
            {plan.weeks.map((wk) => (
              <option key={wk.n} value={wk.n}>
                S{wk.n} — {wk.theme}
              </option>
            ))}
          </select>
        </div>
        <p className="muted">🎯 {weekOf(week).objective}</p>
        <label>
          Fautes récurrentes
          <textarea rows={3} value={w.recurring} placeholder={top.join('\n')} onChange={(e) => setWeekly(week, { ...w, recurring: e.target.value })} />
        </label>
        {top.length > 0 && !w.recurring && (
          <button className="small secondary" onClick={() => setWeekly(week, { ...w, recurring: top.join('\n') })}>
            Reprendre les règles fréquentes du journal
          </button>
        )}
        <fieldset>
          <legend>3 mots appris</legend>
          {w.words.map((word, i) => (
            <input
              key={i}
              lang="pt-PT"
              value={word}
              onChange={(e) => {
                const words = [...w.words] as WeeklyReview['words']
                words[i] = e.target.value
                setWeekly(week, { ...w, words })
              }}
            />
          ))}
        </fieldset>
        <fieldset>
          <legend>Note sur 5</legend>
          <div className="row">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={n <= w.rating ? '' : 'secondary'} onClick={() => setWeekly(week, { ...w, rating: n })} aria-label={`${n} sur 5`}>
                ★
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      {isPhaseWeek(week) && (
        <section className="card">
          <h2>
            Bilan de phase {phase.n} — {phase.title}
          </h2>
          {INDICATORS.filter(([k]) => k !== 'cardsLearned').map(([k, label]) => (
            <label key={k}>
              {label}
              <input inputMode="decimal" value={p[k]} onChange={(e) => setPhase(phase.n, { ...p, [k]: e.target.value, cardsLearned: learnedCount(cards) })} />
            </label>
          ))}
          <p className="muted">
            Cartes apprises (relevé automatique à chaque modification) : <b>{p.cardsLearned || learnedCount(cards)}</b> · Temps total de la phase :{' '}
            <b>{hours(phaseMinutes(phase.n))}</b>
          </p>
        </section>
      )}

      <section className="card">
        <h2>Comparaison des phases</h2>
        <table className="compare">
          <thead>
            <tr>
              <th />
              {plan.phases.map((ph) => (
                <th key={ph.n}>S{ph.weeks[1]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INDICATORS.map(([k, label]) => (
              <tr key={k}>
                <th>{label}</th>
                {plan.phases.map((ph) => (
                  <td key={ph.n}>{phases[ph.n]?.[k] || '–'}</td>
                ))}
              </tr>
            ))}
            <tr>
              <th>Temps total</th>
              {plan.phases.map((ph) => (
                <td key={ph.n}>{hours(phaseMinutes(ph.n))}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Temps passé par semaine</h2>
        <div className="bars" role="img" aria-label="Minutes par semaine">
          {minutes.map((m, i) => (
            <div key={i} className={`bar ${i + 1 === current ? 'now' : ''}`}>
              <small>{m || ''}</small>
              <span style={{ height: `${(100 * m) / max}%` }} />
              <small>S{i + 1}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
