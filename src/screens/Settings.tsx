import { useState } from 'react'
import { DAY_NAMES, plan, type Settings as S } from '../types'
import { fmtDate, iso, today } from '../logic/dates'
import { positionOf } from '../logic/plan'
import { buildIcs, planEvents } from '../logic/ics'
import { exportData, parseImport, useStore } from '../store'
import { saveFile } from '../lib/file'

function DaySelect({ value, onChange, none }: { value: number | null; onChange: (v: number | null) => void; none?: boolean }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}>
      {none && <option value="">Pas de cours 2</option>}
      {DAY_NAMES.map((d, i) => (
        <option key={d} value={i}>
          {d}
        </option>
      ))}
    </select>
  )
}

export function Settings() {
  const { settings, shifts, setSettings, shiftPlan, replaceData } = useStore()
  const current = positionOf(today(), settings.planStart)?.week ?? null
  const [target, setTarget] = useState(current ?? 1)
  const cal = settings.cal
  const setCal = (patch: Partial<S['cal']>) => setSettings({ cal: { ...cal, ...patch } })

  const exportIcs = () => saveFile('portugais.ics', buildIcs(planEvents(settings, today()), new Date()), 'text/calendar')
  const testIcs = () => {
    const at = new Date(Date.now() + 5 * 60_000)
    const time = at.toTimeString().slice(0, 5)
    const ics = buildIcs(
      [{ uid: `test-${Date.now()}`, title: 'Teste — Força! (PT diário)', description: 'Notification de test', date: iso(at), time, durationMin: 5, alarm: '-PT0M' }],
      new Date(),
    )
    saveFile('test-notification.ics', ics, 'text/calendar')
  }

  const importJson = async (file?: File) => {
    if (!file) return
    try {
      const data = parseImport(await file.text())
      if (confirm('Remplacer toutes les données actuelles par cette sauvegarde ?')) replaceData(data)
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <>
      <section className="card">
        <h2>Plan</h2>
        <p>
          Semaine 1 commençant le <b>{fmtDate(settings.planStart)}</b>.{' '}
          {current ? (
            <>
              Aujourd'hui : <b>semaine {current}</b>.
            </>
          ) : (
            "Aujourd'hui est hors des 12 semaines."
          )}
        </p>
        <div className="row">
          <select value={target} onChange={(e) => setTarget(Number(e.target.value))} aria-label="Semaine de reprise">
            {plan.weeks.map((w) => (
              <option key={w.n} value={w.n}>
                S{w.n} — {w.theme}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (confirm(`Reprendre le plan à la semaine ${target} à partir de cette semaine ? L'historique est conservé.`)) shiftPlan(target)
            }}
          >
            Reprendre ici
          </button>
        </div>
        {shifts.length > 0 && (
          <ul className="muted">
            {shifts.map((s, i) => (
              <li key={i}>
                {s.date} : semaine {s.fromWeek ?? '–'} → {s.toWeek}
              </li>
            ))}
          </ul>
        )}
        <p className="muted">Après un décalage, regénère le calendrier ci-dessous.</p>
      </section>

      <section className="card">
        <h2>Cours avec Fábio</h2>
        <div className="row">
          <span>Cours 1</span>
          <DaySelect value={settings.cours1.weekday} onChange={(v) => setSettings({ cours1: { ...settings.cours1, weekday: v ?? 2 } })} />
          <input type="time" value={settings.cours1.time} onChange={(e) => setSettings({ cours1: { ...settings.cours1, time: e.target.value } })} />
        </div>
        <div className="row">
          <span>Cours 2</span>
          <DaySelect none value={settings.cours2.weekday} onChange={(v) => setSettings({ cours2: { ...settings.cours2, weekday: v } })} />
          {settings.cours2.weekday !== null && (
            <input type="time" value={settings.cours2.time} onChange={(e) => setSettings({ cours2: { ...settings.cours2, time: e.target.value } })} />
          )}
        </div>
      </section>

      <section className="card">
        <h2>Rappels (calendrier du téléphone)</h2>
        <p className="muted">
          Les rappels passent par l'appli Calendrier : ils arrivent même appli fermée et hors ligne. Importe le fichier dans un calendrier dédié
          « Portugais » (voir le README).
        </p>
        <label className="check">
          <input type="checkbox" checked={cal.daily} onChange={(e) => setCal({ daily: e.target.checked })} />
          <span>Tâche du jour, alerte à</span>
          <input type="time" value={cal.dailyTime} onChange={(e) => setCal({ dailyTime: e.target.value })} />
        </label>
        <label className="check">
          <input type="checkbox" checked={cal.cours} onChange={(e) => setCal({ cours: e.target.checked })} />
          <span>Cours avec Fábio, alerte</span>
          <input type="number" min={0} value={cal.coursBefore} onChange={(e) => setCal({ coursBefore: Number(e.target.value) || 0 })} />
          <span>min avant</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={cal.bilan} onChange={(e) => setCal({ bilan: e.target.checked })} />
          <span>Bilan du dimanche à</span>
          <input type="time" value={cal.bilanTime} onChange={(e) => setCal({ bilanTime: e.target.value })} />
        </label>
        <button className="wide" onClick={exportIcs}>
          📅 Générer / regénérer le calendrier (.ics)
        </button>
        <button className="wide secondary" onClick={testIcs}>
          Tester la notification (événement dans 5 min)
        </button>
      </section>

      <section className="card">
        <h2>Sauvegarde</h2>
        <button className="wide" onClick={() => saveFile(`pt-diario-${today()}.json`, JSON.stringify(exportData(), null, 1), 'application/json')}>
          Exporter mes données (JSON)
        </button>
        <label className="wide button secondary">
          Importer une sauvegarde…
          <input type="file" accept="application/json,.json" hidden onChange={(e) => importJson(e.target.files?.[0])} />
        </label>
      </section>
    </>
  )
}
