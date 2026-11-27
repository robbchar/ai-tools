import type { PileView } from '../../../types'
import { r } from '../../stage/svg'
import type { Parts } from '../../stage/svg'

import { LEFT_INSET, signSnowAt } from './geometry'
import { blowCss } from './shapes'

// The sign hangs on two ropes from the window's top edge, swaying a little, snow heaped on top.
export const signMarkup = (view: PileView, parts: Parts): string => {
  const sh = signSnowAt(view.fill)
  const text = view.percent === null ? '—' : `${view.percent}%`
  const knot = r(3 + sh * 0.12)
  const heap = (depth: number) =>
    `M246 153C262 ${r(151 - depth)} 300 ${r(149 - depth * 1.15)} 330 ${r(149 - depth * 1.1)}C362 ${r(149 - depth * 1.15)} 398 ${r(151 - depth)} 414 153Z`
  const isCompact = view.transition === 'scatter' && view.fromFill > view.fill
  if (isCompact) {
    blowCss(parts)
  }
  parts.css.push(
    '.sign{transform-origin:330px 0px;animation:sway 5s ease-in-out infinite alternate}',
    '@keyframes sway{from{transform:rotate(-1.2deg)}to{transform:rotate(1.2deg)}}',
  )

  return (
    `<g transform="translate(${LEFT_INSET} 0)"><g class="sign">` +
    '<line class="rope" x1="268" y1="-5" x2="264" y2="152"/><line class="rope" x1="392" y1="-5" x2="396" y2="152"/>' +
    '<rect class="board" x="250" y="150" width="160" height="86" rx="8"/>' +
    '<line class="grain" x1="258" y1="174" x2="402" y2="174"/><line class="grain" x1="258" y1="230" x2="402" y2="230"/>' +
    `<text class="numerals" x="330" y="204" text-anchor="middle" font-family="Georgia, serif" font-size="46" font-weight="700">${text}</text>` +
    '<text class="caption" x="330" y="225" text-anchor="middle" font-family="Georgia, serif" font-size="13" letter-spacing="2">CONTEXT</text>' +
    `<path class="sign-snow" data-depth="${sh}" d="${heap(sh)}"/>` +
    (isCompact ? `<path class="blow" d="${heap(signSnowAt(view.fromFill))}"/>` : '') +
    `<circle class="knot" cx="264" cy="152" r="${knot}"/><circle class="knot" cx="396" cy="152" r="${knot}"/>` +
    '</g></g>'
  )
}
