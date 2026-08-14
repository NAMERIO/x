```bash
pnpm install
pnpm dev
```

```bash
pnpm dev          # build shared contracts once, then watch all packages
pnpm build        # create production builds in each package
pnpm typecheck    # run strict TypeScript checks
pnpm lint         # lint workspace source and configuration
pnpm test         # run the server health-route test
pnpm check        # lint, typecheck, test, and build
pnpm clean        # remove generated output
pnpm db:generate  # generate SQL migrations from the Drizzle schema
pnpm db:migrate   # apply pending migrations to PostgreSQL
pnpm db:studio    # inspect the configured database with Drizzle Studio
```
