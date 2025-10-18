import { describe, expect, it } from 'vitest'
import { buildBacklinks, extractWikilinks } from './Wikilink'

describe('extractWikilinks', () => {
  it('parses simple and aliased wikilinks', () => {
    const md = 'See [[Note A]] and [[Note B|B alias]].'
    const links = extractWikilinks(md)
    expect(links).toMatchObject([
      { target: 'Note A' },
      { target: 'Note B', alias: 'B alias' },
    ])
  })
})

describe('buildBacklinks', () => {
  it('builds backlinks map by slugified target', () => {
    const notes = [
      { id: 'a', title: 'A', content: 'Link to [[B]]' },
      { id: 'b', title: 'B', content: 'Back to [[A]] and [[C]]' },
    ]
    const backlinks = buildBacklinks(notes)
    expect(backlinks['b']).toEqual(['a'])
    expect(backlinks['a']).toEqual(['b'])
    expect(backlinks['c']).toEqual(['b'])
  })
})
