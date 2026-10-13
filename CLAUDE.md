# One Agency

Marketing agency website + client portal + admin panel. UI text is in Azerbaijani; keep new UI strings in Azerbaijani.

## Layout

| Dir | What | Stack | Deploys to |
|---|---|---|---|
| `frontend/` | Public site and client portal (`/portal/panel/...`), public share page (`/share/:token`) | React 19, Vite, Tailwind | Vercel project `one` |
| `admin/` | Admin panel | React, Vite, zustand, react-hook-form | Vercel project `one-admin` |
| `backend/` | REST API (`/api/v1`) | Express 5, TypeScript, Prisma 7, PostgreSQL | Docker on a Contabo VPS |

`docker-compose.prod.yml` runs the API (`one-agency-api`, bound to `127.0.0.1:5000`) and its own Postgres (`one-agency-db`). The same server also hosts other unrelated sites and an n8n bot, so never run server-wide commands (`docker system prune`, restarting shared services) for this project.

## Roles

- `SUPER_ADMIN`: everything, including the Komanda page (create/delete Admin and Creator accounts via `/admin/team`).
- `ADMIN`: all admin sections. May only edit/delete `CLIENT` accounts (`PATCH/DELETE /users/:id`).
- `CREATOR` (videographer): sees only "Layihə Faylları" in the admin panel. Creates deliverables for any client; uploads, edits and deletes only deliverables it created (`Deliverable.createdById`, enforced by `canModifyDeliverable` in `deliverable.controller.ts`). Cannot set status, manage categories or see client emails. Uses the narrow `/api/v1/creator/*` endpoints for the client list, highlights and share links.
- `CLIENT`: client portal only.

Rules that matter when touching permissions:
- Route guards live in `backend/src/middleware/rbac.middleware.ts` (`isAdmin`, `isSuperAdmin`, `isAdminOrCreator`, ...). The admin panel's `RequireAdmin` guard is UI only; real security is the backend.
- Direct and multipart uploads take storage keys from the browser. For creators they are validated (`creatorStorageKeysAllowed`) so a file already attached to another deliverable can't be reused.
- Deliverable status is automatic: `PENDING` on create, `PROCESSING` on upload, `READY`/`FAILED` when media processing ends. A successful re-upload clears `clientFeedback` (intended existing behaviour).

## Develop

```
# backend (needs a local Postgres + backend/.env, see backend/.env.example)
cd backend && npm ci && npx prisma generate
npm run dev          # ts-node-dev on PORT
npm run build        # tsc, this is the only check (no lint/test scripts)

# admin / frontend
cd admin && npm ci && npm run dev      # set VITE_API_URL=http://localhost:5000
npm run build        # tsc -b && vite build
npm run lint         # admin has 62 known pre-existing lint problems; don't add new ones
```

Admin login uses JWT; the admin panel sends `X-Portal: admin` and stores its token as `adminToken` (the client portal uses `token`). Non-GET requests need an `x-csrf-token` header (any value).

## Database / migrations

- Prisma schema: `backend/prisma/schema.prisma`. `npm start` runs `prisma migrate deploy` then `generate` then the app, so merging a migration to `main` applies it on the server at the next deploy.
- Keep migrations additive. The existing migration history has drifted from the schema (e.g. `SUPER_ADMIN`, `RefreshToken`, `igHighlights` were applied outside the migration files), so a fresh DB built from migrations alone will not match; for a local scratch DB use `prisma migrate deploy` then `prisma db push`.
- Take a Contabo snapshot before risky migrations (auto backup is not enabled).

## Deploy

- Pushing to `main` deploys: Vercel rebuilds `admin` and `frontend`; GitHub Actions "Deploy backend to Contabo" runs only when `backend/**` or the workflow file changes (SSH to the server, runs `/opt/one-agency/deploy.sh`).
- Branch pushes only create Vercel Preview builds; they do not touch production. Previews may point at the production API, so don't create test data from a Preview.
- Preferred flow: work on a branch, open a PR, merge. Pushing straight to `main` only when the owner explicitly asks. Roll back by reverting the PR; migrations are additive so old code ignores new columns/enum values.
- After a deploy, check the Actions run is green and log in to the live admin panel.

## Docs to keep in sync

`admin/src/pages/GuidePage.tsx` is the in-app user guide ("İstifadə Təlimatı"). Update it when roles, menus or admin behaviour change.
