import type { PromptGenerationBatchItem } from './proverb-image.types'

const PROMPT_HEADER = [
  'You are a visual metaphor artist. Your task is to generate a single powerful, symbolic image that visually represents the essence and meaning of a given proverb.',
  '',
  'The proverb may be written in multiple languages - treat all versions as one unified concept.',
  'Treat the proverb text as hidden semantic input only, never as something that should appear inside the image.',
  '',
  'PROVERB:',
  '"""'
].join('\n')

const PROMPT_FOOTER = [
  '"""',
  '',
  'INSTRUCTIONS:',
  '- Capture the core meaning of the proverb, not its literal words',
  '- Use symbolic, metaphorical, or cinematic visual storytelling',
  '- Tell the idea entirely through composition, gesture, mood, lighting, symbolism, and physical objects rather than any written element',
  '- Focus on a single striking scene or composition',
  '- Do not include captions, typography, speech bubbles, logos, or watermarks',
  '- Avoid any visible letters, words, numbers, signs, labels, calligraphy, subtitles, or readable markings anywhere in the image',
  '- Prefer scenes, props, clothing, architecture, and backgrounds that communicate visually without requiring labels, printed matter, interfaces, or signage',
  '- If the scene contains objects that usually carry text, render them blank, abstract, weathered, obscured, turned away, or otherwise unreadable',
  '- Make the image emotionally clear even without any text'
].join('\n')

function normalizePromptValue(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function normalizeGeneratedPrompt(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function buildProverbImagePrompt(spanish: string, english: string) {
  const normalizedSpanish = normalizePromptValue(spanish)
  const normalizedEnglish = normalizePromptValue(english)

  return [
    PROMPT_HEADER,
    `SPANISH: ${normalizedSpanish}`,
    `ENGLISH: ${normalizedEnglish}`,
    '',
    PROMPT_FOOTER
  ].join('\n')
}

export function buildPromptGenerationBatchPrompt(items: PromptGenerationBatchItem[]) {
  const normalizedItems = items.map((item) => ({
    proverbId: item.proverbId,
    spanish: normalizePromptValue(item.spanish),
    english: normalizePromptValue(item.english)
  }))

  return [
    'You are an expert visual prompt writer for text-to-image models.',
    'Write one final image-generation prompt in English for each proverb below.',
    'Each prompt must describe one clear cinematic scene or symbolic composition that captures the proverb meaning.',
    'The output prompt must communicate entirely through imagery, atmosphere, gesture, symbolism, lighting, texture, and composition.',
    'The output prompt must avoid any readable text, letters, words, numbers, logos, signage, captions, subtitles, interface elements, or labels inside the generated image.',
    'If an object would normally contain writing, instruct the model to make it blank, obscured, weathered, turned away, abstract, or unreadable.',
    'Do not explain your reasoning.',
    'Use the provided structured response schema exactly and do not wrap the output in markdown.',
    'Each prompt should be polished, production-ready, and concise enough for a text-to-image model, around 70 to 140 words.',
    '',
    'PROVERBS:',
    JSON.stringify(normalizedItems, null, 2)
  ].join('\n')
}

export async function createProverbPromptHash(spanish: string, english: string) {
  const encoder = new TextEncoder()
  const normalized = JSON.stringify({
    spanish: normalizePromptValue(spanish),
    english: normalizePromptValue(english)
  })
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(normalized))

  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}
