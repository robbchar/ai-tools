import { describe, expect, test } from 'claude-code/testing'

import { sceneProblems } from './rules'

describe('sceneProblems', () => {
  test('markup the engine refuses is named', () => {
    expect(sceneProblems('<svg><image/></svg>')).toHaveLength(1)
    expect(sceneProblems('<svg><!-- sky --></svg>')).toHaveLength(1)
    expect(sceneProblems('<svg><a href="#x"/></svg>')).toHaveLength(1)
    expect(sceneProblems('<svg><style>a{b:c}/* x */</style></svg>')).toHaveLength(1)
    expect(sceneProblems('<svg>&</svg>')).toHaveLength(1)
    expect(sceneProblems(`<svg>${'x'.repeat(131_072)}</svg>`)).toHaveLength(1)
  })

  test('plain markup passes', () => {
    expect(sceneProblems('<svg><circle r="3"/></svg>')).toEqual([])
  })
})
