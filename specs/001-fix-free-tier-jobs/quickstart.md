# Quickstart: Free Tier Job Limit Guardrails

## Prerequisites

- Dependencies are already installed.
- Current branch is `001-fix-free-tier-jobs`.
- Feature spec is at `specs/001-fix-free-tier-jobs/spec.md`.

## Implementation Checklist

1. Update job repository eligibility so due retry work is prioritized before new missing-image
   work and fresh pending rows are skipped until their safety window expires.
2. Update enqueue result handling so partial producer failure returns the deferred message/job
   identities, not only counts.
3. Mark unsent jobs as retryable/deferred with a sanitized reason and next retry time.
4. Keep manual regenerate on the same capacity-pressure path and return `deferred` /
   `nextRetryAt` when applicable.
5. Add or update response typing in `client/src/lib/api.ts`.
6. Update `client/src/pages/ImageJobs.tsx` copy so deferred capacity pressure is visibly waiting,
   not failed or lost.
7. Keep all protected job endpoints behind admin authorization.

## Validation

Run targeted server tests:

```powershell
bun test server/test/e2e/proverb-image-jobs.e2e.test.ts
```

Run provider classification tests:

```powershell
bun test server/test/unit/proverb-image-provider.test.ts
```

Run the full server test suite if targeted tests pass:

```powershell
bun test server/test
```

Run the client build after UI/API type changes:

```powershell
npm run build
```

## Manual Checks

1. Start the app locally with the normal dev command.
2. Log in as an admin.
3. Open `/admin/images`.
4. Trigger "Buscar faltantes" when fake or real capacity pressure is active.
5. Confirm the notice distinguishes accepted and deferred work.
6. Confirm retry jobs show a next attempt time and curator-safe reason.
7. Wait until the retry time is eligible or use test time control.
8. Trigger the next sweep/backfill and confirm eligible jobs resume without manual cleanup.
9. Refresh while offline or with a failed status request and confirm stale/error messaging is clear.

## Rollback

- Revert service/repository/UI changes.
- Existing pending/retry/failed rows remain compatible because no new required table is introduced.
- If additive response fields are removed, older clients keep working because existing fields are
  unchanged.
