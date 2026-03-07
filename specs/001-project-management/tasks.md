# Tasks: Poker Texas Build Plan v2 - Modular Architecture

**Input**: Design documents from `/specs/001-project-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested. Manual testing per quickstart.md.

**Organization**: Tasks organized by module-first within each user story phase. Each module (M1-M8) is built incrementally across phases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different code sections, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- File paths reference v2/ directory

---

## Phase 1: Setup

**Purpose**: Project skeleton, dependencies, backend base files

- [x] T001 Create v2/ directory structure with v2/data/ subdirectory
- [x] T002 Create v2/package.json with dependencies: express, pg, bcryptjs, jsonwebtoken, cors, dotenv
- [x] T003 [P] Create v2/.env with DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS, JWT_SECRET, PORT per quickstart.md
- [x] T004 [P] Create v2/data/initial-tasks.json with INITIAL_TASKS data: 3 Epics (Pre-production 8 tasks, Production 18 tasks, Testing & QA 8 tasks), default members per project.info.md teams table, default teamColors (9 teams with hex colors), default phaseColors (3 phases), version:1, savedAt timestamp

**Checkpoint**: v2/ directory ready with all config files.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend server + database + base frontend HTML shell with module scaffolding. MUST complete before user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Create v2/seed.js: connect to PostgreSQL, CREATE TABLE users (id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT NOW()), CREATE TABLE projects (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users, data JSONB NOT NULL, updated_at TIMESTAMP DEFAULT NOW()), insert admin user with bcryptjs hashed password, insert default project with data from v2/data/initial-tasks.json
- [x] T006 Create v2/server.js: Express app with cors, express.json(), dotenv, pg Pool connection, serve static files from current directory (express.static), listen on PORT. Include placeholder comment blocks for API routes: // POST /api/login, // GET /api/data, // POST /api/data, // GET /api/version
- [x] T007 Create v2/index.html base shell: DOCTYPE html lang="vi", head with meta charset/viewport, title "Poker Texas Build Plan", CDN script tags (XLSX 0.18.5, ExcelJS 4.4.0, React 18.2.0 production, ReactDOM 18.2.0 production, Babel standalone 7.23.9). Style tag with MODULE HEADER comments for all 8 CSS sections (THEME & VARIABLES with :root CSS custom properties matching v1 color scheme, LAYOUT, TASK PANEL, GANTT PANEL, BOARD VIEW, DETAIL PANEL, ADMIN PANEL, MODALS & TOASTS). Body with div#root. Script type="text/babel" with 8 MODULE HEADER comment blocks (M1-M8) as empty scaffolding. M8 BOOTSTRAP: ReactDOM.createRoot(document.getElementById('root')).render(React.createElement('div', null, 'Loading...'))

**Checkpoint**: `node v2/seed.js` creates tables, `node v2/server.js` starts and serves index.html with "Loading..." text. All 8 module sections exist as scaffolding.

---

## Phase 3: User Story 1 - Quan ly Task co Gantt Chart (Priority: P1) MVP

**Goal**: Task CRUD phan cap theo phase, Gantt chart 9 tuan, autoSchedule, critical path.

**Independent Test**: Tao task moi, gan dependency, xac nhan Gantt chart hien thi dung va autoSchedule cap nhat ngay.

### M1 CONFIG (US1 portion)

- [x] T008 [US1] Write MODULE 1: CONFIG & CONSTANTS in v2/index.html: const PROJECT_START = new Date(2026, 2, 3), NUM_WEEKS = 9, DAY_MS = 86400000, PRIORITIES = ['High','Medium','Low'], STATUSES = ['To Do','In Progress','Done','Blocked'], INIT_TEAMS array (9 teams), TEAM_SORT_ORDER, INIT_TEAM_COLORS object, INIT_PHASE_COLORS object, INIT_MEMBERS object, PALETTE array (14 colors), API_BASE = '', DEBOUNCE_MS = 1000, POLL_INTERVAL_MS = 30000

### M2 DATE UTILS (complete)

- [x] T009 [US1] Write MODULE 2: DATE UTILITIES in v2/index.html: parseDate(str) DD/MM/YYYY to Date, formatDate(dt) Date to DD/MM/YYYY, addDays(dt,n), diffDays(a,b), isWeekend(dt), skipWeekend(dt) returns {date,skipped}, addWorkingDays(dt,n) skip weekends, getWorkingDaysBetween(a,b), weekOfDate(dt) relative to PROJECT_START, isValidDate(str) validate DD/MM/YYYY format and real date. All pure functions, no side effects.

### M3 TASK LOGIC (complete)

- [x] T010 [US1] Write MODULE 3: TASK LOGIC in v2/index.html: let nextId=100, initNextId(tasks) scan tree for max id, genId() return nextId++, deepClone(obj) JSON parse/stringify, flattenTasks(tasks) convert Epic/children tree to flat array with team sort order (TEAM_SORT_ORDER), detectCircularDeps(taskId, deps, allTasks) DFS cycle detection returning boolean, autoSchedule(tasks) topological sort + forward pass (start = max(dep.end)+1 working day, end = addWorkingDays(start, duration), skip weekends, update Epic dates as min/max of children), calculateCriticalPath(tasks) reverse pass CPM (Late Start/Finish, float=LS-ES, return Set of task IDs with float=0). All pure functions operating on task arrays.

### M6 UI COMPONENTS (US1 portion)

- [x] T011 [US1] Write CSS sections THEME & VARIABLES + LAYOUT + TASK PANEL + GANTT PANEL + DETAIL PANEL + MODALS & TOASTS in v2/index.html style tag: :root with --bg, --surface, --surface2, --border, --text, --text2, --primary, --green, --yellow, --red, --orange, --purple color variables plus --spacing-xs/sm/md/lg, --radius-sm/md, --font-size-xs/sm/md. Component styles for .app, .header, .main, .toolbar, .task-panel, .task-row, .gantt-panel, .gantt-bar, .detail-overlay, .modal, .toast, .btn variants. Match v1 dark theme visual design but with organized sections.

- [x] T012 [US1] Write TaskRow component in v2/index.html MODULE 6: function TaskRow({task, isEpic, indent, expanded, onToggle, onSelect, selected, teamColors}) renders single row with expand button (Epic only), indentation, task name, team badge colored by teamColors, priority dot, status badge, progress %, dates (start/end). Click row calls onSelect.

- [x] T013 [US1] Write TaskPanel component in v2/index.html MODULE 6: function TaskPanel({tasks, selectedId, onSelect, onToggle, onAddTask, teamColors}) renders scrollable task list, iterates tasks with flattenTasks for display, renders TaskRow per item, "Them task" button per Epic, panel header "Danh sach Task". Accepts scrollRef prop for scroll sync.

- [x] T014 [US1] Write GanttBar component in v2/index.html MODULE 6: function GanttBar({task, teamColors, isCritical, onClick}) calculates left position and width from task.start/end relative to PROJECT_START/NUM_WEEKS, renders positioned div with team color background, progress fill overlay, task name label, critical path red border if isCritical. Click calls onClick.

- [x] T015 [US1] Write GanttPanel component in v2/index.html MODULE 6: function GanttPanel({tasks, teamColors, criticalIds, selectedId, onSelect}) renders week headers (W1-W9 with date ranges), gantt rows matching task list order (flattenTasks), GanttBar per task, highlight current week column, empty rows for Epics. Accepts scrollRef for sync with TaskPanel.

- [x] T016 [US1] Write DetailPanel component in v2/index.html MODULE 6: function DetailPanel({task, isOpen, onClose, onUpdate, onDelete, members, teamColors, allTasks}) slide-in panel from right, edit fields: name (text input), team (dropdown from teamColors keys), assignee (dropdown filtered by selected team from members), priority (select PRIORITIES), status (select STATUSES), progress (range slider 0-100 with value display), start date (DatePicker component), end date (DatePicker component), duration (auto-calculated readonly from start/end working days), deps (DepsSelector component), notes (textarea). Update button saves via onUpdate(updatedTask), Delete link with confirm, close button (X).

- [x] T017 [US1] Write DatePicker component in v2/index.html MODULE 6: function DatePicker({value, onChange, label}) text input DD/MM/YYYY with validation (isValidDate), native date input as calendar trigger beside text input, sync between text input and date picker, error border on invalid date.

- [x] T018 [US1] Write DepsSelector component in v2/index.html MODULE 6: function DepsSelector({value, onChange, allTasks, currentTaskId}) multi-select showing all tasks (except current and Epics) with id + name labels, selected deps highlighted, add/remove deps on click, validate no circular dependency using detectCircularDeps before allowing add, show warning message if circular dep detected.

- [x] T019 [US1] Write ConfirmDialog and Toast components in v2/index.html MODULE 6: ConfirmDialog({title, message, onConfirm, onCancel}) modal overlay with confirm/cancel buttons. Toast({message, type, onClose}) fixed bottom-right notification with auto-dismiss after 3s.

### M7 APP CONTAINER (US1 portion)

- [x] T020 [US1] Write MODULE 7: APP CONTAINER in v2/index.html: function App() with useState for tasks (init from INITIAL_TASKS), members, teamColors, phaseColors, selectedTaskId, view ('gantt'), showDetail, showAdmin. Implement update(fn) function: deepClone state, apply fn, run autoSchedule, set state. Implement scroll sync between TaskPanel and GanttPanel using useRef + onScroll. Calculate criticalPath via useMemo. Render layout: Header placeholder (title + view tabs), main area with TaskPanel + GanttPanel side by side, DetailPanel overlay. Wire onSelect/onToggle/onAddTask/onUpdate/onDelete handlers through update(fn).

### M8 BOOTSTRAP (US1 portion)

- [x] T021 [US1] Write MODULE 8: BOOTSTRAP in v2/index.html: define INITIAL_TASKS constant (copy from v2/data/initial-tasks.json structure, 3 Epics with all children tasks matching project.info.md), call initNextId(INITIAL_TASKS), ReactDOM.createRoot(document.getElementById('root')).render(<App />)

**Checkpoint**: App renders task list + Gantt chart, task CRUD works, autoSchedule recalculates on dependency changes, critical path highlighted, detail panel edits all fields. MVP complete.

---

## Phase 4: User Story 2 - Xac thuc va Dong bo du lieu (Priority: P2)

**Goal**: Login, JWT auth, API save/load, conflict detection, localStorage cache.

**Independent Test**: Dang nhap 2 tab, sua task tab 1, tab 2 nhan cap nhat trong 30 giay.

### Backend API endpoints

- [x] T022 [US2] Implement POST /api/login in v2/server.js: parse username/password from body, query users table, bcryptjs.compare password, if match sign JWT with {userId, username} and 30d expiry, return {token, username}, else return 401 {error: "Invalid credentials"}
- [x] T023 [US2] Implement JWT auth middleware in v2/server.js: function authMiddleware(req, res, next) extract Bearer token from Authorization header, jwt.verify with JWT_SECRET, attach decoded to req.user, 401 on failure. Apply to all routes except POST /api/login.
- [x] T024 [US2] Implement GET /api/data in v2/server.js: authMiddleware, query projects WHERE user_id = req.user.userId, return data JSONB, 404 if not found
- [x] T025 [US2] Implement POST /api/data in v2/server.js: authMiddleware, receive body (tasks, members, teamColors, phaseColors, version), query current server version, if body.version < server version return 409 {error: "Version conflict", serverVersion, clientVersion: body.version}, else increment version, set savedAt = new Date().toISOString(), UPSERT into projects (INSERT ON CONFLICT user_id DO UPDATE SET data, updated_at), return {ok: true, version, savedAt}
- [x] T026 [US2] Implement GET /api/version in v2/server.js: authMiddleware, query projects for user, extract version and savedAt from data JSONB, return {version, savedAt}

### M4 PERSISTENCE (complete)

- [x] T027 [US2] Write MODULE 4: DATA PERSISTENCE in v2/index.html: lsSave(state) serialize {tasks, members, teamColors, phaseColors, version} to localStorage key 'ptb-data', lsLoad() parse from localStorage and return or null. apiCall(method, path, body, token) fetch with Authorization Bearer header + JSON content type, handle response status, return parsed JSON. apiLoad(token) GET /api/data, apiSave(data, token) POST /api/data.
- [x] T028 [US2] Write useAutoSave custom hook in v2/index.html MODULE 4: function useAutoSave(data, token, version) uses useRef for debounce timer, useEffect watches data changes, on change: immediately call lsSave(data), clear previous timer, set new setTimeout(DEBOUNCE_MS) to call apiSave, handle 409 conflict (return conflict info), handle 401 (return auth error). Add beforeunload event listener to call lsSave.
- [x] T029 [US2] Write useVersionPoll custom hook in v2/index.html MODULE 4: function useVersionPoll(token, currentVersion, onConflict) uses useEffect with setInterval(POLL_INTERVAL_MS), calls GET /api/version, if server version > currentVersion call onConflict callback, cleanup interval on unmount.

### M6 UI COMPONENTS (US2 additions)

- [x] T030 [US2] Write LoginScreen component in v2/index.html MODULE 6: function LoginScreen({onLogin}) renders centered login form with dark theme, username input, password input, "Dang nhap" button, error message area. On submit call POST /api/login via apiCall, on success call onLogin(token, username), on 401 show error "Sai ten dang nhap hoac mat khau".

### M7 APP CONTAINER (US2 integration)

- [x] T031 [US2] Integrate auth + persistence into App component in v2/index.html MODULE 7: add useState for token (init from localStorage 'ptb-token'), username, version, showConflict. On mount: if token exists call apiLoad to fetch data and set state (tasks/members/teamColors/phaseColors/version), else show LoginScreen. Login handler: store token in localStorage, call apiLoad. Logout handler: clear localStorage token, reset state. Wire useAutoSave(data, token, version) into update(fn) flow. Wire useVersionPoll(token, version, onConflict). Conflict dialog: show modal "Du lieu da thay doi boi nguoi khac", button "Tai lai" calls apiLoad. Header: show username + "Dang xuat" button.

**Checkpoint**: Login works, data persists to server, localStorage caches instantly, conflict detected between 2 tabs within 30s, beforeunload saves to localStorage.

---

## Phase 5: User Story 3 - Board View (Kanban) va Bo loc (Priority: P3)

**Goal**: Kanban 4 cot, filter phase/team/status, search, thong ke.

**Independent Test**: Chuyen Board view, loc team "Dev", search "CongNN", kiem tra stats.

### M6 UI COMPONENTS (US3 additions)

- [x] T032 [US3] Write CSS section BOARD VIEW in v2/index.html style tag: .board container (flex, gap), .board-column (flex-direction column, min-width, flex 1), .board-column-header (sticky, count badge), .board-card (surface background, border, padding, cursor pointer, hover effect), .board-card .team-badge, .board-card .progress-bar
- [x] T033 [US3] Write FilterBar component in v2/index.html MODULE 6: function FilterBar({filters, onChange, phases, teams, stats}) renders: Phase dropdown (Tat ca + phase names from phaseColors), Team dropdown (Tat ca + team names from teamColors), Status dropdown (Tat ca + STATUSES), search text input placeholder "Tim kiem task, member...", stats display showing total | in progress (blue dot) | done (green dot) | blocked (red dot) counts.
- [x] T034 [US3] Write BoardCard component in v2/index.html MODULE 6: function BoardCard({task, teamColors, onClick}) renders card with task name, team badge (colored), assignee name, priority indicator (dot), progress bar with percentage. Click calls onClick.
- [x] T035 [US3] Write BoardView component in v2/index.html MODULE 6: function BoardView({tasks, teamColors, onSelect}) renders 4 columns (To Do, In Progress, Done, Blocked), column headers with status name + count, filter tasks by status into columns, render BoardCard per task, empty state text per column if no tasks.

### M7 APP CONTAINER (US3 integration)

- [x] T036 [US3] Integrate filters and Board view into App component in v2/index.html MODULE 7: add useState for filterPhase, filterTeam, filterStatus, searchText. Implement filteredTasks useMemo: flattenTasks then filter by phase (match Epic name), team, status, search (case-insensitive match on task.name or task.assignee). Compute stats from filteredTasks. Implement view toggle ('gantt'/'board') in Header. Render FilterBar above main area. Conditionally render GanttPanel+TaskPanel or BoardView based on view state. Pass filteredTasks to both views. Wire onSelect to open DetailPanel from BoardCard click.

**Checkpoint**: Board view shows tasks in 4 correct columns, filters work (phase/team/status/search), stats show accurate counts, view toggle switches between Gantt and Board.

---

## Phase 6: User Story 4 - Admin quan ly Team/Member/Phase (Priority: P4)

**Goal**: Admin panel CRUD members/teams/phases, phase creates Epic.

**Independent Test**: Them member, xac nhan xuat hien trong assignee dropdown.

### M6 UI COMPONENTS (US4 additions)

- [x] T037 [US4] Write CSS section ADMIN PANEL in v2/index.html style tag: .admin-modal (wide modal), .admin-tabs (tab navigation), .admin-tab/.admin-tab.active, .admin-table (full width, styled rows), .admin-table input/select, .color-picker (small color input), .admin-add-form (inline form row)
- [x] T038 [US4] Write AdminPanel component in v2/index.html MODULE 6: function AdminPanel({isOpen, onClose, members, teams, phases, teamColors, phaseColors, onUpdateMembers, onUpdateTeams, onUpdatePhases}). 3 tabs: "Thanh vien" (Members), "Team", "Phase". Members tab: table with name/team columns, inline edit name, change team dropdown, delete button with ConfirmDialog, add form (name input + team dropdown + "Them" button). Teams tab: table with name/color columns, color picker input, delete button (warn if members exist), add form (name + color picker). Phases tab: table with name/color columns, color picker, delete button (warn "Se xoa Epic va tat ca task con", use ConfirmDialog), add form (name + color picker). All mutations call respective onUpdate callbacks.

### M7 APP CONTAINER (US4 integration)

- [x] T039 [US4] Integrate AdminPanel into App component in v2/index.html MODULE 7: add useState showAdmin. Header: "Quan ly" button to toggle showAdmin. Implement handlers: onUpdateMembers(newMembers) via update(fn) set members, onUpdateTeams(newTeamColors) via update(fn) set teamColors, onUpdatePhases(newPhaseColors, action) via update(fn) - if add phase: add to phaseColors + create new Epic task in tasks with genId(), if delete phase: remove from phaseColors + remove corresponding Epic and its children from tasks. Render AdminPanel with isOpen={showAdmin}.

**Checkpoint**: Admin panel CRUD works, new member shows in assignee dropdown, new team shows in filter and Gantt colors, new phase auto-creates Epic.

---

## Phase 7: User Story 5 - Import/Export du lieu (Priority: P5)

**Goal**: Export JSON/Excel/Jira CSV, import JSON/Excel, reset.

**Independent Test**: Export Excel, import JSON, xac nhan du lieu khop.

### M5 IMPORT/EXPORT (complete)

- [x] T040 [P] [US5] Write exportJSON function in v2/index.html MODULE 5: function exportJSON(data) serialize {tasks, members, teamColors, phaseColors} to JSON string, create Blob, trigger download as poker_build_plan_YYYYMMDD.json
- [x] T041 [P] [US5] Write importJSON function in v2/index.html MODULE 5: function importJSON(file, callback) FileReader readAsText, JSON.parse, validate required keys (tasks, members, teamColors, phaseColors), call callback(parsedData) on success, return error message on failure
- [x] T042 [US5] Write exportExcel function in v2/index.html MODULE 5: function exportExcel(data, teamColors) using ExcelJS: create Workbook, add Worksheet "Build Plan", styled header row (bold white text, dark background, border), flatten tasks, each row with: Task Name, Phase (Epic name), Team, Assignee, Priority, Status, Start, End, Duration, Progress, Notes. Color-code Team cell background using teamColors, Status cell (green=Done, blue=In Progress, red=Blocked, gray=To Do), Priority cell (red=High, yellow=Medium, green=Low). Auto-fit column widths. Write to buffer, create Blob, trigger download as Poker_Build_Plan.xlsx
- [x] T043 [US5] Write exportJiraCSV function in v2/index.html MODULE 5: function exportJiraCSV(data) flatten tasks, generate CSV string with columns: Summary, Issue Type, Epic Name, Epic Link, Status (map to Jira statuses), Priority, Assignee, Start Date (ISO YYYY-MM-DD format), Due Date (ISO), Original Estimate (duration * 8 + "h"). Epic rows first (Issue Type = "Epic"), then children (Issue Type = "Task", Epic Link = Epic name). Create Blob text/csv, trigger download as Jira_Import_PTB.csv
- [x] T044 [US5] Write importExcel function in v2/index.html MODULE 5: function importExcel(file, callback) using XLSX: FileReader readAsArrayBuffer, XLSX.read, get first sheet, detectHeaders(sheet) scan rows for header row containing keywords (task/name/team/assignee/status/priority/start/end), XLSX.utils.sheet_to_json with detected header row, normalizeRow(row) for each row: parse dates to DD/MM/YYYY, normalize status to valid STATUSES enum, normalize priority to valid PRIORITIES, match team name to closest existing team, group by phase column into Epic/children structure. Call callback(normalizedData) with {tasks, members}. Show import summary.
- [x] T045 [US5] Write Import/Export UI integration in v2/index.html MODULE 6 + MODULE 7: Header dropdown menu "Du lieu" with options: Export JSON, Export Excel, Export Jira CSV, divider, Import JSON (file input hidden triggered by menu click), Import Excel (file input hidden), divider, Reset (ConfirmDialog "Khoi phuc du lieu mac dinh?", on confirm load INITIAL_TASKS via update(fn)). Wire each option to corresponding M5 function. Import callbacks call update(fn) to set new state.

**Checkpoint**: All 3 exports produce correct files, JSON round-trip preserves data, Excel import auto-detects columns, reset restores defaults.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Responsive, UX improvements, final validation

- [x] T046 [P] Add responsive CSS in v2/index.html: media queries for screens < 768px: stack TaskPanel + GanttPanel vertically, Board columns wrap, AdminPanel full width, DetailPanel full width on mobile, header wrap actions
- [x] T047 [P] Add keyboard shortcuts in v2/index.html MODULE 7: useEffect with keydown listener: Escape closes DetailPanel/AdminPanel/ConfirmDialog, Ctrl+S triggers manual save (preventDefault)
- [x] T048 Add error handling and loading states in v2/index.html MODULE 7: loading spinner during apiLoad (useState isLoading), error message on API failures (Toast with type='error'), network offline detection (navigator.onLine + online/offline events, show banner "Mat ket noi mang"), graceful handling of localStorage quota exceeded
- [ ] T049 Run quickstart.md validation: verify seed.js creates tables and data, verify server.js starts and serves index.html, verify all curl API commands from quickstart.md, verify full browser flow (login → Gantt → create task → autoSchedule → Board → filters → Admin → Export Excel → Import JSON → reset), verify SCP deploy to VPS works

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundation)**: Depends on Phase 1 - BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 (needs HTML shell + server)
- **Phase 4 (US2)**: Depends on Phase 2 (backend) + Phase 3 (frontend App component for integration)
- **Phase 5 (US3)**: Depends on Phase 3 (needs TaskPanel, flattenTasks, state, App layout)
- **Phase 6 (US4)**: Depends on Phase 3 (needs state management, update(fn))
- **Phase 7 (US5)**: Depends on Phase 3 (needs flattenTasks, state structure)
- **Phase 8 (Polish)**: Depends on all user stories

### Module Build Order (across phases)

```
Phase 2: M8 scaffold (empty modules)
Phase 3: M1 (full) → M2 (full) → M3 (full) → M6 (US1 components) → M7 (US1 state) → M8 (bootstrap)
Phase 4: M4 (full) → M6 (+LoginScreen) → M7 (+auth integration) → server.js endpoints
Phase 5: M6 (+FilterBar, BoardView) → M7 (+filters, view toggle)
Phase 6: M6 (+AdminPanel) → M7 (+admin integration)
Phase 7: M5 (full) → M6 (+export/import UI) → M7 (+menu wiring)
```

### Parallel Opportunities

- **Setup**: T003 + T004 (.env + initial-tasks.json)
- **US1**: T009 + T010 (M2 + M3 are independent pure function modules after M1)
- **US2**: T022-T026 (server endpoints can be written in parallel)
- **US5**: T040 + T041 (exportJSON + importJSON are independent)
- **Post-US1**: US3, US4, US5 can run in parallel after US1 completes
- **Polish**: T046 + T047 (responsive CSS + keyboard shortcuts)

---

## Implementation Strategy

### MVP First (Phase 1-3 only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundation (T005-T007)
3. Complete Phase 3: US1 (T008-T021)
4. **STOP and VALIDATE**: Task CRUD + Gantt chart works locally
5. At this point: 8 modules scaffolded, M1-M3 complete, M6-M8 partial

### Incremental Delivery

```
Phase 1-2: Skeleton → server serves empty page
Phase 3:   US1 MVP → full Gantt chart app (no auth, local only)
Phase 4:   US2     → multi-user, server sync, login
Phase 5:   US3     → Kanban board + filters
Phase 6:   US4     → admin panel
Phase 7:   US5     → import/export
Phase 8:   Polish  → responsive, keyboard, error handling
```

Each phase adds capability without breaking previous functionality.

---

## Notes

- All frontend code goes in v2/index.html organized by 8 module sections
- All backend code goes in v2/server.js
- Module order in file MUST follow dependency graph: M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8
- CSS sections MUST match JS module component groups for easy navigation
- Use /* ═══ MODULE N: NAME ═══ */ comment headers consistently
- Commit after each module or logical group within a phase
