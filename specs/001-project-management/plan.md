# Implementation Plan: Poker Texas Build Plan v2 - Modular Architecture

**Branch**: `001-project-management` | **Date**: 2026-03-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-project-management/spec.md`
**Focus**: Lam moi v2 voi cau truc module ro rang hon v1

## Summary

Xay dung lai toan bo ung dung Poker Texas Build Plan voi cau truc
module ro rang trong single index.html. V1 la 1 khoi monolithic
~94KB - tat ca constants, utilities, data, components nam trong 1
script tag khong co phan vung. V2 se to chuc code thanh cac module
logic voi ranh gioi ro rang, giup doc, sua, mo rong de dang hon.

**Key difference vs v1**: Code van nam trong 1 file index.html nhung
duoc to chuc thanh cac section/module voi comment headers, moi module
co trach nhiem rieng biet, dependency giua cac module ro rang.

## Technical Context

**Language/Version**: JavaScript (ES2020+), Node.js 18+
**Primary Dependencies**: React 18 (CDN), Babel standalone (CDN),
Express.js, ExcelJS (CDN), SheetJS/XLSX (CDN), bcryptjs, jsonwebtoken
**Storage**: PostgreSQL 16 - JSONB column trong bang `projects`
**Testing**: Manual testing (curl for API, browser for UI),
seed.js for deterministic test data
**Target Platform**: Web browser (desktop, responsive),
VPS Linux server (backend)
**Project Type**: Web application (single-file SPA + REST API)
**Performance Goals**: Gantt chart render 50+ task < 100ms,
autoSchedule < 1s, API response < 500ms
**Constraints**: No build step, single index.html, JSON blob storage,
SCP deploy, CDN-only frontend dependencies
**Scale/Scope**: 1 du an, ~50 task, ~20 members, 9 teams,
~5 nguoi dung dong thoi

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clear Project Structure | PASS | v2/ self-contained. Code organized by logical modules within index.html. Backend/frontend tach biet. |
| II. Clean Code | PASS | Standard formatting (khong minified). Functions single-responsibility. Constants externalized thanh CONFIG module. No dead code. |
| III. Modular Testing | PASS | Pure functions (dateUtils, autoSchedule, flattenTasks, criticalPath) testable doc lap. API endpoints testable qua curl. |
| IV. Extensibility First | PASS | Module boundaries cho phep them tinh nang moi ma khong anh huong module khac. update(fn) la single entry point. |
| No build step | PASS | React 18 + Babel CDN. |
| Single-file frontend | PASS | Tat ca code trong 1 file index.html nhung to chuc modular. |
| JSON blob storage | PASS | JSONB, khong normalize. |
| Deploy simplicity | PASS | SCP + pm2 restart. |

**Gate result: ALL PASS**

## Project Structure

### Documentation (this feature)

```text
specs/001-project-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API endpoints)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
v2/
├── index.html           # Frontend SPA - modular code organization
├── server.js            # Backend API (Node.js + Express)
├── seed.js              # Database seeding script
├── package.json         # Backend dependencies
├── .env                 # Environment config
└── data/
    └── initial-tasks.json  # Default project data
```

### Frontend Module Map (inside index.html)

V1 problem: 1 script tag, ~2000 lines, khong co phan vung ro rang.
V2 solution: Code van trong 1 file nhung to chuc thanh 8 modules
voi comment block headers va scope ro rang:

```text
index.html
├── <head>
│   └── <style> ─── CSS Variables + Component Styles
│       ├── /* ═══ THEME & VARIABLES ═══ */
│       ├── /* ═══ LAYOUT ═══ */
│       ├── /* ═══ TASK PANEL ═══ */
│       ├── /* ═══ GANTT PANEL ═══ */
│       ├── /* ═══ BOARD VIEW ═══ */
│       ├── /* ═══ DETAIL PANEL ═══ */
│       ├── /* ═══ ADMIN PANEL ═══ */
│       └── /* ═══ MODALS & TOASTS ═══ */
│
├── <body>
│   ├── CDN Scripts (React, ReactDOM, Babel, ExcelJS, XLSX)
│   │
│   └── <script type="text/babel">
│       │
│       ├── /* ═══════════════════════════════════════ */
│       ├── /* MODULE 1: CONFIG & CONSTANTS            */
│       ├── /* ═══════════════════════════════════════ */
│       │   PROJECT_START, NUM_WEEKS, PRIORITIES,
│       │   STATUSES, INIT_TEAMS, INIT_TEAM_COLORS,
│       │   INIT_PHASE_COLORS, INIT_MEMBERS, PALETTE,
│       │   API_BASE, DEBOUNCE_MS, POLL_INTERVAL_MS
│       │
│       ├── /* ═══════════════════════════════════════ */
│       ├── /* MODULE 2: DATE UTILITIES                */
│       ├── /* ═══════════════════════════════════════ */
│       │   parseDate, formatDate, addDays, diffDays,
│       │   isWeekend, skipWeekend, addWorkingDays,
│       │   getWorkingDaysBetween, weekOfDate,
│       │   isValidDate
│       │
│       ├── /* ═══════════════════════════════════════ */
│       ├── /* MODULE 3: TASK LOGIC (pure functions)   */
│       ├── /* ═══════════════════════════════════════ */
│       │   genId, initNextId, flattenTasks,
│       │   deepClone, autoSchedule,
│       │   detectCircularDeps, calculateCriticalPath
│       │
│       ├── /* ═══════════════════════════════════════ */
│       ├── /* MODULE 4: DATA PERSISTENCE              */
│       ├── /* ═══════════════════════════════════════ */
│       │   lsLoad, lsSave, apiCall, apiLoad, apiSave,
│       │   useAutoSave (custom hook),
│       │   useVersionPoll (custom hook)
│       │
│       ├── /* ═══════════════════════════════════════ */
│       ├── /* MODULE 5: IMPORT / EXPORT               */
│       ├── /* ═══════════════════════════════════════ */
│       │   exportJSON, importJSON, exportExcel,
│       │   exportJiraCSV, importExcel, detectHeaders,
│       │   normalizeRow
│       │
│       ├── /* ═══════════════════════════════════════ */
│       ├── /* MODULE 6: UI COMPONENTS (presentational)*/
│       ├── /* ═══════════════════════════════════════ */
│       │   LoginScreen, Header, FilterBar,
│       │   TaskRow, TaskPanel, GanttBar, GanttPanel,
│       │   BoardCard, BoardView, DetailPanel,
│       │   AdminPanel (Members/Teams/Phases tabs),
│       │   DatePicker, DepsSelector,
│       │   ConfirmDialog, Toast
│       │
│       ├── /* ═══════════════════════════════════════ */
│       ├── /* MODULE 7: APP CONTAINER (state + glue)  */
│       ├── /* ═══════════════════════════════════════ */
│       │   App component: state management, update(fn),
│       │   filter logic, view switching, scroll sync
│       │
│       └── /* ═══════════════════════════════════════ */
│           /* MODULE 8: BOOTSTRAP                     */
│           /* ═══════════════════════════════════════ */
│           INITIAL_TASKS data, ReactDOM.createRoot,
│           render <App />
```

**Structure Decision**: Single-file constraint maintained. Modular
structure achieved via 8 logical modules within the script tag. Each
module has a clear header comment block, defined responsibility,
and explicit dependencies on other modules. CSS organized by
component section to match JS module structure.

**Key improvements vs v1**:

1. **CONFIG tach biet**: V1 tron lan constants vao code. V2 gom
   tat ca constants vao MODULE 1 dau file.
2. **Date utils doc lap**: V1 ham date nam rai rac. V2 gom thanh
   MODULE 2 - pure functions, testable rieng.
3. **Task logic pure**: V1 tron logic voi UI. V2 tach autoSchedule,
   criticalPath, flattenTasks thanh MODULE 3 - khong phu thuoc
   React hay DOM.
4. **Data persistence tach rieng**: V1 apiCall/lsLoad nam xen ke
   voi component code. V2 gom thanh MODULE 4 voi custom hooks.
5. **Import/Export rieng**: V1 import/export code nam trong
   component. V2 tach thanh MODULE 5.
6. **Components nho hon**: V1 co components lon 200+ dong. V2 tach
   thanh components nho co 1 trach nhiem.
7. **App container tach state**: V1 state logic nam trong component
   render. V2 tach state management rieng MODULE 7.
8. **CSS to chuc theo component**: V1 CSS khong co section. V2 CSS
   chia theo component module.

## Complexity Tracking

| Concern | Decision | Rationale |
|---------|----------|-----------|
| Single file constraint vs modularity | 8 modules voi comment headers trong 1 file | Constitution yeu cau single file. Comment headers + ordering tao module boundaries ro rang. |
| CSS organization | CSS sections match JS modules | Dev co the find/search theo component name. Giong "CSS modules" nhung trong 1 file. |
