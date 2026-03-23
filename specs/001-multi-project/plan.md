# Implementation Plan: Mobile-Friendly Layout for V2

**Branch**: `001-multi-project` | **Date**: 2026-03-15 | **Spec**: [spec.md](spec.md)
**Input**: Update layout cho mobile friendly — responsive design cho v2/index.html

## Summary

Thêm responsive CSS và điều chỉnh layout React components để v2 hoạt động tốt trên mobile (320px-768px). Hiện tại v2 hoàn toàn desktop-only: task-panel 480px cố định, gantt-panel không scroll được trên mobile, header buttons overflow, detail overlay 380px cố định. Cần thêm `@media` breakpoints, chuyển layout sang stacked view trên mobile, và tối ưu touch targets.

## Technical Context

**Language/Version**: JavaScript (ES2020+), React 18 via CDN + Babel standalone
**Primary Dependencies**: React 18 (CDN), Babel standalone (CDN), ExcelJS (CDN), SheetJS/xlsx (CDN)
**Storage**: PostgreSQL 16 — JSONB blob (không thay đổi)
**Testing**: Manual test trên Chrome DevTools responsive mode + real device
**Target Platform**: Web browser (desktop + mobile Safari/Chrome)
**Project Type**: Single-page web application (single index.html)
**Performance Goals**: Layout không lag khi resize, touch gestures smooth
**Constraints**: Single-file frontend (index.html), no build step, CSS-only responsive (no JS resize listeners nếu có thể tránh)
**Scale/Scope**: 1 file (v2/index.html), ~2076 lines

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clear Project Structure | PASS | Không thêm file mới, chỉ sửa v2/index.html |
| II. Clean Code | PASS | Thêm responsive CSS có tổ chức theo breakpoint |
| III. Modular Testing | PASS | Test manual trên DevTools responsive mode |
| IV. Extensibility First | PASS | Additive CSS, không break desktop layout |
| No build step | PASS | CSS media queries, no tooling needed |
| Single-file frontend | PASS | Tất cả trong v2/index.html |
| JSON blob storage | PASS | Không đụng data layer |
| Deploy simplicity | PASS | Vẫn scp v2/index.html |

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-project/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Unchanged (no data changes)
├── quickstart.md        # Unchanged
├── contracts/           # Unchanged
└── tasks.md             # Phase 2 output
```

### Source Code

```text
v2/
├── index.html           # Single file - thêm responsive CSS + minor JSX tweaks
└── server.js            # Unchanged
```

**Structure Decision**: Chỉ sửa `v2/index.html` — thêm `@media` queries vào `<style>` block và điều chỉnh inline styles trong React components khi cần.

## Complexity Tracking

> No violations — all changes are additive CSS within existing file.
