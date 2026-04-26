# Contract: Arabic Audio API

## POST `/api/proverbs/:id/arabic-audio`

Generate or fetch saved Arabic audio for one proverb. Public endpoint, rate-limited.

### Request

No body for v1.

```http
POST /api/proverbs/123/arabic-audio
```

### Success: Saved Audio Reused

```http
200 OK
Content-Type: application/json
```

```json
{
  "status": "ready",
  "audioUrl": "https://pub-...r2.dev/audio/arabic/123-abc123.mp3",
  "cached": true
}
```

### Success: Generated During Request

```http
201 Created
Content-Type: application/json
```

```json
{
  "status": "ready",
  "audioUrl": "https://pub-...r2.dev/audio/arabic/123-def456.mp3",
  "cached": false
}
```

### Already Generating

```http
202 Accepted
Content-Type: application/json
```

```json
{
  "status": "generating",
  "cached": false,
  "message": "Arabic audio is being prepared. Try again shortly.",
  "retryAfterSeconds": 5
}
```

### Missing Arabic Text

```http
422 Unprocessable Entity
Content-Type: application/json
```

```json
{
  "status": "unavailable",
  "cached": false,
  "message": "No Arabic text is available for this proverb."
}
```

### Temporary Provider Limit

```http
503 Service Unavailable
Retry-After: 60
Content-Type: application/json
```

```json
{
  "status": "limited",
  "cached": false,
  "message": "Arabic audio is temporarily unavailable. Please try again soon.",
  "retryAfterSeconds": 60
}
```

### Permanent/Unexpected Failure

```http
502 Bad Gateway
Content-Type: application/json
```

```json
{
  "status": "failed",
  "cached": false,
  "message": "Arabic audio could not be prepared right now."
}
```

## `GET /api/proverbs/:id`

Existing response remains backward compatible. The `proverb` object may include
additive Arabic audio metadata so the client can show saved/generating state without
forcing generation.

```json
{
  "proverb": {
    "id": "123",
    "spanish": "...",
    "arabic": "...",
    "english": "...",
    "arabicAudio": {
      "status": "ready",
      "url": "https://pub-...r2.dev/audio/arabic/123-abc123.mp3"
    }
  }
}
```

If no audio metadata exists, `arabicAudio` may be omitted or returned as:

```json
{
  "status": null,
  "url": null
}
```

## Provider Request Shape

Server-side only; never exposed to the browser.

```http
POST https://api.elevenlabs.io/v1/text-to-speech/cgSgspJ2msm6clMCkdW9?output_format=mp3_44100_128
xi-api-key: <server secret>
Content-Type: application/json
```

```json
{
  "text": "normalized Arabic proverb text",
  "model_id": "eleven_v3",
  "language_code": "ar"
}
```
