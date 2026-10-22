import data from '../exercises.json'
import type { CardItem, ErrorEntry } from '../types'

// Exercices auto-corrigés : conjugaison et phrases (src/exercises.json), cartes et journal d'erreurs.
export type Question = { kind: 'conj' | 'phrase' | 'carte' | 'faute'; prompt: string; hint: string; answers: string[]; rule: string }
export type Verdict = 'ok' | 'accents' | 'faux'

type Tense = { name: string; weeks: number[]; verbs: Record<string, string[]> }
type Sentence = { weeks: number[]; rule: string; prompt: string; answers: string[] }
const tenses = data.tenses as unknown as Tense[]
const sentences = data.sentences as Sentence[]

/** Casse, espaces, ponctuation et guillemets ignorés ; tirets unifiés (vi-o). */
export const normalize = (s: string) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‐‑–—]/g, '-')
    .replace(/[«»"“”.!?¡¿,;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const noAccents = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '')

/** « accents » : juste à un accent près, compté faux mais signalé. */
export function check(input: string, answers: string[]): Verdict {
  const got = normalize(input)
  if (answers.some((a) => normalize(a) === got)) return 'ok'
  if (got && answers.some((a) => noAccents(normalize(a)) === noAccents(got))) return 'accents'
  return 'faux'
}

const pick = <T>(list: T[], n: number, rand: () => number) => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

/** Toutes les questions de conjugaison des temps donnés (la réponse avec le pronom est aussi acceptée). */
function conjugations(list: Tense[]): Question[] {
  return list.flatMap((t) =>
    Object.entries(t.verbs).flatMap(([verb, forms]) =>
      forms.map((form, i) => {
        const person = data.persons[i]
        return {
          kind: 'conj' as const,
          prompt: `${verb} — ${person}`,
          hint: t.name,
          answers: [form, ...person.split(' / ').map((p) => `${p} ${form}`)],
          rule: `${t.name} : ${verb} (${person}) = ${form}`,
        }
      }),
    ),
  )
}

/** Séance de `n` questions pour la semaine : temps et phrases de la semaine, révision des semaines passées, cartes, fautes. */
export function buildSession(week: number, cards: CardItem[], errors: ErrorEntry[], rand = Math.random, n = 10): Question[] {
  const current = conjugations(tenses.filter((t) => t.weeks.includes(week)))
  const review = conjugations(tenses.filter((t) => t.weeks[0] < week && !t.weeks.includes(week)))
  const phrases: Question[] = sentences
    .filter((s) => s.weeks.includes(week))
    .map((s) => ({ kind: 'phrase', prompt: s.prompt, hint: s.rule, answers: s.answers, rule: s.rule }))
  const fromCards: Question[] = cards.map((c) => ({
    kind: 'carte',
    prompt: c.front,
    hint: 'Traduis en portugais européen',
    answers: [c.back],
    rule: c.note || `Traduction : ${c.front} → ${c.back}`,
  }))
  const fromErrors: Question[] = errors
    .filter((e) => e.correction)
    .map((e) => ({ kind: 'faute', prompt: e.wrote, hint: `Corrige — ${e.rule || 'ta faute du journal'}`, answers: [e.correction], rule: e.rule || 'Faute du journal' }))

  const chosen = [...pick(phrases, 3, rand), ...pick(fromCards, 2, rand), ...pick(fromErrors, 2, rand)]
  // Le reste en conjugaison : surtout la semaine, un peu de révision.
  const conj = [...pick(current, n - chosen.length - 1, rand), ...pick(review, 1, rand)]
  const fill = [...conj, ...pick(current, n, rand), ...pick(review, n, rand), ...pick(phrases, n, rand)]
  const unique = [...new Map([...chosen, ...fill].map((q) => [q.prompt + q.hint, q])).values()]
  return pick(unique.slice(0, n), n, rand)
}
