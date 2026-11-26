import type { PileView } from '../../../types'
import { r } from '../../stage/svg'
import type { Parts } from '../../stage/svg'

import { GROUND_Y, HOUSE, PEAK_Y, roofSnowAt } from './geometry'
import { pts } from './shapes'

// The A-frame: roof nearly to the ground, timber gable, a big triangular window and a smoking chimney.
export const houseMarkup = (view: PileView, parts: Parts): string => {
  const { x: hx, half, height } = HOUSE
  const ro = half + HOUSE.overhang
  const apex = PEAK_Y - 16
  const slopeAt = (t: number) => apex + t * (GROUND_Y - apex)
  const chX = hx + ro * 0.22
  const chTop = slopeAt(0.22) - 60
  const snow = roofSnowAt(view.fill)
  const winBase = GROUND_Y - height * 0.36
  const winTop = PEAK_Y + height * 0.2
  const gableTop = PEAK_Y + 30
  const gableHalf = half - 18

  const planks: string[] = []
  for (let x = hx - gableHalf + 11; x < hx + gableHalf; x += 22) {
    const top = gableTop + (Math.abs(x - hx) / gableHalf) * (GROUND_Y - gableTop)
    planks.push(`<line class="plank" x1="${r(x)}" y1="${r(top)}" x2="${r(x)}" y2="${GROUND_Y}"/>`)
  }
  const rail = [-2, -1, 0, 1, 2].map(k => {
    const x = r(hx + k * half * 0.22)

    return `<line class="frame" x1="${x}" y1="${r(winBase + 4)}" x2="${x}" y2="${r(winBase + 26)}" stroke-width="3"/>`
  })
  const roofSnow = (side: 1 | -1) =>
    `<polygon points="${pts([[hx, apex - snow], [hx + side * (ro + 4), GROUND_Y - snow * 0.6], [hx + side * ro, GROUND_Y], [hx, apex]])}"/>`
  const smoke = [0, 1, 2].map(i => `<circle class="smoke" cx="${r(chX)}" cy="${r(chTop - 14)}" r="14" style="animation-delay:-${r(i * 2.2)}s"/>`)

  parts.css.push(
    '.smoke{opacity:0;transform-box:fill-box;transform-origin:center;animation:smoke 6.6s ease-out infinite}',
    '@keyframes smoke{0%{transform:translate(0,0) scale(.5);opacity:0}15%{opacity:.35}100%{transform:translate(46px,-120px) scale(1.9);opacity:0}}',
  )

  return (
    '<g class="house">' +
    `<rect class="chimney" x="${r(chX - 16)}" y="${r(chTop)}" width="32" height="90"/>` +
    `<polygon class="roof" points="${pts([[hx - ro, GROUND_Y], [hx, apex], [hx + ro, GROUND_Y]])}"/>` +
    `<polygon class="gable" points="${pts([[hx - gableHalf, GROUND_Y], [hx, gableTop], [hx + gableHalf, GROUND_Y]])}"/>` +
    planks.join('') +
    `<polygon class="glass frame" points="${pts([[hx - half * 0.42, winBase], [hx, winTop], [hx + half * 0.42, winBase]])}" stroke-width="5" stroke-linejoin="round"/>` +
    `<line class="frame" x1="${hx}" y1="${r(winTop)}" x2="${hx}" y2="${r(winBase)}" stroke-width="4"/>` +
    `<line class="frame" x1="${r(hx - half * 0.26)}" y1="${r(winBase - height * 0.16)}" x2="${r(hx + half * 0.26)}" y2="${r(winBase - height * 0.16)}" stroke-width="4"/>` +
    `<line class="frame" x1="${r(hx - half * 0.5)}" y1="${r(winBase + 26)}" x2="${r(hx + half * 0.5)}" y2="${r(winBase + 26)}" stroke-width="5"/>` +
    rail.join('') +
    `<rect class="door" x="${hx - 28}" y="${GROUND_Y - 108}" width="56" height="108" rx="4"/>` +
    `<rect class="glass frame" x="${r(hx - half * 0.62)}" y="${GROUND_Y - 92}" width="40" height="44" stroke-width="4"/>` +
    `<rect class="glass frame" x="${r(hx + half * 0.62 - 40)}" y="${GROUND_Y - 92}" width="40" height="44" stroke-width="4"/>` +
    `<g class="roof-snow" data-depth="${snow}">${roofSnow(1)}${roofSnow(-1)}</g>` +
    `<ellipse class="chimney-cap" cx="${r(chX)}" cy="${r(chTop)}" rx="${r(18 + snow * 0.15)}" ry="${r(3 + snow * 0.35)}"/>` +
    smoke.join('') +
    '</g>'
  )
}
