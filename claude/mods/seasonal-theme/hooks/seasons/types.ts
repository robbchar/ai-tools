import type { Level, PileView } from '../../types'
import type { makeColors } from '../make-colors.js'

export type SeasonId = 'fall' | 'winter' | 'spring' | 'summer'

export type Palette = Parameters<typeof makeColors>[0]

// A color for each of the app's modes.
export type ModeColor = { light: string; dark: string }

// A season draws its own scene; the engine only hands it the view and the visit clock.
export type Season = {
  id: SeasonId
  label: string
  palette: Palette
  // The backdrop for a view; `phase` is seconds into the visitor's loop.
  draw: (view: PileView, phase: number) => string
  // What a reader who can't see the scene is told, for each level.
  describe: (level: Level) => string
  // The visitor's markup; its `head`, `leg-a` and `leg-b` groups animate, so carry no transform.
  visitor: string
}
