# Research: Free Tier Job Limit Guardrails

## Decision: Keep D1 proverb job state as the recovery source of truth

**Rationale**: Existing proverb rows already track `image_job_status`, attempts, next retry time,
error reason, prompt hash, and generated prompt. Keeping recovery state there lets scheduled
sweeps resume work even if Queue messages are delayed, dropped, retried, or producer sends are
throttled.

**Alternatives considered**:
- New `image_jobs` table: cleaner history, but larger migration and not necessary for this bug.
- Queue-only recovery: simpler short term, but producer pressure can prevent messages from being
created, so Queue cannot be the only source of truth.

## Decision: Treat queue/provider free-tier pressure as capacity pressure, not terminal failure

**Rationale**: The feature is specifically about "free tier limit reached". These failures are
expected operational limits. They should preserve retryable work, set a next retry time, and show
curators a waiting explanation instead of marking records as failed.

**Alternatives considered**:
- Keep failures as `failed`: makes the UI noisy and requires manual relaunch.
- Retry immediately: burns through the next limit window and can loop forever.

## Decision: Defer unsent producer work with next retry time

**Rationale**: Current enqueue flow can send a partial batch and return counts. The missing piece
is identifying unsent jobs and marking them retryable with a cooldown. This makes partial success
recoverable and visible.

**Alternatives considered**:
- Re-run backfill immediately: risks repeated throttling and duplicate work.
- Drop unsent jobs: violates archive completeness and curator expectations.

## Decision: Prevent duplicate pending work with a stale-pending window

**Rationale**: A recently pending job likely already has a Queue message waiting or processing.
Scheduled and manual backfill should skip fresh pending rows, then reconsider them only after a
processing/producer safety window expires. This avoids duplicates while still recovering lost work.

**Alternatives considered**:
- Add `queued_at` field: clearer, but not required because `updated_at`, status, prompt hash, and
existing lease semantics are enough for this feature.
- Never re-enqueue pending jobs: can strand work if a Queue message never runs.

## Decision: Prioritize due retry/recovery work before new missing-image work

**Rationale**: This directly answers the "do not waste time after cooldown" requirement. The first
scheduled or curator-triggered opportunity after a cooldown should spend capacity on eligible
retry/deferred jobs before scanning brand-new work.

**Alternatives considered**:
- FIFO by created time only: can leave due retries behind newer pending rows.
- Manual-only recovery: creates operator toil and violates the spec.

## Decision: Keep operational knobs environment-configurable

**Rationale**: Free-tier constraints differ between preview, production, and local tests. Batch
size, sweep limit, retry delay, quota cooldown, processing lease, and status limit should continue
to come from environment bindings/defaults.

**Alternatives considered**:
- Hardcoded free-tier settings: fast but brittle.
- Per-curator settings: overkill for a single admin job center.
