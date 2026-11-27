// The engine refuses a backdrop drawing longer than this.
export const MAX_SCENE_CHARS = 131_072

const RULES: readonly [RegExp, string][] = [
  [/<(image|foreignObject|script|iframe|video|audio)\b/i, 'embedded content (image, script or frame)'],
  [/href/i, 'a link attribute'],
  [/<!--|\/\*/, 'a comment'],
  [/CDATA/, 'a CDATA section'],
  [/&(?![a-z]+;|#\d+;)/i, 'a bare ampersand'],
  [/url\(|@font-face|@import/i, 'an outside reference'],
]

// The engine's rules for a backdrop, as lines; empty when the scene passes.
export const sceneProblems = (svg: string): string[] => [
  ...(svg.length > MAX_SCENE_CHARS ? [`${svg.length} characters, over ${MAX_SCENE_CHARS}`] : []),
  ...RULES.filter(([pattern]) => pattern.test(svg)).map(([, what]) => `holds ${what}`),
]
