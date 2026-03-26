import type { GeneratedImagePayload, ImageGenerationResult } from './proverb-image.types'
import type { WorkersAiBinding } from '../../shared/types/app-env'

export interface ProverbImageProvider {
  generate(request: {
    prompt: string
    apiKeys: string[]
    model: string
    retryDelaySeconds: number
    quotaCooldownSeconds: number
  }): Promise<ImageGenerationResult>
}

type AiStudioErrorKind = 'quota' | 'transient' | 'invalid-key' | 'failed'

type AiStudioErrorClassification = {
  kind: AiStudioErrorKind
  reason: string
}

type AiStudioErrorPayload = {
  error?: {
    code?: number
    status?: string
    message?: string
  }
}

type WorkersAiRunResult = {
  image?: string
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function normalizeErrorMessage(message: string | undefined, fallback: string) {
  const normalized = message?.replace(/\s+/g, ' ').trim()
  return normalized ? normalized : fallback
}

function normalizeBase64Payload(value: string) {
  return value.replace(/^data:[^;]+;base64,/, '')
}

export function classifyAiStudioError(
  statusCode: number,
  apiStatus?: string,
  message?: string
): AiStudioErrorClassification {
  const normalizedStatus = (apiStatus || '').toUpperCase()
  const normalizedMessage = normalizeErrorMessage(message, 'Unknown AI Studio error')

  if (statusCode === 429 || normalizedStatus === 'RESOURCE_EXHAUSTED') {
    return { kind: 'quota', reason: normalizedMessage }
  }

  if (statusCode === 401 || statusCode === 403 || normalizedStatus === 'UNAUTHENTICATED' || normalizedStatus === 'PERMISSION_DENIED') {
    return { kind: 'invalid-key', reason: normalizedMessage }
  }

  if (statusCode === 500 || statusCode === 503 || statusCode === 504 || normalizedStatus === 'UNAVAILABLE' || normalizedStatus === 'DEADLINE_EXCEEDED') {
    return { kind: 'transient', reason: normalizedMessage }
  }

  return { kind: 'failed', reason: normalizedMessage }
}

function classifyWorkersAiError(message: string) {
  const normalizedMessage = normalizeErrorMessage(message, 'Unknown Workers AI error')
  const lower = normalizedMessage.toLowerCase()

  if (
    lower.includes('rate limit')
    || lower.includes('quota')
    || lower.includes('neuron')
    || lower.includes('capacity')
    || lower.includes('too many requests')
  ) {
    return { kind: 'quota', reason: normalizedMessage } as const
  }

  if (
    lower.includes('timed out')
    || lower.includes('timeout')
    || lower.includes('temporar')
    || lower.includes('unavailable')
    || lower.includes('internal error')
  ) {
    return { kind: 'transient', reason: normalizedMessage } as const
  }

  return { kind: 'failed', reason: normalizedMessage } as const
}

function extractImage(responseJson: Record<string, unknown>): GeneratedImagePayload | null {
  const candidates = Array.isArray(responseJson.candidates) ? responseJson.candidates : []

  for (const candidate of candidates) {
    const content = typeof candidate === 'object' && candidate !== null ? (candidate as { content?: { parts?: unknown[] } }).content : undefined
    const parts = Array.isArray(content?.parts) ? content.parts : []

    for (const part of parts) {
      const inlineData = typeof part === 'object' && part !== null
        ? (
            (part as { inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }).inlineData
            || (part as { inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }).inline_data
          )
        : undefined

      const mimeType = inlineData && 'mimeType' in inlineData ? inlineData.mimeType : inlineData && 'mime_type' in inlineData ? inlineData.mime_type : undefined
      const base64Data = inlineData?.data

      if (mimeType && base64Data) {
        return {
          mimeType,
          base64Data,
          model: ''
        }
      }
    }
  }

  return null
}

export class GoogleAiStudioImageProvider implements ProverbImageProvider {
  private readonly fetchImpl: FetchLike

  constructor(fetchImpl?: FetchLike) {
    // Cloudflare Workers can throw "Illegal invocation" when the global fetch
    // reference is detached and later invoked without the original receiver.
    this.fetchImpl = fetchImpl || ((input, init) => fetch(input, init))
  }

  async generate(request: {
    prompt: string
    apiKeys: string[]
    model: string
    retryDelaySeconds: number
    quotaCooldownSeconds: number
  }): Promise<ImageGenerationResult> {
    if (request.apiKeys.length === 0) {
      return {
        kind: 'failed',
        reason: 'No AI Studio API keys configured. Set AISTUDIO_API_KEYS before running image generation.'
      }
    }

    let sawQuotaError = false
    let sawInvalidKey = false
    let lastReason = 'Image generation failed.'

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
                  parts: [{ text: request.prompt }]
                }
              ],
              generationConfig: {
                responseModalities: ['TEXT', 'IMAGE']
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
        const generatedImage = extractImage(responseJson)

        if (!generatedImage) {
          const blockReason = typeof responseJson.promptFeedback === 'object' && responseJson.promptFeedback !== null
            ? (responseJson.promptFeedback as { blockReason?: string }).blockReason
            : undefined

          if (blockReason) {
            return {
              kind: 'failed',
              reason: `AI Studio blocked the prompt: ${blockReason}`
            }
          }

          return {
            kind: 'retry',
            reason: 'AI Studio did not return an image payload.',
            retryAfterSeconds: request.retryDelaySeconds
          }
        }

        return {
          kind: 'success',
          image: {
            ...generatedImage,
            model: request.model
          }
        }
      } catch (error) {
        return {
          kind: 'retry',
          reason: error instanceof Error ? error.message : 'Network error while calling AI Studio.',
          retryAfterSeconds: request.retryDelaySeconds
        }
      }
    }

    if (sawQuotaError) {
      return {
        kind: 'retry',
        reason: 'All configured AI Studio keys are currently rate-limited.',
        retryAfterSeconds: request.quotaCooldownSeconds
      }
    }

    if (sawInvalidKey) {
      return {
        kind: 'failed',
        reason: 'All configured AI Studio keys were rejected or do not have access to the image model.'
      }
    }

    return {
      kind: 'failed',
      reason: lastReason
    }
  }
}

export class CloudflareWorkersAiImageProvider implements ProverbImageProvider {
  constructor(private readonly ai: WorkersAiBinding) {}

  async generate(request: {
    prompt: string
    apiKeys: string[]
    model: string
    retryDelaySeconds: number
    quotaCooldownSeconds: number
  }): Promise<ImageGenerationResult> {
    try {
      const form = new FormData()
      form.append('prompt', request.prompt)
      form.append('width', '1024')
      form.append('height', '1024')

      // Workers AI expects a multipart payload for flux-2-klein-4b.
      // Serializing through Response gives us both the body stream and boundary.
      const serializedForm = new Response(form)
      const contentType = serializedForm.headers.get('content-type')

      if (!serializedForm.body || !contentType) {
        return {
          kind: 'failed',
          reason: 'Failed to serialize the Workers AI multipart request body.'
        }
      }

      const result = await this.ai.run(request.model, {
        multipart: {
          body: serializedForm.body,
          contentType
        }
      }) as WorkersAiRunResult

      if (!result.image) {
        return {
          kind: 'retry',
          reason: 'Workers AI did not return an image payload.',
          retryAfterSeconds: request.retryDelaySeconds
        }
      }

      return {
        kind: 'success',
        image: {
          mimeType: 'image/jpeg',
          base64Data: normalizeBase64Payload(result.image),
          model: request.model
        }
      }
    } catch (error) {
      const classification = classifyWorkersAiError(
        error instanceof Error ? error.message : String(error)
      )

      if (classification.kind === 'quota') {
        return {
          kind: 'retry',
          reason: classification.reason,
          retryAfterSeconds: request.quotaCooldownSeconds
        }
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
  }
}
