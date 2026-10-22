import type { Lesson } from '../types'
import { fmtDate, today } from '../logic/dates'
import { nextWeekday, positionOf, weekOf } from '../logic/plan'
import { useStore } from '../store'
import { useUi } from '../ui'
import { ErrorList } from '../components/Bits'

function LessonCard({ l }: { l: Lesson }) {
  const { errors, saveLesson, deleteLesson } = useStore()
  const openError = useUi((u) => u.openError)
  const set = (patch: Partial<Lesson>) => saveLesson({ ...l, ...patch })
  return (
    <details className="card" open={l.date === today()}>
      <summary>
        Cours {l.n} · {fmtDate(l.date)} <small className="muted">· S{l.week}</small>
      </summary>
      <div className="row">
        <input type="date" value={l.date} onChange={(e) => set({ date: e.target.value })} aria-label="Date" />
        <select value={l.n} onChange={(e) => set({ n: Number(e.target.value) as 1 | 2 })} aria-label="Cours">
          <option value={1}>Cours 1</option>
          <option value={2}>Cours 2</option>
        </select>
      </div>
      <label>
        Ce que j'ai préparé
        <textarea rows={3} value={l.prepared} onChange={(e) => set({ prepared: e.target.value })} />
      </label>
      <label>
        Ce qu'on a vu
        <textarea rows={3} value={l.seen} onChange={(e) => set({ seen: e.target.value })} />
      </label>
      <div className="row">
        <h3>Fautes corrigées</h3>
        <button className="small" onClick={() => openError({ date: l.date, source: 'cours', lessonId: l.id })}>
          + faute
        </button>
      </div>
      <ErrorList errors={errors.filter((e) => e.lessonId === l.id)} />
      <button className="small ghost danger" onClick={() => confirm('Supprimer ce cours ?') && deleteLesson(l.id)}>
        Supprimer le cours
      </button>
    </details>
  )
}

export function Fabio() {
  const { settings, lessons, saveLesson } = useStore()
  const d = today()
  const upcoming = [
    { n: 1 as const, ...settings.cours1 },
    ...(settings.cours2.weekday === null ? [] : [{ n: 2 as const, weekday: settings.cours2.weekday, time: settings.cours2.time }]),
  ]
    .map((c) => ({ ...c, date: nextWeekday(d, c.weekday) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      <section className="card">
        <h2>Prochain(s) cours</h2>
        {upcoming.map((c) => {
          const pos = positionOf(c.date, settings.planStart)
          const w = pos && weekOf(pos.week)
          return (
            <p key={c.n}>
              <b>
                Cours {c.n} · {c.date === d ? "aujourd'hui" : fmtDate(c.date)} à {c.time}
              </b>
              <br />
              {w ? <>À préparer : {c.n === 1 ? w.days.mer.title : w.days.cours2.title}</> : <span className="muted">Hors plan</span>}
            </p>
          )
        })}
        <button
          className="wide"
          onClick={() => saveLesson({ date: d, n: 1, week: positionOf(d, settings.planStart)?.week ?? 0, prepared: '', seen: '' })}
        >
          + Nouvelle fiche de cours (aujourd'hui)
        </button>
      </section>
      {lessons
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((l) => (
          <LessonCard key={l.id} l={l} />
        ))}
    </>
  )
}
