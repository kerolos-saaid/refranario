# Implementation Plan: Free Tier Job Limit Guardrails

**Branch**: `001-fix-free-tier-jobs` | **Date**: 2026-04-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fix-free-tier-jobs/spec.md`

## Summary

Make proverb image jobs survive free-tier and quota pressure without losing work or wasting
available recovery windows. The implementation will keep D1 proverb job fields as the source of
truth, classify queue/provider throttling as retryable capacity pressure, defer unsent work with a
next retry time, prioritize due retry work on scheduled sweeps, and make the curator UI explicit
about accepted, deferred, and retrying work.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Hono on Cloudflare Workers  
**Primary Dependencies**: React Router, Vite, Tailwind CSS, Hono, Wrangler, Bun test  
**Storage**: D1 proverb job fields, R2 generated image storage, Cloudflare Queues, browser service worker cache  
**Testing**: `bun test server/test/e2e/proverb-image-jobs.e2e.test.ts`, `bun test server/test/unit/proverb-image-provider.test.ts`, `npm run build`  
**Target Platform**: Cloudflare Workers API, Cloudflare Queue consumer, scheduled Worker trigger, Cloudflare Pages PWA  
**Project Type**: React PWA plus Hono Worker API and scheduled/queue job processing  
**Performance Goals**: Resume due jobs during the first scheduled or curator-triggered opportunity after cooldown; avoid duplicate active jobs for the same proverb/prompt; keep each sweep bounded by environment limits  
**Constraints**: Preserve trilingual proverb fields and Arabic RTL display, keep admin-only job actions, respect Cloudflare free-tier/provider throttling, avoid exposing secrets in curator-facing errors  
**Scale/Scope**: Image-generation jobs only; affects backfill, regenerate, active-job status, scheduled sweeps, provider/queue retry handling, image jobs page; no change to public proverb browsing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Cultural fidelity**: PASS. Job transitions will not mutate Spanish, Arabic, English, category, notes, curator, or date fields. UI work will keep existing Spanish/English display and will not remove RTL-safe handling for proverb content.
- **Offline-first PWA**: PASS. Image job status is an admin route; plan includes loading/error/offline stale-status messaging and keeps service worker behavior unchanged unless build output requires normal cache refresh.
- **Curator security**: PASS. Existing admin middleware remains required for backfill, status, and regenerate endpoints. Error text will be normalized before reaching the UI.
- **Cloudflare data contracts**: PASS. Plan documents Hono response-shape changes, D1 state semantics, Queue producer/consumer behavior, scheduled sweep behavior, R2 unchanged, and Wrangler environment knobs.
- **Testable delivery**: PASS. Each story has independent e2e/unit/build validation. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-free-tier-jobs/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- image-job-limit-guardrails.md
`-- checklists/
    `-- requirements.md
```

### Source Code (repository root)

```text
client/
|-- src/
|   |-- lib/api.ts
|   `-- pages/ImageJobs.tsx

server/
|-- src/
|   |-- index.ts
|   |-- modules/proverb-images/
|   |   |-- proverb-image.config.ts
|   |   |-- proverb-image.repository.ts
|   |   |-- proverb-image.routes.ts
|   |   |-- proverb-image.service.ts
|   |   `-- proverb-image.types.ts
|   |-- shared/config/app.constants.ts
|   `-- shared/rate-limit/api-rate-limit.policy.ts
`-- test/
    |-- e2e/proverb-image-jobs.e2e.test.ts
    `-- unit/proverb-image-provider.test.ts

wrangler.toml
package.json
AGENTS.md
```

**Structure Decision**: Keep the current modular Worker layout. The feature belongs inside
`server/src/modules/proverb-images` with small client updates in `client/src/pages/ImageJobs.tsx`
and `client/src/lib/api.ts`. No new top-level service, queue, or database table is required.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Phase 0: Research

See [research.md](./research.md).

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md), [contracts/image-job-limit-guardrails.md](./contracts/image-job-limit-guardrails.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Cultural fidelity**: PASS. Data model explicitly forbids proverb language-field mutation during retry/defer/complete transitions.
- **Offline-first PWA**: PASS. Quickstart covers stale/offline status messaging; no cache-breaking service-worker change is required.
- **Curator security**: PASS. Contracts keep all job endpoints admin-only and avoid raw provider credential exposure.
- **Cloudflare data contracts**: PASS. Contracts cover response fields and scheduled/queue behavior; no backward-incompatible field removal.
- **Testable delivery**: PASS. Quickstart and contracts list server e2e/unit and client build checks for each user story.
