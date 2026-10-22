import { useState } from 'react'
import { DAY_NAMES, plan } from '../types'
import { fmtDate, iso, today } from '../logic/dates'
import { positionOf } from '../logic/plan'
import { buildIcs } from '../logic/ics'
import { exportData, parseImport, useStore } from '../store'
import { saveFile } from '../lib/file'
import { PageHead } from '../components/Bits'

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
  // webcal:// ouvre directement l'abonnement dans l'appli Calendrier.
  const subscribeUrl = new URL('calendrier.ics', location.href).href.replace(/^https?:/, 'webcal:')
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
      <PageHead title="Réglages" />
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
        <p className="muted">
          Après un décalage, mets aussi <code>planStart</code> à <b>{settings.planStart}</b> dans <code>src/calendar.json</code> et lance{' '}
          <code>npm run deploy</code> : le calendrier abonné suivra.
        </p>
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
          Abonne ton iPhone au calendrier publié avec l'appli : les rappels arrivent même appli fermée, et il se met à jour tout seul.
        </p>
        <a className="wide button" href={subscribeUrl}>
          📅 S'abonner au calendrier
        </a>
        <ol className="muted small-list">
          <li>Touche « S'abonner », puis encore « S'abonner ».</li>
          <li>
            <b>Désactive « Supprimer les alertes »</b>, sinon aucune notification.
          </li>
          <li>Touche « Ajouter ».</li>
        </ol>
        <p className="muted">
          Horaires et date de début du calendrier : fichier <code>src/calendar.json</code> du dépôt, puis <code>npm run deploy</code>.
        </p>
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
