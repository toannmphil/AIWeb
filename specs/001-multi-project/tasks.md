# Tasks: Multi-Project Management for V2

**Input**: Design documents from `/specs/001-multi-project/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Not explicitly requested. Manual testing via browser + curl.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4)
- Exact file paths included

---

## Phase 1: Setup

**Purpose**: Database schema changes and project preparation

- [x] T001 Add `settings` table creation to v2/seed.js (CREATE TABLE IF NOT EXISTS settings with id SERIAL, data JSONB, updated_at TIMESTAMPTZ)
- [x] T002 Add seed data for settings table (insert default empty members/teamColors row) in v2/seed.js
- [x] T003 Run seed.js on VPS to create settings table via SSH

**Checkpoint**: Database ready with `settings` table alongside existing `projects` and `users` tables

---

## Phase 2: Foundational (Backend API)

**Purpose**: All new API endpoints in v2/server.js - MUST complete before frontend work

**CRITICAL**: No frontend changes until all API endpoints are working

- [x] T004 Add GET /api/projects endpoint (list all projects: id, name, is_default, updated_at) in v2/server.js
- [x] T005 [P] Add POST /api/projects endpoint (create new project with name, return {id, name, is_default}) in v2/server.js
- [x] T006 [P] Add PUT /api/projects/:id endpoint (update name or is_default, clear other defaults when setting new) in v2/server.js
- [x] T007 [P] Add DELETE /api/projects/:id endpoint (delete project, prevent deleting last one) in v2/server.js
- [x] T008 Add GET /api/project/:id endpoint (load project data + version by project id) in v2/server.js
- [x] T009 Add PUT /api/project/:id endpoint (save project data with version conflict detection) in v2/server.js
- [x] T010 Add GET /api/project/:id/version endpoint (return version, updated_by, updated_at) in v2/server.js
- [x] T011 [P] Add GET /api/settings endpoint (load settings.data from settings table, return members + teamColors) in v2/server.js
- [x] T012 [P] Add PUT /api/settings endpoint (save settings.data to settings table) in v2/server.js
- [x] T013 Refactor existing GET /api/data to proxy to default project via GET /api/project/:defaultId in v2/server.js
- [x] T014 Refactor existing POST /api/data to proxy to default project via PUT /api/project/:defaultId in v2/server.js
- [x] T015 Refactor existing GET /api/version to proxy to default project via GET /api/project/:defaultId/version in v2/server.js
- [x] T016 Test all new API endpoints via curl commands from quickstart.md

**Checkpoint**: All 9 new API endpoints working. Existing /api/data and /api/version still work (backward compat).

---

## Phase 3: User Story 1 - Chuyển đổi dự án (Priority: P1) MVP

**Goal**: Dropdown project selector in header, load/switch between projects

**Independent Test**: Login, see project dropdown, switch between 2 projects, verify different tasks load

### Implementation for User Story 1

- [x] T017 [US1] Add project state variables (projects, currentProjectId, currentProjectName, projectsLoaded) and module-level CURRENT_PROJECT_ID in v2/index.html
- [x] T018 [US1] Add apiLoadProjects() function to fetch GET /api/projects in v2/index.html
- [x] T019 [US1] Update apiLoad() to accept projectId param and call GET /api/project/:id instead of GET /api/data in v2/index.html
- [x] T020 [US1] Update apiSave() to accept projectId param and call PUT /api/project/:id instead of POST /api/data in v2/index.html
- [x] T021 [US1] Update lsLoad()/lsSave() to use per-project key `ptb_p{projectId}` in v2/index.html
- [x] T022 [US1] Add switchProject(projectId) function (reset version, load project data, skip first save) in v2/index.html
- [x] T023 [US1] Update useEffect login init to: load projects list → load settings → find default project → load its data in v2/index.html
- [x] T024 [US1] Update auto-save useEffect to save per-project (tasks, phaseColors) using currentProjectId in v2/index.html
- [x] T025 [US1] Update version polling useEffect to poll GET /api/project/:currentProjectId/version in v2/index.html
- [x] T026 [US1] Add project selector dropdown `<select>` in header area (between title and buttons) in v2/index.html

**Checkpoint**: Can login, see projects dropdown, switch between projects. Tasks and phaseColors load per-project.

---

## Phase 4: User Story 2 - Tạo dự án mới (Priority: P2)

**Goal**: Create new project from Admin panel

**Independent Test**: Open Admin, enter project name, click create, verify new project appears in dropdown

### Implementation for User Story 2

- [x] T027 [US2] Add "Dự án" tab to AdminModal component (tab button + active state management) in v2/index.html
- [x] T028 [US2] Add project creation UI in AdminModal Dự án tab (input field + "Tạo" button) in v2/index.html
- [x] T029 [US2] Add addProject() function calling POST /api/projects, update projects state, show toast in v2/index.html
- [x] T030 [US2] Pass projects, setProjects props from App to AdminModal in v2/index.html

**Checkpoint**: Can create new projects from Admin panel. New projects appear in header dropdown.

---

## Phase 5: User Story 3 - Quản lý dự án (sửa, xóa, mặc định) (Priority: P3)

**Goal**: Rename, delete, set default project from Admin panel

**Independent Test**: Rename a project (check dropdown updates), delete a project (check it disappears), set default (re-login check)

### Implementation for User Story 3

- [x] T031 [US3] Add project list table UI in AdminModal Dự án tab (name, is_default radio, edit/delete buttons) in v2/index.html
- [x] T032 [US3] Add inline edit mode for project name (editingProject state, save on enter/button) in v2/index.html
- [x] T033 [US3] Add saveProjectEdit() function calling PUT /api/projects/:id with new name in v2/index.html
- [x] T034 [US3] Add setDefaultProject() function calling PUT /api/projects/:id with is_default=true in v2/index.html
- [x] T035 [US3] Add deleteProject() function with confirm dialog, calling DELETE /api/projects/:id in v2/index.html
- [x] T036 [US3] Handle delete of active project: auto switch to default or first project in v2/index.html
- [x] T037 [US3] Pass switchProject and currentProjectId props to AdminModal in v2/index.html

**Checkpoint**: Full project lifecycle management (create, rename, delete, set default) working.

---

## Phase 6: User Story 4 - Shared Settings (Priority: P4)

**Goal**: Members and teamColors saved/loaded as shared settings across all projects

**Independent Test**: Edit members in project A, switch to project B, verify same members

### Implementation for User Story 4

- [x] T038 [US4] Add apiLoadSettings() function to fetch GET /api/settings in v2/index.html
- [x] T039 [US4] Add apiSaveSettings() and apiSaveSettingsDebounced() functions calling PUT /api/settings in v2/index.html
- [x] T040 [US4] Update login init useEffect to call apiLoadSettings() and set members/teamColors from response in v2/index.html
- [x] T041 [US4] Add separate auto-save useEffect for shared settings (members, teamColors) with own debounce timer and skipFirstSettings ref in v2/index.html
- [x] T042 [US4] Remove members and teamColors from per-project apiSave() payload (they go to settings now) in v2/index.html

**Checkpoint**: Members and teamColors are shared. Edit in one project, see in all.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, edge cases, deployment

- [x] T043 Add confirm dialog component for destructive actions (delete project) if not already present in v2/index.html
- [x] T044 Add info text in Admin Dự án tab explaining shared settings and default project behavior in v2/index.html
- [ ] T045 Handle edge case: no projects exist (show create prompt instead of empty dropdown) in v2/index.html
- [x] T046 Deploy updated v2/server.js to VPS via SCP and restart PM2
- [x] T047 Deploy updated v2/index.html to VPS via SCP
- [x] T048 Run quickstart.md scenarios on VPS to validate all endpoints
- [ ] T049 End-to-end test: login → create project → switch → edit → delete → verify shared settings

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (settings table must exist)
- **Phase 3 (US1)**: Depends on Phase 2 (API endpoints must work)
- **Phase 4 (US2)**: Depends on Phase 3 (needs project state + dropdown)
- **Phase 5 (US3)**: Depends on Phase 4 (needs project list in Admin)
- **Phase 6 (US4)**: Depends on Phase 3 (needs per-project save refactored)
- **Phase 7 (Polish)**: Depends on all user stories

### User Story Dependencies

- **US1 (P1)**: After Phase 2 - independent, MVP
- **US2 (P2)**: After US1 - needs project state management from US1
- **US3 (P3)**: After US2 - needs project list UI from US2
- **US4 (P4)**: After US1 - needs refactored apiLoad/apiSave from US1. Can run parallel with US2/US3

### Within Each User Story

- API functions before UI components
- State management before rendering
- Core feature before edge cases

### Parallel Opportunities

- **Phase 2**: T005, T006, T007 parallel (different endpoints). T011, T012 parallel (settings endpoints separate from project endpoints)
- **US4 can run parallel with US2+US3** after US1 is done (different concerns: settings vs project CRUD)

---

## Parallel Example: Phase 2 Backend

```bash
# These can run in parallel (independent endpoints, same file but different functions):
Task T005: "POST /api/projects endpoint"
Task T006: "PUT /api/projects/:id endpoint"
Task T007: "DELETE /api/projects/:id endpoint"

# These can run in parallel (settings endpoints):
Task T011: "GET /api/settings endpoint"
Task T012: "PUT /api/settings endpoint"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003) - Add settings table
2. Complete Phase 2: Foundational (T004-T016) - All backend API endpoints
3. Complete Phase 3: US1 (T017-T026) - Project switching
4. **STOP and VALIDATE**: Test switching between projects
5. Deploy if ready

### Incremental Delivery

1. Setup + Foundational → Backend ready
2. US1 → Project switching works → Deploy (MVP!)
3. US2 → Can create projects → Deploy
4. US3 → Full project CRUD → Deploy
5. US4 → Shared settings → Deploy (Complete!)

### Single Developer Strategy (Recommended)

Complete phases sequentially: 1 → 2 → 3 → 4 → 5 → 6 → 7. Each phase is a deployable increment.

---

## Notes

- All changes are in 2 files: v2/server.js (backend) and v2/index.html (frontend)
- seed.js only needs changes once (Phase 1)
- v1's implementation serves as reference (lines 512-628 for state/init, 1668-1873 for AdminModal)
- Keep backward compatibility with /api/data and /api/version endpoints
- Deploy server.js requires PM2 restart; index.html is static (no restart needed)
