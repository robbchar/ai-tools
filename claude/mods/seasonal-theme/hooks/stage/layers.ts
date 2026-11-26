// Layers for scenes that span the window. Stage units: 1000 to the window's height at full size.

export type StageSide = { span: number; markup: string }

const STAGE = 1000

const percent = (n: number) => Math.round(n * 10_000) / 100

// Each stage's share of the width, so both scale by min(width / total span, height / 1000).
const shares = (left: number, right: number) => {
  const leftShare = percent(left / (left + right))

  return { left: leftShare, right: Math.round((100 - leftShare) * 100) / 100 }
}

// Two bottom-corner stages at one scale: full size while there's room for both, then shrinking together.
export const cornerStages = (left: StageSide, right: StageSide): string => {
  const share = shares(left.span, right.span)

  return (
    `<svg width="${share.left}%" height="100%" viewBox="0 0 ${left.span} ${STAGE}" preserveAspectRatio="xMinYMax meet" overflow="visible">${left.markup}</svg>` +
    `<svg x="${share.left}%" width="${share.right}%" height="100%" viewBox="${STAGE - right.span} 0 ${right.span} ${STAGE}" ` +
    `preserveAspectRatio="xMaxYMax meet" overflow="visible">${right.markup}</svg>`
  )
}

// A stage pinned top-left at the same scale as `cornerStages` with these spans.
export const topLeftStage = (spans: { left: number; right: number }, markup: string): string =>
  `<svg width="${shares(spans.left, spans.right).left}%" height="100%" viewBox="0 0 ${spans.left} ${STAGE}" preserveAspectRatio="xMinYMin meet" overflow="visible">${markup}</svg>`

// A 1600 by 1000 frame over the whole window, cropped rather than squashed.
export const coverLayer = (markup: string): string =>
  `<svg width="100%" height="100%" viewBox="0 0 1600 ${STAGE}" preserveAspectRatio="xMidYMax slice">${markup}</svg>`
