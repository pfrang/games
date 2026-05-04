## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, tailwindcss, sveltekit-adapter, drizzle, vitest, mcp

---

## Project overview and key files

| File                                              | Role                                         |
| ------------------------------------------------- | -------------------------------------------- |
| `apps/quiplash/server.js`                         | Entry point: SvelteKit + WS upgrade handler  |
| `apps/quiplash/src/lib/server/websocket/game.ts`  | Game state machine (rounds, voting, scoring) |
| `apps/quiplash/src/lib/server/websocket/index.ts` | WS connection registry + broadcast helper    |
| `apps/quiplash/src/routes/[id]/+page.server.ts`   | Load/actions: join room, submit answer, vote |

### Client state management

Svelte 5 runes only (`$state`, `$derived`). No stores. WebSocket is connected lazily per page and drives state transitions by updating reactive variables.

### Request/real-time split

SvelteKit handles HTTP (page loads, form actions for joining/creating rooms). A custom Node `server.js` wraps the SvelteKit handler and also upgrades WebSocket connections via the `ws` library. WebSocket connections are scoped per room and managed in-memory on the server.

### Server-side game state (in-memory)

`apps/quiplash/src/lib/server/websocket/` owns all mutable game state. Two `Map`s hold runtime state that is _not_ persisted to the database:

- `gameQuestions` — `roomCode → string[]` shuffled question list for the active game
- `votingBatches` — `roomCode → VotingBatch` active voting phase with timer + answers

These maps are the source of truth during a game. If the server restarts mid-game, in-progress games are lost.

### Game flow

```
lobby (waiting)
  └─ host starts game → scheduleGame()
       └─ round 0 starts (60s timer, players answer)
           └─ all answers submitted OR timer expires
               └─ every ROUNDS_PER_VOTING_BATCH (3) rounds:
                   └─ startVoting() → 60s voting phase
                       └─ endVoting() → tallies, broadcasts, then next round
                           └─ after round 9: endGame() → scoreboard
```

### WebSocket message actions

| Direction | Action                          | Purpose                                      |
| --------- | ------------------------------- | -------------------------------------------- |
| S→C       | `player_joined` / `player_left` | Lobby presence                               |
| S→C       | `game_started`                  | Lobby transitions to in_progress             |
| S→C       | `round_started`                 | New round: question + `endsAt` ISO timestamp |
| S→C       | `answer_submitted`              | Progress (X of N players answered)           |
| S→C       | `voting_started`                | Batch of round numbers + anonymized answers  |
| S→C       | `vote_submitted`                | Progress (X of N players voted)              |
| S→C       | `voting_finished`               | Vote tallies per answer                      |
| S→C       | `game_finished`                 | All answers + final scoreboard               |

Timers are sent as ISO strings (`endsAt`); clients render countdown from that absolute time.

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
