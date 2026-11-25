import { describe, expect, test } from 'claude-code/testing'

import type { PileView, Reading } from '../types'

import { describeReading, levelFor, parseLeaves, settle } from './pile'

const view = (level: PileView['level']): PileView => ({ level, from: level, transition: 'none', seed: 1 })
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

describe('settle', () => {
  test('staying in the same band asks for no redraw', () => {
    expect(settle(view(1), live(30), live(40), 7)).toBeNull()
  })

  test('rising a band grows from the old level', () => {
    expect(settle(view(1), live(40), live(55), 7)).toEqual({ level: 2, from: 1, transition: 'grow', seed: 7 })
  })

  test('jumping several bands still grows from where it was', () => {
    expect(settle(view(0), live(null), live(80), 7)).toEqual({ level: 3, from: 0, transition: 'grow', seed: 7 })
  })

  test('reaching the wrap-up band dives', () => {
    expect(settle(view(3), live(85), live(92), 7)?.transition).toBe('dive')
    expect(settle(view(1), live(30), live(95), 7)?.transition).toBe('dive')
  })

  test('a big drop, as after a compact, scatters', () => {
    expect(settle(view(4), live(93), live(12), 7)).toEqual({ level: 0, from: 4, transition: 'scatter', seed: 7 })
  })

  test('the reading going missing, as right after a compact, scatters', () => {
    expect(settle(view(2), live(60), live(null), 7)?.transition).toBe('scatter')
  })

  test('slipping just under a band edge shrinks instead of scattering', () => {
    expect(settle(view(2), live(50.4), live(49.6), 7)?.transition).toBe('shrink')
  })

  test('a preview stands in for the live reading, and clearing it returns to live', () => {
    const previewed = settle(view(1), live(30), { live: 30, preview: 95 }, 7)
    expect(previewed?.level).toBe(4)

    const back = settle(view(4), { live: 30, preview: 95 }, live(30), 8)
    expect(back).toEqual({ level: 1, from: 4, transition: 'scatter', seed: 8 })
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
