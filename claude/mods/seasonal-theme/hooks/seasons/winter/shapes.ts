import { r } from '../../stage/svg'
import type { Parts } from '../../stage/svg'

// Polygon points from [x, y] pairs.
export const pts = (list: readonly (readonly [number, number])[]): string => list.map(([x, y]) => `${r(x)},${r(y)}`).join(' ')

// Snow blowing off something in a compact's gust: hidden at rest.
export const blowCss = (parts: Parts): void => {
  if (!parts.css.includes(BLOW_CSS)) {
    parts.css.push(BLOW_CSS)
  }
}

const BLOW_CSS =
  '.blow{opacity:0;animation:blow 1.8s ease-out .2s both}@keyframes blow{0%{transform:none;opacity:1}100%{transform:translate(90px,-30px);opacity:0}}'
