# Feature Specification: Free Tier Job Limit Guardrails

**Feature Branch**: `001-fix-free-tier-jobs`  
**Created**: 2026-04-26  
**Status**: Draft  
**Input**: User description: "عايز احل مشكلة الfree tier limit reached في جزء الqueues/jobs"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Backfill without quota failure (Priority: P1)

As a curator, I can start or continue image-job backfill without the system turning free-tier
limit pressure into failed proverb records or repeated noisy errors.

**Why this priority**: This is the core failure mode: the archive needs image jobs to pause,
defer, and recover safely when provider limits are reached.

**Independent Test**: Start a backfill while the job system is already at its free-tier limit.
The run reports how many jobs were accepted and how many were deferred, and no proverb loses its
pending/retry state.

**Acceptance Scenarios**:

1. **Given** there are proverbs missing generated images, **When** a curator starts backfill and
   the job system can accept only part of the work, **Then** accepted jobs are queued, remaining
   jobs are deferred, and the curator receives a clear partial-success result.
2. **Given** the job system reports that the free-tier limit is reached, **When** backfill runs,
   **Then** affected proverbs remain eligible for later retry instead of being marked permanently
   failed.
3. **Given** a proverb already has a pending or retrying job, **When** backfill runs again,
   **Then** the system does not create duplicate active work for the same proverb.

---

### User Story 2 - See why jobs are paused (Priority: P2)

As a curator, I can view job status and understand which jobs are waiting because of free-tier
limits, when they are expected to retry, and whether manual action is needed.

**Why this priority**: The limit problem is hard to manage when it looks like a silent failure.
Curators need enough status to trust the system and avoid repeated manual retries.

**Independent Test**: Open the image jobs view after a quota-limited run. Jobs affected by the
limit show a waiting/retry state, a human-readable reason, attempts, and the next retry time.

**Acceptance Scenarios**:

1. **Given** one or more jobs are deferred by free-tier pressure, **When** the curator opens the
   image jobs view, **Then** those jobs show a non-terminal waiting state with the reason and
   next retry time.
2. **Given** all jobs are currently paused because capacity is exhausted, **When** the curator
   checks job status, **Then** the interface communicates that processing will resume later and
   does not imply data loss.
3. **Given** a curator manually requests regeneration for one proverb while limits are active,
   **When** the request is accepted for later processing, **Then** the response distinguishes
   "deferred" from "completed" or "failed".

---

### User Story 3 - Recover automatically after cooldown (Priority: P3)

As an operator, I want the job system to resume gradually as soon as the limit window clears, so
eligible work continues on the first available processing opportunity without immediately
exhausting the free tier again.

**Why this priority**: Recovery matters after the immediate failure is contained. Without gradual
resume, the same limit loop can repeat every run.

**Independent Test**: Simulate a limit event, wait until the retry window is eligible, then run
the job sweep again. Only eligible work is resumed, and jobs that still hit limits receive a later
retry time.

**Acceptance Scenarios**:

1. **Given** several jobs are waiting due to free-tier pressure, **When** the retry window arrives
   and the next scheduled or curator-triggered processing opportunity runs, **Then** eligible jobs
   are resumed automatically within the configured safety cap for that run.
2. **Given** the provider still reports a limit during recovery, **When** a resumed job attempts
   processing, **Then** the system increases or preserves a cooldown and leaves the job retryable.
3. **Given** a job succeeds after recovery, **When** the proverb image is saved, **Then** the job
   leaves the active waiting list and the proverb keeps its Spanish, Arabic, and English content.

### Edge Cases

- The free-tier limit appears while sending jobs, before any external image work starts.
- The free-tier limit appears while generating prompts or images for already accepted jobs.
- A backfill run contains more candidates than the account can safely process in one window.
- A cooldown expires between scheduled processing runs.
- A manual regenerate request arrives for a proverb already waiting on cooldown.
- A job message is stale because the proverb text changed after the message was created.
- The queue/job binding is temporarily unavailable.
- The curator refreshes while offline or while cached job status is stale.
- Arabic RTL text, long Spanish/English phrases, and missing generated images remain readable in
  status views.
- A curator token is expired, invalid, or lacks admin privileges.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST classify free-tier, quota, rate-limit, and "too many requests"
  conditions as capacity pressure rather than permanent job failure.
- **FR-002**: The system MUST preserve retryable job state when capacity pressure occurs, including
  a human-readable reason and next eligible retry time.
- **FR-003**: The system MUST report partial success for bulk job runs, including accepted,
  deferred, scanned, and throttled counts.
- **FR-004**: The system MUST prevent duplicate active work for a proverb that already has an
  equivalent pending, processing, or retrying job.
- **FR-005**: Curators MUST be able to see active, retrying, deferred, failed, and completed job
  outcomes clearly enough to decide whether to wait or intervene.
- **FR-006**: Manual regeneration MUST respect the same capacity-pressure rules as bulk backfill
  and MUST distinguish deferred work from completed work.
- **FR-007**: Scheduled recovery MUST resume eligible work gradually after cooldown instead of
  immediately flooding the job system.
- **FR-008**: Jobs that hit repeated capacity pressure MUST remain bounded by a maximum retry pace
  so the system does not burn through the next free-tier window instantly.
- **FR-009**: The system MUST keep successful jobs from being retried again unless the proverb's
  relevant text changes or a curator explicitly requests regeneration.
- **FR-010**: The system MUST keep stale job messages from overwriting newer proverb state.
- **FR-011**: The system MUST resume eligible deferred jobs on the first scheduled or
  curator-triggered processing opportunity after their retry time, without requiring manual cleanup
  or re-creation of jobs.
- **FR-012**: The system MUST avoid idle capacity when some jobs are eligible after cooldown while
  other jobs remain paused for a later retry window.

### Cultural & Content Requirements *(include if feature touches proverb content)*

- **CR-001**: System MUST preserve Spanish source text, Arabic equivalent, English translation,
  category, notes, curator, and date fields while jobs are deferred, retried, or completed.
- **CR-002**: System MUST render Arabic text with correct right-to-left behavior wherever job
  status includes proverb content.

### Security & Operations Requirements *(include if feature touches protected flows or Cloudflare resources)*

- **SR-001**: Protected job actions MUST require server-side admin authorization.
- **SR-002**: Job, queue, scheduled processing, image generation, and storage behavior changes MUST
  include a compatibility note for existing pending/retry/failed records.
- **SR-003**: Error messages shown to curators MUST explain capacity pressure without exposing
  secrets, tokens, raw provider credentials, or internal binding names.
- **SR-004**: Operational limits MUST be configurable per environment without requiring code
  changes.

### Offline & PWA Requirements *(include if feature affects user-facing routes)*

- **OR-001**: System MUST define loading, error, refresh/update, and offline behavior for affected
  job status routes.
- **OR-002**: If cached job status is shown while offline, the interface MUST make clear that the
  status may be stale.

### Key Entities *(include if feature involves data)*

- **Image Job**: A unit of work to create or regenerate an image for one proverb; includes status,
  attempts, reason, prompt identity, and next retry time.
- **Capacity Pressure Event**: A detected free-tier, quota, rate-limit, or throttling condition
  that causes work to be deferred rather than failed.
- **Backfill Run**: A curator-initiated or scheduled pass that scans missing-image proverbs and
  attempts to enqueue eligible work.
- **Cooldown Window**: The period before deferred work is eligible to resume.
- **Proverb**: The archived Spanish, Arabic, and English content that must remain unchanged by job
  retries unless explicitly edited by a curator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of simulated free-tier limit events leave affected jobs in a retryable or
  deferred state rather than permanent failure.
- **SC-002**: Curators can identify accepted, deferred, and retrying job counts within one status
  check after a limited backfill run.
- **SC-003**: Re-running backfill during an active cooldown creates zero duplicate active jobs for
  the same proverb and prompt state.
- **SC-004**: After the cooldown window, eligible jobs resume without exceeding the configured
  safety cap for a single run.
- **SC-007**: When a cooldown expires before the next processing opportunity, eligible jobs begin
  processing during that next opportunity without a curator having to recreate the work.
- **SC-005**: Existing proverb language fields remain unchanged in every capacity-pressure,
  retry, stale-message, and successful-completion scenario.
- **SC-006**: Unauthorized users cannot start backfill, regeneration, or view protected job
  details.

## Assumptions

- The requested problem refers to the image generation queues/jobs area rather than general page
  browsing rate limits.
- The preferred behavior is to protect free-tier capacity and preserve work for later, not to
  bypass provider limits or silently drop image generation.
- Existing pending, retrying, failed, and completed job records may already exist and must be
  handled without manual cleanup.
- Curators are comfortable with slower generation if the status makes delay and recovery clear.
- A small number of successful jobs per window is better than repeatedly exhausting the free tier
  and creating noisy failures.
