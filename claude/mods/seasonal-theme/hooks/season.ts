import type { SeasonId } from './seasons/types'

export type SeasonChoice = 'auto' | SeasonId

const SEASON_IDS: readonly SeasonId[] = ['fall', 'winter', 'spring', 'summer']

export const FALLBACK_SEASON: SeasonId = 'fall'

// Meteorological seasons, northern hemisphere: Dec–Feb winter, Mar–May spring, and so on.
const BY_MONTH: readonly SeasonId[] = [
  'winter', 'winter', 'spring', 'spring', 'spring', 'summer',
  'summer', 'summer', 'fall', 'fall', 'fall', 'winter',
]

export const seasonForDate = (date: Date): SeasonId => BY_MONTH[date.getMonth()] ?? FALLBACK_SEASON

export const parseChoice = (value: unknown): SeasonChoice =>
  SEASON_IDS.find(id => id === value) ?? 'auto'

export const pickSeason = (
  choice: SeasonChoice,
  date: Date,
  available: readonly SeasonId[],
): SeasonId => {
  const wanted = choice === 'auto' ? seasonForDate(date) : choice

  return available.includes(wanted) ? wanted : FALLBACK_SEASON
}
