---

description: "Tasks for Free Tier Job Limit Guardrails"
---

# Tasks: Free Tier Job Limit Guardrails

**Input**: Design documents from `/specs/001-fix-free-tier-jobs/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/image-job-limit-guardrails.md, quickstart.md

**Tests**: Required for this feature because it changes server job recovery, queue contracts, admin API responses, and UI behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the current job-flow surfaces and prepare shared typing/test fixtures.

- [X] T001 Review current image job repository eligibility in `server/src/modules/proverb-images/proverb-image.repository.ts`
- [X] T002 Review current enqueue/defer behavior in `server/src/modules/proverb-images/proverb-image.service.ts`
- [X] T003 [P] Review current admin API response typing in `client/src/lib/api.ts`
- [X] T004 [P] Review current job center copy and status grouping in `client/src/pages/ImageJobs.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared contracts and helper behavior needed by all user stories.

**CRITICAL**: No user story work should begin until these shared semantics are in place.

- [X] T005 Add additive backfill/regenerate response fields for `deferred` and `nextRetryAt` in `server/src/modules/proverb-images/proverb-image.types.ts`
- [X] T006 Add queue enqueue result job identity tracking for deferred messages in `server/src/modules/proverb-images/proverb-image.service.ts`
- [X] T007 Add sanitized capacity-pressure reason helper for queue/provider-facing errors in `server/src/modules/proverb-images/proverb-image.service.ts`
- [X] T008 Add stale pending safety-window eligibility support in `server/src/modules/proverb-images/proverb-image.repository.ts`
- [X] T009 [P] Confirm environment/default knobs cover sweep limit, queue batch size, retry delay, quota cooldown, and processing lease in `server/src/modules/proverb-images/proverb-image.config.ts`
- [X] T010 [P] Add shared fake queue support for partial send failure scenarios in `server/test/e2e/proverb-image-jobs.e2e.test.ts`

**Checkpoint**: Service and repository can represent accepted, deferred, and retryable work without data loss.

---

## Phase 3: User Story 1 - Backfill without quota failure (Priority: P1) MVP

**Goal**: Backfill reports partial success, preserves deferred work, and avoids duplicate active jobs during free-tier pressure.

**Independent Test**: Start backfill while producer capacity fails partway through; accepted jobs are queued, unsent jobs are retryable/deferred, and duplicate jobs are not created on repeated backfill.

### Tests for User Story 1

- [X] T011 [P] [US1] Add e2e test for partial queue producer failure preserving deferred jobs in `server/test/e2e/proverb-image-jobs.e2e.test.ts`
- [X] T012 [P] [US1] Add e2e test for repeated backfill creating zero duplicate active jobs during cooldown in `server/test/e2e/proverb-image-jobs.e2e.test.ts`
- [X] T013 [P] [US1] Add e2e test for queue binding missing returning deferred work without permanent failure in `server/test/e2e/proverb-image-jobs.e2e.test.ts`

### Implementation for User Story 1

- [X] T014 [US1] Update `enqueueMessages` to return deferred message identities and earliest retry time in `server/src/modules/proverb-images/proverb-image.service.ts`
- [X] T015 [US1] Mark unsent backfill jobs as retryable with sanitized reason and cooldown in `server/src/modules/proverb-images/proverb-image.service.ts`
- [X] T016 [US1] Update `backfill` response to include `enqueued`, `deferred`, `scanned`, `throttled`, `queueError`, and `nextRetryAt` in `server/src/modules/proverb-images/proverb-image.service.ts`
- [X] T017 [US1] Update sweep candidate query to skip fresh pending jobs and include due retry/failed/stale-pending jobs in `server/src/modules/proverb-images/proverb-image.repository.ts`
- [X] T018 [US1] Keep proverb Spanish, Arabic, English, category, notes, curator, and date fields untouched during defer/retry transitions in `server/src/modules/proverb-images/proverb-image.repository.ts`
- [X] T019 [US1] Ensure backfill route returns additive partial-success fields without removing existing fields in `server/src/modules/proverb-images/proverb-image.routes.ts`
- [X] T020 [US1] Run targeted US1 validation command documented in `specs/001-fix-free-tier-jobs/quickstart.md`

**Checkpoint**: User Story 1 is complete when backfill can hit capacity pressure without losing work or duplicating active jobs.

---

## Phase 4: User Story 2 - See why jobs are paused (Priority: P2)

**Goal**: Curators can see accepted/deferred/retry states clearly and understand when work will resume.

**Independent Test**: Open the image jobs view after a throttled run; retry/deferred jobs show waiting state, safe reason, attempts, and next retry time.

### Tests for User Story 2

- [X] T021 [P] [US2] Add e2e test for regenerate response distinguishing deferred work in `server/test/e2e/proverb-image-jobs.e2e.test.ts`
- [X] T022 [P] [US2] Add e2e test for active jobs listing retry reason and next retry time after capacity pressure in `server/test/e2e/proverb-image-jobs.e2e.test.ts`

### Implementation for User Story 2

- [X] T023 [US2] Update regenerate service result to include deferred queue pressure and next retry time in `server/src/modules/proverb-images/proverb-image.service.ts`
- [X] T024 [US2] Update regenerate route response with additive `deferred` and `nextRetryAt` fields in `server/src/modules/proverb-images/proverb-image.routes.ts`
- [X] T025 [US2] Update client API types for backfill and regenerate deferred responses in `client/src/lib/api.ts`
- [X] T026 [US2] Update ImageJobs notice copy for accepted/deferred partial success in `client/src/pages/ImageJobs.tsx`
- [X] T027 [US2] Update ImageJobs retry/deferred card copy to explain free-tier cooldown without implying data loss in `client/src/pages/ImageJobs.tsx`
- [X] T028 [US2] Keep admin-only behavior for status/backfill/regenerate endpoints covered by existing auth middleware in `server/src/app/create-app.ts`

**Checkpoint**: User Story 2 is complete when curators can tell wait/retry/deferred states apart without seeing raw provider secrets.

---

## Phase 5: User Story 3 - Recover automatically after cooldown (Priority: P3)

**Goal**: Eligible jobs resume on the first scheduled or curator-triggered processing opportunity after cooldown while staying within safety limits.

**Independent Test**: Simulate cooldown expiration before the next sweep; due jobs are selected before new work and resumed without manual cleanup.

### Tests for User Story 3

- [X] T029 [P] [US3] Add e2e test for due retry jobs being prioritized before new missing-image jobs in `server/test/e2e/proverb-image-jobs.e2e.test.ts`
- [X] T030 [P] [US3] Add e2e test for stale pending jobs becoming eligible after the safety window in `server/test/e2e/proverb-image-jobs.e2e.test.ts`
- [X] T031 [P] [US3] Add e2e test for successful recovery preserving proverb language fields in `server/test/e2e/proverb-image-jobs.e2e.test.ts`

### Implementation for User Story 3

- [X] T032 [US3] Adjust `listSweepCandidates` ordering so due retry/deferred jobs are selected before new missing-image work in `server/src/modules/proverb-images/proverb-image.repository.ts`
- [X] T033 [US3] Ensure scheduled Worker backfill uses the same bounded recovery path as curator backfill in `server/src/index.ts`
- [X] T034 [US3] Ensure repeated capacity pressure preserves or increases cooldown instead of immediate retry loops in `server/src/modules/proverb-images/proverb-image.service.ts`
- [X] T035 [US3] Ensure successful recovery clears retry metadata only after image upload succeeds in `server/src/modules/proverb-images/proverb-image.service.ts`
- [X] T036 [US3] Run targeted US3 validation command documented in `specs/001-fix-free-tier-jobs/quickstart.md`

**Checkpoint**: User Story 3 is complete when due jobs resume automatically on the next sweep/backfill opportunity.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the full feature and keep documentation/contracts aligned.

- [X] T037 [P] Update contract notes if final response fields differ in `specs/001-fix-free-tier-jobs/contracts/image-job-limit-guardrails.md`
- [X] T038 [P] Update quickstart validation notes with final commands in `specs/001-fix-free-tier-jobs/quickstart.md`
- [X] T039 Run provider classification tests in `server/test/unit/proverb-image-provider.test.ts`
- [X] T040 Run full image job e2e suite in `server/test/e2e/proverb-image-jobs.e2e.test.ts`
- [X] T041 Run full server test suite referenced by `package.json`
- [X] T042 Run client build referenced by `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1 review.
- **Phase 3 US1**: Depends on Phase 2 and is the MVP.
- **Phase 4 US2**: Depends on US1 response semantics for deferred/partial-success fields.
- **Phase 5 US3**: Depends on US1 retry/defer semantics and repository eligibility.
- **Phase 6 Polish**: Depends on all implemented stories.

### User Story Dependencies

- **US1 Backfill without quota failure**: Required MVP; establishes core defer/retry semantics.
- **US2 See why jobs are paused**: Builds on US1 API result fields and status semantics.
- **US3 Recover automatically after cooldown**: Builds on US1 persisted retry/deferred state.

### Within Each User Story

- Tests first where practical.
- Repository/service changes before route/client integration.
- API response typing before UI copy changes.
- Targeted validation before moving to the next story.

---

## Parallel Execution Examples

### User Story 1

```text
Task: "Add e2e test for partial queue producer failure preserving deferred jobs in server/test/e2e/proverb-image-jobs.e2e.test.ts"
Task: "Add e2e test for repeated backfill creating zero duplicate active jobs during cooldown in server/test/e2e/proverb-image-jobs.e2e.test.ts"
Task: "Add e2e test for queue binding missing returning deferred work without permanent failure in server/test/e2e/proverb-image-jobs.e2e.test.ts"
```

### User Story 2

```text
Task: "Update client API types for backfill and regenerate deferred responses in client/src/lib/api.ts"
Task: "Add e2e test for active jobs listing retry reason and next retry time after capacity pressure in server/test/e2e/proverb-image-jobs.e2e.test.ts"
```

### User Story 3

```text
Task: "Add e2e test for due retry jobs being prioritized before new missing-image jobs in server/test/e2e/proverb-image-jobs.e2e.test.ts"
Task: "Ensure scheduled Worker backfill uses the same bounded recovery path as curator backfill in server/src/index.ts"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete US1 tests and implementation.
3. Validate partial queue failure, missing queue binding, and duplicate-prevention behavior.
4. Stop for review if MVP behavior is enough for immediate production pain.

### Incremental Delivery

1. Deliver US1 to stop data loss/noisy failures.
2. Deliver US2 so curators understand what is paused and why.
3. Deliver US3 so cooldown recovery uses the first available processing opportunity.
4. Finish polish with full server tests and client build.

## Format Validation

- Total tasks: 42
- Setup tasks: 4
- Foundational tasks: 6
- US1 tasks: 10
- US2 tasks: 8
- US3 tasks: 8
- Polish tasks: 6
- All tasks use `- [ ] T###` checklist format.
- All user story tasks include `[US1]`, `[US2]`, or `[US3]`.
- All implementation and validation tasks include concrete file paths.
