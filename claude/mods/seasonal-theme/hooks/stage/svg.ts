import type { Level } from '../../types'

import type { ModeColor } from '../seasons/types'

// Helpers any season's scene can use.

export const isWarm = (level: Level) => level >= 3

// Same input, same output: the scene looks the same on every redraw.
export const noise = (n: number): number => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453

  return x - Math.floor(x)
}

export const r = (n: number) => Math.round(n * 10) / 10

export const pick = <T>(list: readonly T[], i: number): T | undefined => list[i % list.length]

export const modeRule = (selector: string, prop: string, color: ModeColor) => ({
  light: `${selector}{${prop}:${color.light}}`,
  dark: `${selector}{${prop}:${color.dark}}`,
})

export type Parts = { css: string[]; dark: string[] }
export type Point = { x: number; y: number }

// Smooth closed or open paths through points, with quadratic curves between midpoints.
export const pathOf = (points: readonly Point[]): string => {
  const [first] = points
  const last = points.at(-1)

  if (first === undefined || last === undefined) {
    return ''
  }

  const curves = points.slice(1, -1).map((point, k) => {
    const next = points[k + 2] ?? point

    return `Q${r(point.x)} ${r(point.y)} ${r((point.x + next.x) / 2)} ${r((point.y + next.y) / 2)}`
  })

  return `M${r(first.x)} ${r(first.y)}${curves.join('')}L${r(last.x)} ${r(last.y)}Z`
}
