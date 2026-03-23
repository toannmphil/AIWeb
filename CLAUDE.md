# Poker Texas Build Plan - Project Rules

## Project Structure
- **v1/**: Phien ban hien tai (stable) - toan bo source code, data, exports
- **v2/**: Phien ban moi (development) - cai tien, refactor
- Root chi chua: `.git`, `.gitignore`, `CLAUDE.md`

## Architecture (v1)
- **Frontend**: Single `v1/index.html`, React 18 via CDN + Babel standalone, no build step
- **Backend**: Node.js + Express at `/opt/poker-plan/server.js` on VPS
- **Database**: PostgreSQL 16 on VPS (76.13.213.204), DB: `poker_texas`, user: `poker_user`
- **Data model**: JSON blob stored in `projects.data` (JSONB column), NOT normalized tables
- **Auth**: JWT (30d expiry), bcryptjs for password hashing

## VPS Access
- SSH: `ssh -i ~/.ssh/id_ed25519 toannm.phil@76.13.213.204`
- App path: `/opt/poker-plan/` (server.js, seed.js, .env, public/index.html)
- Process manager: PM2, app name: `poker-plan`
- Deploy: `scp index.html` to VPS then `pm2 restart poker-plan`

## Code Conventions (v1)
- Frontend: Minified single-line React code style (match existing pattern in v1/index.html)
- Keep all frontend in single index.html file - do NOT split into multiple files
- Vietnamese UI text for user-facing strings
- State: React hooks only (useState, useEffect, useRef, useMemo, useCallback)
- Data persistence: apiSave() (debounced 1s to server) + lsSave() (instant localStorage cache)

## Key Functions (v1)
- `lsLoad()`/`lsSave()` - localStorage cache
- `apiCall()`/`apiLoad()`/`apiSave()` - server API communication
- `update(fn)` - main task mutation function (deep clone + autoSchedule)
- `flattenTasks()` - convert nested epic/children to flat list
- `autoSchedule()` - recalculate dates based on dependencies

## Deploy Workflow (v1)
1. Edit `v1/index.html` locally
2. `scp -i ~/.ssh/id_ed25519 v1/index.html root@76.13.213.204:/opt/poker-plan/public/`
3. No restart needed (static file), restart only if server.js changes: `ssh ... "pm2 restart poker-plan"`

## Don'ts
- Do NOT normalize the JSON blob into relational tables
- Do NOT add a build step (webpack, vite, etc.)
- Do NOT split index.html into multiple files
- Do NOT change the data structure without updating both frontend and seed.js

## Active Technologies
- JavaScript (ES2020+), Node.js 18+ + React 18 (CDN), Babel standalone (CDN), (001-project-management)
- PostgreSQL 16 - JSONB column trong bang `projects` (001-project-management)
- JavaScript (Node.js 18+), React 18 via CDN + Babel standalone + Express.js, pg (node-postgres), bcryptjs, jsonwebtoken, ExcelJS (CDN) (001-multi-project)
- PostgreSQL 16 on VPS (76.13.213.204), DB: `poker_texas`, JSONB blob in `projects.data` (001-multi-project)
- JavaScript (ES2020+), Node.js 18+ + React 18 (CDN), Babel standalone (CDN), Express.js, pg (node-postgres) (001-multi-project)
- PostgreSQL 16, JSONB blob trong `projects.data` (001-multi-project)
- JavaScript (ES2020+), Node.js 18+ + React 18 (CDN) + Babel standalone, Express.js, pg (node-postgres), bcryptjs, jsonwebtoken (001-multi-project)
- PostgreSQL 16 — JSONB blob in `projects.data` column (001-multi-project)
- JavaScript (ES2020+), React 18 via CDN + Babel standalone + ExcelJS 4.4.0 (CDN), SheetJS/xlsx 0.18.5 (CDN) (001-multi-project)
- PostgreSQL 16 JSONB blob (001-multi-project)
- JavaScript (ES2020+), Node.js 18+ + React 18 (CDN), Babel standalone (CDN), Express.js, pg (node-postgres), bcryptjs, jsonwebtoken (001-multi-project)
- JavaScript (ES2020+), React 18 via CDN + Babel standalone + React 18 (CDN), Babel standalone (CDN), ExcelJS (CDN), SheetJS/xlsx (CDN) (001-multi-project)
- PostgreSQL 16 — JSONB blob (không thay đổi) (001-multi-project)

## Recent Changes
- 001-project-management: Added JavaScript (ES2020+), Node.js 18+ + React 18 (CDN), Babel standalone (CDN),
