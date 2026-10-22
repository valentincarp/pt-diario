import type { DayLog, TaskProgress } from '../types'
import { addDays } from './dates'
import { taskKey } from './plan'

export type Status = 'complet' | 'minimum' | null

/**
 * complet : la tâche prévue ce jour-là a été terminée ce jour-là.
 * minimum : session de cartes validée, ou une tâche (rattrapage) terminée ce jour-là.
 * Un rattrapage fait plus tard ne change pas le statut du jour raté.
 */
export function statusOf(date: string, days: Record<string, DayLog>, tasks: Record<string, TaskProgress>): Status {
  const log = days[date]
  if (log?.pos && tasks[taskKey(log.pos)]?.completedOn === date) return 'complet'
  if (log?.cardsOk || Object.values(tasks).some((t) => t.completedOn === date)) return 'minimum'
  return null
}

/** Série en cours : aujourd'hui ne la casse pas tant que la journée n'est pas finie. */
export function currentStreak(today: string, days: Record<string, DayLog>, tasks: Record<string, TaskProgress>) {
  let d = statusOf(today, days, tasks) ? today : addDays(today, -1)
  let n = 0
  while (statusOf(d, days, tasks)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function bestStreak(days: Record<string, DayLog>, tasks: Record<string, TaskProgress>) {
  const candidates = new Set([...Object.keys(days), ...Object.values(tasks).flatMap((t) => t.completedOn ?? [])])
  const worked = [...candidates].filter((d) => statusOf(d, days, tasks)).sort()
  let best = 0
  let run = 0
  worked.forEach((d, i) => {
    run = i > 0 && addDays(worked[i - 1], 1) === d ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}
