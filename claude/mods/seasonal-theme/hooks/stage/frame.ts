import type { Level, PileView } from '../../types'

import { isWarm } from './svg'
import type { Parts } from './svg'

// The root of every scene: its level and fill, its styles in both modes, and no motion when asked.
export const frame = (view: PileView, parts: Parts, body: string): string => {
  const style =
    parts.css.join('') +
    `@media (prefers-color-scheme: dark){${parts.dark.join('')}}` +
    '@media (prefers-reduced-motion: reduce){*{animation:none!important}}'

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" data-level="${view.level}" data-fill="${view.fill}"` +
    `${isWarm(view.level) ? ' class="warm"' : ''}>` +
    `<style>${style}</style>` +
    body +
    '</svg>'
  )
}

// What a reader who can't see the scene is told.
export const altFor = (describe: (level: Level) => string, view: PileView): string =>
  view.percent === null ? describe(view.level) : `${describe(view.level)} ${view.percent}% of the context window is used.`
