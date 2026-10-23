import { useState } from 'react'
import type { Lesson } from '../types'
import { parseNotes } from '../logic/lessonNotes'
import { normalize } from '../logic/exercises'
import { fmtDate, today } from '../logic/dates'
import { nextWeekday, positionOf, weekOf } from '../logic/plan'
import { useStore } from '../store'
import { useUi } from '../ui'
import { ErrorList, PageHead } from '../components/Bits'

const HINT = `Écris librement. Raccourcis :
comboio = train            → carte
mais bom → melhor (règle)  → faute
# Grammaire                → section`

/** Fiche structurée : sections de notes, vocabulaire et fautes repérés dans le texte. */
function Sheet({ l }: { l: Lesson }) {
  const { cards, errors } = useStore()
  const openCard = useUi((u) => u.openCard)
  const prepared = parseNotes(l.prepared)
  const seen = parseNotes(l.seen)
  const vocab = [...prepared.cards, ...seen.cards]
  const known = new Set(cards.map((c) => normalize(c.back)))
  const lessonErrors = errors.filter((e) => e.lessonId === l.id)
  const week = l.week ? weekOf(l.week) : null

  return (
    <div className="sheet-view">
      {week && (
        <p className="muted">
          Semaine {week.n} · {week.theme}
        </p>
      )}
      {[
        ['📝 Préparé', prepared.sections],
        ['📚 Vu en cours', seen.sections],
      ].map(([title, sections]) =>
        (sections as typeof seen.sections).length ? (
          <section key={title as string}>
            <h3>{title as string}</h3>
            {(sections as typeof seen.sections).map((sec) => (
              <div key={sec.title} className="sheet-sec">
                {sec.title !== 'Notes' && <b>{sec.title}</b>}
                <ul>
                  {sec.items.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null,
      )}
      {vocab.length > 0 && (
        <section>
          <h3>🗂 Vocabulaire ({vocab.length})</h3>
          <ul className="errors">
            {vocab.map((v, i) => (
              <li key={i}>
                <span>
                  <b lang="pt-PT">{v.back}</b> — {v.front}
                </span>
                {known.has(normalize(v.back)) ? (
                  <small className="badge">✓ carte</small>
                ) : (
                  <button className="small ghost" onClick={() => openCard({ front: v.front, back: v.back, deckName: 'Cours avec Fábio' })}>
                    + carte
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h3>✗ Fautes corrigées ({lessonErrors.length})</h3>
        <ErrorList errors={lessonErrors} />
      </section>
      {!vocab.length && !prepared.sections.length && !seen.sections.length && !lessonErrors.length && (
        <p className="muted">Rien encore : écris tes notes dans l'onglet « Notes ».</p>
      )}
    </div>
  )
}

function LessonCard({ l }: { l: Lesson }) {
  const { saveLesson, deleteLesson, importLessonNotes } = useStore()
  const openError = useUi((u) => u.openError)
  const [view, setView] = useState<'notes' | 'fiche'>(l.seen.trim() ? 'fiche' : 'notes')
  const [result, setResult] = useState('')
  const set = (patch: Partial<Lesson>) => saveLesson({ ...l, ...patch })
  const structure = () => {
    const r = importLessonNotes(l.id)
    setResult(
      r.cards || r.errors
        ? `✓ ${r.cards} carte(s) créée(s) dans « Cours avec Fábio », ${r.errors} faute(s) ajoutée(s) au journal.`
        : '✓ Fiche à jour : rien de nouveau à ajouter.',
    )
    setView('fiche')
  }
  return (
    <details className="card" open={l.date === today()}>
      <summary>
        Cours {l.n} · {fmtDate(l.date)} <small className="muted">· S{l.week}</small>
      </summary>
      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={view === 'notes'} className={view === 'notes' ? 'on' : ''} onClick={() => setView('notes')}>
          Notes
        </button>
        <button role="tab" aria-selected={view === 'fiche'} className={view === 'fiche' ? 'on' : ''} onClick={() => setView('fiche')}>
          Fiche structurée
        </button>
      </div>

      {view === 'notes' ? (
        <>
          <div className="row">
            <input type="date" value={l.date} onChange={(e) => set({ date: e.target.value })} aria-label="Date" />
            <select value={l.n} onChange={(e) => set({ n: Number(e.target.value) as 1 | 2 })} aria-label="Cours">
              <option value={1}>Cours 1</option>
              <option value={2}>Cours 2</option>
            </select>
          </div>
          <label>
            Ce que j'ai préparé
            <textarea rows={4} lang="pt-PT" value={l.prepared} placeholder={HINT} onChange={(e) => set({ prepared: e.target.value })} />
          </label>
          <label>
            Ce qu'on a vu
            <textarea rows={6} lang="pt-PT" value={l.seen} placeholder={HINT} onChange={(e) => set({ seen: e.target.value })} />
          </label>
        </>
      ) : (
        <Sheet l={l} />
      )}

      <button className="wide" onClick={structure}>
        ✨ Structurer : créer les cartes et les fautes
      </button>
      {result && (
        <p className="feedback ok" role="status">
          {result}
        </p>
      )}
      <div className="row">
        <button className="small secondary" onClick={() => openError({ date: l.date, source: 'cours', lessonId: l.id })}>
          + faute corrigée
        </button>
        <button className="small ghost danger" onClick={() => confirm('Supprimer ce cours ?') && deleteLesson(l.id)}>
          Supprimer
        </button>
      </div>
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
      <PageHead title="Cours avec Fábio" subtitle="Prépare, note ce que vous avez vu et les fautes corrigées" />
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
