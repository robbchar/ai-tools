import { describe, expect, test } from 'claude-code/testing'

import type { Level } from '../../../types'

import { winter } from './index'

describe('winter', () => {
  test("its description differs at every level", () => {
    const levels: Level[] = [0, 1, 2, 3, 4]

    expect(new Set(levels.map(winter.describe)).size).toBe(5)
  })
})
