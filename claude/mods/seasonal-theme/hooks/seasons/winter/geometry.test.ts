import { describe, expect, test } from 'claude-code/testing'

import { capFractionAt, GROUND_Y, HOUSE, roofSnowAt, signSnowAt, snowTopAt } from './geometry'

const FILLS = Array.from({ length: 21 }, (_, i) => i * 5)

describe('snowTopAt', () => {
  test('rises from a dusting to just under the peak at 90%', () => {
    expect(snowTopAt(0)).toBe(913)
    expect(snowTopAt(45)).toBe(719)
    expect(snowTopAt(90)).toBe(525)
    expect(snowTopAt(100)).toBe(481.9)
  })

  test('rises at every 5% step', () => {
    for (const fill of FILLS.slice(1)) {
      expect(snowTopAt(fill)).toBeLessThan(snowTopAt(fill - 5))
    }
  })

  test('never buries the peak', () => {
    expect(snowTopAt(100)).toBeGreaterThan(GROUND_Y - HOUSE.height)
  })

  test('at 90% it covers 47.5% of the stage', () => {
    expect((1000 - snowTopAt(90)) / 1000).toBe(0.475)
  })
})

describe('snow on things', () => {
  test('the roof, the tree and the sign gather more at every step', () => {
    for (const fill of FILLS.slice(1)) {
      expect(roofSnowAt(fill)).toBeGreaterThan(roofSnowAt(fill - 5))
      expect(capFractionAt(fill)).toBeGreaterThan(capFractionAt(fill - 5))
      expect(signSnowAt(fill)).toBeGreaterThan(signSnowAt(fill - 5))
    }
  })

  test('caps run from a dusting to over half of each tier', () => {
    expect(capFractionAt(0)).toBe(0.14)
    expect(capFractionAt(100)).toBe(0.56)
  })
})
