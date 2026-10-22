import { createEmptyCard, fsrs, State, type CardInput, type Grade } from 'ts-fsrs'
import type { CardItem, Review } from '../types'

const scheduler = fsrs() // paramètres FSRS par défaut, étapes d'apprentissage courtes activées

export const NEW_PER_DAY = 5
export const SESSION_SECONDS = 600
/** Comme Anki : on montre en avance les cartes dues dans les 20 min (étapes d'apprentissage). */
const LEARN_AHEAD_MS = 20 * 60_000

const json = <T>(v: T): T => JSON.parse(JSON.stringify(v))

export const emptyFsrs = (now = new Date()): CardInput => json(createEmptyCard(now))

export function grade(card: CardItem, rating: Grade, now: Date) {
  return json(scheduler.next(card.fsrs, now, rating).card) as CardInput
}

const isNew = (c: CardItem) => c.fsrs.state === State.New
const dueAt = (c: CardItem) => new Date(c.fsrs.due as string).getTime()

/** File du jour : cartes dues + nouvelles (5 par jour, + `extraNew` si demandé). */
export function dailyQueue(cards: CardItem[], reviews: Review[], now: Date, today: string, extraNew = 0) {
  const introduced = new Set(reviews.filter((r) => r.day === today && r.wasNew).map((r) => r.cardId)).size
  const t = now.getTime()
  const seen = cards.filter((c) => !isNew(c)).sort((a, b) => dueAt(a) - dueAt(b))
  const fresh = cards.filter(isNew).slice(0, Math.max(0, NEW_PER_DAY + extraNew - introduced))
  // Les cartes en apprentissage dues « bientôt » passent après les nouvelles, pour ne pas revenir aussitôt.
  const soon = seen.filter((c) => dueAt(c) > t && dueAt(c) <= t + LEARN_AHEAD_MS)
  return [...seen.filter((c) => dueAt(c) <= t), ...fresh, ...soon]
}

/** Révision anticipée : cartes pas encore vues aujourd'hui, dues dans les 7 jours. */
export function aheadQueue(cards: CardItem[], reviews: Review[], now: Date, today: string) {
  const seen = new Set(reviews.filter((r) => r.day === today).map((r) => r.cardId))
  return cards
    .filter((c) => !isNew(c) && !seen.has(c.id) && dueAt(c) <= now.getTime() + 7 * 86_400_000)
    .sort((a, b) => dueAt(a) - dueAt(b))
}

/** Plus rien à réviser : la file du jour, l'anticipée et les nouvelles sont vides. */
export const nothingLeft = (cards: CardItem[], reviews: Review[], now: Date, today: string) =>
  dailyQueue(cards, reviews, now, today).length === 0 &&
  aheadQueue(cards, reviews, now, today).length === 0 &&
  !cards.some(isNew)

/** Apprise = sortie de la phase d'apprentissage au moins une fois. */
export const learnedCount = (cards: CardItem[]) =>
  cards.filter((c) => c.fsrs.state === State.Review || c.fsrs.state === State.Relearning).length

export function stats(cards: CardItem[], reviews: Review[], now: Date) {
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)
  const ok = reviews.filter((r) => r.rating > 1).length
  return {
    learned: learnedCount(cards),
    due: cards.filter((c) => !isNew(c) && dueAt(c) <= endOfDay.getTime()).length,
    fresh: cards.filter(isNew).length,
    successRate: reviews.length ? Math.round((100 * ok) / reviews.length) : null,
  }
}
