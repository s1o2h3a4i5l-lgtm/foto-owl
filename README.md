# Foto Owl Media SDK

A headless media SDK ecosystem built on the [Pexels API](https://www.pexels.com/api/).  
Take-home assignment for **Foto Owl — Senior React / React Native Developer** role.

---

## Architecture

```
apps/demo       →  @foto-owl/media-react  →  @foto-owl/media-core
apps/demo       →  @foto-owl/media-ui-react

apps/demo-native →  @foto-owl/media-native  →  @foto-owl/media-core
apps/demo-native →  @foto-owl/media-ui-native
```

### Packages

| Package | Description |
|---|---|
| `packages/media-core` | Framework-agnostic Pexels SDK. Pure TypeScript, no React, no DOM, no Expo. |
| `packages/media-react` | React adapter — `<MediaProvider>` + hooks. No business logic. |
| `packages/media-native` | React Native adapter — same hook names as media-react. No Expo. |
| `packages/media-ui-react` | Headless React UI — `useGrid`, `useLightbox`, `useReelSwiper`. Zero SDK dependency. |
| `packages/media-ui-native` | Headless RN UI — same three hooks, RN-adapted. No Expo. |
| `apps/demo` | Web demo — the only app that imports both data and UI layers. |
| `apps/demo-native` | Native demo — Expo (the ONLY Expo usage in the repo). |

### Dependency Enforcement

The following must always hold. Verified by grep:

```bash
# UI hooks must not know about the SDK
grep -r "media-core"   packages/media-ui-react/src   # → 0 results
grep -r "media-react"  packages/media-ui-react/src   # → 0 results
grep -r "media-native" packages/media-ui-react/src   # → 0 results

# Core must be pure TS — no React, no RN
grep -r '"react"'      packages/media-core/src        # → 0 results
grep -r "react-native" packages/media-core/src        # → 0 results

# Native packages must not use Expo
grep -r "expo"         packages/media-native/src      # → 0 results
grep -r "expo"         packages/media-ui-native/src   # → 0 results

# Web demo must not use native wrapper
grep -r "media-native" apps/demo/src                  # → 0 results
grep -r "media-react"  apps/demo-native               # → 0 results
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 9

### Install

```bash
pnpm install
```

### Build all packages

```bash
pnpm build
```

### Run the web demo

1. Get a free API key at https://www.pexels.com/api/
2. Create `apps/demo/.env`:
   ```
   VITE_PEXELS_API_KEY=your_key_here
   ```
3. Start the dev server:
   ```bash
   pnpm --filter "@foto-owl/demo" dev
   ```

### Run tests

```bash
pnpm test
```

---

## API Key Handling

> **Assignment constraint:** The assignment explicitly requires no backend.

The demo application passes the Pexels API key to `<MediaProvider apiKey={...}>`.
Inside the SDK, `createClient()` stores the key once and exposes it only as HTTP headers —
it is never passed as a raw string into API functions, cached alongside results, or
visible in application component code.

**A production application would normally proxy API calls through a server-side route**
to prevent exposing the key to the browser. The Pexels API terms of service should be
reviewed to determine whether direct browser usage is permitted for your use case.

---

## Event System

The SDK emits `download` and `view` events. A default console logger is installed
automatically inside `createClient()` (in `media-core`), so it works even from
a CLI or non-React context:

```
[media-core] view — photo #12345 at 2026-08-14T07:00:00.000Z
[media-core] download — video #67890 at 2026-08-14T07:00:01.000Z
```

The app layer can add additional subscribers via `useMediaEvents()`.

---

## AI-Assisted Development Disclosure

This project was built with AI coding assistance (Antigravity / Claude Sonnet).

### What was AI-assisted
- Scaffold generation (package.json, tsconfig files, turbo.json)
- Boilerplate for all 5 package source files
- CSS for the demo app
- Test file structure and assertions
- SKILL.md document drafts

### What was hand-authored / hand-reviewed
- All architectural decisions and dependency boundary rules
- The `createClient()` design (injected deps, default logger in core)
- The prop-getter API design for `useGrid`, `useLightbox`, `useReelSwiper`
- Keyboard/focus trap logic in `useLightbox`
- The requirement corrections (Expo isolation, logger placement, demo separation)
- All debugging and build error resolution

### How the skill documents were used
The two `skills/` documents were written during development and used to steer
AI generation of `apps/demo` component code. Specifically:
- `SKILL-media-ui-react.md` guided the AI to write `MediaGrid.tsx` using `getItemProps`
  spread correctly rather than reconstructing handlers manually
- `SKILL-media-react.md` guided the AI to call `subscribe()` return value inside
  `useEffect` for proper cleanup of event listeners

---

## Project Structure

```
foto-owl-media-sdk/
├── apps/
│   ├── demo/                # Vite + React web app
│   └── demo-native/         # Expo app (in progress)
├── packages/
│   ├── media-core/
│   ├── media-react/
│   ├── media-native/
│   ├── media-ui-react/
│   └── media-ui-native/
├── skills/
│   ├── SKILL-media-react.md
│   └── SKILL-media-ui-react.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

---

## What Was Cut and Why

| Item | Decision |
|---|---|
| `apps/demo-native` Expo app | Structure scaffolded; full native demo is WIP. The SDK packages (media-native, media-ui-native) are complete. |
| Storybook | Not required by assignment; deprioritized. TypeDoc covers SDK docs. |
| SDK docs deployment | TypeDoc config ready; deploy to Vercel via `apps/docs` in next iteration. |
| Video in Lightbox | Implemented — `LightboxItem` supports `type: 'video'` and `videoSrc`. |

---

## Deployment

| URL | Description |
|---|---|
| Demo app | [Live link — TBD after Vercel deployment] |
| SDK docs | [Live link — TBD] |

---

## License

MIT
