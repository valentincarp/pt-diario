import { create } from 'zustand'
import type { CardItem, ErrorEntry } from './types'

// État d'interface, non sauvegardé : onglet, modales, session de cartes, texte ouvert.
export type Tab = 'today' | 'cards' | 'exos' | 'journal' | 'plus' | 'fabio' | 'bilans' | 'settings'
export type ErrorDraft = Partial<ErrorEntry>
export type CardDraft = Partial<Pick<CardItem, 'id' | 'deckId' | 'front' | 'back' | 'note'>> & { deckName?: string }

type Ui = {
  tab: Tab
  errorDraft: ErrorDraft | null
  cardDraft: CardDraft | null
  session: boolean
  /** Texte ouvert dans l'écran d'écriture : id, 'new', ou null. */
  writing: string | null
  setTab: (t: Tab) => void
  openError: (d?: ErrorDraft) => void
  openCard: (d?: CardDraft) => void
  close: () => void
  setSession: (open: boolean) => void
  openWriting: (id: string | null) => void
}

export const useUi = create<Ui>()((set) => ({
  tab: 'today',
  errorDraft: null,
  cardDraft: null,
  session: false,
  writing: null,
  setTab: (tab) => set({ tab }),
  openError: (d = {}) => set({ errorDraft: d, cardDraft: null }),
  openCard: (d = {}) => set({ cardDraft: d, errorDraft: null }),
  close: () => set({ errorDraft: null, cardDraft: null }),
  setSession: (session) => set({ session }),
  openWriting: (writing) => set(writing ? { writing, tab: 'exos' } : { writing }),
}))
