<!--
Sync Impact Report
Version change: Template -> 1.0.0
Modified principles:
- Initial adoption: I. Cultural Fidelity and Trilingual Integrity
- Initial adoption: II. Offline-First PWA Experience
- Initial adoption: III. Secure Curator Boundaries
- Initial adoption: IV. Cloudflare Data Contracts
- Initial adoption: V. Testable Incremental Delivery
Added sections:
- Technical Constraints
- Development Workflow and Quality Gates
Removed sections:
- None
Templates requiring updates:
- Updated: .specify/templates/plan-template.md
- Updated: .specify/templates/spec-template.md
- Updated: .specify/templates/tasks-template.md
- Not present: .specify/templates/commands/*.md
Follow-up TODOs:
- None
-->

# Refranario Constitution

## Core Principles

### I. Cultural Fidelity and Trilingual Integrity
Every proverb feature MUST preserve the Spanish source, Arabic equivalent, English translation,
category, curator metadata, and contextual notes as first-class data. Arabic content MUST keep
right-to-left rendering and readable typography wherever it appears. Search, filtering, imports,
image prompts, and display changes MUST avoid silently dropping or rewriting cultural meaning;
lossy transformations require explicit product approval in the feature spec. Rationale: this
project is an archive, so correctness of language and context is the core product value.

### II. Offline-First PWA Experience
User-facing changes MUST work on mobile, tablet, and desktop layouts and MUST define their
online, loading, error, and offline behavior. Service worker, cache, install prompt, and update
banner changes MUST be deliberate, versioned, and verified against stale-cache failure modes.
Primary browsing and reading flows MUST remain usable with previously cached content. Rationale:
Refranario is intended as an installable archive, not only a connected website.

### III. Secure Curator Boundaries
Any create, update, delete, upload, image job, or administrative workflow MUST be protected by
server-side authorization, role checks, input validation, and applicable rate limits. Tokens,
secrets, Cloudflare bindings, and privileged configuration MUST NOT be exposed to client bundles
or committed documentation. Authentication changes MUST preserve token invalidation behavior
after password or privilege changes. Rationale: curator access controls protect archive integrity
and operational resources.

### IV. Cloudflare Data Contracts
API, database, storage, queue, and scheduled-worker changes MUST maintain explicit contracts
between React clients, Hono routes, D1 schema/migrations, R2 storage, Cloudflare Queues, and
Workers AI integrations. Persistent data changes MUST include forward migration steps and a
compatibility note for existing records. Public API response shapes MUST remain backward
compatible unless the spec names the breaking change and the rollout plan. Rationale: the app
depends on durable Cloudflare resources that cannot be treated as disposable local state.

### V. Testable Incremental Delivery
Each feature MUST be sliced into independently demonstrable user stories with a clear MVP path.
Server, security, rate-limit, migration, and API-contract changes MUST include Bun tests or a
documented exception approved in the plan. Client-only changes MUST include build validation and
manual or automated checks for the affected route, responsive layout, and accessibility affordances.
Rationale: small, verifiable increments keep the archive stable while it evolves.

## Technical Constraints

Refranario uses TypeScript, React, Vite, React Router, Tailwind CSS, Hono, Bun tests, and
Cloudflare Workers/Pages infrastructure. D1 is the source of truth for proverb and user data;
R2 stores generated or uploaded images; Cloudflare Queues and scheduled triggers coordinate image
job processing. New dependencies MUST be justified by feature requirements, operational fit for
Cloudflare, and bundle/runtime impact.

The UI MUST honor the established manuscript-inspired archive style while staying readable,
responsive, accessible, and usable for Spanish, Arabic, and English content. Backend code MUST
keep route, service, repository, middleware, and shared-type boundaries clear. Environment-specific
values MUST flow through Wrangler configuration, bindings, or secrets rather than hardcoded
runtime constants.

## Development Workflow and Quality Gates

Specifications MUST identify affected languages, routes, API endpoints, data entities, offline
states, security boundaries, and Cloudflare resources. Plans MUST pass the Constitution Check
before research/design work proceeds and MUST be rechecked after design artifacts are drafted.
Tasks MUST be grouped by independently testable user story and include exact file paths.

Before implementation is considered complete, the relevant validation command MUST run:
`npm run build` for client/build-impacting changes, `bun test server/test` or a narrower Bun test
target for server changes, and migration or Wrangler commands when data or bindings are touched.
If a validation cannot run locally, the reason and residual risk MUST be recorded in the feature
plan or final implementation notes.

## Governance

This constitution supersedes conflicting project practices for Spec Kit work. Amendments require
an explicit constitution update, a Sync Impact Report, and review of affected templates or runtime
guidance. Versioning follows semantic versioning: MAJOR for incompatible governance or principle
redefinitions, MINOR for new principles or materially expanded guidance, and PATCH for wording,
clarification, or non-semantic corrections.

Feature plans, specs, and task lists MUST cite how they satisfy these principles or document
approved exceptions in Complexity Tracking. Reviews MUST block changes that violate curator
security, data contract compatibility, trilingual integrity, or required validation without a
recorded exception.

**Version**: 1.0.0 | **Ratified**: 2026-04-26 | **Last Amended**: 2026-04-26
