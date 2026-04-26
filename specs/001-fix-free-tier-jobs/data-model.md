# Data Model: Free Tier Job Limit Guardrails

## Entity: Proverb Image Job

Backed by existing columns on `proverbs`.

| Field | Type | Source | Validation / Meaning |
|-------|------|--------|----------------------|
| `id` | text | existing proverb id | Stable job identity for one proverb |
| `spanish` | text | proverb content | MUST NOT be changed by job transitions |
| `arabic` | text | proverb content | MUST NOT be changed by job transitions; display remains RTL-safe |
| `english` | text | proverb content | MUST NOT be changed by job transitions |
| `image` | text/null | generated or manual image URL | Non-empty value ends automatic generation |
| `image_job_status` | enum/null | existing job state | `null`, `pending`, `processing`, `retry`, `failed`, `complete` |
| `image_job_attempts` | integer | existing retry counter | Incremented only when processing is claimed |
| `image_job_next_retry_at` | timestamp/null | existing retry/lease time | Retry eligibility or processing lease expiration |
| `image_job_error` | text/null | existing reason | Sanitized capacity/error text, max existing truncation behavior |
| `image_prompt_hash` | text/null | existing prompt identity | Prevents stale queue messages from mutating newer proverb state |
| `image_generation_prompt` | text/null | existing generated prompt cache | Reused while prompt hash remains current |

### State Transitions

```text
null/missing image -> pending
pending -> processing
processing -> complete
processing -> retry
processing -> failed
retry + due cooldown -> pending or processing through next sweep/message
failed + eligible sweep/manual regenerate -> pending
any active state + manual image -> complete
any active state + proverb text changes -> pending with new prompt hash
stale message -> ack/no state mutation
```

### Eligibility Rules

- Due retry rows are eligible when `image_job_status = 'retry'` and
  `image_job_next_retry_at <= now`.
- Failed rows are eligible for backfill when they have no image and their retry time is null or
  due.
- Fresh pending rows are skipped to avoid duplicate active work.
- Stale pending rows become eligible again after the processing/producer safety window, so lost
  work can recover automatically.
- Rows with a non-empty image are not eligible for automatic generation.
- Rows whose prompt hash no longer matches the queued message are treated as stale and ignored.

## Entity: Capacity Pressure Event

Logical event derived from queue send errors or provider responses.

| Field | Type | Meaning |
|-------|------|---------|
| `source` | enum | `queue-producer`, `prompt-provider`, `image-provider` |
| `reason` | text | Sanitized curator-safe explanation |
| `retryAfterSeconds` | number | Cooldown before next eligible attempt |
| `throttled` | boolean | True for free-tier/quota/rate-limit pressure |
| `affectedJobIds` | text[] | Jobs deferred by this event |

## Entity: Backfill Run

Returned to curator and used by tests.

| Field | Type | Meaning |
|-------|------|---------|
| `scanned` | number | Candidate rows considered |
| `enqueued` | number | Jobs accepted by queue producer |
| `deferred` | number | Jobs preserved for later retry |
| `throttled` | boolean | Whether capacity pressure occurred |
| `queueError` | text/null | Sanitized queue pressure reason |
| `nextRetryAt` | timestamp/null | Earliest known deferred retry time when available |

## Compatibility Notes

- No new table is required.
- Existing pending/retry/failed records remain valid.
- Existing API consumers keep current fields; new response fields are additive.
- Existing `complete` rows and rows with manual images are not reprocessed.
