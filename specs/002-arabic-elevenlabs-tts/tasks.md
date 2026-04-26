# Tasks: On-Demand Arabic Voice Audio

**Input**: Design documents from `/specs/002-arabic-elevenlabs-tts/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Include Bun tests for server, security, rate-limit, migration, and API-contract changes unless the plan records an approved exception. Include client build/manual route checks for user-facing UI changes.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm feature scope, affected files, and operational inputs before changing runtime behavior.

- [ ] T001 Review current browser speech synthesis usage in `client/src/hooks/useSpeechSynthesisPlayback.ts`, `client/src/pages/Detail.tsx`, and `client/src/pages/AddEdit.tsx`
- [ ] T002 Review current Hono route/service wiring in `server/src/app/create-app.ts` and `server/src/app/create-services.ts`
- [ ] T003 [P] Review existing R2 storage conventions in `server/src/shared/storage/r2-image-storage.ts` and `server/src/shared/config/app.constants.ts`
- [ ] T004 [P] Review current e2e test platform support in `server/test/support/dev-platform.ts`
- [ ] T005 Confirm no ElevenLabs API keys are committed by scanning `server/`, `client/`, `.specify/`, and `specs/002-arabic-elevenlabs-tts/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data, configuration, and shared module structure that must exist before user stories can be implemented.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Add Arabic audio metadata columns to `server/src/migrations/006_arabic_audio_cache.sql`
- [ ] T007 Add matching Arabic audio metadata columns to `server/src/schema.sql`
- [ ] T008 Add `d1:migrate:arabic-audio` script to `package.json` without overwriting unrelated existing local script changes
- [ ] T009 Add ElevenLabs and Arabic audio binding types to `server/src/shared/types/app-env.ts`
- [ ] T010 Create Arabic audio response and state types in `server/src/modules/proverb-audio/proverb-audio.types.ts`
- [ ] T011 Create Arabic audio config parser with defaults for `eleven_v3`, `cgSgspJ2msm6clMCkdW9`, `mp3_44100_128`, and key cooldown in `server/src/modules/proverb-audio/proverb-audio.config.ts`
- [ ] T012 Create R2 MP3 audio storage helper in `server/src/shared/storage/r2-audio-storage.ts`
- [ ] T013 Add proverb Arabic audio row fields and public `arabicAudio` type shape in `server/src/modules/proverbs/proverb.types.ts`
- [ ] T014 Update proverb mapper to expose additive `arabicAudio` metadata in `server/src/modules/proverbs/proverb.mapper.ts`
- [ ] T015 Add Arabic audio rate-limit policy in `server/src/shared/rate-limit/api-rate-limit.policy.ts`
- [ ] T016 Wire Arabic audio service factory and route placeholder in `server/src/app/create-services.ts` and `server/src/app/create-app.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Play Arabic Audio On Demand (Priority: P1) MVP

**Goal**: A visitor presses the Arabic audio button for a saved proverb with no cached audio, the server generates MP3 Arabic audio, saves it, returns a URL, and the client plays it.

**Independent Test**: Open a saved proverb with Arabic text and no saved Arabic audio, press the Arabic audio button once, and confirm the request generates, saves, returns, and plays an MP3 URL while Spanish/English playback remains unchanged.

### Tests for User Story 1

- [ ] T017 [P] [US1] Add e2e test for successful first-time Arabic audio generation in `server/test/e2e/proverb-arabic-audio.e2e.test.ts`
- [ ] T018 [P] [US1] Add e2e test for missing proverb and missing Arabic text responses in `server/test/e2e/proverb-arabic-audio.e2e.test.ts`
- [ ] T019 [P] [US1] Add unit test for ElevenLabs provider request shape and sanitized failures in `server/test/unit/proverb-audio-provider.test.ts`

### Implementation for User Story 1

- [ ] T020 [P] [US1] Implement ElevenLabs REST provider for `POST /v1/text-to-speech/:voice_id` in `server/src/modules/proverb-audio/proverb-audio.provider.ts`
- [ ] T021 [P] [US1] Implement Arabic text normalization and hash helpers in `server/src/modules/proverb-audio/proverb-audio.service.ts`
- [ ] T022 [US1] Implement D1 repository methods for loading proverbs and writing Arabic audio status in `server/src/modules/proverb-audio/proverb-audio.repository.ts`
- [ ] T023 [US1] Implement generation service path for no-cache first playback in `server/src/modules/proverb-audio/proverb-audio.service.ts`
- [ ] T024 [US1] Implement `POST /api/proverbs/:id/arabic-audio` with status codes from the contract in `server/src/modules/proverb-audio/proverb-audio.routes.ts`
- [ ] T025 [US1] Register Arabic audio route with public rate limit in `server/src/app/create-app.ts`
- [ ] T026 [US1] Add `generateArabicAudio` client API function and response types in `client/src/lib/api.ts`
- [ ] T027 [US1] Create server-audio playback hook with loading, playing, error, stop, and offline handling in `client/src/hooks/useArabicAudioPlayback.ts`
- [ ] T028 [US1] Replace only the Arabic detail-page playback button with the server audio hook in `client/src/pages/Detail.tsx`
- [ ] T029 [US1] Disable create-form Arabic preview with a clear save-first state while preserving saved edit behavior in `client/src/pages/AddEdit.tsx`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Reuse Saved Arabic Audio (Priority: P2)

**Goal**: Subsequent Arabic playback for the same proverb and same Arabic text reuses the saved R2 MP3 URL without making a new ElevenLabs request.

**Independent Test**: Generate Arabic audio once, press the Arabic audio button again, and confirm the second request returns the saved URL with `cached: true` and no provider call.

### Tests for User Story 2

- [ ] T030 [P] [US2] Add e2e test for cached ready audio reuse with no provider call in `server/test/e2e/proverb-arabic-audio.e2e.test.ts`
- [ ] T031 [P] [US2] Add e2e test for stale cached audio when Arabic text hash changes in `server/test/e2e/proverb-arabic-audio.e2e.test.ts`
- [ ] T032 [P] [US2] Add e2e test for duplicate rapid requests returning generating state instead of duplicate generation in `server/test/e2e/proverb-arabic-audio.e2e.test.ts`

### Implementation for User Story 2

- [ ] T033 [US2] Add ready-cache detection using URL, object key, status, model, voice id, and text hash in `server/src/modules/proverb-audio/proverb-audio.service.ts`
- [ ] T034 [US2] Add compare-and-set generating guard to prevent duplicate generation in `server/src/modules/proverb-audio/proverb-audio.repository.ts`
- [ ] T035 [US2] Return `200 cached: true` for reusable audio and `202 generating` for in-flight audio in `server/src/modules/proverb-audio/proverb-audio.routes.ts`
- [ ] T036 [US2] Update `GET /api/proverbs/:id` mapping to include current `arabicAudio` state without breaking existing fields in `server/src/modules/proverbs/proverb.mapper.ts`
- [ ] T037 [US2] Use existing `arabicAudio.url` as an immediate playback source when available in `client/src/hooks/useArabicAudioPlayback.ts` and `client/src/pages/Detail.tsx`
- [ ] T038 [US2] Clear stale Arabic audio metadata when Arabic text changes through update flow in `server/src/modules/proverbs/proverb.repository.ts`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Continue Through Credential Limits (Priority: P3)

**Goal**: If one configured ElevenLabs credential fails or hits limits, the server automatically tries the next configured credential and only reports a temporary failure when all credentials fail.

**Independent Test**: Configure a failing credential followed by a valid credential, request Arabic audio, and confirm generation succeeds without exposing credential details; configure all credentials failing and confirm a safe temporary failure.

### Tests for User Story 3

- [ ] T039 [P] [US3] Add unit tests for ordered key parsing and empty-key filtering in `server/test/unit/proverb-audio-config.test.ts`
- [ ] T040 [P] [US3] Add unit tests for provider error classification covering quota, rate limit, auth, timeout, and unexpected failures in `server/test/unit/proverb-audio-provider.test.ts`
- [ ] T041 [P] [US3] Add e2e test for fallback from exhausted first key to valid second key in `server/test/e2e/proverb-arabic-audio.e2e.test.ts`
- [ ] T042 [P] [US3] Add e2e test for all keys exhausted returning safe `limited` response with no saved broken URL in `server/test/e2e/proverb-arabic-audio.e2e.test.ts`

### Implementation for User Story 3

- [ ] T043 [US3] Implement ordered credential rotation and per-isolate cooldown in `server/src/modules/proverb-audio/proverb-audio.provider.ts`
- [ ] T044 [US3] Sanitize provider errors before saving status or returning responses in `server/src/modules/proverb-audio/proverb-audio.service.ts`
- [ ] T045 [US3] Return `503 limited` with `Retry-After` when all credentials are unavailable in `server/src/modules/proverb-audio/proverb-audio.routes.ts`
- [ ] T046 [US3] Update client Arabic audio error copy for temporary limits and retry states in `client/src/hooks/useArabicAudioPlayback.ts`
- [ ] T047 [US3] Document secret setup and rotation commands without real keys in `specs/002-arabic-elevenlabs-tts/quickstart.md`

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, cleanup, and deployment readiness across all stories.

- [ ] T048 [P] Verify no ElevenLabs API keys or credential identifiers are present in `server/`, `client/`, `.specify/`, and `specs/002-arabic-elevenlabs-tts/`
- [ ] T049 [P] Verify Arabic RTL layout, button disabled states, loading states, and alert text in `client/src/pages/Detail.tsx` and `client/src/pages/AddEdit.tsx`
- [ ] T050 [P] Verify service worker/media cache behavior does not break saved MP3 playback in `client/public/sw.js`
- [ ] T051 Run targeted server tests with `bun test server/test/e2e/proverb-arabic-audio.e2e.test.ts`
- [ ] T052 Run full server tests with `bun test server/test`
- [ ] T053 Run production build with `npm.cmd run build`
- [ ] T054 Apply local D1 migration using `npm.cmd run d1:migrate:arabic-audio`
- [ ] T055 Record production rollout steps for `ELEVENLABS_API_KEYS` and remote D1 migration in `specs/002-arabic-elevenlabs-tts/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - MVP
- **User Story 2 (Phase 4)**: Depends on Foundational and integrates with US1 response/client hook
- **User Story 3 (Phase 5)**: Depends on Foundational and provider/service boundaries from US1
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1**: Core MVP, no dependency on US2 or US3 after foundation
- **US2**: Can be implemented after foundation but is easiest after US1 endpoint/service skeleton exists
- **US3**: Can be implemented after foundation but is easiest after US1 provider/service skeleton exists

### Within Each User Story

- Tests before implementation where practical
- D1 schema and types before repositories
- Repository before service
- Service before route
- API contract before client hook
- Client hook before page integration

## Parallel Opportunities

- T003 and T004 can run in parallel with setup review tasks.
- T017, T018, and T019 can be written in parallel for US1.
- T020 and T021 can run in parallel once foundational types exist.
- T030, T031, and T032 can be written in parallel for US2.
- T039, T040, T041, and T042 can be written in parallel for US3.
- T048, T049, and T050 can run in parallel during polish.

## Parallel Example: User Story 1

```text
Task: "T017 Add e2e test for successful first-time Arabic audio generation in server/test/e2e/proverb-arabic-audio.e2e.test.ts"
Task: "T018 Add e2e test for missing proverb and missing Arabic text responses in server/test/e2e/proverb-arabic-audio.e2e.test.ts"
Task: "T019 Add unit test for ElevenLabs provider request shape and sanitized failures in server/test/unit/proverb-audio-provider.test.ts"
```

```text
Task: "T020 Implement ElevenLabs REST provider for POST /v1/text-to-speech/:voice_id in server/src/modules/proverb-audio/proverb-audio.provider.ts"
Task: "T021 Implement Arabic text normalization and hash helpers in server/src/modules/proverb-audio/proverb-audio.service.ts"
Task: "T026 Add generateArabicAudio client API function and response types in client/src/lib/api.ts"
```

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3.
3. Validate first-time Arabic generation with the targeted e2e test and a manual detail-page check.
4. Stop before cache/fallback polish if a minimal demo is needed.

### Incremental Delivery

1. Add US1 to make Arabic server audio work on demand.
2. Add US2 to protect quota through saved audio reuse and duplicate guards.
3. Add US3 to make quota exhaustion resilient across multiple credentials.
4. Run full validation and update rollout notes.

### Notes

- Do not commit real ElevenLabs API keys.
- Keep Spanish and English playback on browser speech synthesis.
- Do not add pre-generation, queues, or cron work for Arabic audio in v1.
- Preserve existing local unrelated changes in `package.json`, `pdfs/`, `scripts/`, `tmp/`, and `video/`.
