# Data Model: On-Demand Arabic Voice Audio

## Entity: Arabic Audio Asset

Stored on the existing `proverbs` row for v1.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `arabic_audio_url` | TEXT | No | Public URL for the saved MP3 file. |
| `arabic_audio_object_key` | TEXT | No | R2 object key for deletion/replacement. |
| `arabic_audio_text_hash` | TEXT | No | Hash of the normalized Arabic text used to generate the asset. |
| `arabic_audio_status` | TEXT | No | `null`, `generating`, `ready`, `failed`, or `limited`. |
| `arabic_audio_error` | TEXT | No | Sanitized last failure message suitable for operators, never containing secrets. |
| `arabic_audio_model` | TEXT | No | Model used for the saved asset; initial value `eleven_v3`. |
| `arabic_audio_voice_id` | TEXT | No | Voice used for the saved asset; initial value `cgSgspJ2msm6clMCkdW9`. |
| `arabic_audio_content_type` | TEXT | No | Expected `audio/mpeg`. |
| `arabic_audio_created_at` | TEXT | No | First successful generation timestamp. |
| `arabic_audio_updated_at` | TEXT | No | Last status or asset update timestamp. |

### Validation Rules

- Audio is reusable only when status is `ready`, URL is present, object key is
  present, and text hash matches the current normalized Arabic text.
- If Arabic text changes, old audio is treated as stale and must not be played for
  the changed proverb.
- Failure fields must not include API keys, raw provider response bodies, or account
  identifiers.
- `model` and `voice_id` must match the configured values for a newly generated v1
  asset.

### State Transitions

```text
null -> generating -> ready
null -> generating -> failed
null -> generating -> limited
ready -> generating    (only when Arabic text hash changes or asset is unusable)
failed -> generating   (new user retry)
limited -> generating  (after cooldown or with another available credential)
generating -> ready
generating -> failed
generating -> limited
```

## Entity: Voice Credential Pool

Configured through Worker secrets/config, not stored in D1.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ELEVENLABS_API_KEYS` | secret string | Yes for generation | Ordered list of API keys, separated by comma or newline. |
| `ELEVENLABS_VOICE_ID` | string | Yes | Defaults to `cgSgspJ2msm6clMCkdW9` if not set. |
| `ELEVENLABS_MODEL_ID` | string | Yes | Defaults to `eleven_v3` if not set. |
| `ELEVENLABS_OUTPUT_FORMAT` | string | Yes | Defaults to `mp3_44100_128`. |
| `ELEVENLABS_KEY_COOLDOWN_SECONDS` | number | No | Cooldown for keys that hit provider limits. |

### Validation Rules

- Empty keys are ignored.
- Credentials are tried in configured order.
- A failed key may be skipped for the cooldown window inside the same Worker isolate.
- The client never receives the key count, key order, or key identifiers.

## Entity: Playback Request

User-triggered request from the Arabic speaker button.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `proverbId` | string | Yes | Target proverb id. |
| `forceRegenerate` | boolean | No | Reserved for future admin-only repair flow; false for public playback. |

## Entity: Arabic Audio Response

Returned to the client.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | Yes | `ready`, `generating`, `failed`, `limited`, or `unavailable`. |
| `audioUrl` | string | When ready | Saved MP3 URL. |
| `cached` | boolean | Yes | True when no provider generation occurred for this request. |
| `message` | string | No | User-safe state message. |
| `retryAfterSeconds` | number | No | Suggested retry wait when temporarily limited. |

### Validation Rules

- `audioUrl` is present only for `ready`.
- `message` must be safe to show in the UI.
- `cached` is false only when generation was attempted and succeeded during the
  current request.
