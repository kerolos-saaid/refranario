import { JWT_SECRET } from '../config/app.constants'
import type { AuthenticatedUser } from '../types/app-env'

export interface TokenService {
  sign(payload: AuthenticatedUser): Promise<string>
  verify(token: string): Promise<AuthenticatedUser | null>
}

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64UrlDecode(data: string): string {
  const pad = data.length % 4
  const padded = pad ? data + '='.repeat(4 - pad) : data
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
}

async function hmacSign(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
  return base64UrlEncode(new Uint8Array(signature))
}

export class HmacJwtService implements TokenService {
  constructor(private readonly secret: string = JWT_SECRET) {}

  async sign(payload: AuthenticatedUser): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' }
    const headerB64 = base64UrlEncode(new Uint8Array(new TextEncoder().encode(JSON.stringify(header))))
    const payloadB64 = base64UrlEncode(new Uint8Array(new TextEncoder().encode(JSON.stringify(payload))))
    const signature = await hmacSign(`${headerB64}.${payloadB64}`, this.secret)

    return `${headerB64}.${payloadB64}.${signature}`
  }

  async verify(token: string): Promise<AuthenticatedUser | null> {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        return null
      }

      const header = parts[0]
      const payload = parts[1]
      const signature = parts[2]

      if (!header || !payload || !signature) {
        return null
      }

      const expectedSig = await hmacSign(`${header}.${payload}`, this.secret)

      if (signature !== expectedSig) {
        return null
      }

      return JSON.parse(base64UrlDecode(payload)) as AuthenticatedUser
    } catch {
      return null
    }
  }
}
