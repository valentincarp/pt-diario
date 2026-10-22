import { emptyFsrs } from './logic/cards'
import type { CardItem, Data, ErrorEntry, Settings } from './types'

export const defaultSettings: Settings = {
  planStart: '2026-10-19',
  cours1: { weekday: 2, time: '18:00' },
  cours2: { weekday: null, time: '18:00' },
  cal: { daily: true, dailyTime: '20:00', cours: true, coursBefore: 30, bilan: true, bilanTime: '19:00' },
}

const card = (deckId: string, i: number, front: string, back: string, note = ''): CardItem => ({
  id: `${deckId}-${i}`,
  deckId,
  front,
  back,
  note,
  fsrs: emptyFsrs(new Date('2026-10-19T08:00:00')),
  createdAt: '2026-10-19',
})

const STARTER: [string, string][] = [
  ['Je suis arrivé en retard.', 'Cheguei atrasado.'],
  ['Nous avons parlé avec ma grand-mère.', 'Falámos com a minha avó.'],
  ['Il a fait le dîner.', 'Ele fez o jantar.'],
  ['Tu as mis ton manteau ?', 'Puseste o casaco?'],
  ["Elle n'a pas pu venir.", 'Ela não pôde vir.'],
  ['Mes cousins sont venus hier.', 'Os meus primos vieram ontem.'],
  ["J'ai dit la vérité.", 'Disse a verdade.'],
  ['Ils ont apporté du vin.', 'Trouxeram vinho.'],
  ['Je me suis levé à 7 h.', 'Levantei-me às 7h.'],
  ["J'ai beaucoup aimé le film.", 'Gostei muito do filme.'],
]

// Mots nouveaux du carnet papier, semaine 1
const CARNET: [string, string, string?][] = [
  ['avoir', 'ter'],
  ['surchargée, bondée', 'sobrelotada'],
  ['en détention', 'detido'],
  ['des blessures', 'ferimentos'],
  ["L'information a été donnée aujourd'hui.", 'A informação foi dada hoje.'],
  ['le train', 'o comboio'],
  ['il / elle a conseillé', 'aconselhou'],
  ["Que s'est-il passé sur le chemin du retour ?", 'O que aconteceu no caminho de regresso?'],
  ['louer', 'alugar'],
  ['traverser', 'atravessar'],
  ["s'endormir", 'adormecer'],
  ['prendre des photos', 'tirar fotografias'],
  ["l'après-midi / tard", 'à tarde / tarde', 'à tarde = l’après-midi ≠ tarde = tard'],
]

const err = (i: number, date: string, wrote: string, correction: string, rule: string): ErrorEntry => ({
  id: `carnet-${i}`,
  date,
  wrote,
  correction,
  rule,
  source: 'jour',
})

const ERRORS: ErrorEntry[] = [
  err(1, '2026-10-19', 'puseste o casaco (hésitation)', 'Puseste o casaco?', 'pôr au perfeito : pus, puseste, pôs, pusemos, puseram'),
  err(2, '2026-10-21', 'minha namorada', 'a minha namorada', 'Article devant le possessif : a minha / as minhas'),
  err(3, '2026-10-21', 'fomos em Viena', 'fomos a Viena', 'ir a / visita a + lieu (et non em)'),
  err(4, '2026-10-21', 'mais bom', 'melhor', 'Comparatif irrégulier : bom → melhor'),
  err(5, '2026-10-21', 'mais (pour « mais »)', 'mas', 'mas = mais (opposition) ≠ mais = plus'),
  err(6, '2026-10-21', 'visitamos (passé)', 'visitámos', '-ámos au perfeito des verbes en -ar'),
  err(7, '2026-10-21', 'fazer uma visita', 'visitar', 'Calque du français'),
  err(8, '2026-10-21', 'thermes', 'termas', 'Calque du français'),
  err(9, '2026-10-22', 'fizeram (aller)', 'foram', 'foram = ir / ser (et non fazer)'),
  err(10, '2026-10-22', 'puxaram', 'puseram', 'puseram = pôr (et non puxar)'),
  err(11, '2026-10-22', 'tarde (l’après-midi)', 'à tarde', 'à tarde = l’après-midi ≠ tarde = tard'),
  err(12, '2026-10-22', 'fizerem', 'fizeram', 'Perfeito eles : -ram (et non -rem)'),
  err(13, '2026-10-22', 'sairam, nao, ja, Evora', 'saíram, não, já, Évora', 'Accents'),
]

export function initialData(): Data {
  return {
    version: 1,
    settings: defaultSettings,
    days: {
      '2026-10-19': {
        pos: { week: 1, day: 'lun' },
        minutes: 45,
        notes:
          'Demain : relire tous les verbes irréguliers et réguliers.\nPerfeito ≈ passé composé ; pas besoin de pronom personnel pour raconter une action finie.\nMots : ter, sobrelotada, detido, ferimentos, « A informação foi dada hoje ».',
        cardsOk: false,
      },
      '2026-10-21': {
        pos: { week: 1, day: 'mer' },
        minutes: 0,
        notes:
          "Pas de cours : réponses aux questions à la place. Mot : comboio.\n\nTexte corrigé (base pour vendredi) :\nAs minhas últimas férias foram na Áustria. Fui com a minha namorada e fomos de comboio. No primeiro dia, visitámos um museu e depois fomos a um concerto, porque Salzburgo é a cidade natal de Mozart. A melhor coisa que comi foi um prato típico: o schnitzel. O melhor momento foi a visita a Viena, onde vimos o palácio da Sissi, a imperatriz. O pior momento foi ___. No último dia, fomos a Budapeste e passámos o dia nas termas.\n\nPour vendredi : compléter les blancs et atteindre 150 mots (fez frio / fez calor, ce que vous avez acheté, ce que ta namorada a préféré).",
        cardsOk: false,
      },
      '2026-10-22': {
        pos: { week: 1, day: 'jeu' },
        minutes: 19,
        notes:
          'Lecture graduée Lidel B1.\nMots : aconselhou, alugar, atravessar, adormecer, tirar fotografias, « O que aconteceu no caminho de regresso? »',
        cardsOk: false,
      },
    },
    tasks: {
      'S1-lun': {
        checked: ['Grammaire : perfeito régulier et irrégulier (Gramática Ativa 1)', 'Anki 10 min', '1 article RTP Notícias'],
        completedOn: '2026-10-19',
      },
      'S1-mer': {
        checked: ['Préparer : tes dernières vacances au perfeito', 'Cours avec Fábio + fiche remplie'],
        completedOn: '2026-10-21',
      },
      'S1-jeu': { checked: ['Lecture graduée B1', 'Carnet de mots', 'Anki 10 min'], completedOn: '2026-10-22' },
    },
    errors: ERRORS,
    lessons: [],
    decks: [
      { id: 's1', name: 'Semaine 1 — perfeito' },
      { id: 's1-carnet', name: 'Semaine 1 — carnet' },
    ],
    cards: [
      ...STARTER.map(([f, b], i) => card('s1', i, f, b)),
      ...CARNET.map(([f, b, n], i) => card('s1-carnet', i, f, b, n)),
    ],
    reviews: [],
    weekly: {},
    phases: {},
    shifts: [],
  }
}
