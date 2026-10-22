import { DAY_NAMES, type Settings } from '../types'
import { addDays, diffDays, parse } from './dates'
import { isPhaseWeek, positionOf, taskFor, weekOf } from './plan'

export type IcsEvent = {
  uid: string
  title: string
  description: string
  date: string
  /** "HH:MM", heure locale */
  time: string
  durationMin?: number
  /** Valeur TRIGGER de l'alerte : "-PT0M" (à l'heure) ou "-PT30M" (30 min avant). */
  alarm: string
}

export const PT_MESSAGES = [
  'Vamos lá!',
  'Força!',
  'Hoje é dia de português.',
  'Devagar se vai ao longe.',
  'Passo a passo!',
  'Quem não arrisca não petisca.',
  'Mais vale tarde do que nunca.',
]

const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

/** Plie les lignes à 75 octets (RFC 5545) sans couper un caractère UTF-8. */
function fold(line: string) {
  const enc = new TextEncoder()
  const out: string[] = []
  let cur = ''
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) {
      out.push(cur)
      cur = ''
    }
    cur += ch
  }
  out.push(cur)
  return out.join('\r\n ')
}

const hm = (t: string) => t.split(':').map(Number)

/** Heure "flottante" (sans fuseau) : l'iPhone l'interprète dans son fuseau local. */
function localStamp(date: string, time: string, addMin = 0) {
  const [h, m] = hm(time)
  const d = parse(date)
  d.setHours(h, m + addMin)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`
}

export function buildIcs(events: IcsEvent[], stamp: Date) {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PT diario//FR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Portugais']
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}@pt-diario`, `DTSTAMP:${dtstamp}`)
    lines.push(`DTSTART:${localStamp(e.date, e.time)}`, `DTEND:${localStamp(e.date, e.time, e.durationMin ?? 30)}`)
    lines.push(`SUMMARY:${escape(e.title)}`, `DESCRIPTION:${escape(e.description)}`)
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escape(e.title)}`, `TRIGGER:${e.alarm}`, 'END:VALARM', 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** Événements de `from` jusqu'à la fin de la semaine 12. */
export function planEvents(s: Settings, from: string): IcsEvent[] {
  const events: IcsEvent[] = []
  const end = addDays(s.planStart, 7 * 12 - 1)
  const start = diffDays(from, s.planStart) > 0 ? from : s.planStart
  for (let date = start; diffDays(end, date) >= 0; date = addDays(date, 1)) {
    const pos = positionOf(date, s.planStart)!
    const w = weekOf(pos.week)
    const wd = diffDays(date, s.planStart) % 7
    const task = taskFor(pos, s)

    if (s.cal.daily) {
      const testBlanc = wd === 0 && isPhaseWeek(pos.week) ? 'Test blanc cette semaine · ' : ''
      events.push({
        uid: `jour-${date}`,
        title: `${PT_MESSAGES[diffDays(date, s.planStart) % PT_MESSAGES.length]} ${testBlanc}${task.title}`,
        description: `Semaine ${pos.week} — ${w.theme}\n${DAY_NAMES[wd]} :\n${task.subtasks.map((t) => `• ${t}`).join('\n')}`,
        date,
        // Événement à heure fixe (pas « journée entière ») : visible à l'heure du rappel dans l'agenda.
        time: s.cal.dailyTime,
        durationMin: 30,
        alarm: '-PT0M',
      })
    }
    if (s.cal.cours) {
      const lessons = [
        { n: 1, weekday: s.cours1.weekday, time: s.cours1.time, prep: w.days.mer.title },
        { n: 2, weekday: s.cours2.weekday, time: s.cours2.time, prep: w.days.cours2.title },
      ]
      for (const l of lessons.filter((l) => l.weekday === wd)) {
        events.push({
          uid: `cours${l.n}-${date}`,
          title: `Cours ${l.n} avec Fábio`,
          description: `À préparer : ${l.prep}`,
          date,
          time: l.time,
          durationMin: 50,
          alarm: `-PT${s.cal.coursBefore}M`,
        })
      }
    }
    if (s.cal.bilan && wd === 6) {
      events.push({
        uid: `bilan-${date}`,
        title: isPhaseWeek(pos.week) ? `Bilan de phase (semaine ${pos.week})` : `Bilan de la semaine ${pos.week}`,
        description: 'Fautes récurrentes, 3 mots appris, note sur 5. Pense à exporter tes données (Réglages).',
        date,
        time: s.cal.bilanTime,
        durationMin: 20,
        alarm: '-PT0M',
      })
    }
  }
  return events
}
