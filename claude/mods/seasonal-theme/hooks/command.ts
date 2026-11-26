import type { Reading } from '../types'

import { levelFor } from './pile'
import type { ScenePick } from './season'
import type { SeasonId } from './seasons/types'

export type SceneCommand =
  | { kind: 'show' }
  | { kind: 'off' }
  | { kind: 'set'; scene: SeasonId | null; percent: number | null }
  | { kind: 'bad'; reason: string }

const PERCENT = /^-?\d+(?:\.\d+)?%?$/

// `/scene` words, in any order: a scene's name and a percent, or `off` on its own.
export const parseScene = (args: string, available: readonly SeasonId[]): SceneCommand => {
  const words = args.trim().split(/\s+/).filter(word => word !== '')

  if (words.length === 0) {
    return { kind: 'show' }
  }

  if (words.some(word => word.toLowerCase() === 'off')) {
    return words.length === 1 ? { kind: 'off' } : { kind: 'bad', reason: '"off" goes on its own: /scene off.' }
  }

  let scene: SeasonId | null = null
  let percent: number | null = null

  for (const word of words) {
    if (PERCENT.test(word)) {
      const value = Number(word.replace(/%$/, ''))

      if (value > 100 || value < 0) {
        return { kind: 'bad', reason: `"${word}" isn't a percentage from 0 to 100.` }
      }
      if (percent !== null) {
        return { kind: 'bad', reason: 'One percent at a time.' }
      }
      percent = value
      continue
    }

    const named = available.find(id => id === word.toLowerCase())

    if (named === undefined) {
      return { kind: 'bad', reason: `There's no "${word}" scene yet. Scenes: ${available.join(', ')}.` }
    }
    if (scene !== null) {
      return { kind: 'bad', reason: 'One scene at a time.' }
    }
    scene = named
  }

  return { kind: 'set', scene, percent }
}

const LEVEL_NAMES = ['a scattering', 'a small pile', 'a respectable pile', 'a big pile (warm warning)', 'wrap-up (time to compact)']

const whole = (percent: number) => `${Math.round(percent)}%`

const sourceOf = (pick: ScenePick) => {
  const asked = pick.isPinned ? 'pinned in settings' : 'by date'

  return pick.base === pick.wanted ? `${pick.base}, ${asked}` : `${pick.base}, standing in for ${pick.wanted} (${asked}), which has no scene yet`
}

const sceneLine = (pick: ScenePick) =>
  pick.isPreview ? `Scene: ${pick.id} (preview). Otherwise ${sourceOf(pick)}.` : `Scene: ${sourceOf(pick)}.`

const contextLine = (reading: Reading) => {
  const percent = reading.preview ?? reading.live

  if (percent === null) {
    return 'Context: no reading yet.'
  }

  const level = LEVEL_NAMES[levelFor(percent)] ?? ''

  if (reading.preview === null) {
    return `Context: ${whole(percent)} (live), ${level}.`
  }

  const live = reading.live === null ? 'no live reading yet' : `live is ${whole(reading.live)}`

  return `Context: ${whole(percent)} (preview; ${live}), ${level}.`
}

// What /scene answers: the scene and why, the context, and how to end a preview.
export const describeScene = (pick: ScenePick, reading: Reading): string => {
  const lines = [sceneLine(pick), contextLine(reading)]

  if (pick.isPreview || reading.preview !== null) {
    lines.push('/scene off ends the preview.')
  }

  return lines.join('\n')
}
