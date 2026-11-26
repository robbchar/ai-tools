import { describe, expect, test } from 'claude-code/testing'

import type { PileView, Transition } from '../../../types'
import { fillFor, levelFor } from '../../pile'

import { snowTopAt } from './geometry'
import { surfaceAt } from './snow'
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

describe('moves', () => {
  test('a step up raises the snow from the old level', () => {
    const svg = draw(35, 'grow', 30)

    expect(svg).toContain('class="snow-band rise"')
    expect(svg).toContain('@keyframes rise{from{transform:translateY(21.6px)}')
  })

  test('a jump of several steps rises the whole way in one go', () => {
    expect(draw(40, 'grow', 10)).toContain(`@keyframes rise{from{transform:translateY(${Math.round((snowTopAt(10) - snowTopAt(40)) * 10) / 10}px)}`)
  })

  test('a small drop eases the snow down with no other fuss', () => {
    const svg = draw(30, 'shrink', 35)

    expect(svg).toContain('class="snow-band sink"')
    expect(svg).not.toContain('class="slide')
    expect(svg).not.toContain('class="blow')
  })

  test("a compact slides the roof's snow off and blows the tree and the sign clear", () => {
    const svg = draw(10, 'scatter', 80)
    const tree = svg.slice(svg.indexOf('class="tree"'), svg.indexOf(RIGHT_STAGE))
    const sign = svg.slice(svg.indexOf(SIGN_STAGE))

    expect(svg).toContain('class="snow-band sink"')
    expect(svg).toContain('class="slide')
    expect(tree).toContain('class="blow')
    expect(sign).toContain('class="blow')
  })

  test("a settled scene doesn't move", () => {
    const svg = draw(30)

    for (const mark of [' rise"', ' sink"', 'class="slide', 'class="blow']) {
      expect(svg).not.toContain(mark)
    }
  })

  test('leaving snow is hidden when motion is off', () => {
    const svg = draw(10, 'scatter', 80)

    expect(svg).toContain('.slide{opacity:0')
    expect(svg).toContain('.blow{opacity:0')
  })
})

describe('moving snow', () => {
  test('the snow still reaches the bottom of the window while it sinks', () => {
    const svg = draw(0, 'scatter', 100)
    const shift = Number(svg.match(/@keyframes sink\{from\{transform:translateY\(-([\d.]+)px\)/)?.[1])
    const band = svg.match(/<g class="snow-band[^"]*"[^>]*><polygon class="snow" points="([^"]+)"/)?.[1] ?? ''
    const bottom = Math.max(...band.split(' ').map(point => Number(point.split(',')[1])))

    expect(shift).toBeGreaterThan(0)
    expect(bottom - shift).toBeGreaterThan(1000)
  })

  test('snow blowing or sliding off things is still snow-colored', () => {
    const svg = draw(10, 'scatter', 80)
    const snowRule = svg.match(/([^{}]*)\{fill:#fbfdff\}/)?.[1] ?? ''

    expect(snowRule.split(',')).toContain('.blow')
    expect(snowRule.split(',')).toContain('.slide')
  })
})

describe('the house at the top', () => {
  test('the chimney still stands clear of the snow at 100%', () => {
    const svg = draw(100)
    const [, x = 'NaN', y = 'NaN'] = svg.match(/<rect class="chimney" x="([\d.]+)" y="([\d.]+)"/) ?? []

    expect(surfaceAt(Number(x) + 16, 100) - Number(y)).toBeGreaterThan(15)
  })
})
