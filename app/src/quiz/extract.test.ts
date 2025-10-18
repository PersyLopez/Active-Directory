import { describe, it, expect } from 'vitest'
import { extractCards } from './extract'

const note = {
  id: 'a',
  title: 'A',
  path: 'A.md',
  content: `# Cell

Cells are the basic unit of life.

Q: What is the powerhouse of the cell?
A: Mitochondria

See also [[Membrane]].`,
}

describe('extractCards', () => {
  it('extracts definition, qa, and cloze cards', () => {
    const cards = extractCards(note)
    const types = cards.map(c => c.type).sort()
    expect(types).toEqual(['cloze', 'definition', 'qa'])
  })
})
