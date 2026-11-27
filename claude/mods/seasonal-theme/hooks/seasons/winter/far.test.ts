import { describe, expect, test } from 'claude-code/testing'

import type { PileView } from '../../../types'
import { fillFor, levelFor } from '../../pile'

import { atDepth, farMarkup, farTrees } from './far'
import { HOUSE } from './geometry'

const view = (percent: number): PileView => ({
  level: levelFor(percent),
  fill: fillFor(percent),
  percent,
  from: levelFor(percent),
  fromFill: fillFor(percent),
  transition: 'none',
  time: 42,
})
const mean = (list: readonly number[]) => list.reduce((sum, n) => sum + n, 0) / list.length
const sinks = (svg: string) => [...svg.matchAll(/data-sink="([\d.]+)"/g)].map(match => Number(match[1]))

describe('the far trees', () => {
  test("come closer toward the window's sides", () => {
    const trees = farTrees()
    const sides = trees.filter(tree => tree.x < 15 || tree.x > 85).map(tree => tree.z)
    const middle = trees.filter(tree => tree.x >= 35 && tree.x <= 65).map(tree => tree.z)

    expect(sides.length).toBeGreaterThan(2)
    expect(middle.length).toBeGreaterThan(2)
    expect(mean(sides)).toBeGreaterThan(mean(middle))
  })

  test('nearer ones are bigger, lower and sharper', () => {
    const [far, mid, near] = [atDepth(0), atDepth(0.5), atDepth(1)]

    expect(far.height).toBeLessThan(mid.height)
    expect(mid.height).toBeLessThan(near.height)
    expect(far.base).toBeLessThan(mid.base)
    expect(mid.base).toBeLessThan(near.base)
    expect(far.blur).toBeGreaterThan(mid.blur)
    expect(mid.blur).toBeGreaterThan(near.blur)
  })

  test('none come closer than about halfway to the house', () => {
    expect(atDepth(1).height).toBeLessThan((140 + HOUSE.height) / 2 + 0.1)
  })

  test('sink into their own snow, less the farther they are', () => {
    expect(atDepth(0).sink).toBeLessThan(atDepth(1).sink)

    const settled = sinks(farMarkup(view(0), { css: [], dark: [] }))
    const deep = sinks(farMarkup(view(60), { css: [], dark: [] }))

    expect(settled.length).toBe(farTrees().length)
    deep.forEach((sink, i) => expect(sink).toBeGreaterThan(settled[i] ?? Infinity))
  })

  test('keep their shape when the window narrows', () => {
    const svg = farMarkup(view(30), { css: [], dark: [] })

    expect(svg.match(/preserveAspectRatio="xMidYMax meet"/g)?.length).toBe(farTrees().length)
  })

  test('stand on a field behind everything', () => {
    expect(farMarkup(view(30), { css: [], dark: [] })).toContain('class="field"')
  })
})
