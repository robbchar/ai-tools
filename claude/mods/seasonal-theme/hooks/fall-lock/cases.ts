import type { PileView, Transition } from '../../types'
import { levelFor } from '../pile'

// Temporary: pins fall's drawings while the scene code is reworked, then goes.

// 53-bit string hash (cyrb53), as hex.
export const hashOf = (text: string): string => {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}

const MOVES: readonly [Transition, number][] = [['none', 0], ['grow', 0], ['shrink', 100], ['dive', 85], ['scatter', 100]]
const PHASES = [0, 7.3, 61.5]
const FILLS = Array.from({ length: 21 }, (_, i) => i * 5)

export const viewAt = (fill: number, transition: Transition = 'none', fromFill = fill): PileView => ({
  level: levelFor(fill),
  fill,
  percent: fill,
  from: levelFor(fromFill),
  fromFill,
  transition,
  time: 12345,
})

export const FALL_CASES: readonly { key: string; view: PileView; phase: number }[] = FILLS.flatMap(fill =>
  MOVES.flatMap(([transition, fromFill]) =>
    PHASES.map(phase => ({ key: `${fill}:${transition}:${fromFill}:${phase}`, view: viewAt(fill, transition, fromFill), phase }))))

export const ALT_FILLS = FILLS
