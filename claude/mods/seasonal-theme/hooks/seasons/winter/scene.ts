import type { PileView } from '../../../types'
import { frame } from '../../stage/frame'
import { cornerStages, coverLayer, topLeftStage } from '../../stage/layers'
import { modeRule } from '../../stage/svg'
import type { Parts } from '../../stage/svg'
import type { ModeColor } from '../types'

import { farMarkup } from './far'
import { FOX_CSS, foxMarkup } from './fox'
import { flakeCss, flakePlan, flakesMarkup, flurryMarkup } from './flakes'
import { LEFT_SPAN, RIGHT_SPAN, SNOW_AT_90, SPANS, snowTopAt } from './geometry'
import { houseMarkup } from './house'
import { COLORS } from './palette'
import { signMarkup } from './sign'
import { snowBand, treeDrift } from './snow'
import { treeMarkup } from './tree'

// Every themed color, as a CSS rule with its dark-mode twin.
const RULES: readonly [string, string, ModeColor][] = [
  ['.ground', 'fill', COLORS.ground],
  ['.field', 'fill', COLORS.field],
  ['.far-0', 'fill', COLORS.farTree0],
  ['.far-1', 'fill', COLORS.farTree1],
  ['.far-2', 'fill', COLORS.farTree2],
  ['.far-3', 'fill', COLORS.farTree3],
  ['.snow,.drift,.cap,.far-cap,.roof-snow,.chimney-cap,.sign-snow,.knot,.blow,.slide,.puff', 'fill', COLORS.snow],
  ['.snow-shade', 'stroke', COLORS.snowShade],
  ['.tree', 'fill', COLORS.tree],
  ['.tree-dark', 'fill', COLORS.treeDark],
  ['.trunk', 'fill', COLORS.trunk],
  ['.roof', 'fill', COLORS.roof],
  ['.gable', 'fill', COLORS.gable],
  ['.plank', 'stroke', COLORS.plank],
  ['.glass', 'fill', COLORS.glass],
  ['.warm .glass', 'fill', COLORS.warmGlass],
  ['.frame', 'stroke', COLORS.frame],
  ['.door', 'fill', COLORS.door],
  ['.chimney', 'fill', COLORS.chimney],
  ['.smoke', 'fill', COLORS.smoke],
  ['.board', 'fill', COLORS.wood],
  ['.board,.grain', 'stroke', COLORS.woodEdge],
  ['.numerals,.caption', 'fill', COLORS.ink],
  ['.warm .numerals', 'fill', COLORS.warmInk],
  ['.rope', 'stroke', COLORS.rope],
  ['.fox', 'fill', COLORS.fox],
  ['.fox-dark', 'fill', COLORS.foxDark],
  ['.fox-light', 'fill', COLORS.foxLight],
]

const baseCss = (): Parts => {
  const rules = RULES.map(([selector, prop, color]) => modeRule(selector, prop, color))

  return {
    css: [
      ...rules.map(rule => rule.light),
      '.snow-shade{fill:none;stroke-width:5;stroke-linecap:round;opacity:.55}',
      '.plank{stroke-width:2}.rope{stroke-width:4}.board{stroke-width:3}.grain{stroke-opacity:.5;stroke-width:1.5}.caption{opacity:.75}',
      '.glass,.door,.gable,.roof{stroke-linejoin:round}',
    ],
    dark: rules.map(rule => rule.dark),
  }
}

// Winter: snow rising across the window, measured against an A-frame house.
export const renderWinter = (view: PileView, phase: number): string => {
  const parts = baseCss()
  parts.css.push(FOX_CSS)
  const fox = foxMarkup(view, phase, parts)
  const left = treeMarkup(view, parts) + treeDrift(view)
  const right = houseMarkup(view, parts) + fox.behind + snowBand(view, parts) + fox.front
  const sign = signMarkup(view, parts)
  const plan = flakePlan(view)
  flakeCss(parts)
  const behind = `<g class="haze">${flakesMarkup(plan, ['far'], () => SNOW_AT_90 + 95, parts)}</g>${flakesMarkup(plan, ['mid'], () => 1000, parts)}`
  const land = snowTopAt(view.fill)
  const front = `<g class="soft">${flakesMarkup(plan, ['near'], () => land, parts)}</g>${flurryMarkup(view, parts)}`

  return frame(
    view,
    parts,
    '<rect class="ground" width="100%" height="100%"/>' +
      farMarkup(view, parts) +
      coverLayer(behind) +
      cornerStages({ span: LEFT_SPAN, markup: left }, { span: RIGHT_SPAN, markup: right }) +
      coverLayer(front) +
      topLeftStage(SPANS, sign),
  )
}
