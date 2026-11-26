import { describe, expect, test } from 'claude-code/testing'

import type { PileView, Transition } from '../../types'
import { fillFor, levelFor } from '../pile'

import { holdAfterPopout, SCHEDULE, showing, VISIT } from './visits'

const T = 1_795_000_000_000
const LOOP = SCHEDULE.seconds
const mod = (n: number, m: number) => ((n % m) + m) % m
const at = (percent: number, transition: Transition = 'none', fromPercent = percent): PileView => ({
  level: levelFor(percent),
  fill: fillFor(percent),
  percent: Math.round(percent),
  from: levelFor(fromPercent),
  fromFill: fillFor(fromPercent),
  transition,
  time: 42,
})
// Whether a visit is under way at `phase` seconds into the loop.
const isVisiting = (phase: number) => SCHEDULE.starts.some(start => mod(phase, LOOP) >= start && mod(phase, LOOP) < start + VISIT.gone)

describe('the visit schedule', () => {
  test('visits come 30 seconds to 2 minutes apart, a different wait each time', () => {
    const gaps = SCHEDULE.starts.map((start, k) => (SCHEDULE.starts[k + 1] ?? LOOP) - start - VISIT.gone)

    expect(gaps.length).toBeGreaterThan(3)
    for (const gap of gaps) {
      expect(gap).toBeGreaterThan(29.9)
      expect(gap).toBeLessThan(120.1)
    }
    expect(new Set(gaps).size).toBe(gaps.length)
  })
})

describe('showing', () => {
  test('a new reading carries the visits on from where they were', () => {
    const first = showing({ ...at(30), time: T }, T, 0)
    const later = showing({ ...at(31), time: T + 150_000 }, T + 150_000, first.anchor)

    expect(later.anchor).toBe(first.anchor)
    expect(Math.abs(mod(later.phase - first.phase, LOOP) - 150)).toBeLessThan(0.01)
  })

  test('drawn right after its reading, the move plays', () => {
    const view = { ...at(37, 'grow', 31), time: T }

    expect(showing(view, T + 300, 0).view).toBe(view)
  })

  test('asked again moments after a switch back, the visitor stays where it was', () => {
    const view = { ...at(30), time: T }
    // 40 s into the loop: past the first visit, well before the next.
    const first = showing(view, T + 60_000, T + 20_000)
    const again = showing(view, T + 61_500, first.anchor)

    expect(first.anchor).not.toBe(T + 20_000)
    expect(again.anchor).toBe(first.anchor)
    expect(Math.abs(again.phase - first.phase - 1.5)).toBeLessThan(0.01)
  })

  test('a reading just after a switch back carries on the visit it brought', () => {
    const back = showing({ ...at(30), time: T }, T + 60_000, T + 20_000)
    const next = showing({ ...at(31), time: T + 70_000 }, T + 70_000, back.anchor)

    expect(next.anchor).toBe(back.anchor)
    expect(Math.abs(mod(next.phase - back.phase, LOOP) - 10)).toBeLessThan(0.01)
  })
})

describe('holdAfterPopout', () => {
  test('keeps the visitor away at least 40 s and never resumes mid-visit', () => {
    for (let phase = 0; phase < LOOP; phase += 0.5) {
      const hold = holdAfterPopout(phase)

      expect(hold).toBeGreaterThan(39.9)
      expect(isVisiting(phase + hold) && !isVisiting(phase + hold - 0.2)).toBe(false)
    }
  })
})
