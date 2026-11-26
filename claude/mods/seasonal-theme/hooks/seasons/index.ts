import { fall } from './fall'
import type { Season, SeasonId } from './types'
import { winter } from './winter'

// Add a season (its folder's `Season`) here, and to the `season` options in plugin.json.
export const SEASONS: readonly Season[] = [fall, winter]

export const AVAILABLE: readonly SeasonId[] = SEASONS.map(season => season.id)

export const seasonById = (id: string): Season => SEASONS.find(season => season.id === id) ?? fall
