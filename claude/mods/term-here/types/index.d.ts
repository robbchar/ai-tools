export type TermHereCwd = string

declare module 'claude-code' {
  interface PluginState {
    'term-here': { cwd: TermHereCwd }
  }
}
