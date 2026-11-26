import { describe, expect, test } from 'claude-code/testing'

import type { PileView, Transition } from '../../../types'
import { fillFor, levelFor } from '../../pile'

import { renderWinter } from './scene'

const view = (percent: number | null, transition: Transition = 'none', fromPercent = percent ?? 0): PileView => ({
  level: levelFor(percent),
  fill: fillFor(percent),
  percent: percent === null ? null : Math.round(percent),
  from: levelFor(fromPercent),
  fromFill: fillFor(fromPercent),
  transition,
  time: 42,
})
const draw = (percent: number | null, transition: Transition = 'none', fromPercent?: number) =>
  renderWinter(view(percent, transition, fromPercent), 0)
const depth = (svg: string, cls: string) => Number(svg.match(new RegExp(`class="${cls}" data-depth="([\\d.]+)"`))?.[1])
const darkBlock = (svg: string) => svg.match(/@media \(prefers-color-scheme: dark\)\{(.*?)\}@media/)?.[1] ?? ''

const LEFT_STAGE = '<svg width="47.19%" height="100%" viewBox="0 0 420 1000" preserveAspectRatio="xMinYMax meet" overflow="visible">'
const RIGHT_STAGE = '<svg x="47.19%" width="52.81%" height="100%" viewBox="530 0 470 1000" preserveAspectRatio="xMaxYMax meet" overflow="visible">'
const SIGN_STAGE = '<svg width="47.19%" height="100%" viewBox="0 0 420 1000" preserveAspectRatio="xMinYMin meet" overflow="visible">'

describe('the snow', () => {
  test("its top sits at the level for its fill", () => {
    expect(draw(90)).toContain('data-top="570"')
    expect(draw(0)).toContain('data-top="958"')
  })

  test('with no reading the scene is the plain dusting', () => {
    const svg = draw(null)

    expect(svg).toContain('data-level="0"')
    expect(svg).toContain('data-top="958"')
  })
})

describe('the layout', () => {
  test('the big tree is on the left stage; the house and the snow share the right one', () => {
    const svg = draw(30)
    const left = svg.indexOf(LEFT_STAGE)
    const right = svg.indexOf(RIGHT_STAGE)

    expect(left).toBeGreaterThan(-1)
    expect(right).toBeGreaterThan(left)
    expect(svg.indexOf('class="tree"')).toBeGreaterThan(left)
    expect(svg.indexOf('class="tree"')).toBeLessThan(right)
    expect(svg.indexOf('class="house"')).toBeGreaterThan(right)
    expect(svg.indexOf('class="snow-band"')).toBeGreaterThan(svg.indexOf('class="house"'))
  })

  test('the sign hangs top-left, in front of everything', () => {
    const svg = draw(30)
    const after = svg.slice(svg.indexOf(SIGN_STAGE))

    expect(svg.indexOf(SIGN_STAGE)).toBeGreaterThan(svg.indexOf(RIGHT_STAGE))
    expect(after).toContain('class="sign"')
    expect(after.slice(SIGN_STAGE.length)).not.toContain('<svg')
  })
})

describe('the sign', () => {
  test('shows the exact percent', () => {
    expect(renderWinter({ ...view(42), percent: 42 }, 0)).toMatch(/<text class="numerals"[^>]*>42%<\/text>/)
  })

  test('shows a dash before there is any reading', () => {
    expect(draw(null)).toMatch(/<text class="numerals"[^>]*>—<\/text>/)
  })
})

describe('snow on things', () => {
  test('gathers on the roof, the tree and the sign as context fills', () => {
    const low = draw(30)
    const high = draw(60)

    for (const cls of ['roof-snow', 'cap', 'sign-snow']) {
      expect(depth(low, cls)).toBeLessThan(depth(high, cls))
    }
  })
})

describe('warnings', () => {
  test('from 75% the windows glow warmer and the numerals turn warm', () => {
    const svg = draw(75)

    expect(svg).toContain('data-fill="75" class="warm">')
    expect(draw(70)).not.toContain('class="warm"')
    expect(svg).toMatch(/\.warm \.glass\{fill:#[0-9a-f]{6}\}/)
    expect(svg).toMatch(/\.warm \.numerals\{fill:#[0-9a-f]{6}\}/)
  })
})

describe('modes and motion', () => {
  test('every themed part has a dark color', () => {
    const dark = darkBlock(draw(30))

    for (const cls of ['.ground', '.snow', '.glass', '.board', '.tree', '.roof']) {
      expect(dark).toContain(cls)
    }
  })

  test('nothing in the settled scene waits on an animation to be seen', () => {
    const svg = draw(60)

    for (const cls of ['snow', 'snow-band', 'house', 'tree', 'sign', 'roof-snow', 'cap']) {
      expect(svg).not.toContain(`.${cls}{opacity:0`)
    }
  })
})
