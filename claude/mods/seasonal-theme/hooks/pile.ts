import type { Level, PileView, Reading, Transition } from '../types'

// Lower bound of each level, in percent of the context window.
const BANDS: readonly [Level, number][] = [[4, 90], [3, 75], [2, 50], [1, 25]]

// The pile's size moves in steps this big, so it doesn't redraw on every tiny change.
const STEP = 5

// A fall at least this big is a compact or clear, not drift at a step edge.
const SCATTER_DROP = 10

export const levelFor = (percent: number | null): Level =>
  percent === null ? 0 : (BANDS.find(([, floor]) => percent >= floor)?.[0] ?? 0)

export const fillFor = (percent: number | null): number =>
  percent === null ? 0 : Math.min(100, Math.floor(percent / STEP) * STEP)

export const effectivePercent = (reading: Reading): number | null => reading.preview ?? reading.live

const transitionTo = (view: PileView, level: Level, fill: number, before: number | null, after: number | null): Transition => {
  if (level === 4 && view.level < 4) {
    return 'dive'
  }

  if (fill > view.fill) {
    return 'grow'
  }

  const isBigDrop = after === null || (before !== null && before - after >= SCATTER_DROP)

  return isBigDrop ? 'scatter' : 'shrink'
}

// The view to draw after the reading changes, or null when the drawing would not change.
export const settle = (view: PileView, before: Reading, after: Reading, time: number): PileView | null => {
  const percent = effectivePercent(after)
  const level = levelFor(percent)
  const fill = fillFor(percent)
  const shown = percent === null ? null : Math.round(percent)

  if (level === view.level && fill === view.fill && shown === view.percent) {
    return null
  }

  // A new percent within the same step only changes the sign's number.
  const isStill = level === view.level && fill === view.fill

  return {
    level,
    fill,
    percent: shown,
    from: view.level,
    fromFill: view.fill,
    transition: isStill ? 'none' : transitionTo(view, level, fill, effectivePercent(before), percent),
    time,
  }
}
