import { describe, expect, test } from 'claude-code/testing'

import { altFor, renderScene } from '../scene'
import { fall } from '../seasons/fall'

import { ALT_FILLS, FALL_CASES, hashOf, viewAt } from './cases'
import { FALL_HASHES } from './hashes'

describe('the fall lock', () => {
  test('fall draws exactly what it drew before the rework', () => {
    const changed = FALL_CASES.filter(c => hashOf(renderScene(fall.art, c.view, c.phase)) !== FALL_HASHES[c.key]).map(c => c.key)

    expect(changed).toEqual([])
  })

  test("fall's alt text is unchanged", () => {
    const changed = ALT_FILLS.filter(fill => hashOf(altFor(fall.art, viewAt(fill))) !== FALL_HASHES[`alt:${fill}`])

    expect(changed).toEqual([])
    expect(hashOf(altFor(fall.art, { ...viewAt(0), percent: null }))).toBe(FALL_HASHES['alt:none'])
  })
})
