# Beacon — CivicPlexus

**Field-ready emergency logging and FEMA-compliant documentation for local governments.**

Beacon is an open-source, multi-tenant Emergency Operations and FEMA Public Assistance documentation app. Any city can register its own isolated workspace, run incidents, log field activity offline, and export reimbursement-ready packets and After-Action Reports.

Live: https://beacon.civicplexus.org

## Features
- Multi-city workspaces with strict row-level isolation and four roles (City Admin, EOC Commander, Field Responder, Finance / FEMA Auditor)
- Offline-first Field Logger: ICS-214 notes with GPS and photos, force account labor, equipment, and materials
- FEMA Schedule of Equipment Rates lookup and per-city fleet presets (cached offline)
- Chronological timeline with filters and a tamper-evident audit trail
- Photo Evidence Vault with Before / During / After tagging
- One-click printable After-Action Report and four FEMA CSV exports

## Documentation
Both guides are readable in the app at **/docs** (linked from the home page), and live in the repo as:
- [User Manual](docs/USER_MANUAL.md) — also at `/docs/manual`
- [Self-Hosting Guide](docs/SELF_HOSTING.md) — also at `/docs/self-hosting`

## Quick start (development)
```sh
bun install        # or npm install
cp .env.example .env   # fill in your backend URL and publishable key
bun run dev        # http://localhost:8080
bun run test       # cost and rate rule tests
```

## Tech stack
React 19, TanStack Start/Router, Tailwind CSS v4, shadcn/ui, Supabase (Postgres, Auth, Storage), IndexedDB (idb-keyval) for the offline queue. Builds to Cloudflare Workers by default.

## License
[MIT](LICENSE) © CivicPlexus contributors
