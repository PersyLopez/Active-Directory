export type Wikilink = { text: string; target: string; alias?: string; index: number; length: number }

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

export function extractWikilinks(markdown: string): Wikilink[] {
  const links: Wikilink[] = []
  for (const match of markdown.matchAll(WIKILINK_RE)) {
    const [full, target, alias] = match
    links.push({ text: full, target: target.trim(), alias: alias?.trim(), index: match.index ?? 0, length: full.length })
  }
  return links
}

export function buildBacklinks(notes: { id: string; title: string; content: string }[]): Record<string, string[]> {
  const backlinks: Record<string, string[]> = {}
  for (const note of notes) {
    for (const link of extractWikilinks(note.content)) {
      const key = slugify(link.target)
      if (!backlinks[key]) backlinks[key] = []
      if (!backlinks[key].includes(note.id)) backlinks[key].push(note.id)
    }
  }
  return backlinks
}

export function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9\s-_]/g, '').replace(/[\s_]+/g, '-')
}
