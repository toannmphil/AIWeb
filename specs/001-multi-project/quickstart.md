# Quickstart: Multi-Project Management

## Scenario 1: First Login (No Projects)

```bash
# 1. Login
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# → {"token":"xxx","username":"admin"}

# 2. Load projects list
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/projects
# → [{"id":1,"name":"Poker Texas Build Plan","is_default":true}]

# 3. Load shared settings
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/settings
# → {"members":{},"teamColors":{}}

# 4. Load default project data
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/project/1
# → {"data":{"tasks":[...],"phaseColors":{}},"version":1}
```

## Scenario 2: Create and Switch Project

```bash
# 1. Create new project
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Side Project"}'
# → {"id":2,"name":"Side Project","is_default":false}

# 2. Load new project data (empty)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/project/2
# → {"data":{},"version":1}

# 3. Save data to new project
curl -X PUT http://localhost:3001/api/project/2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"tasks":[],"phaseColors":{}},"version":1}'
# → {"ok":true,"version":2,"savedAt":"..."}
```

## Scenario 3: Manage Projects in Admin

```bash
# Rename project
curl -X PUT http://localhost:3001/api/projects/2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Name"}'
# → {"id":2,"name":"New Name","is_default":false}

# Set default
curl -X PUT http://localhost:3001/api/projects/2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_default":true}'
# → {"id":2,"name":"New Name","is_default":true}

# Delete project
curl -X DELETE http://localhost:3001/api/projects/2 \
  -H "Authorization: Bearer $TOKEN"
# → {"ok":true}
```

## Scenario 4: Shared Settings

```bash
# Save members and teamColors (shared across all projects)
curl -X PUT http://localhost:3001/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"members":{"FE":["Alice"],"BE":["Bob"]},"teamColors":{"FE":"#3b82f6","BE":"#10b981"}}}'
# → {"ok":true}

# Load settings (same regardless of active project)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/settings
# → {"members":{"FE":["Alice"],"BE":["Bob"]},"teamColors":{"FE":"#3b82f6","BE":"#10b981"}}
```

## Scenario 5: Version Conflict Detection

```bash
# User A saves (version 1 → 2)
curl -X PUT http://localhost:3001/api/project/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"tasks":[...]},"version":1}'
# → {"ok":true,"version":2}

# User B tries to save with old version (1)
curl -X PUT http://localhost:3001/api/project/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"tasks":[...]},"version":1}'
# → 409 {"error":"Version conflict","serverVersion":2,"clientVersion":1}

# User B polls and detects change
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/project/1/version
# → {"version":2,"updated_by":"admin","updated_at":"..."}
```
