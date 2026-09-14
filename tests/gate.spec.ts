import { describe, expect, it } from 'vitest'
import { Config, modelMatches } from '../src/gate.ts'

describe('modelMatches', () => {
  it('matches configured Codex route patterns', () => {
    expect(modelMatches('gpt-5-codex', ['gpt-*'])).toBe(true)
    expect(modelMatches('deepseek-chat', ['gpt-*'])).toBe(false)
    expect(modelMatches('any-route', ['*'])).toBe(true)
  })

  it('defaults to GPT-5.6 and GPT-6 and accepts an explicit empty pattern list', () => {
    const defaults = ['gpt-5.6-*', 'gpt-6', 'gpt-6-*']
    expect(Config({}).modelPatterns).toEqual(defaults)
    expect(modelMatches('gpt-5.6-luna', defaults)).toBe(true)
    expect(modelMatches('gpt-6', defaults)).toBe(true)
    expect(modelMatches('gpt-6-codex', defaults)).toBe(true)
    expect(modelMatches('gpt-5.5', defaults)).toBe(false)
    expect(modelMatches('gpt-6x', defaults)).toBe(false)
    expect(modelMatches('gpt-image-1', defaults)).toBe(false)
    expect(modelMatches('gpt-5.6-luna', [])).toBe(false)
  })
})
