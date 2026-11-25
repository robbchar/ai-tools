// 0 scattered, 1 small, 2 respectable, 3 big (warm warning), 4 wrap-up (turkey dives in)
export type Level = 0 | 1 | 2 | 3 | 4

export type Transition = 'none' | 'grow' | 'shrink' | 'dive' | 'scatter'

// What the backdrop draws: the level and fill (percent in 5% steps), where they came from, how.
export type PileView = {
  level: Level
  fill: number
  from: Level
  fromFill: number
  transition: Transition
  seed: number
}

// Context fill as last measured, and a /leaves preview that stands in for it.
export type Reading = { live: number | null; preview: number | null }

declare module 'claude-code' {
  interface PluginState {
    'seasonal-theme': { pile: Shaped<PileView>; reading: Shaped<Reading> }
  }
}
