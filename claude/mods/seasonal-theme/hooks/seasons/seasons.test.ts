import { describe, expect, test } from 'claude-code/testing'

import type { Level, Transition } from '../../types'
import { makeColors } from '../make-colors.js'
import { settle } from '../pile'
import { sceneProblems } from '../stage/rules'

import { SEASONS } from './index'

const FILLS = Array.from({ length: 21 }, (_, i) => i * 5)
const levelAt = (fill: number): Level => (fill >= 90 ? 4 : fill >= 75 ? 3 : fill >= 50 ? 2 : fill >= 25 ? 1 : 0)
const MOVES: readonly [Transition, number][] = [['none', 0], ['grow', 0], ['shrink', 100], ['dive', 85], ['scatter', 100]]

for (const season of SEASONS) {
  describe(season.id, () => {
    test('Desktop paints its palette', () => {
      const { problems } = makeColors(season.palette)

      expect(problems.filter(line => line.startsWith("Desktop won't paint"))).toEqual([])
    })

    test('every level and move draws a scene the engine accepts', () => {
      for (const fill of FILLS) {
        for (const [transition, fromFill] of MOVES) {
          const view = { level: levelAt(fill), fill, percent: fill, from: levelAt(fromFill), fromFill, transition, time: 12345 }

          expect(sceneProblems(season.draw(view, 0))).toEqual([])
        }
      }
    })

    test('every move between any two fills stays under the size cap', () => {
      for (const from of FILLS) {
        for (const to of FILLS) {
          const view = { level: levelAt(from), fill: from, percent: from, from: levelAt(from), fromFill: from, transition: 'none' as const, time: 12345 }
          const next = settle(view, { live: from, preview: null }, { live: to, preview: null }, 12345)

          if (next !== null) {
            expect(sceneProblems(season.draw(next, 0))).toEqual([])
          }
        }
      }
    })

    test('the parts that move carry no transform of their own', () => {
      for (const part of ['head', 'leg-a', 'leg-b']) {
        const tag = season.visitor.match(new RegExp(`<g class="${part}"[^>]*>`))?.[0]

        expect(tag).toBe(`<g class="${part}">`)
      }
    })
  })
}
