# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., TypeScript 5, React 19, Hono on Cloudflare Workers or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., React Router, Vite, Tailwind CSS, Hono, Wrangler or NEEDS CLARIFICATION]  
**Storage**: [D1, R2, Cloudflare Queues, browser cache/service worker, files, or N/A]  
**Testing**: [e.g., bun test server/test, npm run build, route-level manual check or NEEDS CLARIFICATION]  
**Target Platform**: [Cloudflare Workers API, Cloudflare Pages PWA, modern mobile/desktop browsers or NEEDS CLARIFICATION]
**Project Type**: [React PWA, Hono API, Worker scheduled job, data migration, importer, or NEEDS CLARIFICATION]  
**Performance Goals**: [domain-specific, e.g., responsive archive search, bounded image job batch time, fast PWA load or NEEDS CLARIFICATION]  
**Constraints**: [trilingual content integrity, Arabic RTL, offline-capable UX, curator-only mutations, Cloudflare binding limits or NEEDS CLARIFICATION]  
**Scale/Scope**: [proverb count, routes/endpoints touched, migration size, image job volume, user roles affected or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Cultural fidelity**: Spanish, Arabic, English, category, notes, and metadata impacts are identified; Arabic RTL/rendering is preserved where affected.
- **Offline-first PWA**: Mobile/desktop layout, loading/error states, cache/update behavior, and offline behavior are defined for affected user-facing flows.
- **Curator security**: Admin mutations, uploads, image jobs, auth/session behavior, validation, and rate limits are accounted for where relevant.
- **Cloudflare data contracts**: Hono routes, API shapes, D1 migrations, R2 objects, queues, cron triggers, and bindings are listed with compatibility notes.
- **Testable delivery**: User stories are independently demonstrable, MVP scope is clear, and required validation commands or approved exceptions are named.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
|-- plan.md              # This file (/speckit-plan command output)
|-- research.md          # Phase 0 output (/speckit-plan command)
|-- data-model.md        # Phase 1 output (/speckit-plan command)
|-- quickstart.md        # Phase 1 output (/speckit-plan command)
|-- contracts/           # Phase 1 output (/speckit-plan command)
`-- tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Delete unused paths and expand the chosen structure with
  real files affected by this feature.
-->

```text
client/
|-- src/
|   |-- components/
|   |-- hooks/
|   |-- lib/
|   `-- pages/
|-- public/
`-- index.html

server/
|-- src/
|   |-- app/
|   |-- modules/
|   |-- shared/
|   |-- migrations/
|   `-- schema.sql
`-- test/
    |-- e2e/
    |-- unit/
    `-- support/

scripts/
`-- [importer or operational scripts, if affected]

wrangler.toml
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., missing Bun test for API change] | [current need] | [why narrower/manual validation is acceptable] |
| [e.g., breaking API response shape] | [specific problem] | [why compatibility cannot be preserved] |
