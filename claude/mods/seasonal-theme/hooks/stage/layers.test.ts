import { describe, expect, test } from 'claude-code/testing'

import { cornerStages, coverLayer, topLeftStage } from './layers'

const widths = (svg: string) => [...svg.matchAll(/ width="([\d.]+)%"/g)].map(match => Number(match[1]))

describe('cornerStages', () => {
  test('pins two stages to the bottom corners, sized so both share one scale', () => {
    expect(cornerStages({ span: 420, markup: 'L' }, { span: 470, markup: 'R' })).toBe(
      '<svg width="47.19%" height="100%" viewBox="0 0 420 1000" preserveAspectRatio="xMinYMax meet" overflow="visible">L</svg>' +
        '<svg x="47.19%" width="52.81%" height="100%" viewBox="530 0 470 1000" preserveAspectRatio="xMaxYMax meet" overflow="visible">R</svg>',
    )
  })

  test('the two stages fill the width between them', () => {
    const [left = 0, right = 0] = widths(cornerStages({ span: 300, markup: '' }, { span: 700, markup: '' }))

    expect(left + right).toBe(100)
  })
})

describe('topLeftStage', () => {
  test('pins a stage to the top-left at the corner stages\' scale', () => {
    expect(topLeftStage({ left: 420, right: 470 }, 'S')).toBe(
      '<svg width="47.19%" height="100%" viewBox="0 0 420 1000" preserveAspectRatio="xMinYMin meet" overflow="visible">S</svg>',
    )
  })
})

describe('coverLayer', () => {
  test('covers the window with a 1600 by 1000 frame, cropped rather than squashed', () => {
    expect(coverLayer('F')).toBe('<svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax slice">F</svg>')
  })
})
