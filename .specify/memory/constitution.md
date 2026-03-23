<!--
  Sync Impact Report
  ==================
  Version change: (new) -> 1.0.0
  Modified principles: N/A (initial ratification)
  Added sections:
    - Principle I: Clear Project Structure
    - Principle II: Clean Code
    - Principle III: Modular Testing
    - Principle IV: Extensibility First
    - Section: Technical Constraints
    - Section: Development Workflow
    - Governance rules
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md: Constitution Check aligned ✅
    - .specify/templates/spec-template.md: Requirements structure aligned ✅
    - .specify/templates/tasks-template.md: Phase structure aligned ✅
  Follow-up TODOs: None
-->

# AIPlan (Poker Texas Build Plan) Constitution

## Core Principles

### I. Clear Project Structure

Every version of the project MUST follow a well-defined directory
layout with explicit separation of concerns.

- Root directory contains ONLY configuration files (`.git`,
  `.gitignore`, `CLAUDE.md`) and version directories (`v1/`, `v2/`).
- Each version directory MUST be self-contained: source code, data,
  assets, and deployment artifacts live within the version folder.
- Backend and frontend boundaries MUST be clearly delineated even
  when co-located (e.g., `public/` for static files, `server.js`
  for API).
- File and directory naming MUST be consistent, lowercase, and
  descriptive. No ambiguous abbreviations.

**Rationale**: A predictable structure reduces onboarding friction,
prevents accidental cross-version contamination, and makes
deployment scripts reliable.

### II. Clean Code

All code MUST be readable, intentional, and free of unnecessary
complexity.

- Functions MUST do one thing and have descriptive names.
- Dead code, unused variables, and commented-out blocks MUST be
  removed, not left "for reference."
- Magic numbers and hardcoded strings MUST be extracted into named
  constants or configuration.
- Duplication is acceptable for 2-3 occurrences; beyond that,
  extract a shared utility ONLY when the pattern is stable.
- Code formatting MUST be consistent within each version (minified
  single-line for v1 frontend as per existing convention; standard
  formatting for backend and v2+).

**Rationale**: Clean code is the primary documentation. Reducing
noise makes bugs visible and reviews efficient.

### III. Modular Testing

Every testable unit MUST be independently verifiable without
requiring the full system to be running.

- API endpoints MUST be testable via isolated HTTP requests (e.g.,
  curl, Postman, or automated scripts).
- Core business logic functions (e.g., `autoSchedule`,
  `flattenTasks`) MUST be pure or near-pure and testable without
  DOM or database dependencies.
- When adding new features, include at minimum one verification
  path: a manual test script, a seed data scenario, or an
  automated test.
- Test data MUST be deterministic and reproducible (use `seed.js`
  patterns for database, explicit fixtures for frontend state).

**Rationale**: Modular tests catch regressions early and enable
confident refactoring. Testing at the unit boundary prevents
cascading failures.

### IV. Extensibility First

The system MUST be designed so that new features can be added
without modifying existing stable code.

- New features MUST be additive: extending existing data structures
  (JSON blob fields) rather than restructuring them.
- The `update(fn)` pattern MUST remain the single entry point for
  state mutations to ensure consistency.
- API routes MUST follow RESTful conventions so new endpoints are
  predictable.
- Configuration (API base URL, JWT expiry, debounce intervals)
  MUST be externalized, not buried in code.
- Version directories (`v1/`, `v2/`) exist specifically to allow
  breaking changes in isolation without disrupting stable releases.

**Rationale**: Extensibility protects existing users and deployed
systems while allowing the project to evolve.

## Technical Constraints

- **No build step**: Frontend MUST remain CDN-based (React via CDN,
  Babel standalone). No webpack, vite, or bundler tooling.
- **Single-file frontend**: Each version's frontend MUST be a
  single `index.html` file. Do NOT split into multiple files.
- **JSON blob storage**: Project data MUST remain as JSONB in the
  `projects.data` column. Do NOT normalize into relational tables.
- **Deployment simplicity**: Deploy MUST be achievable via `scp` +
  optional `pm2 restart`. No CI/CD pipelines required.
- **Dependencies**: Minimize external dependencies. Every new
  npm package MUST be justified against the cost of added
  complexity.

## Development Workflow

- **Edit locally, deploy via SCP**: All changes are made in the
  local version directory, tested locally, then deployed to VPS.
- **Version isolation**: Work on `v2/` MUST NOT affect `v1/`
  stability. Both versions can coexist on VPS if needed.
- **Data consistency**: Any change to the JSON data structure MUST
  be reflected in both frontend code and `seed.js` simultaneously.
- **Code review checklist**:
  1. Does the change follow the Clear Project Structure principle?
  2. Is the code clean and free of dead code or duplication?
  3. Can the change be tested in isolation?
  4. Is the change additive (no breaking modifications to stable
     interfaces)?
  5. Are Technical Constraints respected?

## Governance

- This constitution is the highest-authority document for
  development decisions in this project. When conflicts arise
  between convenience and these principles, the principles win.
- Amendments require: (1) a clear description of the change,
  (2) rationale for why the existing principle is insufficient,
  (3) update to this document with version bump.
- Version follows semantic versioning: MAJOR for principle
  removals/redefinitions, MINOR for new principles or material
  expansions, PATCH for clarifications and wording fixes.
- All feature specifications and implementation plans MUST pass
  a Constitution Check before proceeding (see plan template).
- Use `CLAUDE.md` for runtime development guidance and quick
  reference; this constitution governs the "why" behind those
  rules.

**Version**: 1.0.0 | **Ratified**: 2026-03-07 | **Last Amended**: 2026-03-07
