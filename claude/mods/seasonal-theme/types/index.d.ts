// 0 scattered, 1 small, 2 respectable, 3 big (warm warning), 4 wrap-up (turkey dives in)
export type Level = 0 | 1 | 2 | 3 | 4

export type Transition = 'none' | 'grow' | 'shrink' | 'dive' | 'scatter'

// What the backdrop draws: the pile level, the one it came from, how it got there.
export type PileView = { level: Level; from: Level; transition: Transition; seed: number }

// Context fill as last measured, and a /leaves preview that stands in for it.
export type Reading = { live: number | null; preview: number | null }

declare module 'claude-code' {
  interface PluginState {
    'seasonal-theme': { pile: Shaped<PileView>; reading: Shaped<Reading> }
  }
}
