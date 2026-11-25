import { describe, expect, test } from 'claude-code/testing'

import type { PileView, Transition } from '../types'

import { fillFor, levelFor } from './pile'
import { renderScene, sceneProblems } from './scene'
import type { SceneArt } from './seasons/types'

// A plain stand-in season: shows the scene works with any art.
const CALM = '#00aa00'
const WARM = '#ee0000'
const SCENERY = '<g class="far"><circle cx="400" cy="950" r="9"/></g><rect x="100" y="800" width="20" height="185"/>'
const art: SceneArt = {
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
  scenery: { markup: SCENERY, dropFrom: [{ x: 110, y: 800 }] },
  wanderer: {
    body: '<g class="head"><circle r="3"/></g><g class="leg-a"><path d="M0 0v5"/></g><g class="leg-b"><path d="M2 0v5"/></g>',
    peek: '<path class="tail" d="M0 0l5 -9"/>',
  },
}

// A view settled at a percent, or moving to it from another.
const at = (percent: number, transition: Transition = 'none', fromPercent = percent): PileView => ({
  level: levelFor(percent),
  fill: fillFor(percent),
  from: levelFor(fromPercent),
  fromFill: fillFor(fromPercent),
  transition,
  seed: 42,
})

const count = (svg: string, pattern: RegExp) => svg.match(pattern)?.length ?? 0
const towerPieces = (svg: string) => count(svg, /class="piece"/g)

// The tower's outline as x,y pairs, from its path.
const outline = (svg: string) => {
  const numbers = (svg.match(/class="mound" d="([^"]+)"/)?.[1] ?? '').match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []

  return Array.from({ length: numbers.length / 2 }, (_, i) => ({ x: numbers[i * 2] ?? 0, y: numbers[i * 2 + 1] ?? 0 }))
}
const top = (svg: string) => Math.min(...outline(svg).map(point => point.y))
const base = (svg: string) => {
  const points = outline(svg)

  return (points.at(-1)?.x ?? 0) - (points[0]?.x ?? 0)
}

const STEPS = Array.from({ length: 20 }, (_, i) => (i + 1) * 5)

describe('the tower', () => {
  test('with no context used there is no tower, just a few leaves', () => {
    const svg = renderScene(art, at(0))

    expect(svg).not.toContain('class="mound"')
    expect(count(svg, /class="litter"/g)).toBeGreaterThan(0)
  })

  test('grows taller with every 5% step', () => {
    const tops = STEPS.map(percent => top(renderScene(art, at(percent))))

    for (const [i, y] of tops.entries()) {
      if (i > 0) {
        expect(y).toBeLessThan(tops[i - 1] ?? 0)
      }
    }
  })

  test('at 100% it stands most of the stage tall', () => {
    expect(985 - top(renderScene(art, at(100)))).toBeGreaterThan(800)
  })

  test('keeps the same base width at every step', () => {
    const widths = STEPS.map(percent => base(renderScene(art, at(percent))))

    expect(new Set(widths).size).toBe(1)
    expect(widths[0]).toBeGreaterThan(150)
  })

  test('never bulges much past its base', () => {
    for (const percent of STEPS) {
      const svg = renderScene(art, at(percent))
      const xs = outline(svg).map(point => point.x)

      expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(base(svg) * 1.1)
    }
  })

  test('taller towers hold more leaves', () => {
    expect(towerPieces(renderScene(art, at(80)))).toBeGreaterThan(towerPieces(renderScene(art, at(20))))
  })

  test('below 75% the pile uses calm colors', () => {
    const svg = renderScene(art, at(70))

    expect(svg).toContain(`fill="${CALM}"`)
    expect(svg).not.toContain(`fill="${WARM}"`)
  })

  test('from 75% the pile turns warm', () => {
    for (const percent of [75, 95]) {
      const svg = renderScene(art, at(percent))

      expect(svg).toContain(`fill="${WARM}"`)
      expect(svg).not.toContain(`fill="${CALM}"`)
    }
  })

  test('teeters once it is half the window tall', () => {
    expect(renderScene(art, at(45))).not.toContain('class="teeter')
    expect(renderScene(art, at(50))).toContain('class="teeter')
  })

  test('the root says which level and fill it draws', () => {
    const svg = renderScene(art, at(37))

    expect(svg).toContain('data-level="1"')
    expect(svg).toContain('data-fill="35"')
  })
})

describe('moves', () => {
  test('a grow springs up from the old height', () => {
    const svg = renderScene(art, at(60, 'grow', 40))

    expect(svg).toContain('class="heap grow"')
    expect(svg).toMatch(/@keyframes grow\{from\{transform:scaleY\(0\.6[67]\)/)
  })

  test('a settled tower plays no one-time animation', () => {
    const svg = renderScene(art, at(60))

    expect(svg).not.toContain('class="heap grow"')
    expect(svg).not.toContain('class="burst')
    expect(svg).not.toContain('class="dive"')
  })

  test('the wanderer visits below the wrap-up level', () => {
    for (const percent of [0, 30, 60, 85]) {
      const svg = renderScene(art, at(percent))

      expect(count(svg, /class="visit"/g)).toBe(1)
      expect(svg).not.toContain('class="peek"')
    }
  })

  test('at the wrap-up level only the peek shows, at the top of the tower', () => {
    const svg = renderScene(art, at(95))
    const peekY = Number(svg.match(/translate\(\d+(?:\.\d+)? (\d+(?:\.\d+)?)\)"><g class="peek"/)?.[1])

    expect(svg).not.toContain('class="visit"')
    expect(Math.abs(peekY - top(svg))).toBeLessThan(40)
  })

  test('reaching the wrap-up level plays the dive once', () => {
    expect(renderScene(art, at(92, 'dive', 85))).toContain('class="dive"')
    expect(renderScene(art, at(92))).not.toContain('class="dive"')
  })

  test('a scatter from the wrap-up level throws the old tower and pops the wanderer out', () => {
    const svg = renderScene(art, at(10, 'scatter', 95))

    expect(count(svg, /class="bit"/g)).toBe(towerPieces(renderScene(art, at(95))))
    expect(svg).toContain('class="popout"')
    expect(svg).not.toContain('class="peek"')
  })

  test('a scatter from lower down throws the tower with no pop-out', () => {
    const svg = renderScene(art, at(5, 'scatter', 60))

    expect(count(svg, /class="bit"/g)).toBe(towerPieces(renderScene(art, at(60))))
    expect(svg).not.toContain('class="popout"')
  })
})

describe('the left side', () => {
  test("draws the season's scenery at every level", () => {
    for (const percent of [0, 50, 95]) {
      expect(renderScene(art, at(percent))).toContain(SCENERY)
    }
  })

  test('drifters on the left fall from the scenery', () => {
    const svg = renderScene(art, at(30))

    expect(svg).toContain('<g transform="translate(110 800)"><g class="drift dl0">')
  })
})

describe('motion and mode', () => {
  test('reduced motion and dark mode both have rules', () => {
    const svg = renderScene(art, at(30))

    expect(svg).toContain('@media (prefers-reduced-motion: reduce)')
    expect(svg).toContain('@media (prefers-color-scheme: dark)')
  })
})

describe('sceneProblems', () => {
  test('a clean scene has none', () => {
    expect(sceneProblems(renderScene(art, at(80, 'grow', 20)))).toEqual([])
  })

  test('markup the engine refuses is named', () => {
    expect(sceneProblems('<svg><image/></svg>')).toHaveLength(1)
    expect(sceneProblems('<svg><!-- sky --></svg>')).toHaveLength(1)
    expect(sceneProblems('<svg><a href="#x"/></svg>')).toHaveLength(1)
    expect(sceneProblems('<svg><style>a{b:c}/* x */</style></svg>')).toHaveLength(1)
    expect(sceneProblems('<svg>&</svg>')).toHaveLength(1)
    expect(sceneProblems(`<svg>${'x'.repeat(131_072)}</svg>`)).toHaveLength(1)
  })
})

