# Build plan v1: Kwatro Score

Source of truth for scope: [decisions.md](decisions.md).

## Architecture
- **Vite 8 + React 19 + TypeScript.** It uses a **small custom router** (about 10 routes) instead of React Router. That keeps prerendering simple and avoids depending on a framework version.
- **Static prerender** at build time:
  - Every content route (Home, Kwatro, About, the Play shell, in NL and EN) is rendered with `react-dom/server` into `dist/<route>/index.html`, then hydrated in the browser.
  - `404.html` is the SPA fallback for dynamic routes (`/nl/spelen/spel/<id>`) on GitHub Pages.
- **Tailwind CSS 4**: class-based dark mode, with the theme set by an inline script before first paint. Icons come from lucide-react.
- **Dexie (IndexedDB)** holds `games`, `turns` (an append-only event log) and `names` (name suggestions). `navigator.storage.persist()` is requested at the first game.
- **Pure engine module** (`src/engine/`): totals, current and next player, round table, ranking with shared places, highlights. Tested with Vitest.
- **Hand-written service worker**: the build generates it with a precache list of all files, including HTML, so the app works when started offline. An update banner appears when a new version is deployed.
- **GoatCounter**: loaded only when a site code is configured (`src/config.ts`). It counts page views and a `game-started` event.
- **Deploy**: GitHub Actions to GitHub Pages at `https://shuisman.github.io/kwatro-score/` (Vite `base` = `/kwatro-score/`).

## Routes (relative to base)
| Key | NL | EN |
|---|---|---|
| root | `/` → redirect based on stored or browser language | |
| home | `/nl/` | `/en/` |
| play (list) | `/nl/spelen/` | `/en/play/` |
| new | `/nl/spelen/nieuw/` | `/en/play/new/` |
| game | `/nl/spelen/spel/:id/` | `/en/play/game/:id/` |
| summary | `/nl/spelen/spel/:id/uitslag/` | `/en/play/game/:id/summary/` |
| rules | `/nl/kwatro/` | `/en/kwatro/` |
| about | `/nl/over/` | `/en/about/` |

## Steps
1. Scaffold the project (Vite, TS, Tailwind, Vitest), configs and the base path.
2. Engine with tests.
3. DB layer (Dexie) plus export/import.
4. Router, i18n (NL/EN), layout (top nav on desktop, bottom tab bar on mobile), theme.
5. Play: list, new game (drag and drop), game screen (number pad, pass, end game, peek), summary (podium, highlights, share image, play again, install hint).
6. Content: Home, Kwatro rules (own text + card SVGs), About (FAQ, privacy, export/import, settings, disclaimer).
7. PWA: manifest, icons, service worker, update banner. Prerender + sitemap/robots.
8. GoatCounter hook, GitHub Actions workflow. Checks: typecheck, tests, build, preview.
9. Create the repo and push. **Only after the user's OK.**
