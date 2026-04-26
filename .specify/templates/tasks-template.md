---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include Bun tests for server, security, rate-limit, migration, and API-contract changes unless the plan records an approved exception. Include client build/manual route checks for user-facing UI changes.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Client PWA**: `client/src/`, `client/public/`, `client/index.html`
- **Worker API**: `server/src/`, `server/src/modules/`, `server/src/shared/`
- **Data**: `server/src/schema.sql`, `server/src/migrations/`, `server/src/seed.sql`
- **Tests**: `server/test/unit/`, `server/test/e2e/`, `server/test/support/`
- **Operations**: `wrangler.toml`, `scripts/`, `package.json`

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit-tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/
  - Constitution gates for trilingual integrity, PWA/offline behavior,
    curator security, Cloudflare contracts, and validation

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Confirm affected client/server/data files from implementation plan
- [ ] T002 Confirm required dependencies and Cloudflare bindings
- [ ] T003 [P] Configure or update lint/build/test commands if needed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Setup D1 schema or migration in server/src/migrations/[migration].sql
- [ ] T005 [P] Implement authentication/authorization framework in server/src/shared/ or server/src/modules/auth/
- [ ] T006 [P] Setup Hono routing and middleware structure in server/src/app/ or server/src/modules/
- [ ] T007 Create shared types/entities that all stories depend on
- [ ] T008 Configure error handling, logging, and rate-limit behavior
- [ ] T009 Setup environment configuration and Wrangler binding changes
- [ ] T010 Confirm trilingual field preservation and Arabic RTL requirements
- [ ] T011 Confirm offline/cache/update behavior for affected PWA routes
- [ ] T012 Confirm Cloudflare D1/R2/Queue/AI resources and migration rollout

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1

> Required for server/security/data/API-contract changes. Write these tests FIRST where practical and ensure they fail before implementation.

- [ ] T013 [P] [US1] Contract or e2e test for [endpoint/user journey] in server/test/e2e/[name].test.ts
- [ ] T014 [P] [US1] Unit test for [service/policy/mapper] in server/test/unit/[name].test.ts

### Implementation for User Story 1

- [ ] T015 [P] [US1] Update client route/component in client/src/[location]/[file].tsx
- [ ] T016 [P] [US1] Update API/service/repository in server/src/[location]/[file].ts
- [ ] T017 [US1] Add validation, authorization, and rate-limit handling where applicable
- [ ] T018 [US1] Preserve Spanish/Arabic/English fields and RTL display where affected
- [ ] T019 [US1] Add loading, error, and offline behavior for affected route

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2

- [ ] T020 [P] [US2] Contract or e2e test for [endpoint/user journey] in server/test/e2e/[name].test.ts
- [ ] T021 [P] [US2] Unit test for [service/policy/mapper] in server/test/unit/[name].test.ts

### Implementation for User Story 2

- [ ] T022 [P] [US2] Update client route/component in client/src/[location]/[file].tsx
- [ ] T023 [US2] Implement API/service/repository change in server/src/[location]/[file].ts
- [ ] T024 [US2] Integrate with User Story 1 components if needed

**Checkpoint**: At this point, User Stories 1 and 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3

- [ ] T025 [P] [US3] Contract or e2e test for [endpoint/user journey] in server/test/e2e/[name].test.ts
- [ ] T026 [P] [US3] Unit test for [service/policy/mapper] in server/test/unit/[name].test.ts

### Implementation for User Story 3

- [ ] T027 [P] [US3] Update client route/component in client/src/[location]/[file].tsx
- [ ] T028 [US3] Implement API/service/repository change in server/src/[location]/[file].ts

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX Performance optimization across all stories
- [ ] TXXX [P] Additional unit tests in server/test/unit/
- [ ] TXXX Security hardening
- [ ] TXXX Trilingual content and Arabic RTL regression check
- [ ] TXXX Offline/PWA cache and update behavior check
- [ ] TXXX Run `npm run build`
- [ ] TXXX Run `bun test server/test` or documented narrower target
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel if staffed
  - Or sequentially in priority order (P1 -> P2 -> P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but remains independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but remains independently testable

### Within Each User Story

- Required tests MUST be written and fail before implementation where practical
- Data models and schemas before services
- Services before endpoints
- API contracts before client integration
- Core implementation before offline/cache polishing
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel within Phase 2
- Once Foundational phase completes, all user stories can start in parallel if team capacity allows
- All tests for a user story marked [P] can run in parallel
- Client and server tasks can run in parallel when they touch separate files and share a stable contract
- Different user stories can be worked on in parallel by different contributors

---

## Parallel Example: User Story 1

```bash
# Launch server tests for User Story 1 together:
Task: "Contract or e2e test for [endpoint/user journey] in server/test/e2e/[name].test.ts"
Task: "Unit test for [service/policy/mapper] in server/test/unit/[name].test.ts"

# Launch independent implementation tasks together:
Task: "Update client route/component in client/src/[location]/[file].tsx"
Task: "Update API/service/repository in server/src/[location]/[file].ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. STOP and VALIDATE: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Test independently -> Deploy/Demo (MVP)
3. Add User Story 2 -> Test independently -> Deploy/Demo
4. Add User Story 3 -> Test independently -> Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple contributors:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Contributor A: User Story 1
   - Contributor B: User Story 2
   - Contributor C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify required tests fail before implementing where practical
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid vague tasks, same-file conflicts, and cross-story dependencies that break independence
