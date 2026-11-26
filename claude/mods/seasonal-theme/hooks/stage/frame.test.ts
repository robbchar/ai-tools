import { describe, expect, test } from 'claude-code/testing'

import type { PileView } from '../../types'

import { altFor, frame } from './frame'

const view = (fill: number, percent: number | null = fill): PileView => ({
  level: fill >= 90 ? 4 : fill >= 75 ? 3 : fill >= 50 ? 2 : fill >= 25 ? 1 : 0,
  fill,
  percent,
  from: 0,
  fromFill: 0,
  transition: 'none',
  time: 0,
})
const describeLevel = (level: number) => `level ${level}`

describe('altFor', () => {
  test('tells a reader the percent with the scene', () => {
    expect(altFor(describeLevel, view(42))).toBe('level 1 42% of the context window is used.')
  })

  test('with no reading, just the scene', () => {
    expect(altFor(describeLevel, view(0, null))).toBe('level 0')
  })
})

describe('frame', () => {
  test('wraps the body in the root svg with level, fill and the dark and reduced-motion rules', () => {
    const svg = frame(view(30), { css: ['.a{}'], dark: ['.b{}'] }, '<g/>')

    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" data-level="1" data-fill="30">')).toBe(true)
    expect(svg).toContain('<style>.a{}@media (prefers-color-scheme: dark){.b{}}@media (prefers-reduced-motion: reduce){*{animation:none!important}}</style>')
    expect(svg.endsWith('<g/></svg>')).toBe(true)
  })

  test('marks the warning levels on the root', () => {
    expect(frame(view(75), { css: [], dark: [] }, '')).toContain('data-fill="75" class="warm">')
    expect(frame(view(70), { css: [], dark: [] }, '')).not.toContain('class="warm"')
  })
})
