export type CardType = 'definition' | 'qa' | 'cloze'

export type Card = {
  id: string
  type: CardType
  front: string
  back: string
  tags?: string[]
  sources: { path: string; noteId: string }[]
}

export type Deck = {
  id: string
  name: string
  cardIds: string[]
}
