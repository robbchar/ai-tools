import { describe, expect, test } from 'claude-code/testing'

import type { PileView, Transition } from '../../../types'
import { fillFor, levelFor, settle } from '../../pile'
import { SCHEDULE, showing } from '../../stage/visits'

import { snowTopAt } from './geometry'
import { renderWinter } from './scene'

const T = 1_795_000_000_000
const view = (percent: number, transition: Transition = 'none', fromPercent = percent): PileView => ({
  level: levelFor(percent),
  fill: fillFor(percent),
  percent,
  from: levelFor(fromPercent),
  fromFill: fillFor(fromPercent),
  transition,
  time: 42,
})
const draw = (percent: number, transition: Transition = 'none', fromPercent = percent) => renderWinter(view(percent, transition, fromPercent), 0)
const standsAt = (svg: string) => Number(svg.match(/<g transform="translate\(615 ([\d.]+)\)">(?:<g class="hold">)?<g class="visit">/)?.[1])

describe('the fox', () => {
  test('visits below 90% on the shared clock', () => {
    const svg = draw(60)

    expect(svg).toContain('class="visit"')
    expect(svg).toContain(`animation:visit ${SCHEDULE.seconds}s linear`)
  })

  test('walks on the snow', () => {
    expect(standsAt(draw(30))).toBe(snowTopAt(30))
    expect(standsAt(draw(70))).toBe(snowTopAt(70))
  })

  test('dives once, on crossing into 90%', () => {
    expect(draw(90, 'dive', 85)).toContain('class="dive"')
    expect(draw(95, 'grow', 90)).not.toContain('class="dive"')
  })

  test('a jump from 50% straight to 95% still dives', () => {
    const from = view(50)
    const next = settle(from, { live: 50, preview: null }, { live: 95, preview: null }, 42)

    expect(next?.transition).toBe('dive')
    expect(next === null ? '' : renderWinter(next, 0)).toContain('class="dive"')
  })

  test('from 90% only its tail shows, with no visits', () => {
    const svg = draw(95)

    expect(svg).toContain('class="tail"')
    expect(svg).not.toContain('class="visit"')
  })

  test('coming back to a session at 90%+ shows the tail without replaying the dive', () => {
    const shown = showing({ ...view(95, 'dive', 85), time: T }, T + 60_000, 0)
    const svg = renderWinter(shown.view, shown.phase)

    expect(svg).toContain('class="tail"')
    expect(svg).not.toContain('class="dive"')
  })

  test('a compact from 90%+ pops it out and holds its next visit back', () => {
    const svg = draw(20, 'scatter', 95)

    expect(svg).toContain('class="popout"')
    expect(svg).toContain('class="hold"')
  })

  test('half-played moves are hidden when motion is off; the tail is not', () => {
    // Booleans, not whole drawings: a failure message that big is more than the runner reports.
    const dive = draw(90, 'dive', 85)
    const popout = draw(20, 'scatter', 95)
    const hidden = (svg: string, cls: string) => svg.includes(`.${cls}{opacity:0`)

    expect([hidden(dive, 'dive'), hidden(dive, 'puff'), hidden(popout, 'popout')]).toEqual([true, true, true])
    expect(hidden(dive, 'tail') || hidden(draw(95), 'tail')).toBe(false)
  })
})
