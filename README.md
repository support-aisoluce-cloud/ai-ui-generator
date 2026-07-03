# AI UI Generator

An AI-powered React component generator: describe a UI in plain English, and Claude writes the TSX/JSX into an in-browser virtual filesystem that renders live in a preview pane and an editable Monaco code editor.

## The problem it solves

Prototyping React components is slow: you switch between an editor, a dev server, and documentation just to see a button or a card render. This app collapses that loop. You chat with an AI, it generates real component files, and you see them running instantly — with no files written to disk and no local build step. Registered users can persist and iterate on projects; anonymous users can experiment in a throwaway session.

## Architecture

```
┌──────────────┐   POST /api/chat    ┌────────────────────┐
│  Chat panel  │ ──────────────────► │  Claude (tool-      │
│  (React)     │ ◄────────────────── │  calling, streamed) │
└──────────────┘   streamed tokens   └─────────┬──────────┘
       │                                        │ str_replace_editor
       │ React contexts                         │ file_manager
       ▼                                        ▼
┌──────────────────────────┐          ┌────────────────────┐
│ VirtualFileSystem        │ ◄─────── │  Generated TSX/JSX  │
│ (in-memory tree, JSON)   │          └────────────────────┘
└───────┬──────────────────┘
        │ serialize
        ├──────────────► Monaco editor + file tree  (Code tab)
        ├──────────────► Live Babel-transformed preview  (Preview tab)
        └──────────────► Prisma / SQLite  (persist project for logged-in users)
```

**Pipeline:**

1. The chat UI (`ChatContext`) collects messages and calls `POST /api/chat`.
2. `src/app/api/chat/route.ts` streams a response from Claude via the Vercel AI SDK (`@ai-sdk/anthropic`).
3. Claude drives generation through two tools:
   - `str_replace_editor` — create / view / edit files (`str_replace`, `insert`).
   - `file_manager` — rename / delete files.
4. Generated code lands in a **virtual filesystem** (`src/lib/file-system.ts`) — an in-memory tree, never touching disk — with `/App.jsx` as the entry point and `@/` import aliases.
5. The preview frame transforms JSX in-browser (Babel standalone) and renders it live; the Code tab exposes the same tree in a Monaco editor.
6. On stream completion the project (messages + serialized filesystem) is persisted through Prisma.
7. If no `ANTHROPIC_API_KEY` is set, `src/lib/provider.ts` returns a **mock provider** so the whole app still runs and produces static components.

**Auth layer:** email/password accounts with bcrypt-hashed passwords and stateless JWT sessions (`jose`, HS256) stored in HTTP-only cookies. Middleware (`src/middleware.ts`) protects the project and filesystem API routes. `userId` is optional on projects, so anonymous sessions work too.

## Tech stack

| Layer      | Technology |
|------------|------------|
| Framework  | Next.js 15 (App Router, Turbopack) |
| UI         | React 19, Tailwind CSS v4, shadcn/ui (new-york), Radix UI, lucide-react |
| Language   | TypeScript (strict) |
| AI         | `@ai-sdk/anthropic` + Vercel AI SDK, Claude tool-calling |
| Editor     | `@monaco-editor/react` |
| Preview    | `@babel/standalone` in-browser JSX transform |
| Data       | Prisma ORM + SQLite |
| Auth       | `jose` (JWT), `bcrypt` |
| Testing    | Vitest + React Testing Library + jsdom |

## Getting started

**Prerequisites:** Node.js 18+ and npm.

```bash
# 1. Install dependencies, generate the Prisma client, and run migrations
npm run setup

# 2. (Optional) configure environment
cp .env.example .env
#    - ANTHROPIC_API_KEY: enable real AI generation (omit to use the mock provider)
#    - JWT_SECRET: required for secure sessions in production

# 3. Start the dev server
npm run dev
# open http://localhost:3000
```

Then: sign up (or continue anonymously), describe a component in the chat, watch it render in the Preview tab, and switch to the Code tab to inspect or edit the generated files.

Useful scripts:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint (next lint)
npm run db:reset   # reset the database (destructive)
```

## Testing

The project ships with a Vitest suite (12 test files) covering AI chat flow, the virtual filesystem, JSX transformation, auth/session logic, and UI components. Tests are colocated in `__tests__/` directories next to the code they exercise.

```bash
npm run test                                              # run the full suite
npx vitest run src/lib/__tests__/file-system.test.ts      # run a single file
```

Coverage highlights: `src/lib/__tests__/auth.test.ts` (JWT sign/verify), `src/lib/__tests__/file-system.test.ts` (virtual FS operations), `src/lib/transform/__tests__/jsx-transformer.test.ts` (in-browser JSX transform), plus component and context tests under `src/components/**` and `src/lib/contexts/**`.

## Deployment

**Vercel (recommended for Next.js):**

1. Push the repo to GitHub and import it into Vercel.
2. Set environment variables in the project settings: `JWT_SECRET` (required), `ANTHROPIC_API_KEY` (optional), and `DATABASE_URL` if using a hosted database instead of SQLite.
3. Build command `next build` and the Prisma client generation (`prisma generate`) run as part of the pipeline.

> Note: the default datasource is file-based SQLite (`prisma/schema.prisma`), which is ephemeral on serverless platforms. For a persistent multi-user deployment, point `DATABASE_URL` at a hosted database (e.g. Postgres) and update the Prisma `datasource` provider accordingly.

**Node / VPS:**

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start            # binds to $PORT (default 3000)
```

Run behind a reverse proxy (nginx/Caddy) with TLS. Set `NODE_ENV=production` so session cookies are issued with the `secure` flag.

## Security

- **Secrets via environment only.** No credentials are committed. `.env` is git-ignored; `.env.example` documents every variable. Provide `ANTHROPIC_API_KEY`, `JWT_SECRET`, and (optionally) `DATABASE_URL` at runtime.
- **Password hashing.** User passwords are hashed with `bcrypt` (`src/actions`), never stored in plaintext.
- **Stateless JWT sessions.** Sessions are signed with `jose` (HS256) using `JWT_SECRET` and stored in HTTP-only cookies; the `secure` flag is enabled in production (`src/lib/auth.ts`). The development fallback secret must be overridden in production.
- **Protected routes.** `src/middleware.ts` guards the project and filesystem API endpoints.
- **No arbitrary disk writes.** AI-generated code lives in an in-memory virtual filesystem, not the host filesystem.

## License

MIT © 2026 Kylian Stomp (AISOLUCE). See [LICENSE](./LICENSE).
