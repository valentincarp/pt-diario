import { create } from 'zustand'
import type { CardItem, ErrorEntry } from './types'

// État d'interface, non sauvegardé : onglet, modales, session de cartes.
export type Tab = 'today' | 'cards' | 'journal' | 'fabio' | 'bilans' | 'settings'
export type ErrorDraft = Partial<ErrorEntry>
export type CardDraft = Partial<Pick<CardItem, 'id' | 'deckId' | 'front' | 'back' | 'note'>> & { deckName?: string }

type Ui = {
  tab: Tab
  errorDraft: ErrorDraft | null
  cardDraft: CardDraft | null
  session: boolean
  setTab: (t: Tab) => void
  openError: (d?: ErrorDraft) => void
  openCard: (d?: CardDraft) => void
  close: () => void
  setSession: (open: boolean) => void
}

export const useUi = create<Ui>()((set) => ({
  tab: 'today',
  errorDraft: null,
  cardDraft: null,
  session: false,
  setTab: (tab) => set({ tab }),
  openError: (d = {}) => set({ errorDraft: d, cardDraft: null }),
  openCard: (d = {}) => set({ cardDraft: d, errorDraft: null }),
  close: () => set({ errorDraft: null, cardDraft: null }),
  setSession: (session) => set({ session }),
}))
