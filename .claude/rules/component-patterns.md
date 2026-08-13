## Component Patterns

Next.js 16 App Router + React 19. The goal is a server-rendered shell with
interactivity pushed to the leaves.

### Server Components by default

Pages and layouts are Server Components. **Fetch data and resolve auth on the
server, then pass plain (serializable) data to a client island as props.** Don't
recreate the client-fetch-on-mount waterfall.

```tsx
// app/(web)/journey/page.tsx  (Server Component)
const session = await requireRole("learner");
const journey = await buildJourney(supabase, { tenantId, learnerId });
return <MissionExperience journey={journey} />; // client island
```

- `"use client"` sits only on **interactive leaves** — chat, forms, stateful
  widgets, anything using hooks or browser APIs. Keep them small.
- Never import `createServiceRoleClient()` or a `server-only` module (session /
  DAL) into a client component.
- `loading.tsx` at the route-group level (`app/(web)/loading.tsx`) streams a
  fallback while the server renders.

### Context providers

React context needs a client component. Render the provider in the server layout
wrapping `{children}` (e.g. `PodcastPlaybackProvider` in `app/(web)/layout.tsx`),
as deep as possible so the static shell stays server-rendered.

### Async UI = phase state machines

Multi-step async flows use a string union for phase, not a nest of booleans:

```ts
const [status, setStatus] = useState<"idle" | "grading" | "done">("idle");
```

### Effects and cleanup

- Prefer event-driven state over effect-driven fetches where a retry matters
  (see `MissionExperience`'s `ensureSession` — re-selecting retries).
- Client media/audio (podcast, mic) must stop in cleanup on unmount; key a
  component by the resource id (`key={conceptId}`) so a topic switch remounts
  and tears down the old resource.
- Read a client-only capability with `useSyncExternalStore` (server snapshot
  `false`) to avoid hydration mismatch — see `MicButton`.

### Prompt input

When an external control must write into the chat textarea (e.g. the mic
transcript), lift the input state via `PromptInputProvider` and write through the
controller, rather than manipulating the DOM.
