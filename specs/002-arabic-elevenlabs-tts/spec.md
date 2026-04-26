# Feature Specification: On-Demand Arabic Voice Audio

**Feature Branch**: `002-arabic-elevenlabs-tts`  
**Created**: 2026-04-26  
**Status**: Draft  
**Input**: User description: "Change only Arabic audio to use ElevenLabs. Generate Arabic voice audio only when the user presses the audio playback button. Cache generated audio after the first successful generation so repeated playback does not generate again. Support multiple configured service credentials and automatically fall back to the next credential when one fails or reaches its usage limit."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play Arabic Audio On Demand (Priority: P1)

A visitor viewing a proverb can press the Arabic audio button and hear a natural Arabic reading without the app pre-generating audio for every proverb.

**Why this priority**: This is the core user value: better Arabic playback while avoiding unnecessary generation work and quota usage.

**Independent Test**: Can be fully tested by opening a proverb that has Arabic text but no saved Arabic audio, pressing the Arabic audio button once, and confirming audio plays after generation completes.

**Acceptance Scenarios**:

1. **Given** a proverb has Arabic text and no saved Arabic audio, **When** the user presses the Arabic audio button, **Then** the system generates Arabic voice audio, saves it, and plays it for the user.
2. **Given** a proverb has English or Spanish text, **When** the user uses non-Arabic audio controls, **Then** the existing non-Arabic audio behavior is unchanged.
3. **Given** a proverb does not have Arabic text, **When** the Arabic audio control would otherwise be available, **Then** the system does not request new Arabic voice generation and presents an appropriate unavailable state.

---

### User Story 2 - Reuse Saved Arabic Audio (Priority: P2)

A visitor can replay Arabic audio for a proverb without spending another voice generation request after the audio has already been created once.

**Why this priority**: Caching protects provider quotas, reduces cost, and makes repeated playback feel instant.

**Independent Test**: Can be tested by generating Arabic audio once for a proverb, replaying it, and confirming the second playback uses the saved audio.

**Acceptance Scenarios**:

1. **Given** a proverb already has saved Arabic audio, **When** the user presses the Arabic audio button, **Then** the saved audio plays without starting a new generation.
2. **Given** a user presses the Arabic audio button multiple times after generation completes, **When** each playback starts, **Then** the same saved audio asset is reused.
3. **Given** a saved Arabic audio asset cannot be loaded, **When** the user presses playback, **Then** the system reports the failure and may attempt regeneration only when the saved asset is confirmed unusable.

---

### User Story 3 - Continue Through Credential Limits (Priority: P3)

A visitor should still get Arabic audio when one configured voice service credential is exhausted or temporarily failing, as long as another configured credential can complete the request.

**Why this priority**: The app should avoid visible failures caused by a single exhausted free-tier or limited credential.

**Independent Test**: Can be tested by configuring one unusable or exhausted credential followed by one valid credential, pressing Arabic playback, and confirming audio still generates and plays.

**Acceptance Scenarios**:

1. **Given** multiple voice service credentials are configured, **When** the first usable credential fails due to limit or temporary provider failure, **Then** the system automatically attempts the next configured credential.
2. **Given** all configured credentials fail, **When** the user requests Arabic audio, **Then** the user sees a clear temporary failure message and no broken audio is saved.
3. **Given** a credential fails due to a temporary limit, **When** future Arabic generation requests occur, **Then** the system avoids wasting immediate retries on that same limited credential when another credential is available.

### Edge Cases

- What happens when the user rapidly presses Arabic playback before the first generation finishes?
- How does the system handle Arabic text that is very long, contains punctuation, diacritics, mixed Latin characters, or unusual spacing?
- How does the flow behave when a generated audio save succeeds but playback fails in the browser?
- What happens when generation succeeds but persistent storage is temporarily unavailable?
- How does the system avoid saving partial or invalid audio when the provider returns an error?
- How are expired, missing, malformed, or exhausted credentials handled without exposing secret values to users or logs?
- How does the system behave offline or with poor network connectivity after audio was previously cached?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST use the new premium voice generation flow only for Arabic proverb audio.
- **FR-002**: System MUST leave existing English and Spanish audio behavior unchanged.
- **FR-003**: System MUST start Arabic voice generation only after a user explicitly requests Arabic playback.
- **FR-004**: System MUST save a successfully generated Arabic audio asset so subsequent playback for the same proverb reuses the saved asset.
- **FR-005**: System MUST play saved Arabic audio immediately when a saved usable asset exists.
- **FR-006**: System MUST prevent duplicate generation for the same proverb when multiple playback requests occur while generation is already in progress.
- **FR-007**: System MUST support an ordered set of securely configured voice service credentials.
- **FR-008**: System MUST try the next configured credential automatically when the current credential fails due to quota, rate limit, authentication failure, or temporary provider error.
- **FR-009**: System MUST stop retrying and show a user-safe temporary failure message when no configured credential can complete the generation.
- **FR-010**: System MUST NOT expose credential values in client code, user-facing messages, saved records, or routine logs.
- **FR-011**: System MUST NOT save an Arabic audio asset unless generation completes successfully and the audio is usable.
- **FR-012**: System MUST keep enough status information to distinguish saved, generating, failed, and unavailable Arabic audio states.
- **FR-013**: System MUST allow future operators to add or remove credentials without changing user-facing behavior.
- **FR-014**: System MUST preserve the selected Arabic voice identity and quality settings consistently across generated Arabic audio unless operators intentionally change them.

### Cultural & Content Requirements

- **CR-001**: System MUST preserve Spanish source text, Arabic equivalent, English translation, category, notes, curator, and date fields unless the spec explicitly changes them.
- **CR-002**: System MUST render Arabic text with correct right-to-left behavior wherever affected.
- **CR-003**: Generated Arabic audio MUST read the stored Arabic proverb text without translating, summarizing, or changing its wording.

### Security & Operations Requirements

- **SR-001**: Protected mutations MUST require server-side admin authorization when they are exposed beyond visitor playback.
- **SR-002**: Voice provider credentials MUST be stored and accessed only through protected server-side configuration.
- **SR-003**: Provider failures MUST be reported to users without revealing provider internals, credential identifiers, or secret values.
- **SR-004**: Rollout notes MUST list any new storage, environment, or operational dependency needed for Arabic audio generation and saved audio playback.

### Offline & PWA Requirements

- **OR-001**: System MUST define loading, error, refresh/update, and offline behavior for affected routes.
- **OR-002**: Previously saved Arabic audio SHOULD remain playable through the normal cached media behavior when available to the client.
- **OR-003**: New Arabic voice generation MUST fail gracefully when the user is offline.

### Key Entities

- **Arabic Audio Asset**: A saved audio file associated with a proverb's Arabic text, including playback location, creation status, and enough metadata to validate reuse.
- **Voice Credential Pool**: The ordered set of protected credentials available for Arabic voice generation fallback.
- **Playback Request**: A user-initiated request to hear Arabic audio for one proverb.
- **Arabic Audio State**: The current per-proverb state for Arabic playback, such as unavailable, generating, saved, failed, or temporarily limited.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For proverbs with saved Arabic audio, 95% of Arabic playback attempts begin within 2 seconds on a typical broadband connection.
- **SC-002**: For proverbs without saved Arabic audio, 90% of successful first-time Arabic playback requests complete generation, save the audio, and start playback within 15 seconds.
- **SC-003**: Replaying Arabic audio for the same proverb after a successful first generation results in zero additional generation requests in 100% of normal replay cases.
- **SC-004**: When the first configured credential is exhausted but a later credential is usable, Arabic audio generation succeeds without user intervention in at least 95% of attempts.
- **SC-005**: When all configured credentials fail, 100% of affected users receive a clear temporary failure state instead of a broken or silent playback action.
- **SC-006**: English and Spanish audio behavior has no user-visible regression in existing playback scenarios.

## Assumptions

- The selected premium Arabic voice provider is ElevenLabs, but credential values are managed outside source control.
- Operators will provide one or more credentials in a secure ordered configuration.
- Arabic audio is generated from the stored Arabic proverb text only.
- A single default Arabic voice identity and voice quality profile will be used for the first version.
- Existing storage used for generated media can store the generated Arabic audio assets unless planning identifies a capacity or compatibility issue.
- Existing playback UI can be extended to show generating, saved, and temporary failure states.
- The example credential shared during discussion is treated as sensitive and must not be committed to source control.
