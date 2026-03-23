# Tasks: Unified Task Management (Rewrite)

**Input**: plan.md, data-model.md, contracts/api.md, research.md, quickstart.md
**Prerequisites**: Multi-project (US1-US4) already implemented. This rewrites task management.

**Tests**: Manual via browser + curl (quickstart.md scenarios).

**Organization**: Phase 1-2 = setup/foundational. Phase 3-7 = user stories. Phase 8 = polish/deploy.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US5-US9

---

## Phase 1: Setup & Migration Script

**Purpose**: Create migration script, update seed data to new unified format

- [x] T001 Create `v2/migrate.js` script: connect to DB, load all projects, transform each project.data.tasks recursively — remove `type`, `isEpic`, `isSummary`, `phase` from all tasks; remove `phaseColors` from project.data; convert `deps` from `[number]` to `[{id,type:"FS",lag:0}]`; convert status values (To Do→Not Started, Done→Completed, Blocked→On Hold, Review→In Progress); convert priority Medium→Normal; bump version; save back to DB in v2/migrate.js
- [x] T002 Update `v2/data/initial-tasks.json` to new unified format: remove all `type:'epic'`, `isEpic`, `isSummary`, `phase` fields; remove `phaseColors`; convert deps to `[{id,type,lag}]` objects; update status/priority values in v2/data/initial-tasks.json
- [x] T003 Update `v2/seed.js` to use new initial-tasks.json format (no phaseColors in project data insert) in v2/seed.js

**Checkpoint**: Migration script ready, seed data in new format.

---

## Phase 2: Foundational — Backend API Rewrite

**Purpose**: Rewrite server.js helpers and endpoints for unified task model. MUST complete before frontend.

### 2A: Helper Functions

- [x] T004 Replace `isEpic()` helper with `isParent(task)` function: returns `task.children && task.children.length > 0` in v2/server.js
- [x] T005 Rewrite `flattenTasks(tasks)` to recursively flatten unified task tree (no epic/summary distinction): each task gets `parentId` and `parentName` from its container in v2/server.js
- [x] T006 Rewrite `findTask(tasks, taskId)` recursive search — returns `{task, parent, isParent}` without epic/summary distinction in v2/server.js
- [x] T007 Rewrite `findParent(tasks, parentId)` — find any task by ID that can serve as parent (any task can have children) in v2/server.js
- [x] T008 [P] Add `normalizeDep(dep)` helper: if dep is number, convert to `{id:dep, type:"FS", lag:0}`; if object, validate type∈{FS,SS,FF,SF} in v2/server.js
- [x] T009 [P] Rewrite `countStats(tasks)` helper: count totalTasks, totalLeafTasks, totalParentTasks, maxDepth (replacing epicCount/summaryCount) in v2/server.js

### 2B: Endpoints Rewrite

- [x] T010 Rewrite `GET /api/project/:id/tasks` — flatten unified tree, add parentId/parentName; support filters: status, team, assignee, priority, parentId, leaf in v2/server.js
- [x] T011 Rewrite `GET /api/project/:id/tasks/:taskId` — use unified findTask in v2/server.js
- [x] T012 Rewrite `POST /api/project/:id/tasks` — parentId=null creates top-level, parentId=N adds to that task's children array; auto-init children:[] if parent doesn't have it in v2/server.js
- [x] T013 Rewrite `PUT /api/project/:id/tasks/:taskId` — if isParent(task): only allow name,notes,deps,expanded; else: allow all fields; normalize deps on save in v2/server.js
- [x] T014 Rewrite `PATCH /api/project/:id/tasks/:taskId/status` — block if isParent(task); validate status∈{Not Started,In Progress,Completed,On Hold}; Completed→pct=100 in v2/server.js
- [x] T015 Rewrite `DELETE /api/project/:id/tasks/:taskId` — recursive delete for unified tree (no epic/summary branching) in v2/server.js
- [x] T016 Rewrite `GET /api/project/:id/summary` — return totalTasks, totalLeafTasks, totalParentTasks, avgProgress, byStatus, byTeam, byAssignee, maxDepth (remove epicCount, summaryCount) in v2/server.js
- [x] T017 Remove `POST /api/project/:id/tasks/summary` endpoint (no longer needed) in v2/server.js
- [x] T018 Remove `GET /api/project/:id/epics` endpoint (no longer needed) in v2/server.js

### 2C: New Endpoints

- [x] T019 Add `POST /api/project/:id/tasks/:taskId/indent` — find task's position among siblings, move it into sibling above's children array; return 400 if no sibling above in v2/server.js
- [x] T020 Add `POST /api/project/:id/tasks/:taskId/outdent` — move task from parent's children to grandparent's children (positioned after the parent); return 400 if already top-level in v2/server.js
- [x] T021 [P] Add `POST /api/migrate` endpoint — call migration logic from migrate.js; return `{ok, migratedProjects, totalTasksMigrated}` in v2/server.js
- [x] T022 Rewrite `GET /api/project/:id` and `PUT /api/project/:id` — remove phaseColors from data handling (only tasks + metadata) in v2/server.js
- [x] T023 Update `GET /api/project/:id/members` — unchanged logic but remove any phase references in v2/server.js

**Checkpoint**: All API endpoints working with unified task model. Test via curl (quickstart.md scenarios 1-8).

---

## Phase 3: US5 — Unified Task Data Layer (Frontend)

**Goal**: Frontend data functions work with unified task model (no epic/summary/phase distinction)

**Independent Test**: Load page, tasks render from unified data, flattenTasks produces correct WBS codes

- [x] T024 [US5] Remove `INIT_PHASE_COLORS`, `PHASE_COLORS` references, `phaseColors` state, phase filter dropdown from App component in v2/index.html
- [x] T025 [US5] Update `STATUSES` constant to `['Not Started','In Progress','Completed','On Hold']` and `PRIORITIES` to `['High','Normal','Low']` in v2/index.html
- [x] T026 [US5] Rewrite `flattenTasks(tasks)` — remove epic/summary branching; recursively flatten unified tree; assign `_wbs`, `_level`, `_isParent` (children.length>0) to each task in v2/index.html
- [x] T027 [US5] Rewrite `flattenChildren(children, level, parentWbs, result)` — no sort by isSummary; sort by position in array (preserve user order); assign _wbs/_level in v2/index.html
- [x] T028 [US5] Rewrite `computeSummaryFields(task)` → rename to `computeParentFields(task)` — same logic but check `children.length > 0` instead of `isSummary`; guard null start/end in v2/index.html
- [x] T029 [US5] Update `autoSchedule(tasks)` — replace epic/summary checks with `isParent` check (children.length > 0); compute parent fields bottom-up in v2/index.html
- [x] T030 [US5] Update `getAllTasks(tasks)` — same recursive scan but no type checks in v2/index.html
- [x] T031 [US5] Update `findTask(tasks, id)` and `findTaskInChildren(children, id)` — remove isSummary check, recurse into any task with children in v2/index.html
- [x] T032 [US5] Update `deleteTask` / `removeFromChildren` — no epic/summary branching, unified recursive delete in v2/index.html
- [x] T033 [US5] Remove all `type==='epic'` / `isEpic` / `isSummary` checks throughout entire file — replace with `_isParent` or `children&&children.length>0` checks in v2/index.html
- [x] T034 [US5] Update `initNextId(tasks)` — same logic but ensure it scans all children recursively (no type checks) in v2/index.html
- [x] T035 [US5] Remove `phaseColors` from auto-save useEffect payload, from `lsSave`/`lsLoad`, from `apiSave` payload in v2/index.html
- [x] T036 [US5] Update `INITIAL_TASKS` constant to unified format (no type/isEpic/isSummary/phase) in v2/index.html

**Checkpoint**: Data layer works with unified model. Page loads and renders tasks.

---

## Phase 4: US6 — Parent Task Auto-Computation & Rendering

**Goal**: Parent tasks (children.length>0) display with auto-computed fields, bold, expand/collapse, restricted editing

**Independent Test**: Create parent task with 2+ children, verify auto-computed start/end/pct, bold rendering, Gantt bar

- [x] T037 [US6] Rewrite task row rendering: replace 3-branch (epic/summary/regular) with 2-branch (parent/leaf); parent rows: bold, expand toggle, no team/assignee badges, show computed dates in v2/index.html
- [x] T038 [US6] Update Gantt bar rendering: parent task → black trapezoid bar (height 6px); leaf task → colored bar (height 22px); remove epic bar type in v2/index.html
- [x] T039 [US6] Update `getBarStyle(task)` — replace epic/summary type checks with `_isParent` check in v2/index.html
- [x] T040 [US6] Rewrite detail/edit panel: parent task → read-only computed fields with "(tự động)" label, editable name/notes/deps; leaf task → all fields editable in v2/index.html
- [x] T041 [US6] Update `handleUpdate()` function: if parent task, only save name/notes/deps/expanded; if leaf, save all fields in v2/index.html
- [x] T042 [US6] Add "+ Thêm task con" button in detail panel when parent task selected — creates new empty child in v2/index.html
- [x] T043 [US6] Update stats/board/criticalPath calculations: replace epic/summary exclusions with `_isParent` checks; only count leaf tasks for stats in v2/index.html

**Checkpoint**: Parent tasks render correctly, auto-compute works, detail panel restricts editing.

---

## Phase 5: US7 — Indent/Outdent & Task CRUD

**Goal**: Users can indent/outdent tasks to create/modify hierarchy, create tasks via keyboard

**Independent Test**: Select task, press Shift+Alt+→ to indent, Shift+Alt+← to outdent; press Insert to create task

- [x] T044 [US7] Add `indentTask(taskId)` function: find task in tree, move to previous sibling's children array; previous sibling auto-becomes parent task; recalc parent fields in v2/index.html
- [x] T045 [US7] Add `outdentTask(taskId)` function: find task, move from parent's children to grandparent's children (insert after parent); if parent now empty, it becomes leaf; recalc in v2/index.html
- [x] T046 [US7] Add keyboard handler: `Shift+Alt+ArrowRight` → indentTask(selectedId); `Shift+Alt+ArrowLeft` → outdentTask(selectedId) in v2/index.html
- [x] T047 [US7] Add keyboard handler: `Insert` key → create new task after selected task (same parent), auto-select and start editing name in v2/index.html
- [x] T048 [US7] Add keyboard handler: `Delete` key → delete selected task (with confirm if has children) in v2/index.html
- [x] T049 [US7] Add indent/outdent buttons in toolbar or detail panel (→ ←) for mouse users in v2/index.html
- [x] T050 [US7] Update "+ Task" button: create task under selected parent (or top-level if no selection) in v2/index.html
- [x] T051 [US7] Remove "+ Summary" button from toolbar (no longer needed — indent creates hierarchy) in v2/index.html
- [x] T052 [US7] Update `toggleExpand(taskId)` — work for any parent task (no epic/summary check) in v2/index.html

**Checkpoint**: Indent/outdent works via keyboard and buttons. Insert/Delete keyboard shortcuts work.

---

## Phase 6: US8 — Gantt & UI Polish (Unified)

**Goal**: Clean up all UI to work with unified model, remove phase-related UI elements

**Independent Test**: Full Gantt chart renders with parent/leaf bars, dependency lines, zoom; no phase filter visible

- [x] T053 [US8] Remove phase filter dropdown from toolbar in v2/index.html
- [x] T054 [US8] Remove phase color indicators from task rows and Gantt bars in v2/index.html
- [x] T055 [US8] Update Board view: group by status (Not Started, In Progress, Completed, On Hold) instead of phase in v2/index.html
- [x] T056 [P] [US8] Update Excel export: remove Phase column, remove phaseColors; add WBS column; parent rows bold with no team/assignee; use new status/priority values in v2/index.html
- [x] T057 [P] [US8] Update Excel/JSON import: recognize unified format; no phase grouping; preserve children hierarchy in v2/index.html
- [x] T058 [P] [US8] Update Jira CSV export: remove phase/epic references; use new status mapping in v2/index.html
- [x] T059 [US8] Remove PhaseModal component and all phase editing UI in v2/index.html
- [x] T060 [US8] Update CSS: remove `.task-row.epic` and `.task-row.summary` classes; add `.task-row.parent` class (bold, subtle bg) in v2/index.html

**Checkpoint**: All UI works with unified model, no phase/epic/summary references remain.

---

## Phase 7: US9 — Dependency Types (FS/SS/FF/SF + Lag)

**Goal**: Support 4 dependency types with lag/lead in both UI and scheduling

**Independent Test**: Set SS dependency with lag=2, verify autoSchedule computes correct dates

- [x] T061 [US9] Update `autoSchedule()` — parse dep objects `{id,type,lag}`; implement scheduling for all 4 types: FS (B.start = A.end + lag), SS (B.start = A.start + lag), FF (B.end = A.end + lag), SF (B.end = A.start + lag) in v2/index.html
- [x] T062 [US9] Add `normalizeDeps(deps)` helper in frontend: convert legacy `[number]` to `[{id,type:"FS",lag:0}]` in v2/index.html
- [x] T063 [US9] Update dependency editing in detail panel: each dep shows type dropdown (FS/SS/FF/SF) and lag number input in v2/index.html
- [x] T064 [US9] Update dependency arrow rendering in Gantt: different line styles for SS/FF/SF (dashed, dotted) vs FS (solid) in v2/index.html
- [x] T065 [US9] Add circular dependency detection: before saving deps, check if new dep creates a cycle; show warning if so in v2/index.html
- [x] T066 [US9] Update `computeCriticalPath()` to handle all 4 dependency types in v2/index.html

**Checkpoint**: All 4 dependency types work, lag/lead applies, circular dep detection.

---

## Phase 8: Polish & Deploy

**Purpose**: Migration execution, deploy, end-to-end validation

- [x] T067 Run `migrate.js` on VPS via SSH to convert existing project data to unified format
- [x] T068 Deploy updated server.js to VPS via scp, pm2 restart poker-plan-v2
- [x] T069 Deploy updated index.html to VPS via scp to /opt/poker-plan/public/
- [x] T070 Deploy updated seed.js and data/initial-tasks.json to VPS
- [x] T071 Validate quickstart.md scenarios 1-10 via curl on VPS
- [x] T072 [P] Update `v2/API_SPEC.md` with new unified API documentation in v2/API_SPEC.md
- [ ] T073 End-to-end browser test: login → create parent task → add children → indent/outdent → verify auto-compute → verify Gantt → export Excel

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup/Migration) → Phase 2 (Backend API)
Phase 2 (Backend API) → Phase 3 (Frontend Data Layer)
Phase 3 (Data Layer) → Phase 4 (Parent Rendering) + Phase 5 (Indent/Outdent)
Phase 4 + Phase 5 → Phase 6 (UI Polish)
Phase 3 (Data Layer) → Phase 7 (Dep Types) — can parallel with Phase 4-5
Phase 6 + Phase 7 → Phase 8 (Deploy)
```

### Parallel Opportunities

- **Phase 2**: T008, T009 parallel with T004-T007
- **Phase 2**: T017, T018, T021 parallel (independent removals/additions)
- **Phase 4** and **Phase 5** can run in parallel after Phase 3
- **Phase 7** (Dep Types) can run in parallel with Phase 4-6 (different code areas)
- **Phase 6**: T056, T057, T058 all parallel (export/import, different functions)
- **Phase 8**: T067-T070 sequential (deploy), T072 parallel

### User Story Independence

| Story | Depends On | Can Test After |
|-------|-----------|----------------|
| US5 (Data Layer) | Phase 2 | Phase 3 done — page loads with unified data |
| US6 (Parent Rendering) | US5 | Phase 4 done — parent tasks render with auto-compute |
| US7 (Indent/Outdent) | US5 | Phase 5 done — keyboard shortcuts work |
| US8 (UI Polish) | US6, US7 | Phase 6 done — clean UI, no phase references |
| US9 (Dep Types) | US5 | Phase 7 done — 4 dep types schedule correctly |

---

## Implementation Strategy

### MVP First

1. **Phase 1-2**: Setup + Backend (T001-T023)
2. **Phase 3**: Frontend data layer (T024-T036) — page loads
3. **Phase 4**: Parent rendering (T037-T043) — visual validation
4. **STOP and VALIDATE**: Create parent/leaf tasks, verify auto-compute + WBS + Gantt
5. Deploy MVP

### Full Delivery

1. MVP above
2. Phase 5: Indent/outdent (T044-T052) — keyboard + buttons
3. Phase 6: UI polish (T053-T060) — remove all phase references
4. Phase 7: Dep types (T061-T066) — FS/SS/FF/SF + lag
5. Phase 8: Deploy + validate (T067-T073)

---

## Summary

| Phase | Story | Tasks | Count |
|-------|-------|-------|-------|
| Phase 1 | Setup | T001-T003 | 3 |
| Phase 2 | Foundational (Backend) | T004-T023 | 20 |
| Phase 3 | US5 - Data Layer | T024-T036 | 13 |
| Phase 4 | US6 - Parent Rendering | T037-T043 | 7 |
| Phase 5 | US7 - Indent/Outdent | T044-T052 | 9 |
| Phase 6 | US8 - UI Polish | T053-T060 | 8 |
| Phase 7 | US9 - Dep Types | T061-T066 | 6 |
| Phase 8 | Deploy | T067-T073 | 7 |
| **Total** | | **T001-T073** | **73** |

---

## Phase 9: Export Excel & Jira CSV Update (US10)

**Goal**: Cập nhật `exportExcel()` export ALL tasks (kể cả collapsed) với đúng thứ tự cha-con, màu sắc, indent. Cập nhật `exportJira()` export parent-child hierarchy theo Jira CSV import format mới (Issue Id + Parent columns).

**Independent Test**: Click "Excel" button → mở file verify tất cả tasks có mặt, đúng WBS, đúng màu. Click "Jira CSV" → import vào Jira Cloud → verify Epic/Story/Sub-task hierarchy đúng.

### Implementation

- [x] T074 [US10] Add `flattenAllTasks(tasks)` helper function that recursively flattens ALL tasks (ignoring expanded state) with `_wbs` and `_level` fields in v2/index.html (near existing `flattenTasks` ~line 225)
- [x] T075 [US10] Rewrite `exportExcel()` function: use `flattenAllTasks(tasks)` instead of `flat` variable so ALL tasks (including collapsed children) are exported; keep all existing formatting (WBS, indent, bold parent, team/status/priority colors, alternating rows, borders) in v2/index.html (~line 1309-1332)
- [x] T076 [US10] Rewrite `exportJira()` function with new Jira CSV format: add columns `Issue Id` and `Parent`; map Issue Type by depth (depth 0 parent→Epic, depth 0 leaf→Task, depth 1→Story, depth 2+→Sub-task); export ALL tasks in DFS order (parents before children); map priority Normal→Medium; include notes+start+deps in Description in v2/index.html (~line 1334-1348)
- [ ] T077 [US10] Manual test: export Excel with some tasks collapsed → verify ALL tasks present in .xlsx file, verify WBS numbering correct, parent bold, leaf tasks have colors (MANUAL)
- [ ] T078 [US10] Manual test: export Jira CSV → open in text editor, verify Issue Id/Parent columns populated correctly, verify Epic/Story/Sub-task types correct, verify parents appear before children (MANUAL)
- [ ] T079 [P] [US10] Deploy updated v2/index.html to VPS via scp in v2/index.html

**Checkpoint**: Excel exports full task tree with correct hierarchy and colors. Jira CSV imports into Jira Cloud with correct Epic→Story→Sub-task structure.

---

## Dependencies & Execution Order (Updated)

### Phase 9 Dependencies

```
Phase 8 (all done) → Phase 9 (Export Update)
T074 → T075 (Excel uses flattenAllTasks)
T074 → T076 (Jira uses flattenAllTasks)
T075 → T077 (Excel manual test)
T076 → T078 (Jira manual test)
T077 + T078 → T079 (deploy after verification)
```

### Parallel Opportunities (Phase 9)

- T075 and T076 can run in parallel after T074 (different functions, same file but no overlap)
- T077 and T078 can run in parallel (testing different exports)
- T079 after both tests pass

---

## Summary (Updated)

| Phase | Story | Tasks | Count |
|-------|-------|-------|-------|
| Phase 1 | Setup | T001-T003 | 3 |
| Phase 2 | Foundational (Backend) | T004-T023 | 20 |
| Phase 3 | US5 - Data Layer | T024-T036 | 13 |
| Phase 4 | US6 - Parent Rendering | T037-T043 | 7 |
| Phase 5 | US7 - Indent/Outdent | T044-T052 | 9 |
| Phase 6 | US8 - UI Polish | T053-T060 | 8 |
| Phase 7 | US9 - Dep Types | T061-T066 | 6 |
| Phase 8 | Deploy | T067-T073 | 7 |
| Phase 9 | US10 - Export Update | T074-T079 | 6 |
| **Total** | | **T001-T079** | **79** |

---

## Phase 10: Setup — Meeting Minutes Infrastructure

**Purpose**: Prepare data model and helpers for meeting minutes feature

**Reference**: `research-meetings.md`, `data-model.md` (Meeting entity), `contracts/api.md` (Meetings section)

- [x] T080 Update project creation to initialize `meetings: []` — in `POST /api/projects` endpoint, change initial data from `{ tasks: [] }` to `{ tasks: [], meetings: [] }` in v2/server.js (line ~207)
- [x] T081 [P] Add helper functions `findMeeting(meetings, meetingId)` and `collectMeetingIds(meetings)` in v2/server.js — `findMeeting` returns `{meeting, index}` or null; `collectMeetingIds` returns array of all meeting IDs for next-ID generation. Follow same pattern as `findTask()` and `collectAllIds()`.

**Checkpoint**: Helpers ready, new projects initialize with empty meetings array.

---

## Phase 11: Foundational — Meeting Minutes Backend API

**Purpose**: 4 CRUD endpoints for meetings. MUST complete before frontend meeting UI.

**⚠️ CRITICAL**: Frontend meeting features (Phase 12-13) depend on these endpoints.

- [x] T082 Implement `GET /api/project/:id/meetings` endpoint in v2/server.js — read project data via `getProjectData()`, return `data.meetings[]` sorted by date descending (parse DD/MM/YYYY for comparison). Support query params `?from=DD/MM/YYYY&to=DD/MM/YYYY` for date range filter. Response: `{ meetings: [...], total: N, version: V }`. Apply `authMiddleware`.
- [x] T083 [P] Implement `POST /api/project/:id/meetings` endpoint in v2/server.js — validate `title` (required, non-empty) and `date` (required). Accept fields: `title`, `date`, `content`, `attendees` (string array). Auto-generate `id` via `Math.max(...collectMeetingIds(data.meetings), 0) + 1`. Set `createdBy` from `req.user.username`, `createdAt` from `new Date().toISOString()`. Init `data.meetings` if absent. Push new meeting, call `saveProjectData()`. Response 201: `{ meeting: {...}, version: V }`.
- [x] T084 [P] Implement `PUT /api/project/:id/meetings/:meetingId` endpoint in v2/server.js — partial update. Allowed fields: `title`, `date`, `content`, `attendees`. Find meeting via `findMeeting()`, merge only provided fields, call `saveProjectData()`. Return 404 if meeting not found. Response: `{ meeting: {...}, version: V }`.
- [x] T085 [P] Implement `DELETE /api/project/:id/meetings/:meetingId` endpoint in v2/server.js — find meeting by ID via `findMeeting()`, splice from `data.meetings[]` at returned index, call `saveProjectData()`. Return 404 if not found. Response: `{ ok: true, version: V }`.

**Checkpoint**: All 4 meetings CRUD endpoints working. Verify with curl commands from quickstart.md scenarios 12-15.

---

## Phase 12: US11 — Ghi và xem biên bản họp (Priority: P1) 🎯 MVP

**Goal**: User can create, view, edit, and delete meeting minutes per project via a dedicated "Minutes" tab.

**Independent Test**: Create a meeting via UI → appears in list. Edit it → changes persist. Delete it → disappears. Switch projects → meetings are per-project.

### Implementation for US11

- [x] T086 [US11] Add "Minutes" tab button to view switcher in v2/public/index.html — add tab option (alongside existing Gantt/Board tabs) that sets view state to `'minutes'`. Use existing tab button styling. Tab label: "Minutes".
- [x] T087 [US11] Create `MeetingsTab` React component in v2/public/index.html — renders when `view === 'minutes'`. Shows chronological list of meetings (newest first by date). Each row displays: date (DD/MM/YYYY), title, attendee count badge (e.g., "3"), createdBy. Include "+ Meeting" button in toolbar (similar to existing "+ Task" button). Empty state: "Chưa có biên bản họp nào" message with "+ Meeting" button.
- [x] T088 [US11] Create `MeetingDetail` React component in v2/public/index.html — slide-out panel using existing `.detail-overlay` pattern. Two modes: create (empty form) and edit (pre-filled). Form fields: title (text input, required), date (text input DD/MM/YYYY, default today), content (textarea, min-height 200px), attendees selector. Buttons: "Lưu" (save), "Huỷ" (cancel). For existing meetings: "Xoá" button with `confirm()` dialog.
- [x] T089 [US11] Implement attendees picker in `MeetingDetail` in v2/public/index.html — display all members from shared settings (`st.members`) as clickable chips/tags. Selected members have highlighted background. Click chip to toggle. Store as `attendees: ["Name1", "Name2"]`. If no shared members loaded, show plain comma-separated text input as fallback.
- [x] T090 [US11] Wire meeting CRUD functions to backend API in v2/public/index.html — implement `apiCreateMeeting(projectId, data)`, `apiUpdateMeeting(projectId, meetingId, data)`, `apiDeleteMeeting(projectId, meetingId)` using `apiCall()` pattern with auth token. On success: update `st.meetings` state, call `lsSave()`. On error: show toast notification using existing pattern.
- [x] T091 [US11] Integrate meetings into project load/save flow in v2/public/index.html — when loading project data (`GET /api/project/:id`), extract `data.meetings` into state (default `[]` if absent). When saving full project data (`PUT /api/project/:id`), include `meetings` in payload. Update localStorage cache to include meetings. On project switch: reset meetings state and load from new project.

**Checkpoint**: Full meetings CRUD working in UI. Create/edit/delete meetings. Meetings persist after reload. Per-project isolation verified.

---

## Phase 13: US12 — @Mention thành viên trong biên bản (Priority: P2)

**Goal**: User can type `@` in meeting content to get autocomplete dropdown of team members. Mentions are highlighted in view mode.

**Independent Test**: Edit meeting → type `@Con` in content → dropdown shows "CongNN" → select → `@CongNN` inserted. Save → view mode shows `@CongNN` highlighted in blue.

### Implementation for US12

- [x] T092 [US12] Create `MentionTextarea` React component in v2/public/index.html — wrapper around `<textarea>`. On `onChange`: scan backward from `selectionStart` to find nearest `@` preceded by whitespace or at position 0. Extract partial text after `@`. If 1+ characters after `@`, set `mentionQuery` state to trigger dropdown. Props: `value`, `onChange`, `members` (array), `placeholder`. Use `useRef` for textarea element access.
- [x] T093 [US12] Implement autocomplete dropdown in `MentionTextarea` in v2/public/index.html — floating `<div>` positioned below textarea (absolute, relative to container). Filter members by case-insensitive prefix match on `mentionQuery`. Each item shows member name + team label. Keyboard: ArrowUp/ArrowDown to navigate highlighted index, Enter to select, Escape to close. Mouse: click to select. Max 5 visible items, scroll if more. On select: replace `@partialText` with `@FullMemberName` in textarea value using `selectionStart` position, then move cursor after inserted name.
- [x] T094 [US12] Implement `renderMentions(text, members)` function in v2/public/index.html — takes plain text content and members array. Parse with regex `/@(\w+)/g`. For each match: check if captured name exists in members list (case-sensitive). If yes, wrap in `<span class="mention">@Name</span>`. Also convert `\n` to `<br/>` for display. Return HTML string. Handle XSS: escape `<`, `>`, `&` in non-mention text before wrapping.
- [x] T095 [P] [US12] Add CSS styles for mentions and dropdown in v2/public/index.html — `.mention`: background `#e3f2fd`, color `#1565c0`, border-radius 3px, padding `0 4px`, font-weight 600, display inline. `.mention-dropdown`: position absolute, background white, border `1px solid #ddd`, border-radius 6px, box-shadow `0 4px 12px rgba(0,0,0,0.15)`, max-height 200px, overflow-y auto, z-index 1000, min-width 180px. `.mention-dropdown-item`: padding `8px 12px`, cursor pointer. `.mention-dropdown-item.active` or `:hover`: background `#f0f0f0`. `.mention-dropdown-item .team-label`: font-size 11px, color `#888`, margin-left 8px.
- [x] T096 [US12] Integrate `MentionTextarea` into `MeetingDetail` in v2/public/index.html — replace plain `<textarea>` for content field with `MentionTextarea`. Pass `members` prop from `st.members` (flatten member object into array of `{name, team}`). In view mode (not editing): render content using `renderMentions()` with `dangerouslySetInnerHTML`. Toggle between edit mode (MentionTextarea) and view mode (rendered HTML) based on `editing` state.

**Checkpoint**: @mention autocomplete works. Type `@` + letters → dropdown → select → inserted. View mode highlights mentions. Keyboard navigation (arrows, Enter, Escape) works.

---

## Phase 14: Polish — Meeting Minutes

**Purpose**: Seed data, edge cases, deploy

- [x] T097 Add 2-3 sample meetings with @mentions to seed data in v2/data/initial-tasks.json — include meetings with varied dates, different attendees, and content containing `@MemberName` references. Example: Sprint Review, Daily Standup, Kickoff Meeting.
- [x] T098 [P] Handle meeting edge cases in v2/public/index.html — date input auto-fills today's date on new meeting. Validate title not empty before save (disable save button if empty). Content textarea placeholder: "Nhập nội dung biên bản... dùng @ để tag thành viên". Trim title before save.
- [x] T099 [P] Ensure meetings survive project switch in v2/public/index.html — verify when switching projects: meetings state resets, new project's meetings load, no cross-project leakage. Previous project's meetings preserved in localStorage.
- [x] T100 Run quickstart scenarios 12-15 for end-to-end API validation — execute curl commands from quickstart.md against running server to verify CRUD + @mention content round-trips correctly.
- [x] T101 Deploy meeting minutes feature to VPS — scp updated server.js + pm2 restart, scp updated index.html, scp updated initial-tasks.json. Verify on production.

---

## Dependencies & Execution Order (Meetings Feature)

### Phase Dependencies (Meetings)

```
Phase 10 (Setup) → Phase 11 (Backend CRUD)
Phase 11 (Backend CRUD) → Phase 12 (US11 - Meeting UI MVP)
Phase 12 (Meeting UI) → Phase 13 (US12 - @Mention)
Phase 12 + Phase 13 → Phase 14 (Polish)
```

### Task-Level Dependencies (Meetings)

```
T080 ─┐
T081 ─┤
      ├─ T082 ─┐
      ├─ T083  │
      ├─ T084  ├─ T086 → T087 → T088 → T089 → T090 → T091 ─┐
      └─ T085  │                   │                          │
               │                   └── T092 → T093 ─┐        │
               │                       T094         ├─ T096  │
               │                       T095 ────────┘        │
               │                                              │
               └───────────────────── T097, T098, T099, T100, T101
```

### Parallel Opportunities (Meetings)

**Phase 11** (after T081):
```
Parallel: T082, T083, T084, T085  (4 independent endpoints)
```

**Phase 13** (after T088):
```
Parallel: T092+T093 (MentionTextarea), T094 (renderMentions), T095 (CSS)
Then: T096 (integration — depends on all above)
```

**Phase 14**:
```
Parallel: T097, T098, T099 (independent tasks)
Then: T100, T101 (validation + deploy)
```

### User Story Independence (Meetings)

| Story | Depends On | Can Test After |
|-------|-----------|----------------|
| US11 (Meeting CRUD + UI) | Phase 11 (backend) | Phase 12 done — create/edit/delete meetings in UI |
| US12 (@Mention) | US11 (MeetingDetail exists) | Phase 13 done — @autocomplete + highlight working |

---

## Implementation Strategy (Meetings)

### MVP First (US11 Only — Phase 10-12)

1. Complete Phase 10: Setup (T080-T081)
2. Complete Phase 11: Backend CRUD (T082-T085) — verify with curl
3. Complete Phase 12: US11 — Meeting UI (T086-T091)
4. **STOP and VALIDATE**: Create/edit/delete meetings, per-project, persistent
5. Deploy MVP — @mention is enhancement, not blocking

### Full Feature (US11 + US12 — Phase 10-14)

1. Complete MVP above
2. Complete Phase 13: US12 — @Mention (T092-T096)
3. Complete Phase 14: Polish (T097-T101)
4. Full feature deployed

---

## Summary (Updated with Meetings)

| Phase | Story | Tasks | Count |
|-------|-------|-------|-------|
| Phase 1 | Setup | T001-T003 | 3 |
| Phase 2 | Foundational (Backend) | T004-T023 | 20 |
| Phase 3 | US5 - Data Layer | T024-T036 | 13 |
| Phase 4 | US6 - Parent Rendering | T037-T043 | 7 |
| Phase 5 | US7 - Indent/Outdent | T044-T052 | 9 |
| Phase 6 | US8 - UI Polish | T053-T060 | 8 |
| Phase 7 | US9 - Dep Types | T061-T066 | 6 |
| Phase 8 | Deploy | T067-T073 | 7 |
| Phase 9 | US10 - Export Update | T074-T079 | 6 |
| Phase 10 | Meeting Setup | T080-T081 | 2 |
| Phase 11 | Meeting Backend CRUD | T082-T085 | 4 |
| Phase 12 | US11 - Meeting UI MVP | T086-T091 | 6 |
| Phase 13 | US12 - @Mention | T092-T096 | 5 |
| Phase 14 | Meeting Polish | T097-T101 | 5 |
| **Total** | | **T001-T101** | **101** |

---

## Notes

- All frontend changes in single file `v2/index.html`
- Backend changes in `v2/server.js`
- New file: `v2/migrate.js` (one-time migration)
- Seed data: `v2/data/initial-tasks.json`
- No build step, no new npm dependencies
- Phase 9: No backend changes needed — export is pure frontend logic
- Meetings feature: T080-T101, all additive (no existing code modified)
- @Mention stores plain text `@MemberName` — parse on render, no structured mention data
- Members list from shared settings (`GET /api/settings`) — already loaded at app init
- Deploy via scp + pm2 restart
- **Key principle**: `children.length > 0` = parent task (auto-computed). No type flags needed.
- Status: `Not Started | In Progress | Completed | On Hold`
- Priority: `High | Normal | Low`
- Deps: `[{id, type:"FS", lag:0}]`

---

## Phase 15: Setup — Mobile-Friendly CSS Infrastructure

**Purpose**: Add responsive CSS media query blocks and utility classes to v2/index.html

**Reference**: `plan.md` (Mobile-Friendly Layout), `research.md` (Decisions 16-18)

- [x] T102 Add responsive CSS media query blocks at end of `<style>` section in v2/index.html — add `@media (max-width: 768px) {}` and `@media (max-width: 480px) {}` blocks after line 133 (before `</style>`)
- [x] T103 [P] Add CSS utility classes `.mobile-hidden` and `.phone-hidden` inside the media query blocks in v2/index.html — `.mobile-hidden { display: none !important }` at 768px, `.phone-hidden { display: none !important }` at 480px

**Checkpoint**: Media query blocks ready for view-specific responsive rules.

---

## Phase 16: Foundational — Base Responsive Rules

**Purpose**: Core responsive styles affecting all views — body, buttons, modals, toast

**⚠️ CRITICAL**: Must complete before view-specific responsive phases (17-21)

- [x] T104 Add responsive rules for `body` and `.app` inside `@media (max-width: 768px)` in v2/index.html — `body { overflow: auto; height: auto; min-height: 100vh }` and `.app { height: auto; min-height: 100vh }`
- [x] T105 [P] Add responsive `.btn` and `.btn-sm` rules inside `@media (max-width: 768px)` in v2/index.html — increase padding for 44px touch targets: `.btn { padding: 8px 12px }`, `.btn-sm { padding: 6px 10px; font-size: 12px }`
- [x] T106 [P] Add responsive `.modal` rules inside `@media (max-width: 768px)` in v2/index.html — `.modal { width: calc(100vw - 16px); max-width: 100%; margin: 8px }`, `.modal.wide { width: calc(100vw - 16px) }`
- [x] T107 [P] Add responsive `.toast` rules inside `@media (max-width: 768px)` in v2/index.html — `.toast { left: 16px; right: 16px; bottom: 16px; text-align: center }`

**Checkpoint**: Base responsive CSS ready — all views have proper touch targets, modals fit mobile viewport.

---

## Phase 17: US13 — Header & Toolbar Responsive (Priority: P1) 🎯 MVP

**Goal**: Header and toolbar adapt to mobile — project selector, view tabs, action buttons wrap properly without overflow

**Independent Test**: Chrome DevTools → 375px width. Header shows logo + project selector on line 1, view tabs + buttons wrap below. Toolbar filters wrap, stats hidden. No horizontal overflow.

### Implementation for US13

- [x] T108 [US13] Add responsive `.header` rules inside `@media (max-width: 768px)` in v2/index.html — `.header { flex-wrap: wrap; padding: 8px 12px; gap: 8px }`, `.header h1 { font-size: 14px }`
- [x] T109 [US13] Add responsive `.header-actions` rules inside `@media (max-width: 768px)` in v2/index.html — `.header-actions { flex-wrap: wrap; gap: 4px; width: 100%; justify-content: flex-start }`
- [x] T110 [P] [US13] Add responsive `.view-tabs` and `.view-tab` rules inside `@media (max-width: 768px)` in v2/index.html — `.view-tab { padding: 6px 10px; font-size: 12px }`
- [x] T111 [US13] Add responsive `.toolbar` rules inside `@media (max-width: 768px)` in v2/index.html — `.toolbar { flex-wrap: wrap; padding: 6px 12px; gap: 6px }`, `.stats { display: none }`
- [x] T112 [US13] Add responsive `.search-box` rule inside `@media (max-width: 768px)` in v2/index.html — `.search-box { width: 100%; order: 10 }`
- [x] T113 [US13] Add phone header rules inside `@media (max-width: 480px)` in v2/index.html — `.header h1 { font-size: 12px }`, hide non-essential header buttons (Export, Jira CSV, Import) by adding classNames `btn-export`, `btn-jira`, `btn-import` to those buttons in JSX (around line 1638-1641) and hiding them: `.btn-export, .btn-jira, .btn-import { display: none }`
- [x] T114 [US13] Modify header action buttons JSX in v2/index.html (around line 1638-1641) — add className `btn-export` to Export button, `btn-jira` to Jira CSV button, `btn-import` to Import button for phone-specific hiding

**Checkpoint**: Header and toolbar fully responsive at 768px and 480px.

---

## Phase 18: US14 — Gantt View Responsive (Priority: P1)

**Goal**: Hide gantt-panel on mobile, task-panel takes full width. Task rows larger for touch, simplified columns on phone.

**Independent Test**: 375px viewport, Gantt view selected. Task list full-width, no gantt chart visible. Task rows 40px height, tappable. On 480px: date columns hidden.

### Implementation for US14

- [x] T115 [US14] Add responsive `.main` and `.task-panel` rules inside `@media (max-width: 768px)` in v2/index.html — `.main { flex-direction: column }`, `.task-panel { width: 100%; min-width: unset; border-right: none; flex: 1 }`
- [x] T116 [US14] Add `.gantt-panel { display: none }` inside `@media (max-width: 768px)` in v2/index.html
- [x] T117 [US14] Add responsive `.task-row` rules inside `@media (max-width: 768px)` in v2/index.html — `.task-row { height: 40px; padding: 0 6px; font-size: 12px }`
- [x] T118 [US14] Add classNames to task-panel column header cells in JSX (around line 1797-1806) in v2/index.html — add `className="col-wbs"` to WBS div, `className="col-start"` to Start div, `className="col-dur"` to Dur div, `className="col-end"` to End div
- [x] T119 [US14] Add classNames to task-row JSX for leaf tasks (around line 1833-1847) in v2/index.html — add `className="col-wbs"` to WBS span, `className="col-start"` and `className="col-end"` to date spans, `className="col-dur"` to duration span
- [x] T120 [US14] Add classNames to task-row JSX for parent tasks (around line 1818-1831) in v2/index.html — add `className="col-wbs"` to WBS span, `className="col-start"` and `className="col-end"` to date spans, `className="col-dur"` to duration span
- [x] T121 [US14] Add phone column hiding rules inside `@media (max-width: 480px)` in v2/index.html — `.col-wbs, .col-start, .col-dur, .col-end { display: none !important }`, `.task-row .task-date { display: none }`

**Checkpoint**: Gantt view works on mobile — full-width task list, no gantt, simplified columns on phone.

---

## Phase 19: US15 — Board View Responsive (Priority: P2)

**Goal**: Board view kanban columns scrollable horizontally on mobile

**Independent Test**: 375px viewport, Board view. Columns scroll horizontally. Cards readable and tappable.

### Implementation for US15

- [x] T122 [US15] Add className `board-view` to Board view container div in JSX (around line 1895) in v2/index.html
- [x] T123 [US15] Add className `board-column` to each Board status column div in JSX (around line 1904) in v2/index.html, change inline `minWidth:220` to `minWidth:180`
- [x] T124 [US15] Add responsive Board rules inside `@media (max-width: 768px)` in v2/index.html — `.board-view { padding: 8px; gap: 8px; -webkit-overflow-scrolling: touch }`, `.board-column { min-width: 160px !important }`
- [x] T125 [US15] Add phone Board rules inside `@media (max-width: 480px)` in v2/index.html — `.board-column { min-width: 140px !important }`

**Checkpoint**: Board view usable on mobile with horizontal scroll.

---

## Phase 20: US16 — Detail Overlay & Modals Responsive (Priority: P2)

**Goal**: Detail overlay full-width on mobile. Modals fit viewport. Touch-friendly form inputs.

**Independent Test**: 375px viewport, tap task → detail panel full-width. All form fields usable. Admin modal fits screen.

### Implementation for US16

- [x] T126 [US16] Add responsive `.detail-overlay` rules inside `@media (max-width: 768px)` in v2/index.html — `.detail-overlay { width: 100%; left: 0 }`
- [x] T127 [P] [US16] Add responsive `.detail-overlay .close-btn` rules inside `@media (max-width: 768px)` in v2/index.html — `.detail-overlay .close-btn { font-size: 24px; top: 10px; right: 14px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center }`
- [x] T128 [P] [US16] Add responsive form input rules inside `@media (max-width: 768px)` in v2/index.html — `.detail-overlay .field input, .detail-overlay .field select, .detail-overlay .field textarea, .modal .field input, .modal .field select, .modal .field textarea { padding: 10px 12px; font-size: 14px }`
- [x] T129 [US16] Add responsive `.confirm-dialog` and `.admin-table` rules inside `@media (max-width: 768px)` in v2/index.html — `.confirm-dialog { width: calc(100vw - 32px) }`, `.admin-table { display: block; overflow-x: auto }`

**Checkpoint**: Detail overlay and modals fully usable on mobile.

---

## Phase 21: US17 — Minutes View & Login Responsive (Priority: P3)

**Goal**: Minutes view readable on mobile. Login form adapts to phone width.

**Independent Test**: 375px viewport, Minutes view. Meeting cards full-width. Create/edit panel usable. Login screen centered, form fits phone.

### Implementation for US17

- [x] T130 [US17] Add className `meeting-card` to meeting list card div in JSX (around line 1706) and remove inline `maxWidth:500` from content preview in v2/index.html
- [x] T131 [US17] Add className `attendee-chip` to attendee toggle spans in JSX (around line 1761) in v2/index.html
- [x] T132 [US17] Add responsive meeting and attendee rules inside `@media (max-width: 768px)` in v2/index.html — `.meeting-card { flex-wrap: wrap }`, `.attendee-chip { padding: 6px 10px !important; font-size: 12px !important }`
- [x] T133 [US17] Add className `login-form` to LoginScreen form element in JSX (around line 471) in v2/index.html
- [x] T134 [US17] Add responsive login rules inside `@media (max-width: 480px)` in v2/index.html — `.login-form { width: calc(100vw - 32px) !important; padding: 24px !important }`

**Checkpoint**: Minutes view and login screen work on mobile.

---

## Phase 22: Polish — Mobile Touch & iOS Fixes

**Purpose**: Final mobile optimizations across all views

- [x] T135 [P] Add `-webkit-overflow-scrolling: touch` to `.task-list`, `.gantt-body`, `.detail-overlay` inside `@media (max-width: 768px)` in v2/index.html for smooth iOS Safari scrolling
- [x] T136 [P] Add `select { -webkit-appearance: none; appearance: none }` inside `@media (max-width: 768px)` in v2/index.html for consistent select styling on mobile Safari
- [ ] T137 Manual test: Chrome DevTools responsive mode — test at 375px (iPhone SE), 390px (iPhone 14), 768px (iPad), 1024px (iPad landscape). Verify all views: Login, Gantt, Board, Minutes, Detail overlay, Admin modal. Fix any overflow or touch issues found.
- [ ] T138 Deploy updated v2/index.html to VPS via scp

---

## Dependencies & Execution Order (Mobile Layout)

### Phase Dependencies (Mobile)

```
Phase 15 (CSS Setup) → Phase 16 (Foundation)
Phase 16 (Foundation) → Phase 17-21 (all user stories, can run in parallel)
Phase 17-21 (all stories) → Phase 22 (Polish)
```

### User Story Independence (Mobile)

| Story | Depends On | Can Test After |
|-------|-----------|----------------|
| US13 (Header/Toolbar) | Phase 16 | Phase 17 done — header responsive |
| US14 (Gantt View) | Phase 16 | Phase 18 done — task list full-width on mobile |
| US15 (Board View) | Phase 16 | Phase 19 done — board scrollable |
| US16 (Detail/Modals) | Phase 16 | Phase 20 done — overlays full-width |
| US17 (Minutes/Login) | Phase 16 | Phase 21 done — minutes/login responsive |

### Parallel Opportunities (Mobile)

- **Phase 16**: T105, T106, T107 can run in parallel
- **After Phase 16**: ALL user stories (US13-US17) can run in parallel
- **Phase 22**: T135, T136 can run in parallel
- CSS-only tasks across stories never conflict (different selectors)

---

## Implementation Strategy (Mobile)

### MVP First (US13 + US14 — Header + Gantt)

1. Complete Phase 15: Setup (T102-T103)
2. Complete Phase 16: Foundation (T104-T107)
3. Complete Phase 17: US13 Header (T108-T114)
4. Complete Phase 18: US14 Gantt (T115-T121)
5. **STOP and VALIDATE**: Test at 375px and 768px
6. Deploy — primary mobile experience ready

### Full Delivery

1. MVP above → Deploy
2. Add US15 Board (T122-T125) → Deploy
3. Add US16 Detail/Modals (T126-T129) → Deploy
4. Add US17 Minutes/Login (T130-T134) → Deploy
5. Polish (T135-T138) → Final deploy

---

## Summary (Updated with Mobile Layout)

| Phase | Story | Tasks | Count |
|-------|-------|-------|-------|
| Phase 1 | Setup | T001-T003 | 3 |
| Phase 2 | Foundational (Backend) | T004-T023 | 20 |
| Phase 3 | US5 - Data Layer | T024-T036 | 13 |
| Phase 4 | US6 - Parent Rendering | T037-T043 | 7 |
| Phase 5 | US7 - Indent/Outdent | T044-T052 | 9 |
| Phase 6 | US8 - UI Polish | T053-T060 | 8 |
| Phase 7 | US9 - Dep Types | T061-T066 | 6 |
| Phase 8 | Deploy | T067-T073 | 7 |
| Phase 9 | US10 - Export Update | T074-T079 | 6 |
| Phase 10 | Meeting Setup | T080-T081 | 2 |
| Phase 11 | Meeting Backend CRUD | T082-T085 | 4 |
| Phase 12 | US11 - Meeting UI MVP | T086-T091 | 6 |
| Phase 13 | US12 - @Mention | T092-T096 | 5 |
| Phase 14 | Meeting Polish | T097-T101 | 5 |
| Phase 15 | Mobile CSS Setup | T102-T103 | 2 |
| Phase 16 | Mobile Foundation | T104-T107 | 4 |
| Phase 17 | US13 - Header Responsive | T108-T114 | 7 |
| Phase 18 | US14 - Gantt Responsive | T115-T121 | 7 |
| Phase 19 | US15 - Board Responsive | T122-T125 | 4 |
| Phase 20 | US16 - Detail/Modals Responsive | T126-T129 | 4 |
| Phase 21 | US17 - Minutes/Login Responsive | T130-T134 | 5 |
| Phase 22 | Mobile Polish | T135-T138 | 4 |
| **Total** | | **T001-T138** | **138** |
