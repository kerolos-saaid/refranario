import { buildPromptGenerationBatchPrompt, normalizeGeneratedPrompt } from './proverb-image.prompt'
import { classifyAiStudioError } from './proverb-image.provider'
import type { PromptGenerationBatchItem, PromptGenerationResult } from './proverb-image.types'

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

type AiStudioErrorPayload = {
  error?: {
    status?: string
    message?: string
  }
}

type PromptGenerationResponsePayload = {
  prompts?: Array<{
    proverbId?: string
    prompt?: string
  }>
}

function buildPromptResponseJsonSchema(expectedSize: number) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      prompts: {
        type: 'array',
        description: 'One final image-generation prompt per proverb item in the request batch.',
        maxItems: expectedSize,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            proverbId: {
              type: 'string',
              description: 'The exact proverbId from the input batch.'
            },
            prompt: {
              type: 'string',
              description: 'A polished English prompt for a text-to-image model that communicates purely through imagery.'
            }
          },
          required: ['proverbId', 'prompt']
        }
      }
    },
    required: ['prompts']
  }
}

function tryParseJsonPayload(rawText: string) {
  try {
    return JSON.parse(rawText) as PromptGenerationResponsePayload
  } catch {
    const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    const fencedContent = fencedMatch?.[1]?.trim()

    if (fencedContent) {
      return JSON.parse(fencedContent) as PromptGenerationResponsePayload
    }

    const firstBrace = rawText.indexOf('{')
    const lastBrace = rawText.lastIndexOf('}')

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(rawText.slice(firstBrace, lastBrace + 1)) as PromptGenerationResponsePayload
    }

    throw new Error('Gemini returned prompt data, but it was not valid JSON.')
  }
}

function extractResponseText(responseJson: Record<string, unknown>) {
  const candidates = Array.isArray(responseJson.candidates) ? responseJson.candidates : []

  for (const candidate of candidates) {
    const content = typeof candidate === 'object' && candidate !== null
      ? (candidate as { content?: { parts?: unknown[] } }).content
      : undefined
    const parts = Array.isArray(content?.parts) ? content.parts : []

    for (const part of parts) {
      if (typeof part === 'object' && part !== null && 'text' in part) {
        const text = (part as { text?: unknown }).text
        if (typeof text === 'string' && text.trim()) {
          return text
        }
      }
    }
  }

  return null
}

export interface ProverbPromptProvider {
  generateBatch(request: {
    items: PromptGenerationBatchItem[]
    apiKeys: string[]
    model: string
    retryDelaySeconds: number
    quotaCooldownSeconds: number
  }): Promise<PromptGenerationResult>
}

export class GoogleAiStudioPromptProvider implements ProverbPromptProvider {
  private readonly fetchImpl: FetchLike

  constructor(fetchImpl?: FetchLike) {
    this.fetchImpl = fetchImpl || ((input, init) => fetch(input, init))
  }

  async generateBatch(request: {
    items: PromptGenerationBatchItem[]
    apiKeys: string[]
    model: string
    retryDelaySeconds: number
    quotaCooldownSeconds: number
  }): Promise<PromptGenerationResult> {
    if (request.items.length === 0) {
      return {
        kind: 'success',
        prompts: []
      }
    }

    if (request.apiKeys.length === 0) {
      return {
        kind: 'failed',
        reason: 'No AI Studio API keys configured. Set AISTUDIO_API_KEYS before running Gemini prompt generation.'
      }
    }

    let sawQuotaError = false
    let sawInvalidKey = false
    let lastReason = 'Gemini prompt generation failed.'
    const requestPrompt = buildPromptGenerationBatchPrompt(request.items)
    const responseJsonSchema = buildPromptResponseJsonSchema(request.items.length)

    for (const apiKey of request.apiKeys) {
      try {
        const response = await this.fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: requestPrompt }]
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                responseJsonSchema
              }
            })
          }
        )

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => ({}))) as AiStudioErrorPayload
          const classification = classifyAiStudioError(
            response.status,
            errorBody.error?.status,
            errorBody.error?.message
          )

          lastReason = classification.reason

          if (classification.kind === 'quota') {
            sawQuotaError = true
            continue
          }

          if (classification.kind === 'invalid-key') {
            sawInvalidKey = true
            continue
          }

          if (classification.kind === 'transient') {
            return {
              kind: 'retry',
              reason: classification.reason,
              retryAfterSeconds: request.retryDelaySeconds
            }
          }

          return {
            kind: 'failed',
            reason: classification.reason
          }
        }

        const responseJson = (await response.json()) as Record<string, unknown>
        const rawText = extractResponseText(responseJson)

        if (!rawText) {
          return {
            kind: 'retry',
            reason: 'Gemini did not return any prompt-generation text.',
            retryAfterSeconds: request.retryDelaySeconds
          }
        }

        const parsed = tryParseJsonPayload(rawText)
        const prompts = (parsed.prompts || [])
          .filter((item): item is { proverbId: string; prompt: string } =>
            typeof item?.proverbId === 'string'
            && typeof item?.prompt === 'string'
            && item.proverbId.trim().length > 0
            && item.prompt.trim().length > 0
          )
          .map((item) => ({
            proverbId: item.proverbId,
            prompt: normalizeGeneratedPrompt(item.prompt),
            model: request.model
          }))

        if (prompts.length === 0) {
          return {
            kind: 'retry',
            reason: 'Gemini returned JSON, but no usable prompts were found.',
            retryAfterSeconds: request.retryDelaySeconds
          }
        }

        return {
          kind: 'success',
          prompts
        }
      } catch (error) {
        return {
          kind: 'retry',
          reason: error instanceof Error ? error.message : 'Network error while calling Gemini prompt generation.',
          retryAfterSeconds: request.retryDelaySeconds
        }
      }
    }

    if (sawQuotaError) {
      return {
        kind: 'retry',
        reason: 'All configured AI Studio keys are currently rate-limited for Gemini prompt generation.',
        retryAfterSeconds: request.quotaCooldownSeconds
      }
    }

    if (sawInvalidKey) {
      return {
        kind: 'failed',
        reason: 'All configured AI Studio keys were rejected for Gemini prompt generation.'
      }
    }

    return {
      kind: 'failed',
      reason: lastReason
    }
  }
}
