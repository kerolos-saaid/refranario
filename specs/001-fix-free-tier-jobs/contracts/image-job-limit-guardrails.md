# Contract: Image Job Limit Guardrails

## Protected Access

All endpoints in this contract require the existing admin authorization behavior. Non-admin or
expired sessions receive the existing unauthorized/forbidden response and must not see protected
job details.

## POST /api/proverb-image-jobs/backfill

Starts a bounded scan for missing-image jobs and attempts to enqueue eligible work.

### Request

```json
{
  "limit": 10
}
```

`limit` is optional. If omitted, the environment/default sweep limit is used.

### Success Response

```json
{
  "enqueued": 3,
  "deferred": 7,
  "scanned": 10,
  "throttled": true,
  "queueError": "Queue capacity is temporarily exhausted.",
  "nextRetryAt": "2026-04-26 09:35:00"
}
```

### Contract Rules

- `enqueued` counts jobs accepted by the producer.
- `deferred` counts jobs preserved for a later retry because producer capacity was unavailable.
- `scanned` counts candidate rows considered by the run.
- `throttled` is true when queue/provider capacity pressure was detected.
- `queueError` is sanitized and MUST NOT expose secrets or raw credentials.
- `nextRetryAt` is additive and may be null when no work was deferred.
- The endpoint MUST NOT create duplicate active work for fresh pending jobs.

## GET /api/proverb-image-jobs?limit=50

Returns protected active image job status for curator review.

### Success Response

```json
{
  "jobs": [
    {
      "id": "proverb-id",
      "spanish": "A rey muerto, rey puesto.",
      "english": "The king is dead. Long live the king!",
      "status": "retry",
      "attempts": 2,
      "nextRetryAt": "2026-04-26 09:35:00",
      "error": "Capacity is temporarily exhausted.",
      "promptHash": "abc123"
    }
  ]
}
```

### Contract Rules

- Existing fields remain unchanged.
- Retry/deferred jobs include a human-readable `error` and `nextRetryAt` when known.
- Spanish and English fields are read-only presentation fields in this response.
- Arabic is not currently returned by this endpoint; if added later, it must preserve RTL-safe
  display requirements.

## POST /api/proverbs/:id/regenerate-image

Requests regeneration for one proverb.

### Success Response

```json
{
  "success": true,
  "skipped": false,
  "deferred": true,
  "nextRetryAt": "2026-04-26 09:35:00"
}
```

### Contract Rules

- `deferred` is additive and distinguishes accepted-for-later from immediately enqueued work.
- If the proverb already has an image, `skipped` remains true.
- Missing proverb returns 404.
- Capacity pressure follows the same retry/defer behavior as backfill.

## Scheduled Worker Contract

The scheduled Worker trigger runs the same bounded backfill/recovery flow as curator backfill.

### Contract Rules

- Due retry/deferred work is prioritized before brand-new missing-image work.
- Fresh pending work is skipped to avoid duplicate active messages.
- Stale pending work is eligible after the safety window so lost messages recover.
- A capacity-pressure result must leave affected work retryable for a future run.

## Queue Consumer Contract

The queue consumer processes accepted messages.

### Contract Rules

- Stale prompt-hash messages are acknowledged without mutation.
- Provider quota/rate-limit responses mark jobs retryable and call message retry with the same
  delay.
- Successful image generation uploads to storage and marks the job complete.
- Permanent non-capacity failures may still become failed when they are not retryable.
