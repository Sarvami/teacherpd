# TeachUp Frontend — Copilot Instructions

## Project: TeachUp AI Teacher Companion
- React 18 + TypeScript (strict) + Vite
- Tailwind CSS + shadcn/ui (New York variant)
- TanStack Query v5 for server state, Zustand for client state
- Feature-sliced architecture under src/features/
- Backend: FastAPI at http://localhost:8000

## Important repo reality check (current state)
- The downloaded backend currently exposes: `/health`, `/teachers`, `/reflect`, `/sessions/{teacher_id}`, `/match-peer/{teacher_id}`.
- The broader `/api/auth/*`, `/api/chat/*`, `/api/lessons/*`, `/api/assessments/*`, `/api/pd/*`, `/api/profile/*` routes described in the TeachUp spec are not present yet.
- When implementing TeachUp features, prefer to **adapt to existing endpoints** unless/until backend routes are added.

## Code Style
- Always use TypeScript — no `any`
- Use named exports everywhere (never default exports for components)
- Use TanStack Query for ALL API calls — never `useEffect + fetch`
- Use Zod for ALL form validation
- Error boundaries on every page-level component
- All new components: include loading, error, and empty states

## Naming Conventions
- Components: PascalCase
- Hooks: camelCase with `use` prefix
- Store slices: camelCase with `Store` suffix
- API functions: camelCase, descriptive verb (fetchLesson, createLesson, updateLesson)
- Query keys: centralized constants (never inline strings)

## AI Chat Specifics
- Streaming (SSE) requires a backend SSE endpoint.
- If streaming is implemented, always use AbortController for cleanup.
- Never block UI during streaming.
- Always show typing indicator before first token.
- Messages must support markdown rendering.

## When in doubt
- Prefer `src/shared/types/` for TypeScript interfaces.
