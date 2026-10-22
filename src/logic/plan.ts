import { DAY_KEYS, plan, type DayTask, type Pos, type Settings, type TaskProgress, type Week } from '../types'
import { addDays, diffDays, mondayOf, weekdayIdx } from './dates'

/** Position du plan pour une date, ou null hors des 12 semaines. */
export function positionOf(date: string, planStart: string): Pos | null {
  const d = diffDays(date, planStart)
  if (d < 0) return null
  const week = Math.floor(d / 7) + 1
  if (week > plan.weeks.length) return null
  return { week, day: DAY_KEYS[d % 7] }
}

export const dateOf = (p: Pos, planStart: string) =>
  addDays(planStart, (p.week - 1) * 7 + DAY_KEYS.indexOf(p.day))

export const taskKey = (p: Pos) => `S${p.week}-${p.day}`

export const weekOf = (n: number): Week => plan.weeks[n - 1]

export const phaseOf = (week: number) =>
  plan.phases.find((p) => week >= p.weeks[0] && week <= p.weeks[1])!

/** Semaines de bilan de phase (fin de chaque phase : 4, 8, 12). */
export const isPhaseWeek = (week: number) => plan.phases.some((p) => p.weeks[1] === week)

/** Tâche du jour ; le cours 2 s'ajoute en sous-tâche le jour où il est réglé. */
export function taskFor(p: Pos, s: Settings): DayTask {
  const w = weekOf(p.week)
  const base = w.days[p.day]
  if (s.cours2.weekday !== DAY_KEYS.indexOf(p.day)) return base
  const c2 = w.days.cours2
  return { title: `${base.title} + ${c2.title}`, subtasks: [...base.subtasks, ...c2.subtasks] }
}

export const isDone = (task: DayTask, prog?: TaskProgress) =>
  task.subtasks.every((s) => prog?.checked.includes(s))

export const isAnki = (label: string) => /anki/i.test(label)

/** Nouveau lundi de départ pour que la semaine en cours devienne `week`. */
export const shiftedStart = (today: string, week: number) => addDays(mondayOf(today), -7 * (week - 1))

/** Rattrapage : tâches non faites des jours passés de la semaine en cours uniquement. */
export function catchUp(today: string, s: Settings, tasks: Record<string, TaskProgress>): Pos[] {
  const pos = positionOf(today, s.planStart)
  if (!pos) return []
  return DAY_KEYS.slice(0, weekdayIdx(today))
    .map((day) => ({ week: pos.week, day }))
    .filter((p) => !isDone(taskFor(p, s), tasks[taskKey(p)]))
}

/** Prochaine date (aujourd'hui inclus) tombant sur ce jour de semaine. */
export const nextWeekday = (from: string, weekday: number) =>
  addDays(from, (weekday - weekdayIdx(from) + 7) % 7)
