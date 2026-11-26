import { r } from '../../stage/svg'

// Polygon points from [x, y] pairs.
export const pts = (list: readonly (readonly [number, number])[]): string => list.map(([x, y]) => `${r(x)},${r(y)}`).join(' ')
