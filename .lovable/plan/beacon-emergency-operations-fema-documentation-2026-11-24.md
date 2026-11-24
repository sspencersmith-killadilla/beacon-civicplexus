# Beacon — Emergency Operations & FEMA Documentation

Multi-tenant, offline-capable web app for cities: incident command, field logging, evidence vault, After-Action Reports and FEMA exports. Backend on Lovable Cloud (database, auth, storage) with strict per-city isolation.

## Build order

1. **Foundation** — enable Lovable Cloud, design system (Slate/Amber/Emerald tokens, Inter + JetBrains Mono), Field Mode toggle (high contrast, 48px+ targets), app shell with top bar and City Workspace Switcher.
2. **Database & security** — all tables, roles, RLS, storage bucket `incident-evidence` with org-scoped paths.
3. **Auth & onboarding** — email/password sign-in, Register Your City flow (creates org, makes creator City Admin, seeds default departments + demo incident), join-by-code for staff.
4. **Landing page** — mission (Beacon — CivicPlexus, open-source, multi-city), Sign In / Register Your City / Explore Demo.
5. **Incident Command Hub** — active/archived lists, create/close incidents (Commander), KPI cards.
6. **Field Logger** — 4 quick-log tabs with auto-cost math, GPS capture, multi-photo with captions, offline queue + status banner + Sync Now + auto-sync.
7. **Timeline & Evidence Vault** — filterable feed, photo gallery with Before/During/After tags, edit audit trail.
8. **AAR & Export Center** — printable report (6 sections, print CSS), editable summary and corrective actions, 4 CSV downloads.
9. **City Admin settings** — branding (name, state, seal URL, accent color), departments, rate cards, members/roles, join code.
10. **Demo city** — "Winter Storm Uri-Style Freeze Response" with 8–10 ICS-214 notes, salt-truck equipment, warming-center labor, materials, prefilled AAR.

## Roles

| Role | Can do |
|---|---|
| City Admin | Settings, members, departments, rate cards, everything below |
| EOC Commander | Open/close incidents, declaration #, review logs, AAR |
| Field Responder | Create own logs/labor/equipment/materials/photos; edit own |
| Finance Auditor | Read all; set FEMA category & rate verification; export |

## Technical details

- Tables: `organizations`, `organization_members` (user_id, organization_id, role enum, department), `departments`, `rate_cards`, `incidents`, `field_logs`, `labor_entries`, `equipment_entries`, `material_entries`, `evidence_photos`, `aar_reports`, plus `record_edits` (audit: table, record_id, edited_by, edited_at, previous JSON). Roles live only in `organization_members`, never on profiles.
- Every operational table has `organization_id`, `client_generated_id` (unique per org, for idempotent upsert), `created_by`, `original_timestamp`, `edited_by`, `edited_at`, `timestamp_edited` flag.
- Security-definer helpers `is_org_member(org)` and `has_org_role(org, role[])` used by all RLS policies; GRANTs in every migration. Audit trigger writes `record_edits` on UPDATE and preserves original timestamp.
- Storage path `{org_id}/{incident_id}/{uuid}.jpg`; storage policies check the first path segment against membership.
- Demo: a public, read-only demo organization; "Explore Demo" opens it without sign-in via a server function using read-only data (no writes). New cities also get a seeded sample incident.
- Offline: IndexedDB queue (via `idb-keyval`, browser-only), photos compressed client-side to ~1600px JPEG before queueing; sync on `online` event and manual button; upsert on `client_generated_id`.
- PWA: installable manifest + guarded `vite-plugin-pwa` service worker that never registers in preview (offline works only in the published app).
- Costs: labor = (reg × rate + OT × rate × 1.5) × (1 + fringe%); equipment = active × rate (standby tracked, $0 by default); materials = qty × unit cost. Unit tests for these.
- CSV built client-side; AAR via `window.print()` with `@media print` styles.
- Routes: `/`, `/auth`, `/register-city`, `/join`, `/demo`, `/app/$org` (hub), `/app/$org/incidents/$id` (timeline, evidence, AAR, exports tabs), `/app/$org/log`, `/app/$org/settings`.

## Optional ideas
- Email invitations (needs an email domain); first version uses join codes.
- Map view of geotagged entries.
