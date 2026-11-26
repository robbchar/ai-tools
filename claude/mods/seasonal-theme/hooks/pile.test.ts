import { describe, expect, test } from 'claude-code/testing'

import type { PileView, Reading } from '../types'

import { describeReading, fillFor, levelFor, parseLeaves, settle } from './pile'

// A settled view at a percent, as the mod would hold it.
const at = (percent: number | null): PileView => {
  const level = levelFor(percent)
  const fill = fillFor(percent)

  return { level, fill, percent: percent === null ? null : Math.round(percent), from: level, fromFill: fill, transition: 'none', time: 1 }
}
const live = (percent: number | null): Reading => ({ live: percent, preview: null })

describe('levelFor', () => {
  test('each band starts at its lower bound', () => {
    expect(levelFor(0)).toBe(0)
    expect(levelFor(24.9)).toBe(0)
    expect(levelFor(25)).toBe(1)
    expect(levelFor(49.9)).toBe(1)
    expect(levelFor(50)).toBe(2)
    expect(levelFor(74.9)).toBe(2)
    expect(levelFor(75)).toBe(3)
    expect(levelFor(89.9)).toBe(3)
    expect(levelFor(90)).toBe(4)
    expect(levelFor(100)).toBe(4)
  })

  test('no reading draws the plain scene', () => {
    expect(levelFor(null)).toBe(0)
  })
})

describe('fillFor', () => {
  test('rounds down to a 5% step', () => {
    expect(fillFor(0)).toBe(0)
    expect(fillFor(4.9)).toBe(0)
    expect(fillFor(5)).toBe(5)
    expect(fillFor(37.2)).toBe(35)
    expect(fillFor(99.9)).toBe(95)
    expect(fillFor(100)).toBe(100)
  })

  test('no reading is empty', () => {
    expect(fillFor(null)).toBe(0)
  })
})

describe('settle', () => {
  test('the same whole percent asks for no redraw', () => {
    expect(settle(at(31.2), live(31.2), live(31.4), 7)).toBeNull()
  })

  test('a new percent within a step redraws for the sign, with no move', () => {
    expect(settle(at(31), live(31), live(34), 7)).toEqual({
      level: 1, fill: 30, percent: 34, from: 1, fromFill: 30, transition: 'none', time: 7,
    })
  })

  test('each 5% step grows the pile, within a level too', () => {
    expect(settle(at(31), live(31), live(36), 7)).toEqual({
      level: 1, fill: 35, percent: 36, from: 1, fromFill: 30, transition: 'grow', time: 7,
    })
  })

  test('jumping several steps grows from where it was', () => {
    expect(settle(at(null), live(null), live(80), 7)).toEqual({
      level: 3, fill: 80, percent: 80, from: 0, fromFill: 0, transition: 'grow', time: 7,
    })
  })

  test('reaching the wrap-up level dives', () => {
    expect(settle(at(85), live(85), live(92), 7)?.transition).toBe('dive')
    expect(settle(at(30), live(30), live(95), 7)?.transition).toBe('dive')
  })

  test('growing within the wrap-up level just grows', () => {
    expect(settle(at(91), live(91), live(96), 7)?.transition).toBe('grow')
  })

  test('a big drop, as after a compact, scatters', () => {
    expect(settle(at(93), live(93), live(12), 7)).toEqual({
      level: 0, fill: 10, percent: 12, from: 4, fromFill: 90, transition: 'scatter', time: 7,
    })
  })

  test('the reading going missing, as right after a compact, scatters', () => {
    expect(settle(at(60), live(60), live(null), 7)?.transition).toBe('scatter')
  })

  test('slipping just under a step edge shrinks instead of scattering', () => {
    expect(settle(at(50.4), live(50.4), live(49.6), 7)?.transition).toBe('shrink')
  })

  test('a preview stands in for the live reading, and clearing it returns to live', () => {
    const previewed = settle(at(30), live(30), { live: 30, preview: 95 }, 7)
    expect(previewed?.fill).toBe(95)

    const back = settle(at(95), { live: 30, preview: 95 }, live(30), 8)
    expect(back).toEqual({ level: 1, fill: 30, percent: 30, from: 4, fromFill: 95, transition: 'scatter', time: 8 })
  })
})

describe('describeReading', () => {
  test('a live reading names its level', () => {
    expect(describeReading(live(34))).toBe('Context 34% (live): small pile.')
  })

  test('a preview says so, with the live reading beside it', () => {
    expect(describeReading({ live: 34.4, preview: 92 })).toBe(
      'Previewing 92%: wrap-up (time to compact). Live is 34%; /leaves off returns to it.',
    )
  })

  test('no reading yet says so', () => {
    expect(describeReading(live(null))).toBe('No context reading yet: scattered leaves.')
  })
})

describe('parseLeaves', () => {
  test('a percentage previews that fill', () => {
    expect(parseLeaves('80')).toEqual({ kind: 'preview', percent: 80 })
    expect(parseLeaves(' 92.5% ')).toEqual({ kind: 'preview', percent: 92.5 })
  })

  test('off returns to the live reading', () => {
    expect(parseLeaves('off')).toEqual({ kind: 'off' })
    expect(parseLeaves('LIVE')).toEqual({ kind: 'off' })
  })

  test('nothing shows where things stand', () => {
    expect(parseLeaves('')).toEqual({ kind: 'show' })
  })

  test('out of range or not a number is refused', () => {
    expect(parseLeaves('120').kind).toBe('bad')
    expect(parseLeaves('-1').kind).toBe('bad')
    expect(parseLeaves('lots').kind).toBe('bad')
  })
})
