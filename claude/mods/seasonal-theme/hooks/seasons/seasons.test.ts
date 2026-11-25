import { describe, expect, test } from 'claude-code/testing'

import type { Level, Transition } from '../../types'
import { makeColors } from '../make-colors.js'
import { renderScene, sceneProblems } from '../scene'

import { SEASONS } from './index'

const LEVELS: readonly Level[] = [0, 1, 2, 3, 4]
const MOVES: readonly [Transition, Level][] = [['none', 0], ['grow', 0], ['shrink', 4], ['dive', 3], ['scatter', 4]]

for (const season of SEASONS) {
  describe(season.id, () => {
    test('Desktop paints its palette', () => {
      const { problems } = makeColors(season.palette)

      expect(problems.filter(line => line.startsWith("Desktop won't paint"))).toEqual([])
    })

    test('every level and move draws a scene the engine accepts', () => {
      for (const level of LEVELS) {
        for (const [transition, from] of MOVES) {
          const svg = renderScene(season.art, { level, from, transition, seed: 12345 })

          expect(sceneProblems(svg)).toEqual([])
        }
      }
    })

    test('the parts that move carry no transform of their own', () => {
      for (const part of ['head', 'leg-a', 'leg-b']) {
        const tag = season.art.wanderer.body.match(new RegExp(`<g class="${part}"[^>]*>`))?.[0]

        expect(tag).toBe(`<g class="${part}">`)
      }
    })
  })
}
