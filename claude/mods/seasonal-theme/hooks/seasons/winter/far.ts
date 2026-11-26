import type { PileView } from '../../../types'
import { noise, r } from '../../stage/svg'
import type { Parts } from '../../stage/svg'

import { DUSTING_Y, GROUND_Y, SNOW_AT_90, snowTopAt } from './geometry'
import { pts } from './shapes'

// A far evergreen: x in percent of the window's width; z from 0 (farthest) to 1 (about
// halfway to the big tree and the house).
export type FarTree = { x: number; z: number; size: number }

const COUNT = 46
const BLURS = [2.4, 1.6, 0.9, 0.5, 0.2] as const
const bucketOf = (z: number) => (z < 0.15 ? 0 : z < 0.35 ? 1 : z < 0.55 ? 2 : z < 0.8 ? 3 : 4)
const shadeOf = (z: number) => (z < 0.25 ? 0 : z < 0.5 ? 1 : z < 0.8 ? 2 : 3)
// The field's top edge: just above where the snow stands at 90%.
const HORIZON = SNOW_AT_90 - 5

// Scattered at random; toward the window's sides they come closer.
export const farTrees = (): readonly FarTree[] =>
  Array.from({ length: COUNT }, (_, i) => {
    const x = -2 + noise(i * 7 + 3) * 104
    const edge = Math.min(1, Math.abs(x - 50) / 50)
    const z = Math.min(1, noise(i * 11 + 5) * 0.5 + edge ** 2 * (0.35 + noise(i * 13 + 1) * 0.5))

    return { x: r(x), z: Math.round(z * 1000) / 1000, size: 0.75 + noise(i * 3 + 9) * 0.5 }
  }).sort((a, b) => a.z - b.z)

// Stage-unit base and height, opacity and blur, and the share of the snow's rise it sinks by.
export const atDepth = (z: number) => {
  const seg = (far: number, mid: number, near: number) => (z <= 0.5 ? far + ((mid - far) * z) / 0.5 : mid + ((near - mid) * (z - 0.5)) / 0.5)

  return {
    base: seg(SNOW_AT_90 + 5, SNOW_AT_90 + 95, (SNOW_AT_90 + 95 + GROUND_Y) / 2),
    height: seg(60, 140, 270),
    opacity: seg(0.55, 0.88, 0.96),
    blur: BLURS[bucketOf(z)] ?? 0,
    sink: seg(0.1, 0.28, 0.45),
  }
}

// Two tiers in a 100-unit box, base on y=0, with snow on each tip.
const evergreen = (snowFrac: number) =>
  ([[-100, 24, -42], [-62, 32, 0]] as const)
    .map(([apex, half, bottom]) => {
      const d = (bottom - apex) * snowFrac
      const w = half * snowFrac

      return (
        `<polygon points="${pts([[0, apex], [-half, bottom], [half, bottom]])}"/>` +
        `<polygon class="far-cap" points="${pts([[0, apex - 2], [-w - 2, apex + d], [-w * 0.3, apex + d * 0.8], [w * 0.2, apex + d * 1.05], [w + 2, apex + d]])}"/>`
      )
    })
    .join('')

// The field across the back, and the far trees standing on it, each sinking into its own snow.
export const farMarkup = (view: PileView, parts: Parts): string => {
  const rise = DUSTING_Y - snowTopAt(view.fill)
  const snowFrac = 0.18 + Math.min(view.fill, 100) * 0.0035
  parts.css.push(BLURS.map((blur, k) => `.blur${k}{filter:blur(${blur}px)}`).join(''))

  const field =
    '<svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none">' +
    `<rect class="field" y="${HORIZON}" width="1000" height="${1010 - HORIZON}"/></svg>`
  const trees = farTrees().map(tree => {
    const depth = atDepth(tree.z)
    const height = depth.height * tree.size
    const k = 100 / height
    const sink = r(rise * depth.sink)

    return (
      `<svg x="${r(tree.x - 6)}%" y="${r((depth.base - height) / 10)}%" width="12%" height="${r(height / 10)}%" ` +
      'viewBox="-50 -100 100 100" preserveAspectRatio="xMidYMax meet" overflow="visible">' +
      `<g class="far-${shadeOf(tree.z)} blur${bucketOf(tree.z)}" opacity="${r(depth.opacity * 100) / 100}">${evergreen(snowFrac)}</g>` +
      `<ellipse class="field" data-sink="${sink}" cy="${r(30 * k)}" rx="70" ry="${r((30 + sink) * k)}"/></svg>`
    )
  })

  return field + trees.join('')
}
