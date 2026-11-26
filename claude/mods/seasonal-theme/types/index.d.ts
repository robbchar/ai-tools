// 0 scattered, 1 small, 2 respectable, 3 big (warm warning), 4 wrap-up (turkey dives in)
export type Level = 0 | 1 | 2 | 3 | 4

export type Transition = 'none' | 'grow' | 'shrink' | 'dive' | 'scatter'

// What the backdrop draws: the level, the fill (in 5% steps) and the exact percent for the
// sign, where they came from, and how.
export type PileView = {
  level: Level
  fill: number
  percent: number | null
  from: Level
  fromFill: number
  transition: Transition
  // When this view was written, in ms: varies the drift and keeps the turkey's visits on the clock.
  time: number
}

// Context fill as last measured, and a /leaves preview that stands in for it.
export type Reading = { live: number | null; preview: number | null }

declare module 'claude-code' {
  interface PluginState {
    'seasonal-theme': { pile: Shaped<PileView>; reading: Shaped<Reading> }
  }
}
