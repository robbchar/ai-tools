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
export const settle = (view: PileView, before: Reading, after: Reading, seed: number): PileView | null => {
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
    seed,
  }
}

export type LeavesCommand =
  | { kind: 'preview'; percent: number }
  | { kind: 'off' }
  | { kind: 'show' }
  | { kind: 'bad'; reason: string }

export const parseLeaves = (args: string): LeavesCommand => {
  const text = args.trim().toLowerCase()

  if (text === '') {
    return { kind: 'show' }
  }

  if (text === 'off' || text === 'live') {
    return { kind: 'off' }
  }

  const percent = Number(text.replace(/%$/, ''))

  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    return { kind: 'bad', reason: `"${args.trim()}" isn't a percentage from 0 to 100, or "off".` }
  }

  return { kind: 'preview', percent }
}

const LEVEL_NAMES: Record<Level, string> = {
  0: 'scattered leaves',
  1: 'small pile',
  2: 'respectable pile',
  3: 'big pile (warm warning)',
  4: 'wrap-up (time to compact)',
}

const whole = (percent: number) => `${Math.round(percent)}%`

// What /leaves answers.
export const describeReading = (reading: Reading): string => {
  if (reading.preview !== null) {
    const live = reading.live === null ? 'no live reading yet' : `Live is ${whole(reading.live)}`

    return `Previewing ${whole(reading.preview)}: ${LEVEL_NAMES[levelFor(reading.preview)]}. ${live}; /leaves off returns to it.`
  }

  if (reading.live === null) {
    return `No context reading yet: ${LEVEL_NAMES[0]}.`
  }

  return `Context ${whole(reading.live)} (live): ${LEVEL_NAMES[levelFor(reading.live)]}.`
}
