import { describe, expect, test } from 'bun:test'

import { buildProverbImagePrompt, createProverbPromptHash } from '../../src/modules/proverb-images/proverb-image.prompt'

describe('proverb image prompt helpers', () => {
  test('builds a prompt with both Spanish and English instructions', () => {
    const prompt = buildProverbImagePrompt('A rey muerto, rey puesto.', 'The king is dead. Long live the king!')

    expect(prompt).toContain('SPANISH: A rey muerto, rey puesto.')
    expect(prompt).toContain('ENGLISH: The king is dead. Long live the king!')
    expect(prompt).toContain('Use symbolic, metaphorical, or cinematic visual storytelling')
    expect(prompt).toContain('Do not include captions')
  })

  test('prompt hash is stable across whitespace-only changes', async () => {
    const first = await createProverbPromptHash('  A rey muerto,   rey puesto. ', ' The king is dead. Long live the king! ')
    const second = await createProverbPromptHash('A rey muerto, rey puesto.', 'The king is dead. Long live the king!')

    expect(first).toBe(second)
  })

  test('prompt hash changes when English meaning changes', async () => {
    const first = await createProverbPromptHash('A rey muerto, rey puesto.', 'The king is dead. Long live the king!')
    const second = await createProverbPromptHash('A rey muerto, rey puesto.', 'When one leader falls, another takes the throne.')

    expect(first).not.toBe(second)
  })
})
