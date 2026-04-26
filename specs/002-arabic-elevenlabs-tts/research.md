# Research: On-Demand Arabic Voice Audio

## Decision: Use ElevenLabs Create Speech over server-side REST fetch

**Rationale**: The Worker can call `POST /v1/text-to-speech/:voice_id` with
`xi-api-key`, `model_id`, `text`, and `output_format`, then stream or buffer the
returned MP3 into R2. This keeps credentials server-side and avoids adding a new SDK
dependency until implementation proves the SDK is Worker-compatible and worth the
bundle/runtime surface.

**Alternatives considered**:
- Official TypeScript SDK: convenient API, but a new dependency is unnecessary for a
single endpoint and may add Worker compatibility risk.
- Browser-side SDK: rejected because credentials would be exposed to the client.

**Source**: https://elevenlabs.io/docs/api-reference/text-to-speech/convert

## Decision: Use `eleven_v3` with voice `cgSgspJ2msm6clMCkdW9`

**Rationale**: The user explicitly selected this model and voice. ElevenLabs
documentation lists `eleven_v3` as a text-to-speech model supporting 70+ languages,
including Arabic. Because v3 is more expressive and higher latency than low-latency
models, the app will cache after the first generation and will not use it for
continuous real-time conversation.

**Alternatives considered**:
- `eleven_multilingual_v2`: more stable for long-form, but user selected v3.
- Flash models: lower latency, but not the requested voice quality target.

**Source**: https://elevenlabs.io/docs/overview/models

## Decision: Store generated MP3 in existing R2 bucket under an audio prefix

**Rationale**: The app already uses R2 for generated/uploaded media and has a public
R2 base URL. Storing Arabic MP3 files in the same bucket under `audio/arabic/` keeps
deployment small and avoids a new Cloudflare resource. Metadata in D1 points to the
public URL and object key.

**Alternatives considered**:
- Separate R2 bucket: cleaner isolation, but additional binding/config burden for a
small first version.
- D1 BLOB storage: rejected because audio belongs in object storage, not relational
rows.

## Decision: Add D1 columns to `proverbs` for Arabic audio metadata

**Rationale**: Audio is one cached asset per proverb Arabic text. Storing URL, object
key, text hash, status, error, and timestamps on `proverbs` avoids another table and
keeps `GET /proverbs/:id` able to expose current audio state if needed.

**Alternatives considered**:
- Separate `proverb_audio_assets` table: more flexible for multiple voices/history,
but unnecessary for one Arabic voice/model in v1.

## Decision: Rotate credentials per request and cooldown failing credentials in memory

**Rationale**: Credentials are configured as an ordered secret list. For each
generation, the service tries available keys in order and moves to the next on
quota, rate-limit, auth, timeout, or provider failure. A per-isolate in-memory
cooldown avoids immediate repeated use of a failing key; D1 state protects the
proverb from duplicate generation. This is enough for v1 and does not require a new
persistent credential tracking table.

**Alternatives considered**:
- Persistent per-key quota table: more observable, but risks storing key identifiers
and adds complexity before usage data proves it is needed.
- Random key selection: simpler but less predictable and harder to reason about when
debugging.

## Decision: New public endpoint is idempotent and concurrency guarded

**Rationale**: The playback button is public, but it spends provider quota. The route
must be rate-limited and safe under repeated clicks. If audio exists for the current
Arabic text hash, return it. If generation is already in progress, return an
accepted/in-progress state rather than start another provider request.

**Alternatives considered**:
- Admin-only generation: does not match visitor playback requirement.
- Queue-based generation: useful for bulk jobs, but user requested generation when
pressing the playback button, not pre-generation.
