import type { CardInput } from 'ts-fsrs'
import planJson from './plan.json'

// ---- Plan (src/plan.json, modifiable à la main) ----
export const DAY_KEYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'] as const
export type DayKey = (typeof DAY_KEYS)[number]
export const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export type DayTask = { title: string; subtasks: string[] }
export type Week = {
  n: number
  theme: string
  objective: string
  days: Record<DayKey | 'cours2', DayTask>
}
export type Phase = { n: number; title: string; weeks: [number, number] }
export type Plan = { routine: Record<string, string>; phases: Phase[]; weeks: Week[] }

export const plan = planJson as unknown as Plan

// ---- Données de l'utilisateur (stockées en local, exportées en JSON) ----
/** Position dans le plan : semaine 1-12 et jour. */
export type Pos = { week: number; day: DayKey }

export type Settings = {
  /** Lundi de la semaine 1 (YYYY-MM-DD). Change quand on décale le plan. */
  planStart: string
  /** weekday : 0 = lundi … 6 = dimanche ; time : "HH:MM" */
  cours1: { weekday: number; time: string }
  /** weekday null = pas de cours 2 */
  cours2: { weekday: number | null; time: string }
  cal: {
    daily: boolean
    dailyTime: string
    cours: boolean
    coursBefore: number
    bilan: boolean
    bilanTime: string
  }
}

/** Ce qui s'est passé un jour réel (clé = date). */
export type DayLog = {
  /** Position du plan figée le jour même : un décalage ultérieur ne réécrit pas l'historique. */
  pos: Pos | null
  minutes: number
  notes: string
  /** Session de cartes validée (10 min ou plus rien à revoir). */
  cardsOk: boolean
}

/** Avancement d'une tâche du plan (clé = "S1-lun"). */
export type TaskProgress = { checked: string[]; completedOn?: string }

export type ErrorEntry = {
  id: string
  date: string
  wrote: string
  correction: string
  rule: string
  source: 'jour' | 'cours' | 'manuel'
  lessonId?: string
}

export type Lesson = { id: string; date: string; n: 1 | 2; week: number; prepared: string; seen: string }

export type Deck = { id: string; name: string }
export type CardItem = {
  id: string
  deckId: string
  front: string
  back: string
  note: string
  /** État FSRS sérialisé (dates en ISO). */
  fsrs: CardInput
  createdAt: string
}
/** wasNew : la carte était nouvelle (sert à limiter à 5 nouvelles par jour). */
export type Review = { cardId: string; day: string; rating: number; wasNew: boolean }

export type WeeklyReview = { recurring: string; words: [string, string, string]; rating: number }
export type PhaseReview = {
  errorsPer200: string
  jtPercent: string
  c1Used: string
  mockScore: string
  /** Instantané au moment de l'enregistrement. */
  cardsLearned: number
}
export type PlanShift = { date: string; fromWeek: number | null; toWeek: number }

export type Data = {
  version: 1
  settings: Settings
  days: Record<string, DayLog>
  tasks: Record<string, TaskProgress>
  errors: ErrorEntry[]
  lessons: Lesson[]
  decks: Deck[]
  cards: CardItem[]
  reviews: Review[]
  weekly: Record<number, WeeklyReview>
  phases: Record<number, PhaseReview>
  shifts: PlanShift[]
}
