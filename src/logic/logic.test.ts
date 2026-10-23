import { describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import { defaultSettings } from '../seed'
import { DAY_KEYS, plan, type CardItem, type DayLog, type TaskProgress } from '../types'
import { addDays, diffDays, weekdayIdx } from './dates'
import { catchUp, positionOf, shiftedStart, taskFor, taskKey } from './plan'
import { bestStreak, currentStreak, statusOf } from './streak'
import { aheadQueue, dailyQueue, emptyFsrs, grade, nothingLeft } from './cards'
import { buildIcs, planEvents } from './ics'

const S = defaultSettings

describe('plan.json', () => {
  it('a 12 semaines complètes avec des sous-tâches uniques', () => {
    expect(plan.weeks.map((w) => w.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    for (const w of plan.weeks)
      for (const k of [...DAY_KEYS, 'cours2'] as const) {
        const subs = w.days[k].subtasks
        expect(subs.length, `S${w.n} ${k}`).toBeGreaterThan(0)
        expect(new Set(subs).size).toBe(subs.length)
      }
  })
})

describe('calcul de la semaine', () => {
  it('le lundi 19 octobre 2026 est S1 lundi, le 26 est S2 lundi', () => {
    expect(positionOf('2026-10-19', S.planStart)).toEqual({ week: 1, day: 'lun' })
    expect(positionOf('2026-10-25', S.planStart)).toEqual({ week: 1, day: 'dim' })
    expect(positionOf('2026-10-26', S.planStart)).toEqual({ week: 2, day: 'lun' })
  })
  it('traverse le passage à l’heure d’hiver (25/10) sans décalage', () => {
    expect(diffDays('2026-10-26', '2026-10-25')).toBe(1)
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })
  it('renvoie null avant le début et après la semaine 12', () => {
    expect(positionOf('2026-10-18', S.planStart)).toBeNull()
    expect(positionOf(addDays(S.planStart, 83), S.planStart)).toEqual({ week: 12, day: 'dim' })
    expect(positionOf(addDays(S.planStart, 84), S.planStart)).toBeNull()
  })
  it('ajoute le cours 2 en sous-tâche le jour choisi', () => {
    const s = { ...S, cours2: { weekday: 3, time: '18:00' } }
    const t = taskFor({ week: 1, day: 'jeu' }, s)
    expect(t.subtasks.at(-1)).toBe('Cours 2 : correction du texte + récit au passé')
    expect(taskFor({ week: 1, day: 'jeu' }, S).subtasks).not.toContain(t.subtasks.at(-1))
  })
})

describe('décalage du plan', () => {
  it('« reprends à la semaine 2 » un jeudi de semaine 4', () => {
    const today = '2026-11-12' // jeudi, S4
    expect(positionOf(today, S.planStart)?.week).toBe(4)
    const start = shiftedStart(today, 2)
    expect(weekdayIdx(start)).toBe(0)
    expect(positionOf(today, start)).toEqual({ week: 2, day: 'jeu' })
  })
  it('ne réécrit pas l’historique (position figée dans le DayLog)', () => {
    const days: Record<string, DayLog> = { '2026-10-20': { pos: { week: 1, day: 'mar' }, minutes: 0, notes: '', cardsOk: false } }
    const tasks = { 'S1-mar': { checked: [], completedOn: '2026-10-20' } }
    expect(statusOf('2026-10-20', days, tasks)).toBe('complet')
    // après décalage, la position recalculée serait différente, mais le statut reste celui du jour
    expect(positionOf('2026-10-20', shiftedStart('2026-10-20', 3))?.week).toBe(3)
    expect(statusOf('2026-10-20', days, tasks)).toBe('complet')
  })
})

describe('série', () => {
  const log = (week: number, day: (typeof DAY_KEYS)[number], cardsOk = false): DayLog => ({ pos: { week, day }, minutes: 0, notes: '', cardsOk })
  const days = {
    '2026-10-19': log(1, 'lun'),
    '2026-10-20': log(1, 'mar', true),
    '2026-10-21': log(1, 'mer'),
    '2026-10-23': log(1, 'ven', true),
  }
  const tasks: Record<string, TaskProgress> = {
    'S1-lun': { checked: [], completedOn: '2026-10-19' },
    'S1-mer': { checked: [], completedOn: '2026-10-21' },
  }
  it('complet / minimum / vide', () => {
    expect(statusOf('2026-10-19', days, tasks)).toBe('complet')
    expect(statusOf('2026-10-20', days, tasks)).toBe('minimum')
    expect(statusOf('2026-10-22', days, tasks)).toBeNull()
  })
  it('aujourd’hui non validé ne casse pas la série', () => {
    expect(currentStreak('2026-10-22', days, tasks)).toBe(3)
    expect(currentStreak('2026-10-23', days, tasks)).toBe(1)
    expect(currentStreak('2026-10-25', days, tasks)).toBe(0)
    expect(bestStreak(days, tasks)).toBe(3)
  })
  it('un rattrapage ne répare pas la série mais compte pour le jour où il est fait', () => {
    const t2 = { ...tasks, 'S1-jeu': { checked: [], completedOn: '2026-10-24' } }
    expect(statusOf('2026-10-22', days, t2)).toBeNull()
    expect(statusOf('2026-10-24', days, t2)).toBe('minimum')
  })
})

describe('rattrapage', () => {
  it('ne propose que les jours passés non faits de la semaine en cours', () => {
    const tasks = { [taskKey({ week: 2, day: 'lun' })]: { checked: taskFor({ week: 2, day: 'lun' }, S).subtasks } }
    // mercredi de S2 : lundi fait, mardi raté ; rien de la semaine 1
    expect(catchUp('2026-10-28', S, tasks)).toEqual([{ week: 2, day: 'mar' }])
    expect(catchUp('2026-10-26', S, {})).toEqual([])
  })
})

describe('cartes', () => {
  const now = new Date('2026-10-22T10:00:00')
  const mk = (i: number): CardItem => ({ id: `c${i}`, deckId: 'd', front: '', back: '', note: '', fsrs: emptyFsrs(now), createdAt: '' })
  it('5 nouvelles maximum par jour, plus les extras demandés', () => {
    const cards = Array.from({ length: 12 }, (_, i) => mk(i))
    expect(dailyQueue(cards, [], now, '2026-10-22')).toHaveLength(5)
    const reviews = cards.slice(0, 5).map((c) => ({ cardId: c.id, day: '2026-10-22', rating: 3, wasNew: true }))
    expect(dailyQueue(cards.slice(5), reviews, now, '2026-10-22')).toHaveLength(0)
    expect(dailyQueue(cards.slice(5), reviews, now, '2026-10-22', 5)).toHaveLength(5)
  })
  it('une carte en apprentissage ne revient pas avant les autres nouvelles', () => {
    const graded = { ...mk(0), fsrs: grade(mk(0), Rating.Good, now) }
    const reviews = [{ cardId: graded.id, day: '2026-10-22', rating: 3, wasNew: true }]
    const q = dailyQueue([graded, mk(1), mk(2)], reviews, now, '2026-10-22')
    expect(q.map((c) => c.id)).toEqual(['c1', 'c2', 'c0'])
  })
  it('FSRS : « Facile » repousse plus loin que « À revoir »', () => {
    const c = mk(0)
    const again = new Date(grade(c, Rating.Again, now).due as string)
    const easy = new Date(grade(c, Rating.Easy, now).due as string)
    expect(easy.getTime()).toBeGreaterThan(again.getTime())
  })
  it('« plus rien » quand toutes les cartes sont vues et pas dues', () => {
    const c = { ...mk(0), fsrs: grade(mk(0), Rating.Easy, now) }
    const reviews = [{ cardId: c.id, day: '2026-10-22', rating: 4, wasNew: true }]
    expect(aheadQueue([c], reviews, now, '2026-10-22')).toHaveLength(0)
    expect(nothingLeft([c], reviews, now, '2026-10-22')).toBe(true)
    expect(nothingLeft([mk(1)], [], now, '2026-10-22')).toBe(false)
  })
})

describe('calendrier .ics', () => {
  it('un événement par jour + cours du mercredi + bilan du dimanche', () => {
    const ev = planEvents(S, '2026-10-22')
    const days = ev.filter((e) => e.uid.startsWith('jour-'))
    expect(days).toHaveLength(84 - 3) // du jeudi 22/10 au dimanche de S12
    expect(ev.filter((e) => e.uid.startsWith('cours1-'))).toHaveLength(11)
    expect(ev.filter((e) => e.uid.startsWith('bilan-'))).toHaveLength(12)
    expect(ev.find((e) => e.uid === 'bilan-2026-11-15')?.title).toBe('Bilan de phase (semaine 4)')
    expect(ev.find((e) => e.uid === 'jour-2026-11-09')?.title).toContain('Test blanc cette semaine')
    expect(ev.find((e) => e.uid === 'jour-2026-10-22')).toMatchObject({ time: S.cal.dailyTime, alarm: '-PT0M' })
  })
  it('format RFC 5545 : CRLF, échappement, lignes ≤ 75 octets', () => {
    const txt = buildIcs(
      [{ uid: 'x', title: 'Cours, avec; Fábio', description: 'a\nb', date: '2026-10-21', time: '18:00', durationMin: 50, alarm: '-PT30M' }],
      new Date('2026-10-22T10:00:00Z'),
    )
    expect(txt).toContain('SUMMARY:Cours\\, avec\\; Fábio\r\n')
    expect(txt).toContain('DTSTART:20261021T180000\r\nDTEND:20261021T185000')
    expect(txt).toContain('TRIGGER:-PT30M')
    const long = buildIcs(planEvents(S, '2026-10-22'), new Date())
    for (const line of long.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
  })
})

describe('exercices', () => {
  it('correction tolérante (casse, ponctuation, pronom) mais stricte sur les accents', async () => {
    const { check } = await import('./exercises')
    expect(check('  Vi-o ', ['Vi-o.'])).toBe('ok')
    expect(check('« Dei-lho »', ['Dei-lho.'])).toBe('ok')
    expect(check('falamos', ['falámos'])).toBe('accents')
    expect(check('falei', ['falámos'])).toBe('faux')
    expect(check('', ['x'])).toBe('faux')
  })
  it('séance de 10 questions centrée sur le temps de la semaine', async () => {
    const { buildSession } = await import('./exercises')
    let seed = 1
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const q = buildSession(1, [], [], rand)
    expect(q).toHaveLength(10)
    expect(q.filter((x) => x.hint === 'Pretérito perfeito').length).toBeGreaterThanOrEqual(5)
    const fazer = buildSession(1, [], [], rand, 400).find((x) => x.prompt === 'fazer — eu' && x.hint === 'Pretérito perfeito')
    expect(fazer?.answers).toContain('eu fiz')
    // semaine 3 : phrases de pronoms + révision du perfeito/imperfeito
    const s3 = buildSession(3, [], [], rand)
    expect(s3.some((x) => x.kind === 'phrase')).toBe(true)
    expect(s3).toHaveLength(10)
  })
})

describe('notes de cours', () => {
  it('repère cartes, fautes et sections comme dans le carnet', async () => {
    const { parseNotes } = await import('./lessonNotes')
    const p = parseNotes(`Comboio = train
- mais bom ✗ → melhor (comparatif irrégulier)
fazer uma visita -> visitar : calque du français
# Grammaire
-ámos au perfeito des verbes en -ar
à tarde ≠ tarde
Vocabulaire :
• alugar = louer`)
    expect(p.cards).toEqual([
      { front: 'train', back: 'Comboio' },
      { front: 'louer', back: 'alugar' },
    ])
    expect(p.errors).toEqual([
      { wrote: 'mais bom', correction: 'melhor', rule: 'comparatif irrégulier' },
      { wrote: 'fazer uma visita', correction: 'visitar', rule: 'calque du français' },
    ])
    expect(p.sections).toEqual([{ title: 'Grammaire', items: ['-ámos au perfeito des verbes en -ar', 'à tarde ≠ tarde'] }])
  })
})
