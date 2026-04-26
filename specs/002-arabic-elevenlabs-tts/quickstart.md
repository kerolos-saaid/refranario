# Quickstart: On-Demand Arabic Voice Audio

## Configuration

1. Store ElevenLabs keys as a Worker secret/config value named `ELEVENLABS_API_KEYS`.
   Use comma-separated or newline-separated values. Do not commit keys.
2. Configure defaults:
   - `ELEVENLABS_MODEL_ID=eleven_v3`
   - `ELEVENLABS_VOICE_ID=cgSgspJ2msm6clMCkdW9`
   - `ELEVENLABS_OUTPUT_FORMAT=mp3_44100_128`
   - `ELEVENLABS_KEY_COOLDOWN_SECONDS=300`
3. Reuse the existing R2 bucket binding `senor_shabi_images` for v1 audio objects
   under `audio/arabic/`.

## Migration

1. Add `server/src/migrations/006_arabic_audio_cache.sql`.
2. Add matching columns to `server/src/schema.sql`.
3. Apply locally:

```powershell
npm.cmd run d1:migrate:arabic-audio
```

4. Apply remotely with Wrangler before production deploy.

## Expected Flow

1. Open a proverb detail page.
2. Press the Arabic speaker button.
3. Client calls `POST /api/proverbs/:id/arabic-audio`.
4. Server returns a saved audio URL immediately if one exists for the current Arabic text.
5. If no saved audio exists, server tries configured ElevenLabs keys in order.
6. On success, server saves MP3 to R2, writes D1 metadata, and returns the URL.
7. Client creates an `Audio` element for the returned URL and plays it.
8. Spanish and English buttons continue using browser speech synthesis.

## Validation

```powershell
bun test server/test/e2e/proverb-arabic-audio.e2e.test.ts
bun test server/test
npm.cmd run build
```

## Manual Checks

- Detail page: first Arabic click generates, then plays.
- Detail page: second Arabic click reuses saved audio.
- Detail page: rapid repeated clicks do not create duplicate generations.
- Edit page: Arabic preview uses server audio only for saved existing proverbs.
- Create page: Arabic preview is disabled with a clear "save first" state because
  unsaved text has no stable proverb id for caching in v1.
- Offline: saved media may play from browser cache; new generation shows a clear error.
- Failure: one exhausted key falls through to the next configured key.
- All keys exhausted: user sees a temporary failure message, no broken audio URL is saved.
