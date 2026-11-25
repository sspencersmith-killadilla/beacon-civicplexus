# Self-Hosting Beacon

Beacon is MIT-licensed and can run entirely on infrastructure you control. It has two parts:

1. **Backend** — a Supabase stack (PostgreSQL, Auth, Storage, PostgREST). Use Supabase's hosted service or [self-host Supabase](https://supabase.com/docs/guides/self-hosting) with Docker.
2. **Web app** — a TanStack Start app. The default build targets Cloudflare Workers; Nitro can also target Node.js.

---

## 1. Requirements
- Node.js 20+ and [Bun](https://bun.sh) (or npm)
- `psql` (PostgreSQL client)
- A Supabase project (hosted or self-hosted)
- One of: a Cloudflare account (Workers), or a Linux server with Node.js / Docker

## 2. Get the code
```sh
git clone <your-beacon-repo-url> beacon
cd beacon
bun install
```

## 3. Set up the backend

### 3.1 Create the Supabase project
- **Hosted**: create a project at supabase.com and note the Project URL, the publishable (anon) key and the database connection string.
- **Self-hosted**: follow Supabase's Docker guide (`supabase/docker`), set strong `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, and note `API_EXTERNAL_URL`.

### 3.2 Apply the database schema
The schema is plain SQL in `drizzle/migrations/`, applied in order:
```sh
export DATABASE_URL="postgresql://postgres:<password>@<host>:5432/postgres"
for f in drizzle/migrations/*.sql; do
  echo "Applying $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```
This creates all tables, row-level security policies, roles, the audit trigger, the `register_city` / `join_city` functions, the Riverbend demo city and the reference FEMA equipment rates.

> To skip the demo city, delete it afterwards: `delete from organizations where slug = 'demo';`

Optional demo fleet (matches the hosted demo):
```sql
insert into public.city_fleet_assets (organization_id, asset_number, nickname, department_id, fema_rate_id, rate_source)
select o.id, a.num, a.nick,
  (select id from public.departments d where d.organization_id = o.id and d.name = a.dept),
  (select id from public.fema_equipment_rates r where r.organization_id is null and r.cost_code = a.code),
  'fema_schedule'
from public.organizations o,
 (values ('PW-104','Salt Spreader Truck #4','Public Works','8722'),
         ('PW-210','Skid Steer — Bobcat S650','Public Works','8541'),
         ('UT-G45','Water Plant Generator 45 kW','Utilities','8312')) as a(num, nick, dept, code)
where o.slug = 'demo';
```

### 3.3 Create the storage bucket
In the Supabase dashboard (Storage → New bucket) or via SQL:
```sql
insert into storage.buckets (id, name, public, file_size_limit)
values ('incident-evidence', 'incident-evidence', false, 10485760);
```
The bucket must be **private**. Access policies on `storage.objects` are already created by the migrations (files are stored under `<organization_id>/<incident_id>/…`).

### 3.4 Configure authentication
In Auth settings:
- Enable **Email** sign-in. Keep **Confirm email** on and configure SMTP (self-hosted: `SMTP_*` variables) so confirmation emails are delivered.
- Set **Site URL** to your public address (e.g. `https://beacon.example.gov`) and add it plus `/auth` to **Redirect URLs**.

**Google and Microsoft sign-in:** the hosted Beacon uses Lovable's managed sign-in broker (`src/integrations/lovable`), which is not available when self-hosting. Either:
- remove the **Continue with Google**, **Continue with Microsoft** and **Continue with Lovable** buttons in `src/routes/auth.tsx`, or
- configure Google and Azure (Microsoft Entra ID) in your Supabase Auth settings with your own OAuth clients, remove the Lovable button, and replace the managed sign-in call with the appropriate provider:
  ```ts
  await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/auth" } });
  // Microsoft uses the "azure" provider on self-hosted Supabase:
  await supabase.auth.signInWithOAuth({ provider: "azure", options: { scopes: "email", redirectTo: window.location.origin + "/auth" } });
  ```
  Run only the call for the selected provider. Preserve the intended destination in session storage and navigate there only after an authenticated session is available.

## 4. Configure the web app
```sh
cp .env.example .env
```
Fill in your Supabase URL, publishable/anon key and project ref (both the `VITE_` and plain copies). Never put the service role key in this file — Beacon doesn't need it.

Run locally:
```sh
bun run dev        # http://localhost:8080
bun run test
```

## 5. Build and deploy

### Option A — Cloudflare Workers (default)
```sh
bun run build
npx wrangler login
npx wrangler deploy --config dist/server/wrangler.json
```
Set the same environment variables as Worker variables (Settings → Variables) so server rendering can reach the backend. Then add your custom domain under Workers → your worker → Domains & Routes.

### Option B — Node.js server
Build with the Node preset and run the output:
```sh
NITRO_PRESET=node-server bun run build
node .output/server/index.mjs        # listens on PORT (default 3000)
```
If your build writes to `dist/` instead of `.output/`, run the `index.mjs` under the server folder it prints. Put it behind a reverse proxy (Caddy, nginx) with HTTPS, and keep it running with systemd or Docker.

Example Dockerfile:
```dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile && NITRO_PRESET=node-server bun run build

FROM node:20-slim
WORKDIR /app
COPY --from=build /app/.output ./.output
ENV PORT=3000
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

> HTTPS is required in production: browser GPS, camera capture and offline storage only work on secure origins.

## 6. First run
1. Open your site, choose **Register your city**, create an account and confirm the email.
2. Register the city — you become City Admin.
3. In **City Settings → Fleet & FEMA Rates**, import the current official FEMA Schedule of Equipment Rates CSV with its edition date.
4. Share the join code with staff.

## 7. Operations
- **Backups**: back up the Postgres database (`pg_dump`) and the `incident-evidence` bucket regularly. FEMA may ask for records years after an event.
- **Updates**: pull new code, apply any new files in `drizzle/migrations/` in order (each runs once — keep a record of what you've applied), rebuild and redeploy.
- **Security**: all city isolation is enforced by row-level security in the database. Don't disable RLS, and never expose the service role key to the browser.
- **Offline**: the app stores queued entries in the browser's IndexedDB. There is no service worker yet, so the app must be opened online before going into the field.

## 8. Architecture notes
- Every operational table carries `organization_id`; policies use `is_org_member`, `has_org_role` and `can_read_org`.
- Cities are created and joined only through the `register_city` and `join_city` database functions.
- Cost totals (labor, equipment, materials, reimbursable equipment total) are computed columns in the database.
- Edits to entries pass through the `audit_entry_update` trigger, which preserves original timestamps and writes `record_edits`.

## License
MIT — see [LICENSE](../LICENSE).
