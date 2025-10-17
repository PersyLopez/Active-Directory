export function insertWikilinkBySearch(content: string, term: string): string | null {
  const title = term.trim()
  if (!title) return null
  const idx = content.indexOf(title)
  if (idx < 0) return null
  const before = content.slice(0, idx)
  const after = content.slice(idx + title.length)
  return `${before}[[${title}]]${after}`
}
