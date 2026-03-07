# API Contracts: Poker Texas Build Plan v2

**Date**: 2026-03-07
**Base URL**: `http://76.13.213.204:3000/api`

API contracts khong thay doi so voi v1.
Backend server.js van cung cac endpoints.

## Authentication

### POST /api/login

**Request**: `{ "username": "string", "password": "string" }`
**Response 200**: `{ "token": "jwt-string", "username": "string" }`
**Response 401**: `{ "error": "Invalid credentials" }`

### Authorization Header

All endpoints (except /api/login):
`Authorization: Bearer <jwt-token>`

## Project Data

### GET /api/data

**Response 200**: Full JSON blob (tasks, members, teamColors,
phaseColors, version, savedAt)
**Response 404**: `{ "error": "No data found" }`

### POST /api/data

**Request**: JSON blob + version
**Response 200**: `{ "ok": true, "version": N+1, "savedAt": "ISO" }`
**Response 409**: `{ "error": "Version conflict", "serverVersion": N, "clientVersion": M }`

### GET /api/version

**Response 200**: `{ "version": N, "savedAt": "ISO" }`

## Error Format

```json
{ "error": "Human-readable message" }
```

Status codes: 200, 400, 401, 404, 409, 500
