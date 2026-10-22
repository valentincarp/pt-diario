import { useEffect, useRef, useState } from 'react'
import { Rating, State, type Grade } from 'ts-fsrs'
import { today } from '../logic/dates'
import { aheadQueue, dailyQueue, nothingLeft, SESSION_SECONDS, stats } from '../logic/cards'
import { useStore } from '../store'
import { useUi } from '../ui'

const GRADES: [Grade, string][] = [
  [Rating.Again, 'À revoir'],
  [Rating.Hard, 'Difficile'],
  [Rating.Good, 'Bien'],
  [Rating.Easy, 'Facile'],
]

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Session plein écran : file du jour, minuteur de 10 min, validation automatique de « Anki ». */
export function Session() {
  const { cards, reviews, days, gradeCard, validateCards, addMinutes } = useStore()
  const setSession = useUi((u) => u.setSession)
  const [mode, setMode] = useState<'jour' | 'avance'>('jour')
  const [extra, setExtra] = useState(0)
  const [shown, setShown] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(0)
  const elapsedRef = useRef(0)
  elapsedRef.current = elapsed

  const d = today()
  const now = new Date()
  const daily = dailyQueue(cards, reviews, now, d, extra)
  const ahead = aheadQueue(cards, reviews, now, d)
  const queue = mode === 'avance' ? ahead : daily
  const card = queue[0]
  const validated = days[d]?.cardsOk ?? false
  const empty = done > 0 && nothingLeft(cards, reviews, now, d)

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!validated && (elapsed >= SESSION_SECONDS || empty)) validateCards()
  }, [elapsed, empty, validated, validateCards])

  const finish = () => {
    addMinutes(d, Math.round(elapsedRef.current / 60))
    setSession(false)
  }

  const rate = (g: Grade) => {
    gradeCard(card.id, g)
    setShown(false)
    setDone((n) => n + 1)
  }

  return (
    <div className="session">
      <header className="row">
        <span className={`timer ${elapsed >= SESSION_SECONDS ? 'ok' : ''}`}>
          ⏱ {mmss(elapsed)} / {mmss(SESSION_SECONDS)}
        </span>
        <span className="muted">{queue.length} restante(s)</span>
        <button className="ghost" onClick={finish}>
          Terminer
        </button>
      </header>
      {validated && <p className="badge complet">✓ Cartes du jour validées : la série est sauvée</p>}

      {card ? (
        <div className="flash">
          <small className="muted">{card.fsrs.state === State.New ? 'Nouvelle' : 'Révision'}</small>
          <p className="front">{card.front}</p>
          {shown ? (
            <>
              <p className="back" lang="pt-PT">
                {card.back}
              </p>
              {card.note && <p className="muted">{card.note}</p>}
              <div className="grades">
                {GRADES.map(([g, label]) => (
                  <button key={g} className={`grade g${g}`} onClick={() => rate(g)}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button className="reveal" onClick={() => setShown(true)}>
              Afficher la réponse
            </button>
          )}
        </div>
      ) : (
        <div className="flash">
          {nothingLeft(cards, reviews, now, d) ? (
            <p>Plus rien à réviser pour l'instant. Crée de nouvelles cartes depuis tes notes ou ton journal !</p>
          ) : (
            <>
              <p>{mode === 'jour' ? 'File du jour terminée.' : 'Révision anticipée terminée.'} Continuer ?</p>
              <div className="row wrap">
                {mode === 'avance' && daily.length > 0 && <button onClick={() => setMode('jour')}>Cartes du jour ({daily.length})</button>}
                {ahead.length > 0 && mode === 'jour' && (
                  <button onClick={() => setMode('avance')}>Révision anticipée ({ahead.length})</button>
                )}
                {cards.some((c) => c.fsrs.state === State.New) && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setExtra((x) => x + 5)
                      setMode('jour')
                    }}
                  >
                    + 5 nouvelles
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function Cards() {
  const { cards, reviews, decks, deleteCard, addDeck } = useStore()
  const { setSession, openCard } = useUi()
  const st = stats(cards, reviews, new Date())
  const d = today()
  const queue = dailyQueue(cards, reviews, new Date(), d)
  const newCount = queue.filter((c) => c.fsrs.state === State.New).length

  return (
    <>
      <section className="card">
        <div className="stats">
          <div>
            <b>{st.learned}</b>
            <small>apprises</small>
          </div>
          <div>
            <b>{st.due}</b>
            <small>dues aujourd'hui</small>
          </div>
          <div>
            <b>{st.successRate ?? '–'}%</b>
            <small>réussite</small>
          </div>
        </div>
        <button className="wide" onClick={() => setSession(true)}>
          Session du jour · {queue.length - newCount} à revoir + {newCount} nouvelles
        </button>
      </section>

      <section className="card">
        <div className="row">
          <h2>Paquets</h2>
          <div className="row">
            <button
              className="small secondary"
              onClick={() => {
                const name = prompt('Nom du paquet (ex. Verbes irréguliers, Liste C1)')
                if (name?.trim()) addDeck(name.trim())
              }}
            >
              + paquet
            </button>
            <button className="small" onClick={() => openCard()}>
              + carte
            </button>
          </div>
        </div>
        {decks.map((deck) => {
          const inDeck = cards.filter((c) => c.deckId === deck.id)
          return (
            <details key={deck.id}>
              <summary>
                {deck.name} <small className="muted">· {inDeck.length} cartes</small>
              </summary>
              <ul className="cardlist">
                {inDeck.map((c) => (
                  <li key={c.id}>
                    <span>
                      {c.front} → <b lang="pt-PT">{c.back}</b>
                    </span>
                    <span className="actions">
                      <button className="small ghost" onClick={() => openCard(c)} aria-label="Modifier">
                        ✎
                      </button>
                      <button className="small ghost" onClick={() => confirm('Supprimer cette carte ?') && deleteCard(c.id)} aria-label="Supprimer">
                        🗑
                      </button>
                    </span>
                  </li>
                ))}
                <li>
                  <button className="small secondary" onClick={() => openCard({ deckId: deck.id })}>
                    + carte dans ce paquet
                  </button>
                </li>
              </ul>
            </details>
          )
        })}
      </section>
    </>
  )
}
