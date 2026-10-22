import { useState } from 'react'
import { today } from '../logic/dates'
import { positionOf } from '../logic/plan'
import { useStore } from '../store'
import { useUi, type CardDraft, type ErrorDraft } from '../ui'

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={(e) => e.preventDefault()}>
        <header className="row">
          <h2>{title}</h2>
          <button type="button" className="ghost" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>
        {children}
      </form>
    </div>
  )
}

function ErrorModal({ draft }: { draft: ErrorDraft }) {
  const { saveError } = useStore()
  const { close, openCard } = useUi()
  const [e, setE] = useState({ date: today(), wrote: '', correction: '', rule: '', source: 'manuel' as const, ...draft })
  const field = (k: 'wrote' | 'correction' | 'rule') => ({
    value: e[k],
    onChange: (ev: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => setE({ ...e, [k]: ev.target.value }),
  })
  const save = (thenCard: boolean) => {
    if (!e.wrote.trim() && !e.correction.trim()) return
    saveError(e)
    if (thenCard) openCard({ front: `Corrige : ${e.wrote}`, back: e.correction, note: e.rule, deckName: "Journal d'erreurs" })
    else close()
  }
  return (
    <Sheet title={draft.id ? 'Modifier la faute' : 'Nouvelle faute'} onClose={close}>
      <label>
        Date
        <input type="date" value={e.date} onChange={(ev) => setE({ ...e, date: ev.target.value })} />
      </label>
      <label>
        Ce que j'ai écrit / dit
        <textarea rows={2} {...field('wrote')} autoFocus />
      </label>
      <label>
        Correction
        <textarea rows={2} {...field('correction')} />
      </label>
      <label>
        Règle
        <input {...field('rule')} placeholder="ex. -ámos au perfeito des verbes en -ar" />
      </label>
      <div className="row">
        <button type="submit" onClick={() => save(false)}>
          Enregistrer
        </button>
        <button type="button" className="secondary" onClick={() => save(true)}>
          Enregistrer + carte
        </button>
      </div>
    </Sheet>
  )
}

function CardModal({ draft }: { draft: CardDraft }) {
  const { decks, settings, saveCard, addDeck } = useStore()
  const { close } = useUi()
  const week = positionOf(today(), settings.planStart)?.week
  const defaultName = draft.deckName ?? (week ? `Semaine ${week}` : 'Divers')
  const [c, setC] = useState({ front: '', back: '', note: '', ...draft })
  const [deck, setDeck] = useState(draft.deckId ?? decks.find((d) => d.name === defaultName)?.id ?? '__new')
  const [newName, setNewName] = useState(defaultName)
  const save = () => {
    if (!c.front.trim() || !c.back.trim()) return
    const deckId = deck === '__new' ? addDeck(newName.trim() || 'Divers') : deck
    saveCard({ id: c.id, deckId, front: c.front.trim(), back: c.back.trim(), note: c.note.trim() })
    close()
  }
  return (
    <Sheet title={c.id ? 'Modifier la carte' : 'Nouvelle carte'} onClose={close}>
      <label>
        Recto (français)
        <textarea rows={2} value={c.front} onChange={(e) => setC({ ...c, front: e.target.value })} autoFocus />
      </label>
      <label>
        Verso (português europeu)
        <textarea rows={2} lang="pt-PT" value={c.back} onChange={(e) => setC({ ...c, back: e.target.value })} />
      </label>
      <label>
        Note (règle, exemple) — optionnelle
        <input value={c.note} onChange={(e) => setC({ ...c, note: e.target.value })} />
      </label>
      <label>
        Paquet
        <select value={deck} onChange={(e) => setDeck(e.target.value)}>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
          <option value="__new">+ Nouveau paquet…</option>
        </select>
      </label>
      {deck === '__new' && (
        <label>
          Nom du nouveau paquet
          <input value={newName} onChange={(e) => setNewName(e.target.value)} />
        </label>
      )}
      <button type="submit" onClick={save}>
        Enregistrer la carte
      </button>
    </Sheet>
  )
}

export function Modals() {
  const { errorDraft, cardDraft } = useUi()
  if (errorDraft) return <ErrorModal draft={errorDraft} />
  if (cardDraft) return <CardModal draft={cardDraft} />
  return null
}
