import { describe, expect, test } from 'claude-code/testing'

import type { Level, PileView, Transition } from '../types'

import { renderScene, sceneProblems } from './scene'
import type { SceneArt } from './seasons/types'

// A plain stand-in season: shows the scene works with any art.
const CALM = '#00aa00'
const WARM = '#ee0000'
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
  wanderer: {
    body: '<g class="head"><circle r="3"/></g><g class="leg-a"><path d="M0 0v5"/></g><g class="leg-b"><path d="M2 0v5"/></g>',
    peek: '<path class="tail" d="M0 0l5 -9"/>',
  },
}

const view = (level: Level, transition: Transition = 'none', from: Level = level): PileView => ({
  level,
  from,
  transition,
  seed: 42,
})

const count = (svg: string, pattern: RegExp) => svg.match(pattern)?.length ?? 0
const heapPieces = (svg: string) => count(svg, /class="piece[ "]/g)
const LEVELS: readonly Level[] = [0, 1, 2, 3, 4]

describe('renderScene', () => {
  test('the pile holds more pieces at each level', () => {
    const sizes = LEVELS.map(level => heapPieces(renderScene(art, view(level))))

    expect(sizes[0]).toBe(0)
    for (const [i, size] of sizes.entries()) {
      if (i > 0) {
        expect(size).toBeGreaterThan(sizes[i - 1] ?? 0)
      }
    }
  })

  test('below the warning levels the pile uses calm colors', () => {
    const svg = renderScene(art, view(2))

    expect(svg).toContain(`fill="${CALM}"`)
    expect(svg).not.toContain(`fill="${WARM}"`)
  })

  test('from the warning level up the pile turns warm', () => {
    for (const level of [3, 4] as const) {
      const svg = renderScene(art, view(level))

      expect(svg).toContain(`fill="${WARM}"`)
      expect(svg).not.toContain(`fill="${CALM}"`)
    }
  })

  test('the wanderer visits below the wrap-up level', () => {
    for (const level of [0, 1, 2, 3] as const) {
      const svg = renderScene(art, view(level))

      expect(count(svg, /class="visit"/g)).toBe(1)
      expect(svg).not.toContain('class="peek"')
    }
  })

  test('at the wrap-up level only the peek shows, out of the pile', () => {
    const svg = renderScene(art, view(4))

    expect(svg).toContain('class="peek"')
    expect(svg).not.toContain('class="visit"')
  })

  test('reaching the wrap-up level plays the dive once', () => {
    expect(renderScene(art, view(4, 'dive', 3))).toContain('class="dive"')
    expect(renderScene(art, view(4))).not.toContain('class="dive"')
  })

  test('a scatter from the wrap-up level throws the old pile and pops the wanderer out', () => {
    const svg = renderScene(art, view(0, 'scatter', 4))

    expect(count(svg, /class="burst b\d+"/g)).toBe(heapPieces(renderScene(art, view(4))))
    expect(svg).toContain('class="popout"')
    expect(svg).not.toContain('class="peek"')
  })

  test('a scatter from a lower level throws the pile with no pop-out', () => {
    const svg = renderScene(art, view(0, 'scatter', 2))

    expect(count(svg, /class="burst b\d+"/g)).toBe(heapPieces(renderScene(art, view(2))))
    expect(svg).not.toContain('class="popout"')
  })

  test('growing lands only the pieces the old level lacked', () => {
    const svg = renderScene(art, view(2, 'grow', 1))
    const added = heapPieces(renderScene(art, view(2))) - heapPieces(renderScene(art, view(1)))

    expect(count(svg, /class="piece new"/g)).toBe(added)
    expect(svg).toContain('class="heap grow"')
  })

  test('a settled pile plays no one-time animation', () => {
    const svg = renderScene(art, view(2))

    expect(svg).not.toContain('class="heap grow"')
    expect(svg).not.toContain('class="piece new"')
    expect(svg).not.toContain('class="burst')
  })

  test('the root says which level it draws', () => {
    for (const level of LEVELS) {
      expect(renderScene(art, view(level))).toContain(`data-level="${level}"`)
    }
  })

  test('reduced motion and dark mode both have rules', () => {
    const svg = renderScene(art, view(1))

    expect(svg).toContain('@media (prefers-reduced-motion: reduce)')
    expect(svg).toContain('@media (prefers-color-scheme: dark)')
  })
})

describe('sceneProblems', () => {
  test('a clean scene has none', () => {
    expect(sceneProblems(renderScene(art, view(3, 'grow', 1)))).toEqual([])
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
