import { useEffect, useRef, useState } from 'react'
import { addDays, diffDays, mondayOf, today } from '../logic/dates'
import { PT_MESSAGES } from '../logic/ics'
import { taskFor, taskKey } from '../logic/plan'
import { bestStreak, currentStreak, statusOf, type Status } from '../logic/streak'
import { useStore } from '../store'
import type { Pos } from '../types'

const MILESTONES = [3, 7, 14, 21, 30, 50, 84, 100, 200, 365]
const LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function message(status: Status, streak: number) {
  if (status === 'complet') return 'Dia completo! Journée bouclée, parabéns 🎉'
  if (status === 'minimum') return 'Série sauvée ✓ Encore un effort pour le « complet » ?'
  if (streak > 0) return `Ne casse pas ta série de ${streak} jour${streak > 1 ? 's' : ''} : 10 min de cartes suffisent.`
  return "Nouvelle série aujourd'hui : 10 min suffisent pour démarrer."
}

/** Bandeau du haut : série, palier suivant, progression du jour, semaine en cours. */
export function Hero({ pos }: { pos: Pos | null }) {
  const { days, tasks, settings } = useStore()
  const d = today()
  const streak = currentStreak(d, days, tasks)
  const status = statusOf(d, days, tasks)
  const next = MILESTONES.find((m) => m > streak)
  const subtasks = pos ? taskFor(pos, settings).subtasks : []
  const done = pos ? subtasks.filter((s) => tasks[taskKey(pos)]?.checked.includes(s)).length : 0
  const pct = subtasks.length ? done / subtasks.length : 0
  const quote = PT_MESSAGES[((diffDays(d, '2026-01-01') % PT_MESSAGES.length) + PT_MESSAGES.length) % PT_MESSAGES.length]
  const monday = mondayOf(d)

  return (
    <section className={`hero ${status ?? ''}`}>
      <div className="hero-top">
        <div className={`flame ${streak ? 'lit' : ''}`} aria-hidden>
          🔥
        </div>
        <div className="hero-streak">
          <b>{streak}</b>
          <span>jour{streak > 1 ? 's' : ''} d'affilée</span>
          <small>
            Record {bestStreak(days, tasks)}
            {next && ` · palier ${next} dans ${next - streak} j`}
          </small>
        </div>
        {pos && (
          <div className="ring" style={{ '--p': pct } as React.CSSProperties} role="img" aria-label={`${done} sur ${subtasks.length} sous-tâches`}>
            <span>
              {done}/{subtasks.length}
            </span>
          </div>
        )}
      </div>
      <p className="hero-msg">{message(status, streak)}</p>
      <div className="weekstrip">
        {LETTERS.map((l, i) => {
          const date = addDays(monday, i)
          const st = diffDays(date, d) > 0 ? 'future' : (statusOf(date, days, tasks) ?? 'vide')
          return (
            <span key={date} className={`dot ${st} ${date === d ? 'today' : ''}`} title={`${date} : ${st}`}>
              {st === 'complet' ? '✓' : st === 'minimum' ? '•' : l}
            </span>
          )
        })}
      </div>
      <p className="quote" lang="pt-PT">
        « {quote} »
      </p>
    </section>
  )
}

/** Confettis quand la journée devient « complète », petit message quand la série est sauvée. */
export function Celebrate() {
  const { days, tasks } = useStore()
  const status = statusOf(today(), days, tasks)
  const prev = useRef(status)
  const [show, setShow] = useState<Status>(null)

  useEffect(() => {
    if (status && status !== prev.current) {
      setShow(status)
      const t = setTimeout(() => setShow(null), 2600)
      prev.current = status
      return () => clearTimeout(t)
    }
    prev.current = status
  }, [status])

  if (!show) return null
  return (
    <div className="celebrate" aria-live="polite">
      {show === 'complet' &&
        Array.from({ length: 36 }, (_, i) => (
          <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.07}s`, background: ['#046a38', '#c8102e', '#e8b100'][i % 3] }} />
        ))}
      <div className="toast">{show === 'complet' ? 'Dia completo! 🎉' : 'Série sauvée ✓'}</div>
    </div>
  )
}
