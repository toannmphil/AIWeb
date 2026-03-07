# Quickstart: Poker Texas Build Plan v2

## Prerequisites

- Node.js 18+
- PostgreSQL 16
- PM2 (global): `npm install -g pm2`

## Local Development

### 1. Setup backend

```bash
cd v2/
npm install
```

### 2. Configure environment

Tao file `v2/.env`:
```env
DB_HOST=76.13.213.204
DB_PORT=5432
DB_NAME=poker_texas
DB_USER=poker_user
DB_PASS=<password>
JWT_SECRET=<random-secret>
PORT=3000
```

### 3. Seed database

```bash
node v2/seed.js
```

### 4. Start server

```bash
node v2/server.js
# hoac:
pm2 start v2/server.js --name poker-plan-v2
```

### 5. Access

Mo `http://localhost:3000`, dang nhap voi admin/admin123.

## Deploy to VPS

```bash
# Frontend only:
scp -i ~/.ssh/id_ed25519 v2/index.html \
  root@76.13.213.204:/opt/poker-plan-v2/public/

# Backend:
scp -i ~/.ssh/id_ed25519 v2/server.js \
  root@76.13.213.204:/opt/poker-plan-v2/
ssh -i ~/.ssh/id_ed25519 root@76.13.213.204 \
  "pm2 restart poker-plan-v2"
```

## Verify

```bash
# Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Load data
curl http://localhost:3000/api/data \
  -H "Authorization: Bearer TOKEN"
```

## Module Verification

Kiem tra tung module hoat dong doc lap:

1. **M2 DATE UTILS**: Mo browser console, goi `addWorkingDays`,
   `isValidDate` truc tiep
2. **M3 TASK LOGIC**: Goi `autoSchedule(testTasks)` voi test data
3. **M4 PERSISTENCE**: Kiem tra localStorage sau khi thay doi task
4. **M5 IMPORT/EXPORT**: Export JSON, import lai, so sanh
5. **M6 UI COMPONENTS**: Render tung component voi mock props
