// Lecture des notes de cours, sans IA, avec des règles simples (celles de tes carnets) :
//   comboio = train                 → carte (portugais = français)
//   mais bom → melhor (comparatif)  → faute (faux → correct, règle entre parenthèses ou après « : »)
//   # Grammaire   ou   Grammaire :   → nouvelle section
//   tout le reste                    → note dans la section en cours
export type ParsedNotes = {
  cards: { front: string; back: string }[]
  errors: { wrote: string; correction: string; rule: string }[]
  sections: { title: string; items: string[] }[]
}

const ARROW = /\s*(?:→|->|=>)\s*/

export function parseNotes(text: string): ParsedNotes {
  const out: ParsedNotes = { cards: [], errors: [], sections: [] }
  let section = { title: 'Notes', items: [] as string[] }
  out.sections.push(section)

  for (const raw of text.split('\n')) {
    const line = raw.replace(/^\s*[-•*·]\s+/, '').trim()
    if (!line) continue

    const heading = raw.trim().match(/^#+\s*(.+)$/) ?? line.match(/^([^=→>:]{2,40}):$/)
    if (heading) {
      section = { title: heading[1].trim(), items: [] }
      out.sections.push(section)
      continue
    }

    const arrow = line.match(ARROW)
    if (arrow && arrow.index! > 0) {
      const wrote = line.slice(0, arrow.index).replace(/[✗❌]/g, '').trim()
      const rest = line.slice(arrow.index! + arrow[0].length)
      const [, correction, r1, r2] = rest.match(/^(.*?)\s*(?:\((.+)\)|:\s+(.+))?$/)!
      if (wrote && correction) {
        out.errors.push({ wrote, correction: correction.trim(), rule: (r1 ?? r2 ?? '').trim() })
        continue
      }
    }

    const eq = line.match(/^(.+?)\s*=\s*(.+)$/)
    if (eq) {
      out.cards.push({ front: eq[2].trim(), back: eq[1].trim() })
      continue
    }
    section.items.push(line)
  }
  out.sections = out.sections.filter((s) => s.items.length)
  return out
}
