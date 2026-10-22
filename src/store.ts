import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { del, get, set } from 'idb-keyval'
import { State, type Grade } from 'ts-fsrs'
import { today } from './logic/dates'
import { emptyFsrs, grade } from './logic/cards'
import { isAnki, isDone, positionOf, shiftedStart, taskFor, taskKey } from './logic/plan'
import { initialData } from './seed'
import type { CardItem, Data, DayLog, ErrorEntry, Lesson, PhaseReview, Pos, Settings, WeeklyReview } from './types'

const uid = () => crypto.randomUUID()

type Actions = {
  toggleSubtask: (pos: Pos, label: string) => void
  updateDay: (date: string, patch: Partial<Pick<DayLog, 'minutes' | 'notes'>>) => void
  addMinutes: (date: string, minutes: number) => void
  validateCards: () => void
  saveError: (e: Omit<ErrorEntry, 'id'> & { id?: string }) => void
  deleteError: (id: string) => void
  saveLesson: (l: Omit<Lesson, 'id'> & { id?: string }) => string
  deleteLesson: (id: string) => void
  addDeck: (name: string) => string
  saveCard: (c: Pick<CardItem, 'deckId' | 'front' | 'back' | 'note'> & { id?: string }) => void
  deleteCard: (id: string) => void
  gradeCard: (id: string, rating: Grade) => void
  setWeekly: (week: number, w: WeeklyReview) => void
  setPhase: (phase: number, p: PhaseReview) => void
  setSettings: (patch: Partial<Settings>) => void
  shiftPlan: (toWeek: number) => void
  replaceData: (d: Data) => void
}

export type Store = Data & Actions

/** Crée le DayLog du jour si besoin, avec la position du plan figée. */
const ensureDay = (s: Data, date: string): DayLog =>
  s.days[date] ?? { pos: positionOf(date, s.settings.planStart), minutes: 0, notes: '', cardsOk: false }

const idbStorage = {
  getItem: async (k: string) => (await get<string>(k)) ?? null,
  setItem: (k: string, v: string) => set(k, v),
  removeItem: (k: string) => del(k),
}

export const useStore = create<Store>()(
  persist(
    (setState, getState) => ({
      ...initialData(),

      toggleSubtask: (pos, label) =>
        setState((s) => {
          const key = taskKey(pos)
          const prev = s.tasks[key] ?? { checked: [] }
          const checked = prev.checked.includes(label) ? prev.checked.filter((l) => l !== label) : [...prev.checked, label]
          const done = isDone(taskFor(pos, s.settings), { checked })
          const d = today()
          return {
            tasks: { ...s.tasks, [key]: { checked, completedOn: done ? (prev.completedOn ?? d) : undefined } },
            days: { ...s.days, [d]: ensureDay(s, d) },
          }
        }),

      updateDay: (date, patch) => setState((s) => ({ days: { ...s.days, [date]: { ...ensureDay(s, date), ...patch } } })),

      addMinutes: (date, minutes) =>
        setState((s) => {
          const day = ensureDay(s, date)
          return { days: { ...s.days, [date]: { ...day, minutes: day.minutes + minutes } } }
        }),

      /** Session de cartes validée : coche « Anki » du jour et garde la série (règle du minimum). */
      validateCards: () =>
        setState((s) => {
          const d = today()
          const day = { ...ensureDay(s, d), cardsOk: true }
          if (!day.pos) return { days: { ...s.days, [d]: day } }
          const pos = day.pos
          const key = taskKey(pos)
          const task = taskFor(pos, s.settings)
          const prev = s.tasks[key] ?? { checked: [] }
          const checked = [...new Set([...prev.checked, ...task.subtasks.filter(isAnki)])]
          const done = isDone(task, { checked })
          return {
            days: { ...s.days, [d]: day },
            tasks: { ...s.tasks, [key]: { checked, completedOn: done ? (prev.completedOn ?? d) : undefined } },
          }
        }),

      saveError: (e) =>
        setState((s) =>
          e.id
            ? { errors: s.errors.map((x) => (x.id === e.id ? { ...x, ...e, id: x.id } : x)) }
            : { errors: [{ ...e, id: uid() }, ...s.errors] },
        ),
      deleteError: (id) => setState((s) => ({ errors: s.errors.filter((e) => e.id !== id) })),

      saveLesson: (l) => {
        const id = l.id ?? uid()
        setState((s) => ({
          lessons: l.id ? s.lessons.map((x) => (x.id === id ? { ...x, ...l, id } : x)) : [{ ...l, id }, ...s.lessons],
        }))
        return id
      },
      deleteLesson: (id) => setState((s) => ({ lessons: s.lessons.filter((l) => l.id !== id) })),

      addDeck: (name) => {
        const existing = getState().decks.find((d) => d.name === name)
        if (existing) return existing.id
        const id = uid()
        setState((s) => ({ decks: [...s.decks, { id, name }] }))
        return id
      },

      saveCard: (c) =>
        setState((s) =>
          c.id
            ? { cards: s.cards.map((x) => (x.id === c.id ? { ...x, ...c, id: x.id } : x)) }
            : { cards: [...s.cards, { ...c, id: uid(), fsrs: emptyFsrs(), createdAt: today() }] },
        ),
      deleteCard: (id) => setState((s) => ({ cards: s.cards.filter((c) => c.id !== id) })),

      gradeCard: (id, rating) =>
        setState((s) => {
          const card = s.cards.find((c) => c.id === id)
          if (!card) return {}
          const review = { cardId: id, day: today(), rating, wasNew: card.fsrs.state === State.New }
          return {
            cards: s.cards.map((c) => (c.id === id ? { ...c, fsrs: grade(c, rating, new Date()) } : c)),
            reviews: [...s.reviews, review],
          }
        }),

      setWeekly: (week, w) => setState((s) => ({ weekly: { ...s.weekly, [week]: w } })),
      setPhase: (phase, p) => setState((s) => ({ phases: { ...s.phases, [phase]: p } })),
      setSettings: (patch) => setState((s) => ({ settings: { ...s.settings, ...patch } })),

      shiftPlan: (toWeek) =>
        setState((s) => {
          const d = today()
          const fromWeek = positionOf(d, s.settings.planStart)?.week ?? null
          return {
            settings: { ...s.settings, planStart: shiftedStart(d, toWeek) },
            shifts: [...s.shifts, { date: d, fromWeek, toWeek }],
          }
        }),

      replaceData: (d) => setState(d),
    }),
    { name: 'pt-diario', version: 1, storage: createJSONStorage(() => idbStorage) },
  ),
)

/** Partie « données » du store (sans les fonctions), pour l'export. */
export function exportData(): Data {
  const { version, settings, days, tasks, errors, lessons, decks, cards, reviews, weekly, phases, shifts } = useStore.getState()
  return { version, settings, days, tasks, errors, lessons, decks, cards, reviews, weekly, phases, shifts }
}

/** Contrôle minimal d'un fichier importé avant de remplacer les données. */
export function parseImport(text: string): Data {
  const d = JSON.parse(text)
  const arrays = ['errors', 'lessons', 'decks', 'cards', 'reviews', 'shifts']
  const objects = ['days', 'tasks', 'weekly', 'phases']
  const ok =
    d?.version === 1 &&
    typeof d.settings?.planStart === 'string' &&
    arrays.every((k) => Array.isArray(d[k])) &&
    objects.every((k) => d[k] && typeof d[k] === 'object')
  if (!ok) throw new Error("Ce fichier n'est pas une sauvegarde valide de l'appli.")
  return d as Data
}
