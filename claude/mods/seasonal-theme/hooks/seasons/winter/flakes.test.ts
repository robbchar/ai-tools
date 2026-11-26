import { describe, expect, test } from 'claude-code/testing'

import type { PileView, Transition } from '../../../types'
import { fillFor, levelFor } from '../../pile'

import { flakePlan } from './flakes'
import { renderWinter } from './scene'

const view = (percent: number, transition: Transition = 'none', fromPercent = percent, time = 42): PileView => ({
  level: levelFor(percent),
  fill: fillFor(percent),
  percent,
  from: levelFor(fromPercent),
  fromFill: fillFor(fromPercent),
  transition,
  time,
})
const of = (depth: string, plan = flakePlan(view(30))) => plan.filter(flake => flake.depth === depth)
const mean = (list: readonly number[]) => list.reduce((sum, n) => sum + n, 0) / list.length
const darkBlock = (svg: string) => svg.match(/@media \(prefers-color-scheme: dark\)\{(.*?)\}@media/)?.[1] ?? ''

describe('the snowfall', () => {
  test('falls at three depths: far flakes are smaller and slower than near ones', () => {
    const far = of('far')
    const near = of('near')

    expect(of('mid').length).toBeGreaterThan(0)
    expect(Math.max(...far.map(flake => flake.size))).toBeLessThan(Math.min(...near.map(flake => flake.size)))
    expect(Math.min(...far.map(flake => flake.fall))).toBeGreaterThan(Math.max(...near.map(flake => flake.fall)))
  })

  test('each flake rests unseen between falls', () => {
    for (const flake of flakePlan(view(30))) {
      expect(flake.cycle).toBeGreaterThan(flake.fall)
    }
  })

  test('snow falls more often from 50%', () => {
    const share = (percent: number) => mean(flakePlan(view(percent)).map(flake => flake.fall / flake.cycle))

    expect(share(50)).toBeGreaterThan(share(45))
  })

  test('dots far away, stars up close', () => {
    expect(of('far').every(flake => flake.shape === 'dot')).toBe(true)
    expect([...of('mid'), ...of('near')].every(flake => flake.shape === 'star')).toBe(true)
  })

  test('is reshuffled every redraw, and the same for the same drawing', () => {
    expect(flakePlan(view(30, 'none', 30, 42))).toEqual(flakePlan(view(30, 'none', 30, 42)))
    expect(flakePlan(view(30, 'none', 30, 43))).not.toEqual(flakePlan(view(30, 'none', 30, 42)))
  })
})

describe('the flurry', () => {
  test('a step up brings a flurry; nothing else does', () => {
    expect(renderWinter(view(35, 'grow', 30), 0)).toContain('class="flurry')
    expect(renderWinter(view(90, 'dive', 85), 0)).toContain('class="flurry')
    for (const [percent, transition, from] of [[30, 'none', 30], [30, 'shrink', 35], [10, 'scatter', 80]] as const) {
      expect(renderWinter(view(percent, transition, from), 0)).not.toContain('class="flurry')
    }
  })
})

describe('flakes and motion', () => {
  test('flakes and the flurry are hidden when motion is off', () => {
    const svg = renderWinter(view(35, 'grow', 30), 0)

    expect(svg).toContain('.flake{opacity:0')
    expect(svg).toContain('.flurry{opacity:0')
  })

  test('light-mode flakes keep a faint outline', () => {
    const svg = renderWinter(view(30), 0)

    expect(svg).toContain('.flake-edge{stroke:rgba(110,135,160,.45)')
    expect(darkBlock(svg)).toContain('.flake-edge{stroke:none')
  })
})
