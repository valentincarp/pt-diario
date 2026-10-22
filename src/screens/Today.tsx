import { DAY_KEYS, DAY_NAMES } from '../types'
import { fmtDate, today, weekdayIdx } from '../logic/dates'
import { catchUp, phaseOf, positionOf, taskFor, weekOf } from '../logic/plan'
import { bestStreak, currentStreak, statusOf } from '../logic/streak'
import { useStore } from '../store'
import { useUi } from '../ui'
import { ErrorList, Heatmap, Subtasks } from '../components/Bits'

export function Today() {
  const { settings, days, tasks, errors, updateDay } = useStore()
  const { setSession, setTab, openError, openCard } = useUi()
  const d = today()
  const pos = positionOf(d, settings.planStart)
  const status = statusOf(d, days, tasks)
  const log = days[d]
  const late = catchUp(d, settings, tasks)

  return (
    <>
      <section className="card streak">
        <div>
          <strong className="big">🔥 {currentStreak(d, days, tasks)}</strong> jour(s) d'affilée
          <small> · record {bestStreak(days, tasks)}</small>
        </div>
        <Heatmap />
        <small className="legend">
          <span className="cell vide" /> rien <span className="cell minimum" /> minimum <span className="cell complet" /> complet
        </small>
      </section>

      {!pos ? (
        <section className="card">
          <h2>{d < settings.planStart ? `Le plan commence le ${fmtDate(settings.planStart)}.` : 'Plan de 12 semaines terminé. Parabéns!'}</h2>
          <p>Les cartes et le journal restent disponibles. Tu peux recommencer une semaine dans Réglages → Décaler le plan.</p>
        </section>
      ) : (
        <>
          <section className="card">
            <small className="muted">
              Semaine {pos.week}/12 · Phase {phaseOf(pos.week).n} — {phaseOf(pos.week).title}
            </small>
            <h1>{weekOf(pos.week).theme}</h1>
            <p className="muted">🎯 {weekOf(pos.week).objective}</p>
          </section>

          <section className="card">
            <div className="row">
              <small className="muted">{fmtDate(d)}</small>
              {status && <span className={`badge ${status}`}>{status === 'complet' ? 'Complet ✓' : 'Minimum ✓'}</span>}
            </div>
            <h2>{taskFor(pos, settings).title}</h2>
            <Subtasks pos={pos} />
            <div className="row wrap">
              {!status && (
                <button className="secondary" onClick={() => setSession(true)}>
                  Règle du minimum : 10 min de cartes
                </button>
              )}
              {pos.day === 'dim' && <button onClick={() => setTab('bilans')}>Remplir le bilan</button>}
              {(weekdayIdx(d) === settings.cours1.weekday || weekdayIdx(d) === settings.cours2.weekday) && (
                <button onClick={() => setTab('fabio')}>Fiche du cours</button>
              )}
            </div>
          </section>
        </>
      )}

      <section className="card">
        <label>
          Temps passé aujourd'hui (minutes)
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={log?.minutes ?? 0}
            onChange={(e) => updateDay(d, { minutes: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <label>
          Notes / mots nouveaux
          <textarea rows={4} value={log?.notes ?? ''} onChange={(e) => updateDay(d, { notes: e.target.value })} />
        </label>
        <div className="row">
          <h3>Fautes du jour</h3>
          <div className="row">
            <button className="small secondary" onClick={() => openCard()}>
              + carte
            </button>
            <button className="small" onClick={() => openError({ date: d, source: 'jour' })}>
              + faute
            </button>
          </div>
        </div>
        <ErrorList errors={errors.filter((e) => e.date === d)} />
      </section>

      {late.length > 0 && (
        <section className="card">
          <h2>Rattrapage de la semaine</h2>
          <p className="muted">Rattraper fait avancer le plan, mais ne répare pas la série.</p>
          {late.map((p) => (
            <details key={p.day}>
              <summary>
                {DAY_NAMES[DAY_KEYS.indexOf(p.day)]} — {taskFor(p, settings).title}
              </summary>
              <Subtasks pos={p} />
            </details>
          ))}
        </section>
      )}
    </>
  )
}
