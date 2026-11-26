import type { PileView } from '../../../types'
import { r } from '../../stage/svg'
import type { Parts } from '../../stage/svg'

import { capFractionAt, GROUND_Y, TREE } from './geometry'
import { blowCss, pts } from './shapes'

// The big evergreen: six tiers, each wearing a snow cap that grows with the fill.
export const treeMarkup = (view: PileView, parts: Parts): string => {
  const { x, height } = TREE
  const top = GROUND_Y - height
  const frac = capFractionAt(view.fill)
  const isCompact = view.transition === 'scatter' && view.fromFill > view.fill
  if (isCompact) {
    blowCss(parts)
  }
  const tiers = Array.from({ length: TREE.tiers }, (_, i) => {
    const apex = top + i * height * 0.14
    const bottom = apex + height * 0.25
    const half = height * (0.075 + i * 0.042)
    const cap = (share: number) => {
      const d = (bottom - apex) * share
      const w = half * share

      return pts([[x, apex - 3], [x + w + 3, apex + d], [x + w * 0.5, apex + d * 0.78], [x, apex + d * 1.04], [x - w * 0.5, apex + d * 0.8], [x - w - 3, apex + d]])
    }
    const blown = isCompact ? `<polygon class="blow" style="animation-delay:${r(0.1 + i * 0.08)}s" points="${cap(capFractionAt(view.fromFill))}"/>` : ''

    return (
      `<polygon points="${pts([[x, apex], [x - half, bottom], [x + half, bottom]])}"/>` +
      `<polygon class="tree-dark" points="${pts([[x, apex], [x, bottom], [x + half, bottom]])}"/>` +
      `<polygon class="cap" data-depth="${frac}" points="${cap(frac)}"/>` +
      blown
    )
  })

  return `<g class="tree"><rect class="trunk" x="${x - 16}" y="${r(GROUND_Y - height * 0.12)}" width="32" height="${r(height * 0.12)}"/>${tiers.join('')}</g>`
}
