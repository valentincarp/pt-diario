// Dates manipulées en chaînes locales "YYYY-MM-DD" : pas de fuseau, pas de piège à l'heure d'été.

const pad = (n: number) => String(n).padStart(2, '0')

export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const today = () => iso(new Date())

export const addDays = (s: string, n: number) => {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

/** a − b en jours (calcul en UTC pour ignorer les changements d'heure). */
export const diffDays = (a: string, b: string) => {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db)) / 86_400_000)
}

/** 0 = lundi … 6 = dimanche */
export const weekdayIdx = (s: string) => (parse(s).getDay() + 6) % 7

export const mondayOf = (s: string) => addDays(s, -weekdayIdx(s))

export const fmtDate = (s: string) =>
  parse(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
