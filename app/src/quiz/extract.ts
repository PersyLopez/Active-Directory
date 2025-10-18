import { extractWikilinks } from '../vault/Wikilink'
import type { Card } from './types'

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

export function extractCards(note: { id: string; title: string; path: string; content: string }): Card[] {
  const cards: Card[] = []
  const lines = note.content.split(/\r?\n/)

  // Q/A: lines starting with Q: / A:
  for (let i = 0; i < lines.length; i++) {
    const q = lines[i]
    if (/^\s*Q\s*:\s*/i.test(q)) {
      const a = lines[i + 1] ?? ''
      if (/^\s*A\s*:\s*/i.test(a)) {
        const front = q.replace(/^\s*Q\s*:\s*/i, '').trim()
        const back = a.replace(/^\s*A\s*:\s*/i, '').trim()
        const id = `qa_${hash(note.id + front + back)}`
        cards.push({ id, type: 'qa', front, back, sources: [{ path: note.path, noteId: note.id }] })
      }
    }
  }

  // Definition: heading followed by first paragraph
  const headingMatch = note.content.match(/^#\s+(.+)$/m)
  if (headingMatch) {
    const title = headingMatch[1].trim()
    const paraMatch = note.content.slice(headingMatch.index! + headingMatch[0].length).match(/\n\s*\n([^\n][\s\S]*?)\n\s*\n/)
    const def = paraMatch ? paraMatch[1].trim() : ''
    if (def) {
      const id = `def_${hash(note.id + title)}`
      cards.push({ id, type: 'definition', front: title, back: def, sources: [{ path: note.path, noteId: note.id }] })
    }
  }

  // Cloze: convert sentences containing [[Term]] into cloze prompts
  const links = extractWikilinks(note.content)
  for (const l of links) {
    const term = l.alias ?? l.target
    const idx = note.content.indexOf(l.text)
    if (idx >= 0) {
      const start = Math.max(0, idx - 80)
      const end = Math.min(note.content.length, idx + l.text.length + 80)
      const window = note.content.slice(start, end)
      const front = window.replace(l.text, `{{c1::${term}}}`)
      const id = `cloze_${hash(note.id + term + idx)}`
      cards.push({ id, type: 'cloze', front, back: term, sources: [{ path: note.path, noteId: note.id }] })
    }
  }

  return cards
}

export function extractCardsFromVault(notes: { id: string; title: string; path: string; content: string }[]) {
  return notes.flatMap(n => extractCards(n))
}
