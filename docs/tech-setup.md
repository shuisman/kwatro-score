# Kwatro Score: Technical Setup Recommendation

Status: proposal, October 2026. Scope: a local-first, offline-capable scorekeeping PWA for **Kwatro** (Gene Mackles; also published as IOTA), modelled on scoreapp.nl.

> Alignment note: `scoreapp-overview.md` and `kwatro-game-overview.md` were not in `docs/` when this was written. The engine sketch below uses the published Kwatro scoring rules: a turn scores the sum of the face values in every line it creates or extends; a card in two lines counts twice; each completed four-card line doubles the turn, and so does playing all four cards. Revisit section 3.3 once the game overview exists.

---

## 1. TL;DR

- **Vite 8 + React 19 + TypeScript** as a client-side SPA. A handful of static, prerendered HTML pages (landing, rules, privacy) cover SEO.
- **IndexedDB through Dexie 4**, storing an **append-only event log** per game. Call `navigator.storage.persist()` and offer JSON export/import as the safety net.
- **vite-plugin-pwa** (Workbox) using the `prompt` update strategy, plus an iOS "Add to Home Screen" coach mark.
- **Tailwind CSS 4 + shadcn/ui** (only the primitives you use), **lucide** icons and a light touch of **Motion**. **Paraglide JS 2** handles NL/EN.
- **Vitest + fast-check** test the pure scoring engine and **Playwright** covers end-to-end, including offline.
- **Cloudflare (Workers static assets or Pages)** hosts it for free. Any later sync is an event relay on a Durable Object. There is no sync engine today, but the data model is ready for one.

---

## 2. Recommended stack

| Layer | Choice | Why | Alternatives considered |
|---|---|---|---|
| Build / framework | **Vite 8** (Rolldown bundler, stable since March 2026) + **React 19** + **TypeScript** (strict) | The app is 95% client-side state and has no server, and Vite is the simplest, fastest toolchain for that. React has the largest ecosystem (shadcn, Dexie hooks, Motion) and matches scoreapp.nl, so patterns transfer. | **Next.js static export**: works, but `output: 'export'` drops most of what Next is for, has PWA and manifest friction (route handlers need `force-static`), and adds a lot of framework for no gain. **Astro 6 + React island**: an excellent fit if the marketing and SEO surface grows (blog, many rules pages, i18n routing), and `@vite-pwa/astro` exists. It is the runner-up. **SvelteKit static / Solid / Preact**: smaller bundles, but the bundle size of a scorepad is irrelevant, and you lose the React ecosystem and scoreapp familiarity. |
| Routing | **React Router 7** (declarative/data mode), or its framework mode with `ssr:false` + `prerender` for the few SEO routes | Mature and well understood. Framework mode prerenders `/`, `/rules` and `/en/...` to real HTML while the rest stays SPA. | TanStack Router (great typing); wouter (tiny); plain Vite multi-page HTML for the marketing pages. |
| SEO pages | 3–6 prerendered static pages (NL + EN) with `hreflang`, a sitemap and Open Graph tags | Crawlers get real HTML without needing SSR. | Astro, if the content grows. |
| Local persistence | **IndexedDB through Dexie 4** (`useLiveQuery`) | Async and transactional. It has proper indexes, is not limited to about 5 MB like localStorage, has built-in schema versioning and upgrade functions, and leaves an upgrade path to Dexie Cloud sync. | `localStorage` (what scoreapp uses): fine for tiny data, but synchronous, string-only, has no transactions and a small quota. `idb-keyval`: too thin for an indexed event log. **SQLite-WASM + OPFS**: powerful, but adds about 1 MB of WASM, worker plumbing and COOP/COEP headaches, which is overkill here. |
| Domain state | Pure **event-sourced reducer** (`fold(events) → GameState`), plus a tiny **Zustand** store for UI-only state (open sheet, keypad input) | Undo, redo, edit, history and future sync all fall out of the log. | Snapshot plus undo stack (scoreapp's approach): simpler, but edits and sync get messy. Redux Toolkit is more ceremony than needed. |
| PWA | **vite-plugin-pwa** (Workbox `generateSW`, `registerType: 'prompt'`) | The de facto standard with about 6M weekly downloads, and it generates the manifest, precache list and registration. | **Serwist** (Workbox fork): use it if you need a custom service worker and the Vite plugin falls short. A hand-written service worker is feasible for about 60 lines but has more footguns (cache versioning, update races). |
| UI kit | **Tailwind CSS 4** + **shadcn/ui** (copy-in components on Radix/Base UI) | You own the code, it is accessible, and it is themeable through CSS variables, which makes light/dark trivial. Copy in only Dialog, Sheet, Button, Tabs and Toast. | Plain CSS modules; Park UI/Ark; Mantine (heavier). |
| Icons / motion | **lucide-react**; **Motion** (formerly framer-motion) for score pop-ins and the leader swap | Same as scoreapp. Respect `prefers-reduced-motion`. | CSS transitions only, which is fine for v1. |
| i18n | **Paraglide JS 2** (compiled, type-safe, tree-shaken messages) | No runtime catalog to load offline. Messages are typed functions, and a missing translation is a build error. | Lingui (about 3 kB, good DX); react-i18next (heavier and runtime-based). |
| Unit tests | **Vitest** + **fast-check** (property tests) + `fake-indexeddb` | The scoring engine is pure, so it is ideal for table-driven and property tests. | Jest (slower, more config). |
| E2E tests | **Playwright** (Chromium + WebKit + mobile viewports) | It can toggle `context.setOffline(true)`, test service worker caching and emulate iPhone and Pixel. | Cypress (weaker WebKit/offline story). |
| Lint / format | ESLint (flat config) + Prettier, or **Biome** | Pick one. Biome is a single fast tool. | — |
| Hosting | **Cloudflare Workers static assets** (or Cloudflare Pages, which is still supported) | Free tier and global CDN. Durable Objects are right next door if live sync is ever needed. | Netlify / Vercel (also free for this size), GitHub Pages (free, but no headers control and awkward SPA fallback). |
| CI/CD | GitHub Actions: typecheck → unit → build → Playwright → deploy | Standard. | Cloudflare's Git integration alone. |
| Analytics | **None**, or cookieless (Cloudflare Web Analytics / Plausible / Umami) | Needs no consent banner. | GA4 (needs consent mode plus a CMP). |
| Ads | **None by default** | AdSense in the EEA requires a Google-certified CMP and consent mode v2, which costs UX and engineering time for negligible revenue at this scale. | AdSense + CMP as scoreapp does, or a "buy me a coffee" link. |
| Native later | **TWA** (Bubblewrap/PWABuilder) for Google Play; **Capacitor** for the iOS App Store if ever needed | A TWA reuses the PWA unchanged. | — |

> Versions: pin the current stable releases at scaffold time (`npm create vite@latest`, Vite 8.x, React 19.x, Tailwind 4.x, Dexie 4.x, Vitest, Playwright). Rolldown reached 1.0 in May 2026, and Vite 8 ships it by default.

---

## 3. Proposed architecture

### 3.1 Folder structure

```
kwatro-score/
├─ public/
│  ├─ icons/                     # 192, 512, maskable, apple-touch-icon 180
│  └─ robots.txt
├─ messages/                     # Paraglide: nl.json, en.json
├─ src/
│  ├─ engine/                    # PURE TS. No React, no DOM, no storage.
│  │  ├─ events.ts               # event type definitions (see 3.3)
│  │  ├─ reduce.ts               # fold(events) -> GameState
│  │  ├─ scoring.ts              # Kwatro turn score calculation
│  │  ├─ rules.ts                # end-of-game detection, ranking, tiebreaks
│  │  ├─ migrate.ts              # upcast old event versions -> current
│  │  └─ __tests__/
│  ├─ data/                      # persistence layer
│  │  ├─ db.ts                   # Dexie schema + versions
│  │  ├─ repo.ts                 # appendEvent, listGames, loadGame, ...
│  │  ├─ backup.ts               # JSON export/import (validated with zod/valibot)
│  │  ├─ durability.ts           # storage.persist(), estimate(), warnings
│  │  └─ ids.ts                  # UUIDv7 / HLC clock, deviceId
│  ├─ sync/                      # EMPTY for now; interface only (SyncTransport)
│  ├─ features/
│  │  ├─ new-game/
│  │  ├─ scoring/                # big keypad, turn entry, line-builder helper
│  │  ├─ scoreboard/             # standings, TV/"presenter" view
│  │  ├─ history/                # turn list, edit, undo/redo
│  │  └─ settings/               # language, theme, wake lock, export/import
│  ├─ ui/                        # shadcn components, theme tokens
│  ├─ pwa/                       # SW registration, update toast, iOS install hint
│  ├─ routes/                    # app routes + prerendered marketing pages
│  ├─ lib/                       # wakeLock.ts, haptics.ts, share.ts
│  └─ main.tsx
├─ e2e/                          # Playwright specs (incl. offline.spec.ts)
├─ vite.config.ts                # react, tailwind, paraglide, VitePWA
└─ package.json
```

The core rule is that `engine/` imports nothing outside itself. Everything else depends on it, and it depends on nothing, so you can test it exhaustively, reuse it on a future sync server, and port it to another UI.

### 3.2 Game-engine module (pure functions)

```ts
// engine/scoring.ts
export interface TurnBreakdown {
  lineSums: number[];        // face-value sum of each line created/extended this turn
  completedFours: number;    // number of 4-card lines completed this turn ("lots")
  playedAllFour: boolean;    // all 4 hand cards played this turn
}

export function scoreTurn(b: TurnBreakdown): number {
  const base = b.lineSums.reduce((a, n) => a + n, 0);
  const doublings = b.completedFours + (b.playedAllFour ? 1 : 0);
  return base * 2 ** doublings;
}
```

The UI offers two entry modes:
- **Quick:** type the turn total on a big keypad, as scoreapp does.
- **Helper:** enter the line sums and tap the ×2 toggles, and the engine computes the total. Store the breakdown as well, so the score can be audited and edited later.

`reduce.ts` folds events into a `GameState` (`players`, `turns`, `totals`, `currentPlayerIndex`, `status`, `ranking`). Derived values are never stored. They are always recomputed from the log, which takes microseconds for a few hundred events.

### 3.3 Event-log data model

```ts
// engine/events.ts
export type ID = string;          // UUIDv7: sortable, globally unique, no coordination needed
export type HLC = string;         // hybrid logical clock "<ms>-<counter>-<deviceId>", total order across devices

interface EventBase {
  id: ID;
  gameId: ID;
  v: 1;                           // per-event schema version (upcast in migrate.ts)
  at: HLC;                        // ordering key
  deviceId: ID;                   // who wrote it (sync-ready)
}

export type GameEvent =
  | (EventBase & { type: 'game.created';   payload: { gameType: 'kwatro'; rulesVariant?: string; players: PlayerRef[]; startingPlayerId: ID; targetScore?: number } })
  | (EventBase & { type: 'player.renamed'; payload: { playerId: ID; name: string } })
  | (EventBase & { type: 'turn.scored';    payload: { playerId: ID; points: number; breakdown?: TurnBreakdown; note?: string } })
  | (EventBase & { type: 'turn.passed';    payload: { playerId: ID; reason?: 'swap' | 'pass' } })
  | (EventBase & { type: 'turn.corrected'; payload: { targetId: ID; points: number; breakdown?: TurnBreakdown } })
  | (EventBase & { type: 'event.voided';   payload: { targetId: ID } })      // = undo
  | (EventBase & { type: 'event.restored'; payload: { targetId: ID } })      // = redo
  | (EventBase & { type: 'game.finished';  payload: { reason: 'deck-empty' | 'target' | 'manual'; bonus?: Record<ID, number> } })
  | (EventBase & { type: 'game.reopened';  payload: {} });

export interface PlayerRef { id: ID; name: string; color?: string }

// Stored rows (data/db.ts)
export interface GameRow {
  id: ID; gameType: 'kwatro'; createdAt: number; updatedAt: number;
  title?: string; status: 'active' | 'finished';
  playerNames: string[];          // denormalised for the list screen only
  summary?: { leaderId: ID; totals: Record<ID, number> }; // cache, rebuildable from events
}
export interface EventRow extends GameEvent { seq: number } // local autoincrement, for cheap ordering on one device
export interface MetaRow { key: 'schema' | 'deviceId' | 'persistGranted' | 'lastBackupAt'; value: unknown }
```

Design decisions:
- **Append-only:** nothing is ever updated or deleted in `events`. Undo appends `event.voided`. Redo appends `event.restored`. An edit appends `turn.corrected`.
  - The in-memory undo/redo cursor is just "the last N non-voided local events".
  - This is the same UX as scoreapp's undo stack, but it survives reloads and syncs cleanly.
- **IDs and timestamps are sync-ready from day one.** UUIDv7 IDs, an HLC and a `deviceId` cost nothing now.
  - Later, merging two devices is a set union of events sorted by `at`, which is a grow-only-set CRDT, so no CRDT library is needed for scores.
- **Versioning happens at two levels:**
  - **Dexie `db.version(n).upgrade(...)`** handles storage shape.
  - **Event `v` + `upcast()`** handles payload shape. Old exports and old synced peers stay readable.
- **The `summary` cache** on `GameRow` keeps the game list fast. It is recomputed after every append and can be rebuilt from the events.

### 3.4 Persistence layer

- `repo.appendEvent(e)` runs in a single Dexie transaction that writes the event and updates the `GameRow.summary` cache.
- The UI subscribes through `useLiveQuery`, so live updates also work across tabs.
- **Durability:**
  - Call `navigator.storage.persist()` after the first game is created, which is a user gesture context.
  - Record the result, and show `navigator.storage.estimate()` in Settings.
  - In Safari, any origin's storage is wiped after 7 days without interaction **unless the app is installed to the Home Screen**. Home Screen apps have their own usage counter.
  - Since Safari 17, `persist()` is honoured heuristically and shows no UI.
  - The mitigations:
    1. nudge iOS users to install;
    2. one-tap **Export JSON** (Web Share API on mobile, download on desktop);
    3. a "last backup N days ago" hint once the user has 5 or more games;
    4. **Import** validates with a schema and merges by event ID, which makes it idempotent.
- **Quota** is a non-issue at this scale. A 60-turn game is about 15 KB, and 1,000 games are about 15 MB, well within IndexedDB quotas on every browser.
- **scoreapp-style `localStorage`** is only for tiny prefs (theme, language), so the first paint is correct before IndexedDB opens.

### 3.5 PWA specifics

- **Manifest:**
  - `display: standalone`, `orientation: any`, and `start_url: /app?source=pwa`.
  - Include `id`, `theme_color`/`background_color` (light and dark), 192/512 icons plus a maskable icon, `screenshots` (needed for Android's richer install UI) and a `shortcuts` entry ("New game").
  - Add `apple-touch-icon` and the `apple-mobile-web-app-*` metas for iOS.
- **Install:**
  - On Android/Chromium, capture `beforeinstallprompt` and show your own "Install" button after the first finished game.
  - iOS has **no** install event. Show a one-time coach mark ("Share → Add to Home Screen") when `navigator.standalone === false` on iOS Safari.
  - As of iOS 26, every Home Screen site opens as a web app by default.
- **Updates:**
  - Use `registerType: 'prompt'`, and show "New version available – Reload" as a toast. Never auto-reload mid-game.
  - Check for updates on `visibilitychange`.
  - Precache the app shell and all hashed assets, and use network-first for the marketing HTML.
- **Screen Wake Lock:**
  - Request it while the scoring screen is visible. Re-acquire it on `visibilitychange`, and make it a toggle in Settings.
- **Offline testing:**
  - Playwright `context.setOffline(true)` after the first load, then create a game, score, reload and assert.
  - Run Lighthouse PWA checks in CI.
  - Manual checks on a real iPhone (installed and not installed) and a real Android device before release.

### 3.6 Optional sync later: what to build now vs. later

**Now (free):**
- UUIDv7 IDs, HLC timestamps and `deviceId`.
- Immutable events and idempotent merge-by-ID import. Import is the same code path as sync.
- An empty `sync/` folder that defines a `SyncTransport` interface (`push(events)`, `subscribe(gameId, cb)`).

**Later, by use case:**

| Use case | Cheapest robust option | Notes |
|---|---|---|
| **TV/second screen shows live standings** (one scorer, many viewers) | **Cloudflare Durable Object relay** (PartyServer). The scorer pushes events and viewers subscribe to `wss://…/g/<gameId>`. Share by link plus QR code (`/watch/<gameId>#<secret>`). | About 100 lines of server code, probably inside the free tier. Works with the event log as-is. Encrypt the payload with a key in the URL fragment for privacy. |
| **Several phones scoring the same game** | Same relay, with events merged by `at` (HLC). Conflicts are rare because turns are sequential. Show "Turn already recorded by Anna" if two people score the same turn. | No CRDT library needed for scores. |
| **Peer-to-peer without a server** | Yjs + y-webrtc, or a raw WebRTC data channel | Still needs a signalling server, and NAT issues make it flaky. Not recommended as the primary path. |
| **Personal history on all my devices** (accounts) | **Dexie Cloud**: same Dexie schema, adds auth and sync | It is the smallest step from the recommended stack. It is a paid tier beyond hobby use, so check pricing at that time. |
| Rich collaborative documents | Automerge 3 / Yjs / Jazz / TinyBase | Overkill for an append-only score log. |
| Server-authoritative SQL apps | Zero (Rocicorp), PowerSync, ElectricSQL, Instant | These need Postgres or another backend. Zero is not offline-write-first. Replicache is in maintenance mode. Not a fit unless the product pivots to accounts and leagues. |

### 3.7 UI guidance (big-button scoring)

- **Layout:**
  - A portrait-first scoring screen with the current player highlighted.
  - A large numeric keypad (at least 64 px targets) and an "×2" toggle row for the helper mode.
  - One primary action ("Add score"), with Undo always visible.
- **Scoreboard / TV view:**
  - A landscape route with large type, auto-sorted standings and a Motion layout animation for rank swaps.
  - Hide all chrome there.
- **Accessibility:**
  - AA contrast in both themes and `aria-live` for score changes.
  - Haptics via `navigator.vibrate` where it is supported (not on iOS).
  - Honour `prefers-reduced-motion`.
- **Theme and language:**
  - The theme follows the system, with a manual override.
  - The language comes from `navigator.language` (NL default, EN fallback), and the user can switch it in Settings.

### 3.8 Hosting, domain and cost

| Item | Cost |
|---|---|
| Cloudflare Workers static assets / Pages, free tier | €0 (static asset requests do not count against Worker quotas) |
| Custom domain (`.nl` or `.app`) | ~€10–20/year (`.app` is HSTS-preloaded, so HTTPS is mandatory, which is fine) |
| Optional Durable Object relay later | Likely €0 at hobby scale; the Workers Paid plan is ~$5/month if exceeded |
| Google Play (TWA) | $25 one-time |
| Apple App Store (Capacitor) | $99/year, plus review risk under guideline 4.2 (minimum functionality) for thin web wrappers |

---

## 4. Risks

1. **iOS data loss:** if the user never installs and doesn't open the app for 7 or more days, Safari can wipe the data.
   - Mitigation: install coach mark, `persist()`, export reminders.
   - Document this honestly on the About page.
2. **Users clearing site data or switching phones** loses everything when there is no sync. Export/import is the only recovery.
3. **Service worker update bugs** can strand users on old versions.
   - Use the prompt-based update, never cache `index.html` without revalidation, and keep a "Reset app cache" escape hatch in Settings.
4. **Rules ambiguity** (wild cards, end-game penalties, house rules) could make the helper calculator "wrong".
   - Keep **quick entry** as the default, and make the helper optional and variant-configurable.
5. **Scope creep toward multi-game** (scoreapp is generic) can blur the engine.
   - Keep `gameType` in the model now, but ship Kwatro-only.
6. **Trademark/branding:** "Kwatro" and the game art belong to the publisher(s).
   - Use the name descriptively ("score app for Kwatro"), avoid the logo and box art, and add a disclaimer.
7. **Over-engineering sync** before anyone needs it. The event model keeps the door open, so don't build the relay until there is a real need.
8. **Ads/GDPR:** adding AdSense later means a CMP, consent mode, a privacy-policy rewrite and slower first paint. Decide early (see questions).

---

## 5. Questions to grill the user on (prioritised)

1. **Who is this for: personal/family use or a public product?**
   - Options: personal (no SEO, no ads, minimal polish); public free; public monetised.
   - **Default: public and free**, built to personal-use simplicity. It drives SEO pages, i18n polish, analytics and the ads decision.
2. **Do you need multi-device in v1?** (a TV/second-screen live view, several phones scoring one game, or your history on multiple devices)
   - Options: no; live viewer only; co-scoring; accounts + history sync.
   - **Default: no for v1, but sync-ready data model.** A live viewer is the first candidate for v2.
3. **How should a turn be entered: a total only, or a "helper" that computes the score from lines and doublings?**
   - Options: quick total only; helper only; both.
   - **Default: both, with quick as the primary mode.**
4. **Only Kwatro, or several games (like scoreapp)?**
   - Options: Kwatro only; Kwatro first with a generic engine later; generic from day one.
   - **Default: Kwatro only, with `gameType` kept in the model.**
5. **Ads or monetisation?**
   - Options: none; donation link; AdSense + CMP (like scoreapp); a paid "pro" tier.
   - **Default: none, or a donation link.** No consent banner needed.
6. **Your framework familiarity: React, or something else (Svelte, Vue)?**
   - Options: React (Vite) / Svelte (SvelteKit static) / Vue (Vite).
   - **Default: React.** Switch only if you are clearly more productive elsewhere.
7. **App stores: do you need presence on Google Play and/or the Apple App Store?**
   - Options: PWA only; Play via TWA; both via Capacitor.
   - **Default: PWA only.** Add a Play TWA if discoverability matters. The iOS store costs $99/year and carries review risk.
8. **Languages: NL + EN only, or more (DE/FR, since Kwatro is sold in BE/DE/FR)?**
   - **Default: NL (primary) + EN**, with the i18n setup ready for more.
9. **Hosting and domain: do you already have a domain or host (Cloudflare, Netlify, Vercel, GitHub)?**
   - **Default: Cloudflare + a new domain** (around €15/year).
10. **How much marketing/SEO content do you expect?** (a landing page vs. a blog, rules explanations and strategy articles)
    - Options: 1–5 pages (stay on Vite); many pages (move the shell to Astro with a React island).
    - **Default: 1–5 pages.**
11. **Analytics: do you want usage numbers at all?**
    - Options: none; cookieless (Cloudflare Web Analytics / Plausible); GA4 + consent.
    - **Default: Cloudflare Web Analytics** (free, cookieless).
12. **Game-history features: are stats such as per-player averages, best turn and win rate wanted in v1?**
    - **Default: basic history list in v1, stats in v2.** The event log supports them either way.

---

## 6. Sources

- Vite 8 / Rolldown: https://www.theregister.com/2026/03/16/vite_8_rolldown/ · https://www.infoq.com/news/2026/05/vite-v8-rust/
- Next.js static exports: https://nextjs.org/docs/app/guides/static-exports · PWA + export discussion: https://github.com/vercel/next.js/discussions/72221
- React Router SPA mode and prerendering: https://reactrouter.com/how-to/spa · https://reactrouter.com/how-to/pre-rendering
- Astro 6: https://www.infoq.com/news/2026/02/astro-v6-beta-cloudflare/ · https://astro.build/blog/whats-new-september-2026/
- vite-plugin-pwa: https://github.com/vite-pwa/vite-plugin-pwa · https://www.npmjs.com/package/vite-plugin-pwa
- Serwist: https://github.com/serwist/serwist · https://www.npmjs.com/package/@serwist/vite
- Installation prompts: https://web.dev/learn/pwa/installation-prompt · iOS: https://www.mobiloud.com/blog/progressive-web-apps-ios/ · https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide · https://developer.apple.com/forums/thread/807603
- Safari storage eviction / persist(): https://developer.apple.com/forums/thread/710157 · https://vinova.sg/navigating-safari-ios-pwa-limitations/
- Local-first landscape: https://fosdem.org/2026/schedule/track/local-first/ · https://www.alexcloudstar.com/blog/local-first-software-developer-guide-2026/ · https://github.com/alexanderop/awesome-local-first/blob/main/README.md · https://cssauthor.com/best-local-first-databases-for-web-apps/
- Replicache maintenance mode / Zero: https://forums.basehub.com/rocicorp/mono/1 · https://queryplane.com/blog/replicache-local-first-sync/
- Yjs / y-webrtc / PartyServer: https://github.com/yjs/y-webrtc · https://github.com/cloudflare/partykit/blob/main/packages/y-partyserver/README.md · https://app.cinevva.com/guides/multiplayer-browser-game
- Paraglide JS vs alternatives: https://paraglidejs.com/comparison · https://github.com/opral/paraglide-js · https://simplelocalize.io/blog/posts/the-most-popular-react-localization-libraries/
- Cloudflare Pages vs Workers static assets: https://dev.to/rickcogley/cloudflare-pages-vs-workers-in-2026-migration-guide-ka7 · https://mecanik.dev/en/posts/cloudflare-pages-vs-workers-which-to-use-in-2026/
- Kwatro rules summary: https://www.spelshop.be/en/white-goblin-games/kwatro · https://boardgamegeek.com/boardgame/22774/kwatro
- Reference app: https://www.scoreapp.nl
