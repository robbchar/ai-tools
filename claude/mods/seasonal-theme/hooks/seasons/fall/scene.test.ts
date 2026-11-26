import { describe, expect, test } from 'claude-code/testing'

import type { PileView, Transition } from '../../../types'

import { fillFor, levelFor } from '../../pile'
import { sceneProblems } from '../../stage/rules'
import { showing } from '../../stage/visits'

import { renderFall } from './scene'
import type { FallArt } from './types'

// A plain stand-in season: shows the scene works with any art.
const CALM = '#00aa00'
const WARM = '#ee0000'
const SCENERY = '<g class="far"><circle cx="400" cy="950" r="9"/></g>'
const CLUMPS = Array.from({ length: 10 }, (_, i) => ({ x: 60 + i * 30, y: 400 + (i % 3) * 40, r: 50 }))
const art: FallArt = {
  describe: level => `level ${level}`,
  ground: { light: '#ffffff', dark: '#000000' },
  pile: {
    mound: { light: '#111111', dark: '#222222' },
    warmMound: { light: '#333333', dark: '#444444' },
    piece: fill => `<circle r="5" fill="${fill}"/>`,
    colors: [CALM],
    warmColors: [WARM],
  },
  drifter: { piece: fill => `<rect width="4" height="4" fill="${fill}"/>`, colors: ['#0000ee'] },
  scenery: {
    markup: SCENERY,
    tree: { branches: '<path class="bough" d="M200 985V500"/>', clumps: CLUMPS, colors: ['#884400'], lastLeaf: { x: 300, y: 480 } },
  },
  distance: { field: { light: '#dddddd', dark: '#222222' }, trees: fullness => `<circle class="far-tree" data-full="${fullness}" r="9"/>` },
  sign: {
    wood: { light: '#eeddcc', dark: '#332211' },
    ink: { light: '#221100', dark: '#ffeedd' },
    warmInk: { light: '#990000', dark: '#ff8866' },
    ornament: '<circle class="acorn" r="3"/>',
  },
  wanderer: {
    body: '<g class="head"><circle r="3"/></g><g class="leg-a"><path d="M0 0v5"/></g><g class="leg-b"><path d="M2 0v5"/></g>',
    peek: '<path class="tail" d="M0 0l5 -9"/>',
  },
}

// A view settled at a percent, or moving to it from another.
const at = (percent: number, transition: Transition = 'none', fromPercent = percent): PileView => ({
  level: levelFor(percent),
  fill: fillFor(percent),
  percent: Math.round(percent),
  from: levelFor(fromPercent),
  fromFill: fillFor(fromPercent),
  transition,
  time: 42,
})

const count = (svg: string, pattern: RegExp) => svg.match(pattern)?.length ?? 0
const towerPieces = (svg: string) => count(svg, /class="piece"/g)
const clumps = (svg: string) => count(svg, /class="clump"/g)
const mod = (n: number, m: number) => ((n % m) + m) % m
// A clock reading well into a day, in ms.
const T = 1_795_000_000_000

// The visit loop as drawn: its length, its start, and each stretch the visitor is on stage, in seconds.
const visitTimeline = (svg: string) => {
  const [, length = 'NaN', delay = 'NaN'] = svg.match(/animation:visit ([\d.]+)s linear (-?[\d.]+)s infinite/) ?? []
  const seconds = Number(length)
  const frames = svg.match(/@keyframes visit\{(.*?)\}\}/)?.[1] ?? ''
  const away = [...frames.matchAll(/([\d.]+)%\{transform:translateX/g)].map(m => (Number(m[1]) / 100) * seconds).slice(0, -1)
  const visits = Array.from({ length: away.length / 2 }, (_, k) => ({ start: away[2 * k] ?? NaN, end: away[2 * k + 1] ?? NaN }))

  return { seconds, delay: Number(delay), visits }
}
const LOOP = visitTimeline(renderFall(art, at(30))).seconds

// The first path classed mound after a marker, as x,y pairs.
const outline = (svg: string, after = '') => {
  const from = after === '' ? 0 : svg.indexOf(after)
  const numbers = (svg.slice(from).match(/class="mound" d="([^"]+)"/)?.[1] ?? '').match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []

  return Array.from({ length: numbers.length / 2 }, (_, i) => ({ x: numbers[i * 2] ?? 0, y: numbers[i * 2 + 1] ?? 0 }))
}
const top = (svg: string, after = '') => Math.min(...outline(svg, after).map(point => point.y))
const base = (svg: string) => {
  const points = outline(svg)

  return (points.at(-1)?.x ?? 0) - (points[0]?.x ?? 0)
}

const STEPS = Array.from({ length: 20 }, (_, i) => (i + 1) * 5)

describe('the tower', () => {
  test('with no context used there is no tower, just a few leaves', () => {
    const svg = renderFall(art, at(0))

    expect(svg).not.toContain('class="mound"')
    expect(count(svg, /class="litter"/g)).toBeGreaterThan(0)
  })

  test('grows taller with every 5% step', () => {
    const tops = STEPS.map(percent => top(renderFall(art, at(percent))))

    for (const [i, y] of tops.entries()) {
      if (i > 0) {
        expect(y).toBeLessThan(tops[i - 1] ?? 0)
      }
    }
  })

  test('at 100% it stands most of the stage tall', () => {
    expect(985 - top(renderFall(art, at(100)))).toBeGreaterThan(800)
  })

  test('keeps the same base width at every step', () => {
    const widths = STEPS.map(percent => base(renderFall(art, at(percent))))

    expect(new Set(widths).size).toBe(1)
    expect(widths[0]).toBeGreaterThan(150)
  })

  test('never bulges much past its base', () => {
    for (const percent of STEPS) {
      const svg = renderFall(art, at(percent))
      const xs = outline(svg).map(point => point.x)

      expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(base(svg) * 1.1)
    }
  })

  test('taller towers hold more leaves', () => {
    expect(towerPieces(renderFall(art, at(80)))).toBeGreaterThan(towerPieces(renderFall(art, at(20))))
  })

  test('below 75% the pile uses calm colors', () => {
    const svg = renderFall(art, at(70))

    expect(svg).toContain(`fill="${CALM}"`)
    expect(svg).not.toContain(`fill="${WARM}"`)
  })

  test('from 75% the pile turns warm', () => {
    for (const percent of [75, 95]) {
      const svg = renderFall(art, at(percent))

      expect(svg).toContain(`fill="${WARM}"`)
      expect(svg).not.toContain(`fill="${CALM}"`)
    }
  })

  test('teeters once it is half the window tall', () => {
    expect(renderFall(art, at(45))).not.toContain('class="teeter')
    expect(renderFall(art, at(50))).toContain('class="teeter')
  })

  test('the root says which level and fill it draws', () => {
    const svg = renderFall(art, at(37))

    expect(svg).toContain('data-level="1"')
    expect(svg).toContain('data-fill="35"')
  })
})

describe('the big tree', () => {
  test('is full with no context used', () => {
    expect(clumps(renderFall(art, at(0)))).toBe(CLUMPS.length)
  })

  test('loses clumps as the context fills, and never gains them back while it rises', () => {
    const counts = [0, ...STEPS].map(percent => clumps(renderFall(art, at(percent))))

    for (const [i, n] of counts.entries()) {
      if (i > 0) {
        expect(n).toBeLessThanOrEqual(counts[i - 1] ?? 0)
      }
    }
    expect(counts[10]).toBeLessThan(CLUMPS.length)
    expect(counts[10]).toBeGreaterThan(0)
  })

  test('is bare from 90%, but for the last leaf', () => {
    for (const percent of [90, 100]) {
      const svg = renderFall(art, at(percent))

      expect(clumps(svg)).toBe(0)
      expect(svg).toContain('class="cling"')
    }
    expect(renderFall(art, at(85))).not.toContain('class="cling"')
  })

  test('always shows its branches', () => {
    for (const percent of [0, 50, 100]) {
      expect(renderFall(art, at(percent))).toContain('class="bough"')
    }
  })
})

describe('the gust', () => {
  test('each step up blows leaves from the tree across to the pile', () => {
    const svg = renderFall(art, at(55, 'grow', 50))

    expect(count(svg, /class="gust g\d+"/g)).toBeGreaterThan(5)
    expect(svg).toContain('class="tree gusting"')
  })

  test('the gust starts at the tree on the left and ends at the pile on the right', () => {
    const svg = renderFall(art, at(55, 'grow', 50))
    const frames = svg.match(/@keyframes g0\{[^}]*\}[^@]*\}/)?.[0] ?? ''

    expect(frames).toMatch(/^@keyframes g0\{0%\{transform:translate\(\d+(\.\d+)?vmin/)
    expect(frames).toMatch(/100%\{transform:translate\(calc\(100vw - \d+(\.\d+)?vmin\)/)
  })

  test('the clumps a step strips fall away during the gust', () => {
    const svg = renderFall(art, at(50, 'grow', 0))
    const lost = clumps(renderFall(art, at(0))) - clumps(renderFall(art, at(50)))

    expect(count(svg, /class="clump leave"/g)).toBe(lost)
  })

  test('a settled scene has no gust', () => {
    const svg = renderFall(art, at(55))

    expect(svg).not.toContain('class="gust')
    expect(svg).not.toContain('class="tree gusting"')
    expect(svg).not.toContain('clump leave')
  })

  test('reaching the wrap-up level gusts and dives', () => {
    const svg = renderFall(art, at(92, 'dive', 85))

    expect(svg).toContain('class="dive"')
    expect(svg).toContain('class="gust g0"')
  })
})

describe('after a compact', () => {
  test('the old tower collapses where it stood', () => {
    const svg = renderFall(art, at(10, 'scatter', 95))

    expect(svg).toContain('class="collapse"')
    expect(top(svg, 'class="collapse"')).toBe(top(renderFall(art, at(95))))
  })

  test('leaves swirl from the pile on the right back up to the tree on the left', () => {
    const svg = renderFall(art, at(10, 'scatter', 95))
    const frames = svg.match(/@keyframes s0\{[^}]*\}[^@]*\}/)?.[0] ?? ''

    expect(count(svg, /class="swirl s\d+"/g)).toBeGreaterThan(15)
    expect(frames).toMatch(/^@keyframes s0\{0%\{transform:translate\(calc\(100vw - \d+(\.\d+)?vmin\)/)
    expect(frames).toMatch(/100%\{transform:translate\(\d+(\.\d+)?vmin/)
  })

  test('the tree grows its leaves back', () => {
    const svg = renderFall(art, at(10, 'scatter', 95))

    expect(count(svg, /class="clump arrive"/g)).toBe(clumps(renderFall(art, at(10))))
  })

  test('the wanderer pops out if it was in the pile', () => {
    expect(renderFall(art, at(10, 'scatter', 95))).toContain('class="popout"')
    expect(renderFall(art, at(5, 'scatter', 60))).not.toContain('class="popout"')
  })
})

describe('the wanderer', () => {
  test('visits below the wrap-up level', () => {
    for (const percent of [0, 30, 60, 85]) {
      const svg = renderFall(art, at(percent))

      expect(count(svg, /class="visit"/g)).toBe(1)
      expect(svg).not.toContain('class="peek"')
    }
  })

  test('comes out again after 30 seconds to 2 minutes, a different wait each time', () => {
    const { seconds, visits } = visitTimeline(renderFall(art, at(30)))
    const gaps = visits.map((visit, k) => (visits[k + 1]?.start ?? seconds + (visits[0]?.start ?? 0)) - visit.end)

    expect(visits.length).toBeGreaterThan(3)
    for (const gap of gaps) {
      expect(gap).toBeGreaterThan(29.9)
      expect(gap).toBeLessThan(120.1)
    }
    expect(new Set(gaps.map(Math.round)).size).toBe(gaps.length)
  })

  test('draws the loop at the phase it is given', () => {
    const { seconds, delay } = visitTimeline(renderFall(art, at(30), 123.4))

    expect(Math.abs(mod(-delay, seconds) - 123.4)).toBeLessThan(0.06)
  })

  test('a new reading carries the visits on from where they were', () => {
    const first = showing({ ...at(30), time: T }, T, 0)
    const later = showing({ ...at(31), time: T + 150_000 }, T + 150_000, first.anchor)

    expect(later.anchor).toBe(first.anchor)
    expect(Math.abs(mod(later.phase - first.phase, LOOP) - 150)).toBeLessThan(0.01)
  })

  test('shown again well after its reading, the turkey is out within seconds', () => {
    for (let wait = 6_000; wait < 600_000; wait += 7_000) {
      const shown = showing({ ...at(30), time: T }, T + wait, 0)
      const { seconds, delay, visits } = visitTimeline(renderFall(art, shown.view, shown.phase))
      const now = mod(-delay, seconds)
      const isOn = visits.some(visit => now >= visit.start && now < visit.end)
      const next = Math.min(...visits.map(visit => mod(visit.start - now, seconds)))

      expect(isOn || next <= 6.1).toBe(true)
    }
  })

  test('shown again, the last move stays played rather than replaying', () => {
    const later = T + 60_000
    const gust = showing({ ...at(37, 'grow', 31), time: T }, later, 0)
    const popout = showing({ ...at(10, 'scatter', 95), time: T }, later, 0)

    expect(gust.view.transition).toBe('none')
    expect(renderFall(art, gust.view, gust.phase)).not.toContain('class="tree gusting"')
    expect(renderFall(art, popout.view, popout.phase)).not.toContain('class="popout"')
    expect(popout.view).toMatchObject({ level: 0, fill: 10, from: 0, fromFill: 10 })
  })

  test('drawn right after its reading, the move plays', () => {
    const view = { ...at(37, 'grow', 31), time: T }

    expect(showing(view, T + 300, 0).view).toBe(view)
  })

  test('asked again moments after a switch back, the turkey stays where it was', () => {
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

  test('after popping out it stays away at least 40 s, and never comes back mid-walk', () => {
    const holds: number[] = []
    for (let phase = 0; phase < LOOP; phase += 7) {
      const svg = renderFall(art, at(10, 'scatter', 95), phase)
      const { seconds, delay, visits } = visitTimeline(svg)
      const hold = Number(svg.match(/\.hold\{animation:hold ([\d.]+)s/)?.[1])
      const back = mod(hold - delay, seconds)
      holds.push(hold)

      expect(hold).toBeGreaterThan(39.9)
      expect(visits.some(visit => back > visit.start + 0.1 && back < visit.end - 0.1)).toBe(false)
    }
    expect(Math.min(...holds)).toBe(40)
    expect(Math.max(...holds)).toBeGreaterThan(40)
  })

  test('only a pop-out holds the visits back', () => {
    expect(renderFall(art, at(30))).not.toContain('class="hold"')
    expect(renderFall(art, at(5, 'scatter', 60))).not.toContain('class="hold"')
  })

  test('at the wrap-up level only the peek shows, at the top of the tower', () => {
    const svg = renderFall(art, at(95))
    const peekY = Number(svg.match(/translate\(\d+(?:\.\d+)? (\d+(?:\.\d+)?)\)"><g class="peek"/)?.[1])

    expect(svg).not.toContain('class="visit"')
    expect(Math.abs(peekY - top(svg))).toBeLessThan(40)
  })

  test('the dive plays once, on reaching the wrap-up level', () => {
    expect(renderFall(art, at(92))).not.toContain('class="dive"')
  })
})

describe('the ground and the distance', () => {
  test('leaves gather on the ground as the context fills', () => {
    const counts = [0, 50, 100].map(percent => count(renderFall(art, at(percent)), /class="ground-leaf"/g))

    expect(counts[1]).toBeGreaterThan(counts[0] ?? 0)
    expect(counts[2]).toBeGreaterThan(counts[1] ?? 0)
  })

  test('far trees stand across the back and lose their leaves in three steps, at 30, 60 and 90%', () => {
    const fullnessAt = (percent: number) => [
      ...new Set(renderFall(art, at(percent)).match(/class="far-tree" data-full="[^"]+"/g) ?? []),
    ]

    expect(count(renderFall(art, at(0)), /class="far-tree"/g)).toBe(6)
    expect(fullnessAt(0)).toEqual(['class="far-tree" data-full="1"'])
    expect(fullnessAt(25)).toEqual(['class="far-tree" data-full="1"'])
    expect(fullnessAt(30)).toEqual(['class="far-tree" data-full="0.66"'])
    expect(fullnessAt(55)).toEqual(['class="far-tree" data-full="0.66"'])
    expect(fullnessAt(60)).toEqual(['class="far-tree" data-full="0.33"'])
    expect(fullnessAt(85)).toEqual(['class="far-tree" data-full="0.33"'])
    expect(fullnessAt(90)).toEqual(['class="far-tree" data-full="0"'])
    expect(fullnessAt(100)).toEqual(['class="far-tree" data-full="0"'])
  })

  test('a step that crosses one of those marks drops a few leaves from the far trees', () => {
    expect(count(renderFall(art, at(30, 'grow', 25)), /class="far-drop fd\d"/g)).toBeGreaterThan(6)
    expect(renderFall(art, at(35, 'grow', 30))).not.toContain('class="far-drop')
    expect(renderFall(art, at(30))).not.toContain('class="far-drop')
  })

  test('after a compact the far trees grow their leaves back with the big tree', () => {
    expect(count(renderFall(art, at(10, 'scatter', 95)), /class="far-refill"/g)).toBe(6)
    expect(renderFall(art, at(10))).not.toContain('class="far-refill"')
    expect(renderFall(art, at(35, 'scatter', 55))).not.toContain('class="far-refill"')
  })

  test("the season's still scenery draws at every level", () => {
    for (const percent of [0, 50, 95]) {
      expect(renderFall(art, at(percent))).toContain(SCENERY)
    }
  })

  test('leaves drift down from the tree while it has some, and not once it is bare', () => {
    expect(renderFall(art, at(30))).toContain('class="drift dl0"')
    expect(renderFall(art, at(95))).not.toContain('class="drift dl')
  })
})

describe('the sign', () => {
  test('shows the exact context percent', () => {
    expect(renderFall(art, at(42))).toMatch(/<text class="numerals"[^>]*>42%<\/text>/)
    expect(renderFall(art, at(44))).toMatch(/<text class="numerals"[^>]*>44%<\/text>/)
  })

  test('shows a dash before there is any reading', () => {
    expect(renderFall(art, { ...at(0), percent: null })).toMatch(/<text class="numerals"[^>]*>—<\/text>/)
  })

  test('collects leaves at 30, 60 and 90%, as the far trees lose theirs', () => {
    const stuck = (percent: number) => count(renderFall(art, at(percent)), /class="stuck"/g)

    expect([25, 30, 55, 60, 85, 90, 100].map(stuck)).toEqual([0, 2, 2, 4, 4, 6, 6])
  })

  test('the turkey walks, dives and pops out in front of it', () => {
    const post = (svg: string) => svg.indexOf('class="post"')
    const visit = renderFall(art, at(42))
    const dive = renderFall(art, at(92, 'dive', 85))
    const popout = renderFall(art, at(10, 'scatter', 95))

    expect(visit.indexOf('class="visit"')).toBeGreaterThan(post(visit))
    expect(dive.indexOf('class="dive"')).toBeGreaterThan(post(dive))
    expect(popout.indexOf('class="popout"')).toBeGreaterThan(post(popout))
  })

  test('leaves on the ground lie in front of its post', () => {
    const svg = renderFall(art, at(42))

    expect(svg.lastIndexOf('class="ground-leaf"')).toBeGreaterThan(svg.indexOf('class="post"'))
    expect(svg.indexOf('class="litter"')).toBeGreaterThan(svg.indexOf('class="post"'))
  })

  test('turns to the warning ink from 75%', () => {
    expect(renderFall(art, at(70))).not.toContain('class="sign warn"')
    expect(renderFall(art, at(75))).toContain('class="sign warn"')
  })

  test('draws at full strength, outside the faded art', () => {
    const svg = renderFall(art, at(42))
    const sign = svg.indexOf('<g class="sign')
    const lastArt = svg.lastIndexOf('<g class="art">', sign)

    expect(sign).toBeGreaterThan(-1)
    expect(svg.slice(lastArt, sign)).toContain('</g></g>')
    expect(svg.slice(lastArt, sign).split('<g').length - 1).toBe(svg.slice(lastArt, sign).split('</g>').length - 1)
  })

  test("wears the season's ornament", () => {
    expect(renderFall(art, at(42))).toContain('<circle class="acorn" r="3"/>')
  })
})

describe('motion and mode', () => {
  test('reduced motion and dark mode both have rules', () => {
    const svg = renderFall(art, at(30))

    expect(svg).toContain('@media (prefers-reduced-motion: reduce)')
    expect(svg).toContain('@media (prefers-color-scheme: dark)')
  })
})

describe('engine rules', () => {
  test('a clean scene has none', () => {
    expect(sceneProblems(renderFall(art, at(80, 'grow', 20)))).toEqual([])
  })
})
