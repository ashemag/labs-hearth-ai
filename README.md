# Hearth Labs

Next.js app and companion clients for Hearth Labs.

## Development

```bash
npm run dev
```

The web app runs at [http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
npm run build
npm run lint
```

`npm run build` currently skips linting through `next.config.js` while existing lint debt is cleaned up.

## Repo Layout

```txt
src/app/                 Next.js app routes and API route entrypoints
src/features/            Product feature modules and feature-owned UI
src/server/              Server-side route helpers and domain services
src/lib/                 Shared clients, integrations, and low-level utilities
src/components/          Shared UI and marketing components
supabase/migrations/     Database schema migrations
chrome-extension/        Chrome extension client
electron-imessage/       Electron iMessage helper
ios/                     iOS client files
scripts/                 One-off migration and maintenance scripts
public/                  Static assets
```

## Structural Conventions

Keep `src/app` thin. Route files should wire request/response behavior and delegate product logic to `src/features` or `src/server`.

For authenticated API routes, prefer `withUser` from `src/server/api/route.ts`. It centralizes Supabase user lookup, JSON error handling, and common request validation helpers.

For Rolodex UI, use `src/features/rolodex` as the feature boundary. The `/app/rolodex` route imports that feature through `src/features/rolodex/index.ts`.

Generated Contentful export error logs are ignored via `.gitignore`; do not commit timestamped export artifacts.
