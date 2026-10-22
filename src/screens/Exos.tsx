import { useEffect, useRef, useState } from 'react'
import { fmtDate, today } from '../logic/dates'
import { buildSession, check, type Verdict } from '../logic/exercises'
import { positionOf, weekOf } from '../logic/plan'
import { checkText, type LtMatch } from '../lib/languagetool'
import { useStore } from '../store'
import { useUi } from '../ui'
import { PageHead } from '../components/Bits'
import type { TextEntry } from '../types'

const KIND_LABEL = { conj: 'Conjugaison', phrase: 'Transformation', carte: 'Traduction', faute: 'Faute du journal' }
const ptInput = { lang: 'pt-PT', autoCapitalize: 'off', autoCorrect: 'off', spellCheck: false } as const

/** Séance de 10 questions corrigées tout de suite ; chaque faute part dans le journal. */
function Quiz({ onExit, onRestart }: { onExit: () => void; onRestart: () => void }) {
  const { cards, errors, settings, saveError, deleteError, addMinutes } = useStore()
  const week = positionOf(today(), settings.planStart)?.week ?? 12
  const [qs] = useState(() => buildSession(week, cards, errors))
  const [i, setI] = useState(0)
  const [input, setInput] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [score, setScore] = useState(0)
  const [lastErr, setLastErr] = useState<string | null>(null)
  const start = useRef(Date.now())
  const q = qs[i]
  const finished = i >= qs.length

  useEffect(() => {
    if (finished) addMinutes(today(), Math.round((Date.now() - start.current) / 60_000))
  }, [finished, addMinutes])

  const submit = () => {
    const v = check(input, q.answers)
    setVerdict(v)
    if (v === 'ok') setScore((s) => s + 1)
    else setLastErr(saveError({ date: today(), wrote: input.trim() || '(sans réponse)', correction: q.answers[0], rule: q.rule, source: 'exercice' }))
  }
  // Réponse juste mais non prévue : on retire la faute ajoutée.
  const override = () => {
    if (lastErr) deleteError(lastErr)
    setLastErr(null)
    setVerdict('ok')
    setScore((s) => s + 1)
  }
  const next = () => {
    setI(i + 1)
    setInput('')
    setVerdict(null)
    setLastErr(null)
  }

  if (finished)
    return (
      <section className="card center">
        <p className="score">
          {score}/{qs.length}
        </p>
        <h2>{score === qs.length ? 'Perfeito! 🎉' : score >= qs.length * 0.7 ? 'Muito bem!' : 'Continua, estás a melhorar!'}</h2>
        <p className="muted">{qs.length - score ? `${qs.length - score} faute(s) ajoutée(s) au journal d'erreurs.` : 'Aucune faute.'}</p>
        <div className="row wrap center">
          <button onClick={onRestart}>Nouvelle série</button>
          <button className="secondary" onClick={onExit}>
            Terminer
          </button>
        </div>
      </section>
    )

  return (
    <>
      <PageHead title={`Question ${i + 1}/${qs.length}`} subtitle={`${KIND_LABEL[q.kind]} · ${q.hint}`} onBack={onExit} />
      <div className="progress" aria-hidden>
        <span style={{ width: `${(100 * i) / qs.length}%` }} />
      </div>
      <form
        className="card quiz"
        onSubmit={(e) => {
          e.preventDefault()
          if (verdict) next()
          else submit()
        }}
      >
        <p className="prompt">{q.prompt}</p>
        <input {...ptInput} value={input} onChange={(e) => setInput(e.target.value)} readOnly={!!verdict} placeholder="Ta réponse en portugais" autoFocus />
        {verdict && (
          <div className={`feedback ${verdict}`} role="status">
            {verdict === 'ok' ? (
              <b>✓ Certo!</b>
            ) : (
              <>
                <b>{verdict === 'accents' ? '≈ Presque : attention aux accents' : '✗ Pas tout à fait'}</b>
                <p lang="pt-PT">
                  Réponse : <b>{q.answers[0]}</b>
                </p>
                <small>{q.rule}</small>
              </>
            )}
          </div>
        )}
        <div className="row">
          {verdict && verdict !== 'ok' ? (
            <button type="button" className="ghost small" onClick={override}>
              J'avais juste
            </button>
          ) : (
            <span />
          )}
          <button type="submit">{verdict ? 'Suivant →' : 'Vérifier'}</button>
        </div>
      </form>
    </>
  )
}

/** Petit extrait autour d'une faute, pour le journal. */
const excerpt = (body: string, m: LtMatch) => {
  const a = Math.max(0, body.lastIndexOf(' ', m.offset - 12) + 1)
  const b = body.indexOf(' ', m.offset + m.length + 12)
  return body.slice(a, b < 0 ? undefined : b).trim()
}

/** Écriture : le texte est sauvegardé en continu, LanguageTool souligne les fautes. */
function Writing({ id, onClose }: { id: string; onClose: () => void }) {
  const { texts, settings, saveText, deleteText, saveError } = useStore()
  const pos = positionOf(today(), settings.planStart)
  const [t, setT] = useState<Omit<TextEntry, 'id'> & { id?: string }>(
    () => texts.find((x) => x.id === id) ?? { date: today(), week: pos?.week ?? 0, title: pos ? weekOf(pos.week).days.ven.title : 'Texte libre', body: '' },
  )
  const [matches, setMatches] = useState<LtMatch[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState<number[]>([])
  const words = t.body.trim().split(/\s+/).filter(Boolean).length

  const update = (patch: Partial<TextEntry>) => {
    const next = { ...t, ...patch }
    setT({ ...next, id: saveText(next) })
  }
  const edit = (body: string) => {
    update({ body })
    setMatches(null) // les positions des fautes ne correspondent plus
  }
  const correct = async () => {
    setBusy(true)
    setError('')
    try {
      setMatches(await checkText(t.body))
      setAdded([])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const apply = (m: LtMatch, value: string) => {
    const delta = value.length - m.length
    update({ body: t.body.slice(0, m.offset) + value + t.body.slice(m.offset + m.length) })
    setMatches((ms) => ms!.filter((x) => x !== m).map((x) => (x.offset > m.offset ? { ...x, offset: x.offset + delta } : x)))
  }

  // Texte avec les fautes surlignées (les chevauchements sont ignorés).
  const parts: React.ReactNode[] = []
  let pos0 = 0
  for (const m of [...(matches ?? [])].sort((a, b) => a.offset - b.offset)) {
    if (m.offset < pos0) continue
    parts.push(t.body.slice(pos0, m.offset), <mark key={m.offset}>{t.body.slice(m.offset, m.offset + m.length)}</mark>)
    pos0 = m.offset + m.length
  }
  parts.push(t.body.slice(pos0))

  return (
    <>
      <PageHead title="Écriture" subtitle={t.week ? `Semaine ${t.week} · ${fmtDate(t.date)}` : fmtDate(t.date)} onBack={onClose} />
      <section className="card">
        <label>
          Sujet
          <input value={t.title} onChange={(e) => update({ title: e.target.value })} />
        </label>
        <label>
          Ton texte <small>· {words} mots</small>
          <textarea {...ptInput} rows={10} value={t.body} onChange={(e) => edit(e.target.value)} placeholder="Escreve aqui o teu texto…" />
        </label>
        <button className="wide" onClick={correct} disabled={busy || !t.body.trim()}>
          {busy ? 'Correction…' : '✨ Corriger avec LanguageTool'}
        </button>
        <small className="muted">Le texte est envoyé à languagetool.org pour la correction (internet requis).</small>
        {error && <p className="feedback faux">{error}</p>}
      </section>

      {matches && (
        <section className="card">
          <h2>{matches.length ? `${matches.length} point(s) à revoir` : 'Aucune faute détectée 🎉'}</h2>
          {matches.length > 0 && (
            <p className="highlighted" lang="pt-PT">
              {parts}
            </p>
          )}
          <ul className="lt">
            {matches.map((m, k) => (
              <li key={`${m.offset}-${k}`}>
                <p>
                  <s>{t.body.slice(m.offset, m.offset + m.length)}</s> · {m.message}
                </p>
                <div className="row wrap">
                  {m.replacements.slice(0, 3).map((r) => (
                    <button key={r.value} className="small" onClick={() => apply(m, r.value)}>
                      {r.value || '(supprimer)'}
                    </button>
                  ))}
                  <button
                    className="small ghost"
                    disabled={added.includes(m.offset)}
                    onClick={() => {
                      saveError({
                        date: today(),
                        wrote: excerpt(t.body, m),
                        correction: m.replacements[0]?.value ?? '',
                        rule: m.rule.description || m.message,
                        source: 'exercice',
                      })
                      setAdded([...added, m.offset])
                    }}
                  >
                    {added.includes(m.offset) ? '✓ au journal' : '+ journal'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {t.id && (
        <button
          className="ghost danger small"
          onClick={() => {
            if (confirm('Supprimer ce texte ?')) {
              deleteText(t.id!)
              onClose()
            }
          }}
        >
          Supprimer ce texte
        </button>
      )}
    </>
  )
}

export function Exos() {
  const { texts, settings } = useStore()
  const { writing, openWriting } = useUi()
  const [quiz, setQuiz] = useState(0) // 0 = accueil ; change de valeur pour relancer une série
  const pos = positionOf(today(), settings.planStart)
  const w = weekOf(pos?.week ?? 12)

  if (writing) return <Writing key={writing} id={writing} onClose={() => openWriting(null)} />
  if (quiz) return <Quiz key={quiz} onExit={() => setQuiz(0)} onRestart={() => setQuiz((q) => q + 1)} />

  return (
    <>
      <PageHead title="Exercices" subtitle={`Semaine ${w.n} · ${w.theme}`} />
      <button className="tile" onClick={() => setQuiz(1)}>
        <span className="tile-emoji">🎯</span>
        <span>
          <b>Série de 10 questions</b>
          <small>Conjugaison et phrases de la semaine, tes cartes et tes fautes. Corrigé tout de suite.</small>
        </span>
      </button>
      <button className="tile" onClick={() => openWriting('new')}>
        <span className="tile-emoji">✍️</span>
        <span>
          <b>Écrire un texte</b>
          <small>{w.days.ven.title} · corrigé par LanguageTool</small>
        </span>
      </button>
      {texts.length > 0 && (
        <section className="card">
          <h2>Mes textes</h2>
          <ul className="list">
            {texts.map((x) => (
              <li key={x.id}>
                <button className="row-btn" onClick={() => openWriting(x.id)}>
                  <span>
                    <b>{x.title}</b>
                    <small className="muted">
                      {fmtDate(x.date)} · {x.body.trim().split(/\s+/).filter(Boolean).length} mots
                    </small>
                  </span>
                  <span aria-hidden>›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
