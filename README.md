# X

Foundation for a modern, single-community communication platform. The pnpm monorepo currently includes a React client, Fastify API, shared runtime contracts, PostgreSQL persistence, and authentication. Chat, calls, announcements, desktop, and mobile features are intentionally outside the current scope.

## Requirements

- Node.js 22 or newer
- pnpm 11 or newer
- PostgreSQL

## Workspace

```text
client/   React + TypeScript + Vite
server/   Node.js + TypeScript + Fastify + Drizzle
shared/   Cross-runtime constants, Zod schemas, and TypeScript types
```

The local `survev/` directory is architectural reference material only. It is ignored by Git and is not part of this workspace.

## Setup

```bash
pnpm install
cp server/.env.example server/.env
cp client/.env.example client/.env
pnpm db:migrate
pnpm dev
```

On Windows PowerShell installations that block the `pnpm.ps1` shim, use `pnpm.cmd` instead.

- Client: <http://localhost:3000>
- Server: <http://localhost:3001>
- Health: <http://localhost:3001/api/health>

## Authentication

Email/password registration uses Argon2id password hashes. Sessions are stored in PostgreSQL while browsers receive only an opaque, signed, HTTP-only cookie. Session tokens are SHA-256 hashed before storage.

The first user created while the `users` table is completely empty receives the `Owner` role. Account creation is serialized with a PostgreSQL advisory transaction lock so concurrent first registrations cannot create multiple owners. Later accounts receive the `Member` role. Roles are derived on the server and are never accepted from client input.

Authentication endpoints:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
GET  /api/auth/providers
GET  /api/auth/oauth/:provider
GET  /api/auth/oauth/:provider/callback
```

Login methods are stored in `auth_accounts`, separately from `users`, so account-linking support can be added later without changing the user model. OAuth state and PKCE verifiers are short-lived, single-use database records. OAuth accounts are not automatically linked by matching email addresses.

## Google and Facebook OAuth

OAuth is optional. With no credentials, the login page still displays Google and Facebook buttons in a disabled state. Never put provider secrets in `client/.env` or any `VITE_` variable.

Real credentials belong only in the untracked `server/.env` file:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/oauth/google/callback

FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_REDIRECT_URI=http://localhost:3001/api/auth/oauth/facebook/callback
```

Create credentials in the respective Google and Meta developer consoles, register the exact callback URI, and then restart the server. A provider is enabled only when its client ID, client secret, and redirect URI are all present. The provider adapter boundary allows another provider such as Apple to be introduced without rewriting password authentication or session management.

## Database

All database code is under `server/src/database/`. The schema currently contains:

- `users`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `app_settings`
- `auth_accounts`
- `sessions`
- `oauth_flows`

Commands:

```bash
pnpm db:generate  # generate SQL from schema changes
pnpm db:migrate   # apply pending migrations
pnpm db:studio    # open Drizzle Studio
```

## Development commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm check
pnpm format
pnpm clean
```

`pnpm check` runs linting, strict TypeScript checks, server tests, and production builds for the complete workspace.
