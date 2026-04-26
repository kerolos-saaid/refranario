# Implementation Plan: On-Demand Arabic Voice Audio

**Branch**: `002-arabic-elevenlabs-tts` | **Date**: 2026-04-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-arabic-elevenlabs-tts/spec.md`

## Summary

Arabic proverb audio will move from browser speech synthesis to server-side on-demand
generation through ElevenLabs. The client will request Arabic playback only when the
speaker button is pressed; the Worker will reuse an existing saved Arabic audio URL
when available, otherwise generate MP3 audio with model `eleven_v3` and voice
`cgSgspJ2msm6clMCkdW9`, save it to R2, store audio metadata in D1, and return the
playable URL. English and Spanish playback remain on the existing browser speech
synthesis hook.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Hono on Cloudflare Workers  
**Primary Dependencies**: React Router, Vite, Tailwind CSS, Hono, Wrangler, Cloudflare Workers fetch API, existing R2/D1 bindings  
**Storage**: D1 for Arabic audio metadata on `proverbs`; R2 for generated MP3 files; browser/service-worker cache for normal media reuse  
**Testing**: `bun test server/test`, targeted e2e tests for Arabic audio routes, `npm run build`, manual route check on detail/edit audio controls  
**Target Platform**: Cloudflare Workers API, Cloudflare Pages PWA, modern mobile/desktop browsers  
**Project Type**: React PWA plus Hono API with D1/R2 migration  
**Performance Goals**: Saved Arabic audio starts within 2 seconds for 95% of attempts; first generation completes and starts playback within 15 seconds for 90% of successful attempts  
**Constraints**: Arabic-only provider change, no committed credentials, server-side secret access only, no regression to Spanish/English audio, Cloudflare runtime compatibility, on-demand generation only, no duplicate generation for the same proverb while in flight  
**Scale/Scope**: Existing proverb detail route and edit route for saved proverbs; Arabic preview for unsaved create forms is disabled until the proverb is saved because v1 requires a proverb id for caching; one new public playback endpoint; one D1 migration; R2 audio object writes; no queue/cron pre-generation in v1

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Cultural fidelity**: PASS. Arabic text is read from the stored proverb without translation or rewriting; Spanish/English fields are untouched.
- **Offline-first PWA**: PASS. Saved audio can be reused through normal browser media caching; new generation fails gracefully when offline.
- **Curator security**: PASS. Credentials stay in Worker secrets/config; visitor endpoint exposes only playback status and audio URL.
- **Cloudflare data contracts**: PASS. Plan names new Hono endpoint, D1 fields, R2 object keys, Worker secrets, and compatibility with existing records.
- **Testable delivery**: PASS. Stories map to server e2e tests, client build validation, and manual playback checks.

## Project Structure

### Documentation (this feature)

```text
specs/002-arabic-elevenlabs-tts/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- arabic-audio-api.md
`-- tasks.md
```

### Source Code (repository root)

```text
client/
|-- src/
|   |-- hooks/
|   |   |-- useSpeechSynthesisPlayback.ts
|   |   `-- useArabicAudioPlayback.ts
|   |-- lib/
|   |   `-- api.ts
|   `-- pages/
|       |-- Detail.tsx
|       `-- AddEdit.tsx

server/
|-- src/
|   |-- app/
|   |   |-- create-app.ts
|   |   `-- create-services.ts
|   |-- migrations/
|   |   `-- 006_arabic_audio_cache.sql
|   |-- modules/
|   |   |-- proverb-audio/
|   |   |   |-- proverb-audio.config.ts
|   |   |   |-- proverb-audio.provider.ts
|   |   |   |-- proverb-audio.repository.ts
|   |   |   |-- proverb-audio.routes.ts
|   |   |   |-- proverb-audio.service.ts
|   |   |   `-- proverb-audio.types.ts
|   |   `-- proverbs/
|   |       |-- proverb.mapper.ts
|   |       |-- proverb.repository.ts
|   |       `-- proverb.types.ts
|   |-- shared/
|   |   |-- storage/
|   |   |   `-- r2-audio-storage.ts
|   |   `-- types/
|   |       `-- app-env.ts
|   `-- schema.sql
server/test/
    |-- e2e/
    |   `-- proverb-arabic-audio.e2e.test.ts
    `-- support/
```

**Structure Decision**: Add a dedicated `proverb-audio` server module so provider
fallback, repository state, route contracts, and audio storage do not mix with image
job code. Add a separate client hook for Arabic server audio; leave the existing
speech synthesis hook for Spanish/English. Arabic generation is limited to saved
proverbs in v1 so every generated asset can be cached against a stable proverb id
and Arabic text hash.

## Complexity Tracking

No constitution violations.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/arabic-audio-api.md](./contracts/arabic-audio-api.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Cultural fidelity**: PASS. Data model stores an `arabic_audio_text_hash` so changed Arabic text invalidates stale audio instead of playing the wrong wording.
- **Offline-first PWA**: PASS. Client contract distinguishes saved playback, generating state, temporary failure, and offline failure; saved MP3 URLs remain regular cacheable media.
- **Curator security**: PASS. Secrets use `ELEVENLABS_API_KEYS`; no key is returned to the browser or logged.
- **Cloudflare data contracts**: PASS. Migration, R2 naming, endpoint response shapes, and Worker bindings are documented.
- **Testable delivery**: PASS. Quickstart lists targeted e2e/unit validation plus build.
