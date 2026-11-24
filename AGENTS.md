<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Beacon architecture rules
- Tenancy: every operational table carries `organization_id`; RLS uses `is_org_member` / `has_org_role` / `can_read_org` security-definer helpers. Why: strict per-city isolation without recursive policies.
- Roles live only in `organization_members.role` (per city). Why: a user can hold different roles in different cities.
- City creation and joining go through `register_city` / `join_city` RPCs. Why: membership rows can't be self-inserted by clients.
- Demo city is a normal org with `is_demo = true`, readable by anon via `can_read_org`. Why: "Explore demo" needs no sign-in.
- All field entries go through `src/lib/syncEngine.ts` (IndexedDB stores in `src/lib/offlineDb.ts`: sync_queue, offline_photos, reference_cache), drained FIFO and upserted on `(organization_id, client_generated_id)`; photos upload first and record `storage_path` before the row. 401/403 pauses the queue, never deletes; retry rules live in `src/lib/sync-policy.ts` (tested). Why: one idempotent path for online/offline, no lost or duplicate FEMA records.
- Queued entries are merged into `useIncidentData` (`mergeQueued`) so timeline/KPIs show them optimistically. Why: crews see their offline work immediately.
- Costs are generated columns in the DB and mirrored in `src/lib/costs.ts` (tested). Why: the DB is the source of truth for exports; the UI previews totals.
- Edits to entries go through the `audit_entry_update` trigger, which preserves original timestamps and writes `record_edits`. Why: FEMA audit integrity.
- `/app` routes are `ssr: false` and read with client `useQuery`. Why: data depends on the browser session and IndexedDB.
- Offline app shell: vite-plugin-pwa generateSW (`/sw.js`, output pinned to dist/client) registered only by `src/lib/pwa-register.ts`, which refuses dev, iframes and Lovable preview hosts; pages NetworkFirst. Why: cold-start offline without stale previews.
- Staff access: `org_invites` (email-bound, expiring, role+department) accepted via `accept_invite`; join codes create `join_requests` an admin approves via `decide_join_request`; `rotate_join_code` replaces leaked codes. Why: nobody joins a city without an admin decision.
- Entry review: `review_status` on the four entry tables, enforced by `guard_entry_review` trigger (reviewers only; approved rows immutable except FEMA tag/rate verification; reopen to edit). Why: approved FEMA records can't drift.
- Claim exports (CSVs + PDF packet) are filing-ready only when `claimReadiness` (`src/lib/claim.ts`, tested) passes; otherwise they download as DRAFT. Why: no unverified rates in a FEMA filing.
- FEMA rates: `fema_equipment_rates.organization_id` NULL = shared reference schedule (read-only to all); city CSV imports are stored with that city's id. Why: one city's import must never change another city's rates.
- Equipment entries snapshot `fema_cost_code`, `schedule_edition`, `rate_source` and rate at log time; `reimbursable_total` is a generated column (active hours × rate). Why: audit immutability when schedules change.
- FEMA rates, fleet, departments, rate cards and active incidents are cached in IndexedDB `reference_cache` via `useReferenceData` (`src/lib/rate-cache.ts`), prefetched by the app shell. Why: equipment picker must work offline.
- Demo city is fully editable by anon via `is_demo_org` policies; the UI treats demo visitors as `city_admin` (branding/members hidden). `reset_demo_city()` runs nightly via pg_cron (08:00 UTC) and reseeds fleet from `demo_fleet_seed`. Why: public hands-on demo without sign-up, kept clean.
- Public docs pages are SSR routes under `/docs` that render `docs/*.md` imported with `?raw` (`src/lib/docs.ts` + `src/components/beacon/markdown.tsx`). Why: the markdown files stay the single source of truth for the manual and self-hosting guide, and server rendering keeps them readable to crawlers and to print.
