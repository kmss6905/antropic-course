# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (Turbopack)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Lint
npm run lint

# Database reset
npm run db:reset
```

Requires `ANTHROPIC_API_KEY` in `.env` (optional — falls back to a mock model if absent).

## Architecture

UIGen is a Next.js 15 App Router application that lets users describe React components in chat; Claude generates the code live and renders it in a preview pane.

### Key data flows

1. **User sends message** → `ChatInterface` → `POST /api/chat`
2. **API route** (`src/app/api/chat/route.ts`) calls Anthropic Claude (claude-haiku-4-5) via Vercel AI SDK with streaming and two tools: `str_replace` and `file_manager`
3. **Tool calls** mutate the **virtual file system** (in-memory, no disk I/O) via `src/lib/file-system.ts`
4. **File system state** propagates via `FileSystemContext` → `PreviewFrame` re-renders the iframe
5. On completion, the conversation and file snapshot are saved to SQLite via Prisma

### Three-panel layout (`src/app/main-content.tsx`)

| Panel | Contents |
|-------|----------|
| Left  | `ChatInterface` — message history + input |
| Middle | `CodeEditor` (Monaco) or `FileTree` |
| Right | `PreviewFrame` (iframe) or raw code view |

Panels are resizable via `react-resizable-panels`.

### Virtual file system (`src/lib/file-system.ts`)

All generated files live in memory. `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) exposes the current state to the editor and preview. Changes trigger a `refreshKey` that forces the preview iframe to reload.

### AI provider (`src/lib/provider.ts`)

Wraps `@ai-sdk/anthropic`. When `ANTHROPIC_API_KEY` is absent, substitutes a `MockLanguageModel` so the UI still loads. Model is `claude-haiku-4-5`.

### Authentication (`src/lib/auth.ts`, `src/actions/index.ts`)

JWT sessions stored in `httpOnly` cookies (7-day expiry, `jose` library). Passwords hashed with `bcrypt`. Middleware at `src/middleware.ts` enforces auth on protected routes.

### Database (`prisma/schema.prisma`)

Always refer to `prisma/schema.prisma` when needing to understand the database structure.

SQLite with two models:
- **User**: `email`, `password`, relation to projects
- **Project**: `name`, `messages` (JSON), `fileData` (JSON), `userId`

### Path alias

`@/*` maps to `src/*` throughout the project.

## Code Style

- Use comments sparingly — only comment complex/non-obvious code.
