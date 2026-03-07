# Data Model: Poker Texas Build Plan v2

**Date**: 2026-03-07
**Branch**: `001-project-management`

## Overview

Toan bo du lieu du an luu trong 1 JSON blob (JSONB column)
trong bang `projects`. Khong normalize thanh nhieu bang.
Data model khong thay doi so voi v1 - chi thay doi cach to chuc code.

## Database Schema

### Table: `users`

| Field      | Type         | Constraints       |
|------------|-------------|-------------------|
| id         | SERIAL      | PRIMARY KEY       |
| username   | VARCHAR(50) | UNIQUE, NOT NULL  |
| password   | VARCHAR(255)| NOT NULL (hashed) |
| created_at | TIMESTAMP   | DEFAULT NOW()     |

### Table: `projects`

| Field      | Type         | Constraints       |
|------------|-------------|-------------------|
| id         | SERIAL      | PRIMARY KEY       |
| user_id    | INTEGER     | REFERENCES users  |
| data       | JSONB       | NOT NULL          |
| updated_at | TIMESTAMP   | DEFAULT NOW()     |

## JSON Blob Structure (`projects.data`)

```json
{
  "tasks": [Task],
  "members": [Member],
  "teamColors": { "TeamName": "#hexcolor" },
  "phaseColors": { "PhaseName": "#hexcolor" },
  "version": Number,
  "savedAt": "ISO8601 string"
}
```

## Entity: Task

```json
{
  "id": Number,
  "name": "String",
  "team": "String (team name)",
  "assignee": "String (member name)",
  "priority": "High | Medium | Low",
  "status": "To Do | In Progress | Done | Blocked",
  "start": "DD/MM/YYYY",
  "end": "DD/MM/YYYY",
  "duration": Number,
  "pct": Number,
  "deps": [Number],
  "notes": "String",
  "isEpic": Boolean,
  "phase": "String (phase name, only for Epics)",
  "expanded": Boolean,
  "children": [Task]
}
```

**Validation rules**:
- `id`: Unique, auto-increment (genId)
- `name`: Required, non-empty string
- `priority`: One of "High", "Medium", "Low"
- `status`: One of "To Do", "In Progress", "Done", "Blocked"
- `start`, `end`: Valid DD/MM/YYYY string
- `duration`: Positive integer (working days)
- `pct`: Integer 0-100
- `deps`: Array of valid task IDs (no circular deps)
- `isEpic`: true for Epic (phase container)
- `children`: Only when isEpic = true

**State transitions**:
```
To Do → In Progress → Done
  ↓         ↓
Blocked   Blocked
  ↓         ↓
To Do   In Progress
```

## Entity: Member

```json
{
  "name": "String",
  "team": "String (team name)"
}
```

## Entity: Team (via teamColors)

Key: team name (string), Value: hex color (#RRGGBB)

## Entity: Phase (via phaseColors + Epic tasks)

Key: phase name (string), Value: hex color (#RRGGBB)
Each phase has a corresponding Epic task in tasks[].

## Relationships

```
Project 1──* Task (via tasks[])
Project 1──* Member (via members[])
Project 1──* Team (via teamColors{})
Project 1──* Phase (via phaseColors{})
Epic 1──* Child Task (via children[])
Team 1──* Member (via member.team)
Task *──* Task (via deps[])
```

## Module ↔ Entity Mapping

| Module | Entities Used |
|--------|--------------|
| M1 CONFIG | Default values for all entities |
| M2 DATE UTILS | Task (start, end, duration) |
| M3 TASK LOGIC | Task (all fields), Epic/children |
| M4 PERSISTENCE | Project blob (all entities) |
| M5 IMPORT/EXPORT | Task, Member, Team, Phase |
| M6 UI COMPONENTS | Task (display), Member (dropdown), Team (colors), Phase (filter) |
| M7 APP CONTAINER | All entities (state management) |
| M8 BOOTSTRAP | INITIAL_TASKS (seed data) |
