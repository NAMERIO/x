## Setup

```bash
pnpm install
cp server/.env.example server/.env
cp client/.env.example client/.env
pnpm db:migrate
pnpm dev
```

- Client: <http://localhost:3000>
- Server: <http://localhost:3001>

## Database

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
