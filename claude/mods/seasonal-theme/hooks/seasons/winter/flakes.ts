import type { PileView } from '../../../types'
import { noise, r } from '../../stage/svg'
import type { Parts } from '../../stage/svg'

import { snowTopAt } from './geometry'

export type Depth = 'far' | 'mid' | 'near'
export type Flake = { depth: Depth; x: number; size: number; fall: number; cycle: number; delay: number; dx: number; shape: 'dot' | 'star' }

type Range = readonly [number, number]
const LAYERS: Record<Depth, { count: number; size: Range; fall: Range; opacity: number; sway: number; salt: number }> = {
  far: { count: 16, size: [1.6, 2.6], fall: [24, 34], opacity: 0.5, sway: 12, salt: 1 },
  mid: { count: 12, size: [3, 4.4], fall: [15, 20], opacity: 0.75, sway: 19, salt: 2 },
  near: { count: 9, size: [6, 9], fall: [8, 11], opacity: 0.9, sway: 27, salt: 3 },
}
const DEPTHS: readonly Depth[] = ['far', 'mid', 'near']
const lerp = ([a, b]: Range, t: number) => a + (b - a) * t

// Each flake falls once per cycle, then rests unseen; cycles never line up, and every redraw reshuffles.
export const flakePlan = (view: PileView): readonly Flake[] => {
  const gaps = view.fill >= 50 ? 1.5 : 2.2
  const seed = view.time % 100_000

  return DEPTHS.flatMap(depth => {
    const layer = LAYERS[depth]

    return Array.from({ length: layer.count }, (_, i): Flake => {
      const s = seed + i * 17 + layer.salt * 101
      const fall = r(lerp(layer.fall, noise(s + 2)))
      const cycle = r(fall * gaps * (0.8 + noise(s + 3) * 0.6))

      return {
        depth,
        x: r(noise(s) * 1600),
        size: r(lerp(layer.size, noise(s + 1))),
        fall,
        cycle,
        delay: r(noise(s + 5) * cycle),
        dx: r((noise(s + 4) - 0.5) * 160),
        shape: depth === 'far' ? 'dot' : 'star',
      }
    })
  })
}

// A dot, or six arms with small branches when big enough, edged so it shows on a light sky.
const shapeOf = (shape: Flake['shape'], size: number): string => {
  if (shape === 'dot') {
    return `<circle class="flake-dot" r="${r(size * 0.55)}"/>`
  }
  let d = ''
  for (let a = 0; a < 6; a++) {
    const angle = (a * Math.PI) / 3
    d += `M0 0L${r(Math.cos(angle) * size)} ${r(Math.sin(angle) * size)}`
    if (size >= 5) {
      const bx = Math.cos(angle) * size * 0.58
      const by = Math.sin(angle) * size * 0.58
      for (const side of [-1, 1]) {
        const b = angle + (side * Math.PI) / 4
        d += `M${r(bx)} ${r(by)}L${r(bx + Math.cos(b) * size * 0.32)} ${r(by + Math.sin(b) * size * 0.32)}`
      }
    }
  }
  const width = Math.max(1, size * 0.2)

  return `<path class="flake-edge" d="${d}" stroke-width="${r(width + 1.6)}"/><path class="flake-core" d="${d}" stroke-width="${r(width)}"/>`
}

const swayOf = (depth: Depth, shape: Flake['shape'], s: number) =>
  `animation:sw${depth[0]}${shape === 'star' ? 'r' : ''} ${r(3 + noise(s) * 3)}s ease-in-out -${r(noise(s + 1) * 5)}s infinite alternate`

// The CSS every snowfall layer shares: hidden at rest, edges only in light mode, a sway per depth.
export const flakeCss = (parts: Parts): void => {
  parts.css.push(
    '.flake{opacity:0}.flurry{opacity:0}.sw{transform-box:fill-box;transform-origin:center}',
    '.flake-dot{fill:#fff;stroke:rgba(110,135,160,.45);stroke-width:.9}',
    '.flake-core{stroke:#fff;fill:none;stroke-linecap:round}.flake-edge{stroke:rgba(110,135,160,.45);fill:none;stroke-linecap:round}',
    '.haze{filter:blur(.7px)}.soft{filter:blur(1.1px)}',
    ...DEPTHS.flatMap(depth => {
      const a = LAYERS[depth].sway
      const k = depth[0]

      return [
        `@keyframes sw${k}{from{transform:translateX(-${a}px)}to{transform:translateX(${a}px)}}`,
        `@keyframes sw${k}r{from{transform:translateX(-${a}px) rotate(-30deg)}to{transform:translateX(${a}px) rotate(30deg)}}`,
      ]
    }),
  )
  parts.dark.push('.flake-dot{fill:#dfe6ee;stroke:none}.flake-core{stroke:#dfe6ee}.flake-edge{stroke:none}')
}

// The planned flakes of these depths, each with its own literal keyframes, landing at `landAt(x)`.
export const flakesMarkup = (plan: readonly Flake[], depths: readonly Depth[], landAt: (x: number) => number, parts: Parts): string =>
  plan
    .map((flake, i) => ({ flake, i }))
    .filter(({ flake }) => depths.includes(flake.depth))
    .map(({ flake, i }) => {
      const name = `fk${i}`
      const share = (flake.fall / flake.cycle) * 100
      const opacity = LAYERS[flake.depth].opacity
      const dy = r(landAt(flake.x + flake.dx) + 20)
      parts.css.push(
        `.${name}{animation:${name} ${flake.cycle}s linear -${flake.delay}s infinite}`,
        `@keyframes ${name}{0%{transform:translate(0,0);opacity:0}${r(share * 0.06)}%{opacity:${opacity}}${r(share * 0.85)}%{opacity:${opacity}}` +
          `${r(share)}%,100%{transform:translate(${flake.dx}px,${dy}px);opacity:0}}`,
      )

      return `<g transform="translate(${flake.x} -20)"><g class="flake ${name}"><g class="sw" style="${swayOf(flake.depth, flake.shape, i * 7 + 3)}">${shapeOf(flake.shape, flake.size)}</g></g></g>`
    })
    .join('')

// The 5% step: a short burst of heavier snow, once.
export const flurryMarkup = (view: PileView, parts: Parts): string => {
  if (view.transition !== 'grow' && view.transition !== 'dive') {
    return ''
  }
  const land = snowTopAt(view.fill)

  return Array.from({ length: 30 }, (_, i) => {
    const s = i * 29 + 7
    const isNear = noise(s + 1) > 0.55
    const size = isNear ? lerp([5.5, 8.5], noise(s + 2)) : lerp([2.6, 4], noise(s + 2))
    const dx = r((noise(s + 3) - 0.5) * 120)
    const name = `fl${i}`
    parts.css.push(
      `.${name}{animation:${name} ${r(2.6 + noise(s + 4) * 1.4)}s ease-in ${r(noise(s + 5) * 1.2)}s 1 both}`,
      `@keyframes ${name}{0%{transform:translate(0,0);opacity:0}8%{opacity:.85}88%{opacity:.85}100%{transform:translate(${dx}px,${r(land + 20)}px);opacity:0}}`,
    )

    return `<g transform="translate(${r(noise(s) * 1600)} -20)"><g class="flurry ${name}">${shapeOf('star', size)}</g></g>`
  }).join('')
}
