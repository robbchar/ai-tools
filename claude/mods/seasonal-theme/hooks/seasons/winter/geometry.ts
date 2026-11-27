import { r } from '../../stage/svg'

// Winter's stage units, from the mockup's tall house. Left-stage x is the mockup's x;
// right-stage x is the mockup's x less 600, with the window's right edge at 1000.
// Raised off the window's bottom edge so the house and tree stand on a strip of snow.
export const GROUND_Y = 940
// The snow's top with no context used: a dusting.
export const DUSTING_Y = 913
export const HOUSE = { x: 790, height: 500, half: 225, overhang: 24 } as const
export const PEAK_Y = GROUND_Y - HOUSE.height
// At 90% only the peak and the chimney stand clear.
export const SNOW_AT_90 = PEAK_Y + 85
// How far the left stage's art sits in from the window's edge, clear of the app's sidebar.
export const LEFT_INSET = 280
export const TREE = { x: 165 + LEFT_INSET, height: 815, tiers: 6 } as const
// Width each corner stage needs at full size; below their sum (× height), both shrink.
export const LEFT_SPAN = 700
export const RIGHT_SPAN = 470
export const SPANS = { left: LEFT_SPAN, right: RIGHT_SPAN } as const
export const FOX_X = 615
export const OFFSTAGE_X = 1120

const used = (fill: number) => Math.min(fill, 100)

export const snowTopAt = (fill: number): number => r(DUSTING_Y - ((DUSTING_Y - SNOW_AT_90) * used(fill)) / 90)

export const roofSnowAt = (fill: number): number => r(3 + used(fill) * 0.24)

export const capFractionAt = (fill: number): number => Math.round((0.14 + (used(fill) / 100) * 0.42) * 1000) / 1000

export const signSnowAt = (fill: number): number => r(2 + used(fill) * 0.3)
