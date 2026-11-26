import type { PileView } from '../../../types'
import { frame } from '../../stage/frame'
import { cornerStages, topLeftStage } from '../../stage/layers'
import { modeRule } from '../../stage/svg'
import type { Parts } from '../../stage/svg'
import type { ModeColor } from '../types'

import { LEFT_SPAN, RIGHT_SPAN, SPANS } from './geometry'
import { houseMarkup } from './house'
import { COLORS } from './palette'
import { signMarkup } from './sign'
import { snowBand, treeDrift } from './snow'
import { treeMarkup } from './tree'

// Every themed color, as a CSS rule with its dark-mode twin.
const RULES: readonly [string, string, ModeColor][] = [
  ['.ground', 'fill', COLORS.ground],
  ['.snow,.drift,.cap,.roof-snow,.chimney-cap,.sign-snow,.knot', 'fill', COLORS.snow],
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
export const renderWinter = (view: PileView, _phase: number): string => {
  const parts = baseCss()
  const left = treeMarkup(view) + treeDrift(view)
  const right = houseMarkup(view, parts) + snowBand(view)
  const sign = signMarkup(view, parts)

  return frame(
    view,
    parts,
    '<rect class="ground" width="100%" height="100%"/>' +
      cornerStages({ span: LEFT_SPAN, markup: left }, { span: RIGHT_SPAN, markup: right }) +
      topLeftStage(SPANS, sign),
  )
}
