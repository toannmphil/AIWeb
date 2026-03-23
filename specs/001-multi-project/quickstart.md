# Quickstart: Unified Task Management

Base URL: `http://76.13.213.204:3001`

## Scenario 1: Login & Load Project

```bash
# Login
TOKEN=$(curl -s -X POST $BASE/api/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')
echo "Token: ${TOKEN:0:20}..."

# List projects
curl -s $BASE/api/projects -H "Authorization: Bearer $TOKEN" | jq .

# Load project 1 data
curl -s $BASE/api/project/1 -H "Authorization: Bearer $TOKEN" | jq '.data.tasks | length'
```

**Expected**: Login OK, 3 projects listed, tasks loaded.

## Scenario 2: View Top-Level Tasks (replaces "Get Epics")

```bash
# Top-level tasks = tasks with no parent (previously "epics")
curl -s "$BASE/api/project/1/tasks?leaf=false" \
  -H "Authorization: Bearer $TOKEN" | jq '.tasks[] | {id, name, children: (.children | length)}'
```

**Expected**: Returns top-level parent tasks like "Pre-production", "Production", etc.

## Scenario 3: Create Task & Indent

```bash
# Create top-level task
curl -s -X POST $BASE/api/project/1/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"parentId":null,"name":"New Phase","status":"Not Started"}' | jq .

# Create child task under it
PARENT_ID=$(curl -s "$BASE/api/project/1/tasks" -H "Authorization: Bearer $TOKEN" | jq '.tasks[-1].id')
curl -s -X POST $BASE/api/project/1/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"parentId\":$PARENT_ID,\"name\":\"Child Task\",\"team\":\"Dev\",\"status\":\"Not Started\",\"start\":\"10/03/2026\",\"end\":\"15/03/2026\"}" | jq .
```

**Expected**: Parent task created, child task added. Parent auto-computes start/end.

## Scenario 4: Indent/Outdent

```bash
# Create two sibling tasks
curl -s -X POST $BASE/api/project/1/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"parentId":1,"name":"Task A","team":"Dev","status":"Not Started","start":"10/03/2026","end":"12/03/2026"}'

TASK_B=$(curl -s -X POST $BASE/api/project/1/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"parentId":1,"name":"Task B","team":"Dev","status":"Not Started","start":"13/03/2026","end":"15/03/2026"}' | jq '.task.id')

# Indent Task B under Task A
curl -s -X POST $BASE/api/project/1/tasks/$TASK_B/indent \
  -H "Authorization: Bearer $TOKEN" | jq .

# Outdent Task B back
curl -s -X POST $BASE/api/project/1/tasks/$TASK_B/outdent \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected**: Task B becomes child of Task A (indent), then sibling again (outdent).

## Scenario 5: Dependency with Type & Lag

```bash
# Update task with FS dependency + 2 day lag
curl -s -X PUT $BASE/api/project/1/tasks/12 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"deps":[{"id":10,"type":"FS","lag":2}]}' | jq '.task.deps'
```

**Expected**: Task 12 depends on task 10 with Finish-to-Start + 2 days lag.

## Scenario 6: Status Update

```bash
# Set task to In Progress
curl -s -X PATCH $BASE/api/project/1/tasks/10/status \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"In Progress","pct":50}' | jq '{status: .task.status, pct: .task.pct}'

# Set task to Completed
curl -s -X PATCH $BASE/api/project/1/tasks/10/status \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"Completed"}' | jq '{status: .task.status, pct: .task.pct}'
```

**Expected**: Status updates, Completed auto-sets pct=100.

## Scenario 7: Cannot Edit Parent Task Computed Fields

```bash
# Try to set assignee on parent task (has children)
curl -s -X PUT $BASE/api/project/1/tasks/1 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"assignee":"CongNN"}' | jq .

# Try to set status on parent task
curl -s -X PATCH $BASE/api/project/1/tasks/1/status \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"Completed"}' | jq .
```

**Expected**: Both return 400 error — parent task fields are auto-computed.

## Scenario 8: Project Summary Stats

```bash
curl -s $BASE/api/project/1/summary \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected**: Returns `totalTasks`, `totalLeafTasks`, `totalParentTasks`, `avgProgress`, `byStatus`, `byTeam`, `maxDepth`.

## Scenario 9: Data Migration (one-time)

```bash
# Migrate all projects from old format to unified format
curl -s -X POST $BASE/api/migrate \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected**: All projects migrated, returns count. Old fields (type, isEpic, isSummary, phase, phaseColors) removed.

## Scenario 10: Delete Parent Task (cascading)

```bash
# Delete parent task — should delete all children
curl -s -X DELETE $BASE/api/project/1/tasks/100 \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected**: Parent task and all nested children deleted.

## Scenario 11: Export Excel

1. Mở browser, navigate to project
2. Click button **"Excel"** ở header
3. File `Poker_Build_Plan.xlsx` được download

**Verify**:
- Tất cả tasks xuất hiện (kể cả collapsed)
- WBS column đúng (1, 1.1, 1.2, 2, 2.1, etc.)
- Task column indent đúng theo level (parent không indent, child 2 spaces, grandchild 4 spaces)
- Parent tasks: bold, Type = "Parent", Team/Assignee/Priority/Status = empty
- Leaf tasks: Type = "Task", có đầy đủ Team/Assignee/Priority/Status
- Team cells tô màu nền = teamColor, chữ trắng
- Status cells tô màu: Not Started (xám), In Progress (xanh), Completed (xanh lá), On Hold (đỏ)
- Priority cells tô màu: High (đỏ nhạt), Normal (vàng), Low (xanh nhạt)
- % Complete hiển thị dạng percentage (0%, 50%, 100%)
- Dependencies format: `T010FS`, `T015SS+2`

## Scenario 12: Create Meeting Minutes with @Mention

```bash
# Create meeting
curl -s -X POST $BASE/api/project/1/meetings \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "title": "Sprint Review - Week 10",
    "date": "10/03/2026",
    "content": "Reviewed @CongNN card engine progress.\n@HuongBP reported betting system 70% done.\n\nDecisions:\n- Postpone AI bot to sprint 4\n\nAction items:\n- @ToanNM update timeline by 12/03",
    "attendees": ["ToanNM", "CongNN", "HuongBP"]
  }' | jq .
```

**Expected**: Meeting created with id=1, content contains @mentions as plain text.

## Scenario 13: List & Filter Meetings

```bash
# List all meetings
curl -s "$BASE/api/project/1/meetings" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Filter by date range
curl -s "$BASE/api/project/1/meetings?from=01/03/2026&to=15/03/2026" \
  -H "Authorization: Bearer $TOKEN" | jq '.meetings[] | {id, title, date}'
```

**Expected**: Returns meetings list with total count and version.

## Scenario 14: Update Meeting

```bash
# Update content with new @mention
curl -s -X PUT $BASE/api/project/1/meetings/1 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "content": "Updated: @CongNN completed card engine. @LocPT started wireframe review.",
    "attendees": ["ToanNM", "CongNN", "HuongBP", "LocPT"]
  }' | jq .
```

**Expected**: Meeting updated, version bumped.

## Scenario 15: Delete Meeting

```bash
curl -s -X DELETE $BASE/api/project/1/meetings/1 \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected**: `{ "ok": true, "version": N }`

## Scenario 16: Export Jira CSV

1. Mở browser, navigate to project
2. Click button **"Jira CSV"** ở header
3. File `Jira_Import_PTB.csv` được download

**Verify**:
- Mở CSV trong text editor hoặc Excel
- Headers: `Issue Id,Issue Type,Summary,Parent,Priority,Assignee,Labels,Description,Due date,Original Estimate`
- Issue Type mapping:
  - Top-level parent tasks (Pre-production, Production, Testing) → **Epic**
  - Direct children (depth 1) → **Story**
  - Grandchildren+ (depth 2+) → **Sub-task**
  - Top-level standalone tasks → **Task**
- Parent column: chứa Issue Id (= task.id) của task cha, empty cho top-level
- Priority: `Normal` → `Medium`
- Description: notes + start date + dependencies
- Parents xuất hiện TRƯỚC children
- Import vào Jira Cloud: System > External System Import > CSV → chọn file → map columns → verify parent-child preserved
