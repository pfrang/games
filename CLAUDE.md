# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Turborepo monorepo hosting **Quiplash** — a real-time multiplayer party game. Players answer prompts, vote on each other's answers, and accumulate points across 10 rounds.

## Commands

All commands run from the repo root unless noted.

```bash
# Development
pnpm dev                   # Start all apps (Turborepo TUI)

# Database (delegates to packages/db)
pnpm db:push               # Push schema changes to DB
pnpm db:generate           # Generate Drizzle migrations
pnpm db:migrate            # Run migrations
pnpm db:studio             # Open Drizzle Studio
pnpm db:seed               # Seed questions

# Type checking
pnpm ts:check              # TypeScript check across all packages

# Build & run
pnpm build                 # Build all packages
pnpm start:quiplash        # Run quiplash production build (requires .env)
```

### Monorepo layout

```
apps/quiplash/       # SvelteKit app (game UI + server)
packages/db/         # Drizzle ORM schema, migrations, typed queries
packages/redis/      # Shared Redis client wrapper (not used currently)
```

### Database schema (packages/db)

Five tables: `lobbies` (status: waiting/in_progress/finished), `players` (with `isHost` flag), `questions` (seeded prompt bank), `rounds` (one per round per lobby), `answers`, `votes`. All cascade-delete from `lobbies`.

## Key files

| File | Role |
| `packages/db/src/schema.ts` | Drizzle schema (single source of truth for DB shape) |

## Svelte MCP tools

See `apps/quiplash/CLAUDE.md` for the available Svelte 5 / SvelteKit MCP documentation tools (`list-sections`, `get-documentation`, `svelte-autofixer`). Use these when writing Svelte code.

## SvelteKit app

- For game logic, see apps/quiplash/CLAUDE.md

## For frontend design

- See frontend design skill within apps/quiplash directory
