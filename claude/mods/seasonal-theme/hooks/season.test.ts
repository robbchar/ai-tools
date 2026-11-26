import { describe, expect, test } from 'claude-code/testing'

import { parseChoice, pickScene, pickSeason, seasonForDate } from './season'

const on = (month: number, day: number) => new Date(2026, month - 1, day, 12)

describe('seasonForDate', () => {
  test('meteorological seasons, northern hemisphere', () => {
    expect(seasonForDate(on(2, 28))).toBe('winter')
    expect(seasonForDate(on(3, 1))).toBe('spring')
    expect(seasonForDate(on(5, 31))).toBe('spring')
    expect(seasonForDate(on(6, 1))).toBe('summer')
    expect(seasonForDate(on(8, 31))).toBe('summer')
    expect(seasonForDate(on(9, 1))).toBe('fall')
    expect(seasonForDate(on(11, 30))).toBe('fall')
    expect(seasonForDate(on(12, 1))).toBe('winter')
  })
})

describe('pickSeason', () => {
  const all = ['fall', 'winter', 'spring', 'summer'] as const

  test('auto follows the date', () => {
    expect(pickSeason('auto', on(1, 15), all)).toBe('winter')
    expect(pickSeason('auto', on(11, 26), all)).toBe('fall')
  })

  test('a pinned season wins over the date', () => {
    expect(pickSeason('summer', on(11, 26), all)).toBe('summer')
  })

  test('a season with no art yet falls back to fall', () => {
    expect(pickSeason('auto', on(1, 15), ['fall'])).toBe('fall')
    expect(pickSeason('winter', on(11, 26), ['fall'])).toBe('fall')
  })
})

describe('parseChoice', () => {
  test('known values pass through', () => {
    expect(parseChoice('fall')).toBe('fall')
    expect(parseChoice('winter')).toBe('winter')
  })

  test('anything else is auto', () => {
    expect(parseChoice(undefined)).toBe('auto')
    expect(parseChoice('autumn')).toBe('auto')
    expect(parseChoice(3)).toBe('auto')
  })
})

describe('pickScene', () => {
  const both = ['fall', 'winter'] as const

  test('with no preview, the date picks', () => {
    expect(pickScene('auto', on(11, 26), both, null)).toEqual({ id: 'fall', base: 'fall', wanted: 'fall', isPinned: false, isPreview: false })
  })

  test('a preview wins over the date, which stays known', () => {
    expect(pickScene('auto', on(11, 26), both, 'winter')).toEqual({ id: 'winter', base: 'fall', wanted: 'fall', isPinned: false, isPreview: true })
  })

  test('a preview wins over a pinned season too', () => {
    expect(pickScene('winter', on(11, 26), both, 'fall')).toEqual({ id: 'fall', base: 'winter', wanted: 'winter', isPinned: true, isPreview: true })
  })

  test('a stored preview with no art any more is ignored', () => {
    expect(pickScene('auto', on(11, 26), both, 'spring')).toEqual({ id: 'fall', base: 'fall', wanted: 'fall', isPinned: false, isPreview: false })
  })

  test('where the date asks for a scene with no art, fall stands in and says for what', () => {
    expect(pickScene('auto', on(1, 15), ['fall'], null)).toEqual({ id: 'fall', base: 'fall', wanted: 'winter', isPinned: false, isPreview: false })
  })
})
