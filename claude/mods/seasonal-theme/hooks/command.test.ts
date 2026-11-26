import { describe, expect, test } from 'claude-code/testing'

import { describeScene, parseScene } from './command'
import type { ScenePick } from './season'

const SCENES = ['fall', 'winter'] as const

describe('parseScene', () => {
  test('nothing asks what is showing', () => {
    expect(parseScene('  ', SCENES)).toEqual({ kind: 'show' })
  })

  test('off, in any case, ends the previews', () => {
    expect(parseScene('off', SCENES)).toEqual({ kind: 'off' })
    expect(parseScene(' OFF ', SCENES)).toEqual({ kind: 'off' })
  })

  test('a name picks a scene, in any case', () => {
    expect(parseScene('Winter', SCENES)).toEqual({ kind: 'set', scene: 'winter', percent: null })
  })

  test('a number picks a percent, with or without the sign', () => {
    expect(parseScene('80', SCENES)).toEqual({ kind: 'set', scene: null, percent: 80 })
    expect(parseScene('92.5%', SCENES)).toEqual({ kind: 'set', scene: null, percent: 92.5 })
    expect(parseScene('0', SCENES)).toEqual({ kind: 'set', scene: null, percent: 0 })
  })

  test('a name and a number go in either order', () => {
    expect(parseScene('winter 80', SCENES)).toEqual({ kind: 'set', scene: 'winter', percent: 80 })
    expect(parseScene('80  winter', SCENES)).toEqual({ kind: 'set', scene: 'winter', percent: 80 })
  })

  test('a scene with no art yet is refused, naming the ones there are', () => {
    expect(parseScene('spring 40', SCENES)).toEqual({ kind: 'bad', reason: 'There\'s no "spring" scene yet. Scenes: fall, winter.' })
  })

  test('a percent out of range is refused', () => {
    expect(parseScene('120', SCENES)).toEqual({ kind: 'bad', reason: '"120" isn\'t a percentage from 0 to 100.' })
    expect(parseScene('-1', SCENES)).toEqual({ kind: 'bad', reason: '"-1" isn\'t a percentage from 0 to 100.' })
  })

  test('two of a kind, or off with anything, is refused', () => {
    expect(parseScene('fall winter', SCENES)).toEqual({ kind: 'bad', reason: 'One scene at a time.' })
    expect(parseScene('20 30', SCENES)).toEqual({ kind: 'bad', reason: 'One percent at a time.' })
    expect(parseScene('winter off', SCENES)).toEqual({ kind: 'bad', reason: '"off" goes on its own: /scene off.' })
  })
})

const pick = (overrides: Partial<ScenePick> = {}): ScenePick => ({
  id: 'fall', base: 'fall', wanted: 'fall', isPinned: false, isPreview: false, ...overrides,
})

describe('describeScene', () => {
  test('the scene by date and the live context', () => {
    expect(describeScene(pick(), { live: 34.4, preview: null })).toBe('Scene: fall, by date.\nContext: 34% (live), a small pile.')
  })

  test('a pinned scene says so', () => {
    expect(describeScene(pick({ isPinned: true }), { live: 60, preview: null })).toBe(
      'Scene: fall, pinned in settings.\nContext: 60% (live), a respectable pile.',
    )
  })

  test('a stand-in names the scene it stands in for', () => {
    expect(describeScene(pick({ wanted: 'winter' }), { live: null, preview: null })).toBe(
      'Scene: fall, standing in for winter (by date), which has no scene yet.\nContext: no reading yet.',
    )
  })

  test('previews say what they stand over, and how to end them', () => {
    expect(describeScene(pick({ id: 'winter', isPreview: true }), { live: 30, preview: 95 })).toBe(
      'Scene: winter (preview). Otherwise fall, by date.\nContext: 95% (preview; live is 30%), wrap-up (time to compact).\n/scene off ends the preview.',
    )
  })

  test('a percent preview alone still says how to end it', () => {
    expect(describeScene(pick(), { live: null, preview: 80 })).toBe(
      'Scene: fall, by date.\nContext: 80% (preview; no live reading yet), a big pile (warm warning).\n/scene off ends the preview.',
    )
  })
})
