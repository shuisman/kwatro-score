# ScoreApp (scoreapp.nl): technical and UX reference

This document is a reverse-engineered blueprint of https://www.scoreapp.nl. We use it as the reference design for a local-first scorekeeping app for **Kwatro**. It describes how the app is built and how it behaves, so that we can reuse its architecture and UX patterns. It also records the mistakes we should not copy.

- **Snapshot date:** 2026-10-05. The deployed build uses Turbopack chunks under `/_next/static/immutable/chunks/`, and the service worker cache is `scoreapp-v10`.
- **Method:** the production JS chunks were downloaded, prettified and read; HTML pages, `sw.js`, `site.webmanifest`, `robots.txt` and `sitemap.xml` were fetched; redirect behaviour was probed with `curl`. Nothing was executed in a browser.
- **Evidence notation:**
  - **[V]** = verified directly in code or in an HTTP response, with the function, field or module named next to it. Minified local names such as `et()` and `tC()` are given so the code can be found again.
  - **[I]** = inferred from code reading but not observed at runtime.
- **Local copies** of all material are in the session scratchpad (`...\scratchpad\`):
  - `session.pretty.js`, `config.pretty.js` and `setup.pretty.js`.
  - `pretty/*.js`: summary, settings, home, layout, consent and i18n.
  - `dict_nl.json` and `dict_en.json`: the extracted dictionaries.
  - `pages/`: the fetched HTML, `sw.js` and the sitemap.

---

## 1. Product overview and information architecture

ScoreApp is a free, account-less, ad-supported scorekeeping PWA. It supports four built-in game modes:

- `generic` ("Algemeen", generic)
- `triominos`
- `qwirkle`
- `darts` (x01 with sets and legs, a dartboard input and AI opponents)

Around these sit SEO content (guides and "score tracker" landing pages) and a darts-only progress page. Dutch is the default language. All game data lives in the browser.

### Routes

| Route | Purpose | Notes |
|---|---|---|
| `/` | Home, NL | `/nl` returns a **308 redirect to `/`** [V curl]. `getHomeHref(lang)` returns `"/"` for nl and `/${lang}` otherwise [V module 58342]. |
| `/en` | Home, EN | |
| `/{lang}/games` | Game picker ("Spellen") | Lists the four modes plus SEO landing pages. |
| `/{lang}/games/{gameId}` | **Setup page** (`NewGameContent`) | gameId ∈ {generic, triominos, qwirkle, darts}. An unknown id returns 404 [V curl `/nl/games/foo`]. |
| `/{lang}/games/{slug}-score-tracker` | SEO landing pages: rummikub, farkle, domino, mexican-train-dominoes, cribbage, uno, settlers-of-catan, phase-10, yahtzee, ticket-to-ride | All CTAs link to `/nl/games/generic` [V grep]. These are not real game configs. |
| `/{lang}/{gameId}/session/{uuid}` | **Live game** (`SessionHeader` + `SessionContent`, or `DartsSessionContent`) | `noindex, nofollow`. An unknown gameId returns 404 [V curl]. |
| `/{lang}/{gameId}/session/{uuid}/summary` | **End screen** (`SummaryHeader` + `SummaryContent` / `DartsSummaryContent`) | |
| `/{gameId}/session/{uuid}[/summary]` (no lang) | Legacy or short form | **308 to `/nl/...` regardless of the `scorelog_lang` cookie** [V curl]. The app itself generates these unprefixed URLs (see §12). |
| `/{lang}/progress` | Darts player stats ("Progressie") | Reads `scorelog_player_stats`. |
| `/{lang}/settings` | Theme, language, export/import, clear-all, cookies | `SettingsContent` [V chunk `026b72gh5alg2`]. |
| `/{lang}/guides`, `/{lang}/guides/{slug}` | 22 SEO articles per language | Darts, triominos, qwirkle, uno, catan, and others. |
| `/{lang}/tools/darts-checkout-calculator`, `/{lang}/tools/board-game-score-counter` | Tools and SEO pages | |
| `/{lang}/darts`, `/about`, `/contact`, `/privacy`, `/cookies` | Static pages | |

**Navigation.** `BottomNav` is a fixed, glass-style 5-tab bar that respects `env(safe-area-inset-bottom)` [V module 91567]. Its tabs:

| Tab | Dutch label | Destination |
|---|---|---|
| Home | Home | `getHomeHref` |
| Games | Spellen | `/{lang}/games` |
| Guides | Gidsen | `/{lang}/guides` |
| Progress | Progressie | `/{lang}/progress` |
| Settings | Instellingen | `/{lang}/settings` |

The active tab shows a pulsing bar (`animate-pulse-glow`).

`AppHeader` is a sticky `h-14` glass header. It shows the title, a back button that uses `backHref` or `backFallbackHref` (and otherwise `router.back()`), and optional actions [V module 46217].

**robots.txt** disallows `/*/*/session/` and `/*?*` and allows `/games/`, `/guides/`, `/tools/` and `/progress` [V].

---

## 2. Tech stack and PWA/offline mechanics

### Stack [V unless noted]

- **Next.js App Router, built with Turbopack.**
  - Chunks are `globalThis.TURBOPACK.push([...])` modules with numeric ids.
  - Pages are server-rendered (SSR) with `[lang]` and `[gameId]` dynamic segments; the gameId whitelist is enforced server-side, giving a 404.
  - Client components gate on a mounted flag. For example, `NewGameContent` renders a skeleton until `useEffect(() => S(true))`, which avoids hydration mismatches with localStorage.
- **Libraries:**
  - React 19-style hooks: `useSyncExternalStore` and `startTransition`.
  - Tailwind with shadcn/ui components on Radix primitives: Dialog, Sheet (Radix Dialog), Collapsible, ScrollArea, Switch, Label and Toast.
  - `cva` for button and badge variants.
  - **vaul** for the drawer (`Drawer.Root` with `shouldScaleBackground`, `Handle` and `onRelease`).
  - **framer-motion** (`motion.div`, `AnimatePresence`).
  - **lucide** icons.
  - **next-themes** (`storageKey: "theme"`, `attribute: "class"`, `defaultTheme: "dark"`, `enableSystem`).
  - **Fuse.js 7.5.0** for the rules assistant.
  - Fonts: Inter and Space Grotesk via `next/font` (`font-display` class).
- **Hosting:** Vercel. The service worker explicitly skips `/_vercel/*`, and Vercel Analytics and Speed Insights are gated by consent.
- **Tracking:** Google gtag `G-QDVLR31NFT` with Consent Mode v2 defaults set to denied, Google Funding Choices CMP (TCF v2) and AdSense `ca-pub-4166291143305703`. See §11.

### Web app manifest (`/site.webmanifest`) [V]

```json
{ "id": "/", "name": "ScoreApp – Score Tracker for Darts, Triominos & Qwirkle", "short_name": "ScoreApp",
  "start_url": "/", "scope": "/", "display": "standalone",
  "background_color": "#0d1117", "theme_color": "#0d1117",
  "icons": [ {"src":"/android-chrome-192x192.png","sizes":"192x192","purpose":"any"},
             {"src":"/android-chrome-512x512.png","sizes":"512x512","purpose":"any maskable"} ] }
```

`/manifest.json` returns 404. The page links `<link rel="manifest" href="/site.webmanifest">` and `<meta name="theme-color" content="#0d1117">`.

### Service worker (`/sw.js`, hand-written, about 7 KB) [V]

- **Registration:** the `ServiceWorkerRegistration` client component (in the root layout) calls `navigator.serviceWorker.register("/sw.js", {scope:"/"})` in a `useEffect` and silently catches errors.
- **Cache:** a single cache named `scoreapp-${CACHE_VERSION}`, currently `scoreapp-v10`.
- **Install:** precaches `/site.webmanifest`, `/favicon.ico`, `/apple-touch-icon.png` and the two android-chrome icons using `Promise.allSettled`, then calls `skipWaiting()`.
- **Activate:** deletes every `scoreapp-*` cache except the current one, then calls `clients.claim()`.
- **Fetch strategy** (same-origin GET only):

| Request | Strategy |
|---|---|
| `/_vercel/*` | Not intercepted. |
| `/_next/static/*` (immutable hashed chunks) | **CacheFirst**; responses are stored on first fetch. |
| favicon, icons, manifest, `/logo.png`, `/logo.svg` | **StaleWhileRevalidate** |
| `request.mode === "navigate"` (HTML) | `fetch(request, {redirect:"manual"})`. An opaque redirect is returned as-is. **OK HTML is not cached**, deliberately, to avoid hydration mismatches after deploys. On a non-OK response or a network error it falls back to `caches.match(request)`, then `caches.match("/")`, then `Response.error()`. |
| Everything else (RSC payloads such as `?_rsc=`, images, and so on) | **NetworkFirst** with a 3 s timeout race, caching OK responses. |

- **Updates:** there is no update UI and no message channel. A new `sw.js` installs, calls `skipWaiting` and claims clients immediately. Updates to the app shell are picked up because HTML is always fetched from the network and the chunk URLs are content-hashed. The cache is only purged when `CACHE_VERSION` is bumped manually.

> **Offline reality check [I, important]:**
> - Because navigation HTML is never written to the cache, both `caches.match(request)` and the `caches.match("/")` fallback will miss.
> - **A cold start while offline (opening the installed PWA, or a full reload) therefore fails.** It shows the browser's offline error.
> - What does work offline is a tab that is already open. All game logic is client-side and localStorage is synchronous. Client-side navigations whose RSC payload is in the NetworkFirst cache also work.
> - Starting a *new* game offline probably fails as well. It navigates to a brand-new `/session/{uuid}` URL, and that RSC payload cannot be in the cache.
> - The marketing copy ("Werkt offline", works offline) overstates this. **For our app: precache an app-shell HTML and serve it for navigations, or use a static export or SPA fallback.**

---

## 3. Data model, persistence, versioning, export/import

### 3.1 TypeScript types (reconstructed)

```ts
type GameId = "generic" | "triominos" | "qwirkle" | "darts";   // + legacy fallbacks, see below
type TurnType = "play" | "draw" | "pass";

interface Player {
  id: string;            // "p1"/"p2" for the first two (setup defaults), crypto.randomUUID() for added ones
  name: string;          // trimmed; empty → "Speler 1"/"Speler 2"/"Speler N" at session creation
  color: string;         // one of PLAYER_COLORS (hex)
  isAI?: boolean;        // darts only
  aiDifficulty?: "beginner" | "casual" | "league" | "pro";  // darts only; name becomes "AI (Pro)" etc.
}

interface Turn {
  id: string;            // crypto.randomUUID()
  playerId: string;
  points: number;        // signed; darts stores NEGATIVE thrown score (mapInputToTurn negates)
  type?: TurnType;       // may be undefined (edit flow creates turns with type from existing turn or undefined)
  stonesDrawn?: number;  // triominos "draw" count; DARTS reuses it as "darts thrown" (default 3)
  ts: number;            // Date.now() at submit; ALL turns of one sequential cycle share the same ts
  note?: string;         // the cycle's note is copied onto every turn of that cycle
}

interface Round {
  id: string;
  index: number;                         // 0-based, re-numbered on delete
  turns: Turn[];
  scoresByPlayerId: Record<string, number>; // settlement / bonus points ("Bonuspunten")
  settled: boolean;                      // closed by "Ronde afronden"
  orderMode?: "fixed" | "rotate";        // always "fixed" in practice (see §6.3)
  playerOrder?: string[];                // player ids in turn order for this round
  endedByPlayerId?: string;              // round winner / player who went out (darts: leg winner)
  notes?: string;                        // settlement note
}

interface Session {
  id: string;                            // crypto.randomUUID()
  gameId: GameId;
  title?: string;                        // optional "Spel titel", editable on summary
  players: Player[];
  rounds: Round[];
  status: "active" | "finished";
  roundsEnabled: boolean;                // generic: user switch (default false); triominos: true; qwirkle/darts: false
  goalEnabled: boolean;                  // generic: user switch; triominos: true; others false
  targetScore?: number;                  // generic default 100, triominos default 400; undefined if goal off
  rules?: { winnerBonus25: boolean; winnerGetsSumOfRemaining: boolean };   // triominos only
  dartsConfig?: { startingScore: number; legsToWinSet: number; bestOfSets: number;
                  scoringMode: "quick" | "detailed"; preferredInputMode?: "keypad" | "dartboard" };
  gameEndTriggeredAt?: { roundIndex: number; playerId: string; timestamp: number };
  endgame?: { lastTilePlayerId: string | null; lastTileBonus: 6 };        // qwirkle only
  schemaVersion: 1;                      // stamped by saveSession
  createdAt: string;                     // ISO
  updatedAt: string;                     // ISO, overwritten on EVERY save
}

// localStorage "scorelog_sessions"
type SessionsBlob = { version: 1; data: Session[] } | Session[];  // bare array = legacy, still readable

// localStorage "scorelog_player_stats" (darts only), keyed by player NAME
type PlayerStats = Record<string, {
  playerName: string; gamesPlayed: number; rollingAverage10: number[];  // 3-dart avg per match, last 10
  bestLeg: number;      // fewest darts in a won leg; initialised to Infinity (→ null in JSON, see §12)
  total100Plus: number; total140Plus: number; total180s: number; updatedAt: string;
}>;
```

The colour palette is `PLAYER_COLORS = ["#EF4444","#3B82F6","#22C55E","#F59E0B","#8B5CF6","#EC4899","#F97316","#14B8A6"]` [V module 99833]. A new player gets `PLAYER_COLORS[players.length % 8]`, and colours are not deduplicated.

### 3.2 Storage layer [V modules 52348 `safeStorage`, 4421 store, 61343 `sessionsStore`]

**`safeStorage`** wraps `localStorage` with `getItem`, `setItem`, `removeItem`, `readJSON(key, fallback)` and `writeJSON(key, value)`. Every method is SSR-safe and returns `null` or `false` when no `window` is present. Failures dispatch window `CustomEvent`s:

- `scorelog:storage-full` with `{key, op}`. This fires when `setItem` throws `QuotaExceededError`, `NS_ERROR_DOM_QUOTA_REACHED`, or an error with code 22 or 1014.
- `scorelog:storage-error` with `{key, op, reason?}`. `reason: "parse"` means `JSON.parse` failed, and `"stringify"` means serialisation failed.

**Session store** (module 4421):

- `o()` reads `scorelog_sessions` once into an in-memory array `s` and an id→session `Map a`. It accepts both `{version:1,data}` and a bare array; anything else becomes `[]`.
- It installs a single global `storage` listener, guarded by `window.__scorelog_store_storage_listener__`. That listener drops the caches when another tab writes the key.
- `d(list)` is the only writer. It:
  - updates the caches;
  - writes `{version:1, data:list}`;
  - dispatches `scorelog:storage-error` if the write failed;
  - **always** dispatches `scorelog:sessions-changed`.
- Exported functions:
  - `getAllSessions()`
  - `getSession(id)`: lookup via the Map.
  - `getRecentSessions(limit = 10, gameId?)`: sorted by `updatedAt` descending, memoised for the unfiltered call.
  - `saveSession(s)`: stamps `schemaVersion:1`, keeps `createdAt` (or sets it to now), and sets `updatedAt` to now. It replaces the session in place if it exists, or **`unshift`s** it otherwise, then writes the **whole array**.
  - `deleteSession(id)`
  - `getAllPlayerStats()`
  - `updatePlayerStatsFromSession(s)`: darts only; skips AI players.
- **`sessionsStore`** is a `useSyncExternalStore` adapter. It subscribes to `scorelog:sessions-changed` and `storage`. Its snapshot is `getRecentSessions()`, which is **capped at 10**, and a shallow comparison of `id` and `updatedAt` keeps the snapshot reference stable.

**Write timing.** The live session keeps the session in React state. Its `J(next)` function sets state, pushes the previous state onto the undo stack, and calls `saveSession` from `requestIdleCallback`, falling back to `setTimeout(0)` [V `SessionContent`]. Some paths save synchronously: undo, `onSaved` flows and finishing.

**Other localStorage keys** [V grep of all chunks]:

| Key | Owner / meaning |
|---|---|
| `scorelog_sessions` | All sessions, wrapped as `{version:1,data}`. |
| `scorelog_player_stats` | Darts lifetime stats, keyed by player name. |
| `scorelog_lang` | `"nl"`/`"en"`. Also mirrored in a `scorelog_lang` cookie (1 year, `SameSite=Lax`). |
| `theme` | next-themes value. |
| `darts-scoring-mode` | `"keypad"`/`"dartboard"`, the last chosen darts input. |
| `scorelog_feedback_enabled` | Darts "performance feedback" phrases toggle. |
| `scorelog_notice_storage_shown` | Dismissed flag for the storage notice in Settings. |
| `consent` | `{necessary:true, marketing:boolean}`. Used only when the Google CMP is unavailable. |

**Custom events:**

- `scorelog:sessions-changed`
- `scorelog:storage-full` / `scorelog:storage-error`
- `scorelog-undo`: dispatched on `globalThis`, consumed by `SessionContent` and `DartsSessionContent`.

**Storage error UI.** Two independent listeners toast destructive messages: `eS` inside `Providers` (deduplicated per type, and it distinguishes "corrupted" on `reason:"parse"`) and `StorageWatcher`. If both are mounted, users may get two toasts [I]. The messages are:

- "Opslag Vol" (storage full)
- "Opslagfout" (storage error)
- "Opslag Corrupt" (storage corrupted)

### 3.3 Schema versioning and migration [V]

There are two version markers:

- the container `{version: 1, data}`;
- the per-session `schemaVersion: 1`.

**Neither is used for branching yet.** No migration table exists. "Migration" is normalisation on load, done in several places:

- **Store read:** a bare array (legacy) is accepted as-is, and an unknown shape becomes `[]`.
- **`SessionContent` load:** every round is normalised to `{index: number ?? arrayIndex, turns: Array ?? [], scoresByPlayerId: ?? {}, settled: !!settled}`. If any stored round lacked a `turns` array, the normalised session is **written back** on idle.
- **Home list:** `gameId || game || "triominos"`, and an unknown id is also treated as `"triominos"`. This implies an older schema used `game` and that triominos was the original or only game [I].
- **Import** (see below) fills defaults for `rounds`, `status`, `createdAt` and `updatedAt`.

### 3.4 Export / import / clear [V `SettingsContent`]

- **Export ("Gegevens exporteren", export data):**
  - It writes `JSON.stringify(getAllSessions(), null, 2)`, which is a **bare `Session[]`** without the `{version}` wrapper and **without player stats or settings**.
  - It downloads the file `scorelog-export-YYYY-MM-DD.json` through a Blob, `URL.createObjectURL` and a hidden `<a download>`.
- **Import ("Gegevens importeren", import data):**
  1. The user picks an `<input type=file accept=".json">`, which is read with `file.text()` and `JSON.parse`.
  2. The parser accepts a `Session[]` or `{data: Session[]}`.
  3. Each item must have a string `id`, a string `gameId` and an array `players`. If any item is invalid, the **whole import is rejected**.
  4. Defaults are applied: `rounds` → `[]`, an invalid `status` → `"finished"`, and missing timestamps → now.
  5. Each item goes through `saveSession`, which **merges** by id: existing ids are overwritten and new ones are unshifted. Note that `saveSession` sets `updatedAt = now` for every imported session.
  6. A toast reports "N sessions" in English plural only.
- **Clear all ("Alles wissen" → "Alle gegevens wissen?" → "Alles wissen"; clear all, clear all data?, clear everything):**
  - This calls `safeStorage.removeItem("scorelog_sessions")` and then `location.href = "/"`, a hard reload that also resets the in-memory caches.
  - It **does not** clear `scorelog_player_stats`, the language, the theme or the consent setting.

---

## 4. The game-config "plugin" pattern

### 4.1 Interface (reconstructed) [V module 73579 `getGameConfig`, 58144 darts]

```ts
interface GameConfig {
  id: GameId;
  nameKey: string;                 // i18n key, e.g. "games.triominos"
  maxPlayers: number;              // enforced on setup ("Max {{count}} spelers voor {{game}}")
  quickPicks: number[];            // keypad chips; tapping one submits immediately (submitOnQuickPick: true)
  minScore?: number;               // keypad blocks "Klaar" when value < min ("Minimale waarde is {{min}}")
  turnTypes: TurnType[];           // declared, but the UI never lets you choose draw/pass (see §12)
  supportsSettlement: boolean;     // true → keypad shows "Ronde voltooien" + settlement dialog
  mapInputToTurn(a: { rawValue: string; turnType: TurnType }): { points: number; stonesDrawn?: number };
  calculateSettlement(a: {
    winnerId: string; scores: Record<string, string>; players: Player[];
    rules?: Session["rules"]; finishMode: "out" | "blocked"; localWinnerGetsSum: boolean;
  }): Record<string, number>;      // → round.scoresByPlayerId
  getTipKey?(a: { isFinishFlow: boolean }): string | undefined;   // hint under quick picks
}
const getGameConfig = (id) => registry[id] ?? genericConfig;     // unknown id → generic
```

### 4.2 The four configs [V]

| | generic | triominos | qwirkle | darts |
|---|---|---|---|---|
| maxPlayers | 8 | 8 | 4 | 2 |
| quickPicks | 5, 10, 25, 50 | −15, −10, −5, 0, 25, 40 | 3, 4, 5, 6, 7, 12 | 26, 41, 45, 60, 81, 100 |
| minScore | – | −15 | – | – |
| turnTypes | play | play, draw, pass | play | play |
| mapInputToTurn | `parseInt` or 0 | play: `parseInt`; draw: `points = −5×n, stonesDrawn = n`; pass: `−25` | `parseInt` | **`−parseInt`** (the score counts down) |
| supportsSettlement | true, but forced **false** when `roundsEnabled === false` (override in `SessionContent` as `M`) | true | false | false |
| calculateSettlement | Each player gets `parseInt(scores[id])`. The round-ender is forced to `"0"` by the caller. | See below. | Everyone gets 0. | `{}` |
| getTipKey | – | `"games.triominosTip"` when not in the finish flow | – | – |
| Sign toggle (+/−) on keypad | yes | yes | no | no |

The sign-toggle rule is hard-coded as `showSignToggle: "generic"===id \|\| "triominos"===id`.

**Triominos settlement** (`calculateSettlement`):

- Every non-winner gets `0`.
- **`finishMode "out"`** (a player went out, "Speler is uit"):
  - winner = `25·winnerBonus25 + (localWinnerGetsSum ? Σ|others' remaining| : 0)`.
- **`finishMode "blocked"`** ("Geblokkeerd", blocked):
  - All remaining values are required.
  - The winner is the player with the **lowest** `|remaining|`.
  - winner = `(sum ? Σothers : 0) − own`.

**Darts extras (module 58144):**

- `dartsConfig` defaults to `{startingScore:501, legsToWinSet:3, bestOfSets:5}`.
- `getDartsMatchState(session)` walks settled rounds (= legs) using `endedByPlayerId` to compute sets, set wins, current leg wins, remaining points per player (`startingScore + Σ negative points` in the open leg) and the match winner (first to `ceil(bestOfSets/2)` sets).
- `analyzeDartsMatch` produces "stories" (swing, heavy_scoring, turning_point, streak, clutch) and `calculateDartsMomentum` returns a weighted average of the last 3 turns.
- Darts has its own `DartsSessionContent` and `DartsSummaryContent`, a lazily loaded `<dartbot-dartboard>` web component, AI bots (`beginner` average 35, `casual` 50, `league` 65, `pro` 100) and a checkout calculator. It is not relevant to Kwatro beyond its patterns.

### 4.3 It is not really a plugin system

Game behaviour is spread over **at least five places** [V]:

1. **`getGameConfig` registry** (module 73579): scoring and keypad behaviour.
2. **`GAMES` UI registry** (module 11627):
   - per-game `{id, titleKey, descriptionKey, startLabelKey, startHref(lang), sessionHref(lang,id), summaryHref(lang,id), icon}`;
   - used by the home and games pages.
3. **Hard-coded `gameId ===` branches**, including:
   - setup forms in `NewGameContent` (separate JSX per game, defaults such as `targetScore` "400" vs "100", and the 1 vs 2 minimum players for darts);
   - `SessionContent`: Qwirkle last-tile dialog, `ei()` URL `/qwirkle/session/...`, triominos round-order rule, the sign toggle;
   - `getSessionTotals` (the Qwirkle bonus);
   - summary game names (with a **fallback to "Triominos"** for unknown ids);
   - `BLOCKED_ROUTES` for ads;
   - darts-only stats.
4. **Rules-assistant adapters** (`ta`/`tl`/`to`/`tu`): a per-game, per-locale rulebook in the session bundle.
5. **Route whitelist** on the server: unknown gameId returns 404. Plus SEO pages, sitemap and i18n keys (`games.*`, `newGame.*Rules*`).

**How a new game plugs in today:**

1. Add a `GameConfig`.
2. Add a `GAMES` entry.
3. Add i18n keys.
4. Add a setup branch.
5. Add the route param.
6. Optionally add a rules adapter and special end-game handling.

For our app this should be collapsed into **one** game-definition module (see §13).

---

## 5. Session lifecycle

```
 /games/{id} (setup)            /{id}/session/{uuid} (live)                      /{id}/session/{uuid}/summary
 ┌───────────────┐ "Spel starten" ┌──────────────────────────────┐ finish ┌──────────────────────────┐
 │ NewGameContent├──────────────► │ status:"active"               ├──────► │ status:"finished"        │
 └───────────────┘ saveSession    │  rounds grow / settle         │        │ title editable, share,   │
                                  │  gameEndTriggeredAt (latched) │        │ "new game same players"  │
                                  └──────────────────────────────┘        └─────────┬────────────────┘
                                         ▲  "Ga verder met laatste spel" (home)      │ new session (active)
                                         └────────────────────────────────────────────┘
```

### 5.1 Setup → create [V `NewGameContent`]

**Form.** The form contains:

- optional title ("Spel titel", game title), autofocused;
- a player list (name input with a pencil affordance, 8 colour swatches, a remove ✕ once there are more than the minimum players);
- "Speler toevoegen" (add player), up to `maxPlayers`;
- "Gebruik laatste spelers" (use last players). It is only shown if a previous session of this game exists, and it copies the players with fresh ids;
- per-game rules:
  - **generic:** switches for "Rondes inschakelen" (enable rounds, default **off**) and "Doelscore" (goal score, default off, value 100);
  - **triominos:** switches "Eerste uit bonus: +25" (first-out bonus, default on) and "Winnaar krijgt som van resterende" (winner gets the sum of the remaining tiles, default on), plus target score 400;
  - **qwirkle:** an info card only;
  - **darts:** scoring mode, start score 301/501/701 or custom, legs per set, best-of sets, and "AI-tegenstander" (AI opponent). Darts prefills these from the last darts session.

**Leave guard.** Once the form is dirty, the page pushes a dummy history entry `{scorelogLeaveGuard:true}` and intercepts `popstate` to show "Deze spelinstelling verwijderen?" (discard this game setup?). A `beforeunload` prompt is added as well.

**Start ("Spel starten", start game).** The start button is disabled when there are fewer than 2 players (1 for darts). Starting runs `saveSession({...})` with the fields below, then `trackEvent("game_started")`, then `router.push("/{lang}/{gameId}/session/{id}")`.

| Field | Value set at creation |
|---|---|
| `id` | `crypto.randomUUID()` |
| `gameId` | route param |
| `createdAt`, `updatedAt` | now |
| `title` | trimmed, or `undefined` |
| `players` | empty names replaced with "Speler 1", "Speler 2", "Speler N" |
| `rounds` | `[]` |
| `status` | `"active"` |
| `roundsEnabled` | generic: the switch; triominos: `true`; others: `false` |
| `goalEnabled` | generic: the switch; triominos: `true`; others: `false` |
| `targetScore` | `parseInt` if > 0; otherwise 400 (triominos) or 100 (generic); `undefined` when the goal is off, for qwirkle, and for darts |
| `rules` | triominos only: `{winnerBonus25, winnerGetsSumOfRemaining}` |
| `dartsConfig` | darts only |

### 5.2 Live → finish [V `SessionContent`]

- **Load:**
  - `getSession(id)`. If it is missing, `router.push("/")`. If `gameId` does not match the route, `notFound()`.
  - The session is normalised (§3.3) and set with `startTransition`.
- **Mutations:** each mutation goes through `J(next)`, which saves and pushes an undo entry. They are:
  - adding turns (`et()`);
  - settling a round (`onSubmitSettlement`);
  - reordering the current round (`onUpdateOrder`);
  - editing a past turn group (`onSaveRound`);
  - latching the goal (`gameEndTriggeredAt`).
- **Finish:** `en()` re-reads the latest stored session, calls `trackEvent("game_finished", {game_type, players, duration_seconds})`, saves `{...s, status:"finished"}` and pushes `/{gameId}/session/{id}/summary`. That URL has no lang, so it 308s to `/nl` (§12).
- **Qwirkle finish:** `ei(playerId|null)` saves `status:"finished"` and `endgame:{lastTilePlayerId, lastTileBonus:6}`, then pushes `/qwirkle/session/{id}/summary`. It does **not** fire `game_finished`.
- **Darts finish:** the status is set when the match is won. After a 2.6 s celebration, `router.replace("/darts/session/{id}/summary")` runs and `updatePlayerStatsFromSession` is called.

### 5.3 Summary → next game

- The summary only reads the session. It **does not** change `status`, so an active session can be viewed there too.
- Renaming the title saves through `saveSession`.
- "Nieuw spel met dezelfde spelers" (new game with the same players) creates `{id, gameId, createdAt, updatedAt, players with new ids, rounds:[], status:"active", roundsEnabled, goalEnabled, targetScore}` and pushes `/{gameId}/session/{newId}`. **`rules` and `dartsConfig` are not copied** (§12).

### 5.4 Resume / delete

There is no explicit "resume" state. Any session with `status:"active"` is resumable by URL. Home links the **most recently updated active** session ("Ga verder met laatste spel", continue last game) plus up to 10 cards. See §8.

---

## 6. The live session screen

### 6.1 Layout (top → bottom) [V]

1. **`SessionHeader`:** `AppHeader` with the game name as its title and a back fallback to `/{lang}`.
2. **Sticky scoreboard strip** (`top-14`, horizontally scrollable):
   - one avatar per player, sorted by total descending;
   - a coloured circle with the player's initial, a rank badge, a "Leider" (leader) badge for #1 if the total is above 0, and a total that is animated by `tS`. `tS` counts from the old value to the new one over 300 ms with ease-out cubic via `requestAnimationFrame`;
   - the "current" player (`er`) gets a glowing ring and a pulsing ▶ badge.
3. **Goal banner:**
   - When `gameEndTriggeredAt` is set and the last round is unsettled, the banner reads "{{target}} bereikt — voltooi deze ronde om de winnaar te bepalen." ("{{target}} reached — finish this round to decide the winner").
4. **Goal progress bar** (only if `goalEnabled`):
   - "Doel: N" (goal: N) and "nog X" (X to go) or "Doel bereikt!" (goal reached!);
   - the bar width is `leaderTotal / target`, with a 700 ms width transition.
5. **Turn list** (`w`):
   - empty state "Nog geen beurten" (no turns yet);
   - otherwise rounds newest first. Within each round, turns are grouped by `ts` into "Beurt N" (turn N) cards, showing a colour dot, the initial and ±points per player, plus a pencil button for editing;
   - a settled round shows a dashed divider "Ronde N Voltooid" (round N finished) and a "Ronde Overzicht" (round summary) grid. Each player has a round total (turns + settlement, coloured green or red); the settlement part is listed separately as "Bonuspunten" (bonus points).
6. **Floating action bar** (above the bottom nav, glass):
   - primary "**+ Score toevoegen**" (add score);
   - a "⋯" button that opens the bottom **Sheet "Meer"** (more). The sheet contains:
     - the wake-lock toggle;
     - "Regels-assistent" (rules assistant) with an "AI" badge, only for triominos and qwirkle;
     - "Spel voltooien" (finish game).
7. **Drawers** (full-screen vaul, `h-[100dvh]`): the score-entry drawer and the edit-turn drawer.
8. **Dialogs:**
   - goal reached;
   - finish confirm;
   - Qwirkle last tile;
   - rules assistant;
   - delete round (dead code, §12).

### 6.2 Turn entry flows (`P`, the round form inside `ScoreDrawer`) [V]

**Two modes exist in code:**

- **Sequential cycle (`ee = true`).**
  - The form walks players in `K` (= the current round's `playerOrder`, or the player list) starting at `K[0]`.
  - Header: a `TurnStatusBar` in the player's colour with the name animated by framer-motion and the subtitle "Speler i/n" (player i/n). Each step slides in from x+20 with `AnimatePresence mode="wait"`.
  - The primary button shows "**Volgende • {next name}**" (next, with a chevron) and, on the last player, "**Klaar**" (done).
  - Values are held per player in local state.
  - On "Klaar", one `onSubmitTurnCycle` creates **one turn per player with a value**. All of those turns share the same `ts` and carry the note. Empty "play" inputs are skipped.
- **Pick-a-player (`ee = false`).**
  - The screen asks "Wie is er aan de beurt?" (whose turn?) and lists the players.
  - Tapping a player opens the keypad with the primary "**Beurt toevoegen**" (add turn), which creates a single turn.

**Which mode you get:**

- The "Score toevoegen" button **always** sets `B = true`, so the drawer always opens in sequential mode starting at `playerOrder[0]`. Generic games without rounds force it too.
- The pick-a-player screen is only reachable after cancelling the finish-round dialog.
- In practice every "add score" walks **the whole table**. Tapping a quick-pick chip submits that player's value immediately and advances.

**Submission rules (`et()`):**

1. **Rounds disabled** (generic without rounds, qwirkle, darts in this component): everything is appended to `rounds[0]`, which is created on demand with `orderMode:"fixed"`.
2. **Rounds enabled:**
   - If the last round is settled, or there is none, a new round is created with `playerOrder`:
     - **triominos:** a copy of the previous round's `playerOrder` (`tN`);
     - **other games:** the player list with the previous round's `endedByPlayerId` moved to the front (the rest keep their original order, they are not rotated).
   - Turns are ordered by `tC()` before insert.
   - A cycle is saved only if some turn has a non-zero value, is a draw or pass, or a note exists. **The exception is a single entry, which is saved even if it is 0.** An all-zero multi-player cycle is silently dropped.
3. **`opts.keepOpen` / `opts.onSaved`** let "finish" flows save the pending value first and then continue.

**Keypad details (`TurnKeypad`, module 66906):**

- **Display:**
  - On screens ≥ 640 px the big value box "Punten"/"Stenen" (points/stones) is shown.
  - **On phones that box is `hidden`**, and the value is shown inside the primary button instead.
- **Quick-pick chips:** horizontally scrollable, shown as "+N".
- **Number grid:**
  - a 3×3 grid of 1–9;
  - then **+/-** (or an empty cell), **0** and **⌫** (backspace).
- **Bottom buttons:**
  - Cancel: red outline; shows only "✕" under 360 px.
  - Optional **secondary action:** "Ronde voltooien" (finish round), or "Spel voltooien" (finish game) for games without settlement.
  - Primary button: h-14.
- **Validation:** "Klaar" is disabled while the value is `"-"` or below `minScore`, and "Minimale waarde is {{min}}" (minimum value is {{min}}) pulses.
- **Input rules:** typing replaces a leading "0". The +/- toggle prefixes or strips "-".
- **Haptics:** `navigator.vibrate(25)` on every press.
- **Keyboard:** a global `keydown` handler maps `0-9` → digit, `Backspace` → delete, `Enter` → submit and `Escape` → cancel.
- **Note:** "Notitie toevoegen / Bewerk notitie" (add note / edit note) expands an input. The note is attached to every turn of the cycle. For a settlement, it goes to `round.notes`.

### 6.3 Turn order [V]

- The order is stored per round in `playerOrder`.
- The "Beurtvolgorde" (turn order, subtitle "Met de klok mee", clockwise) card has a "Wijzigen"/"Verbergen" (change/hide) toggle that reveals:
  - ▲/▼ swap buttons;
  - a "start" button that rotates the list so that player begins.
- Changes call `onUpdateOrder("fixed", order)`, which writes to the **current unsettled round only**.
- **There are two notions of order:**
  - `tC(session, round)` supports `orderMode:"rotate"`. In that mode the start index is `(number of distinct ts in the round) mod n`, which is the original "rotate based on distinct ts" design.
  - **Nothing ever sets `orderMode:"rotate"`**: the only writer passes `round.orderMode ?? "fixed"`, and new rounds are created with `"fixed"`. Rotation is therefore dead.
  - The "current player" highlight (`er = tC(...)[0]`) is therefore always `playerOrder[0]` and **does not advance after each turn** [V + I].

### 6.4 Settlement / round finishing [V]

Settlement applies when `supportsSettlement` is true (triominos, and generic with rounds).

1. Pressing **"Ronde voltooien"** (finish round) on the keypad stores the current player's pending input in `z`, marks that player as the round-ender `es`, and opens the dialog "**Resterende stenen**" (remaining tiles).
2. For triominos the dialog has a mode toggle: "**Speler is uit**" (player went out) or "**Geblokkeerd**" (blocked).
3. Inputs:
   - **"out" mode:** one numeric input per *other* player.
   - **"blocked" mode:** every player, all required ("Voer voor elke speler een resterende steenwaarde in…", enter a remaining tile value for every player).
4. **"Ronde afronden"** (settle round):
   1. In "out" mode, the ender's pending keypad value is first saved as a normal turn.
   2. In "blocked" mode, the winner is recomputed as the lowest remaining value.
   3. `calculateSettlement(...)` runs.
   4. `onSubmitSettlement(winnerId, scores, note)` sets, on the last round (or a newly created one), `scoresByPlayerId`, `endedByPlayerId`, `settled:true` and `notes`.
5. After settling, the totals are recomputed with `getPlayerTotal`:
   - If any player has reached `targetScore || 400` and nothing was latched yet, `gameEndTriggeredAt = {roundIndex, playerId, timestamp}` is latched.
   - If the **leader** has reached the target, the "Doel bereikt!" (goal reached!) dialog opens with the current standings and two buttons: "Verder spelen" (continue playing) and "Spel voltooien" (finish game).

### 6.5 Target / goal end-game logic [V]

- **Totals:** `getSessionTotals(s)` = Σ `turn.points` + Σ `round.scoresByPlayerId`, plus the Qwirkle `endgame.lastTileBonus` for `lastTilePlayerId`.
- **Winner:** `getWinner` returns the highest total. **Ties go to the earliest player in `players`** (strict `>`).
- **Two latch paths:**
  1. **Effect:** if `goalEnabled`, the session is not finished, and nothing is latched, the first player with total ≥ `targetScore||400` sets `gameEndTriggeredAt`. This happens after every change, mid-round included.
  2. **Settlement:** as in §6.4. This path ignores `goalEnabled`, see §12.
- **Latching is permanent.** Undo can revert it because undo restores the whole state.
- **"Spel voltooien"** (finish game) in the "Meer" (more) sheet:
  - **Qwirkle:** opens "Wie legde zijn laatste tegel?" (who played their last tile?). Picking a player gives +6; "Voltooien zonder bonus" (finish without bonus) skips the bonus.
  - **Other games:** a confirm dialog "Spel nu voltooien?" (finish game now?) is shown when the goal is not latched or the last round is unsettled. Its three texts are "finishEarlyNoGoal", "finishEarlyNotSettled" and "finishNow", with the button "Toch voltooien" (finish anyway). Otherwise the game finishes immediately.
- **Games without settlement:** the keypad's secondary button is "Spel voltooien" itself. It saves the pending cycle (`keepOpen`, `onSaved`) and then finishes.

### 6.6 Editing past rounds [V `I` component]

1. The pencil on a "Beurt N" card opens a second `ScoreDrawer` for `{roundId, ts}`.
2. It lists **all players** with that turn group's value. A missing player shows 0, and a draw shows the stone count.
3. Tapping a player opens the keypad with "Wijzigingen toepassen" (apply changes).
4. "Wijzigingen opslaan" (save changes) rebuilds the round's turns:
   - turns with other `ts` values are kept;
   - **a turn is (re)created for every player** at that `ts`, keeping the id, type and note where they exist.
5. Limitations:
   - editing adds explicit 0-turns for players who were not in the group;
   - settlement values cannot be edited;
   - no turn can be deleted;
   - "delete round" is unreachable (§12).

### 6.7 Undo [V]

- **Stack:** `q` is an in-memory array of up to **20** previous session states. `J` pushes `[...prev.slice(-19), prev]`.
- **Effect of undo (`ee()`):** it pops the last state, restores it and saves it synchronously.
- **Lifetime:** the stack is lost on reload or navigation.
- **Trigger:** the only trigger is the window event `scorelog-undo`. It is dispatched **only** by a touch gesture: swiping down more than 100 px on the keypad's value display. Because that display is `hidden sm:block`, **phones have no reachable undo** (§12).
- **Darts** listens to the same event.

### 6.8 Notes

- Notes on turns live in `Turn.note`. The cycle note is copied onto each turn.
- Notes on settlements live in `Round.notes`.
- **Notes are never displayed anywhere**: not in the turn list, the summary or the share card [V by search: no renderer reads `note` or `notes`]. The pencil button's aria-label even reuses "Bewerk notitie" (edit note).

### 6.9 Screen wake lock [V `N` hook + `tj` toggle]

- The hook tracks `supported = !!navigator.wakeLock`.
- `toggle` requests or releases `navigator.wakeLock.request("screen")`.
- While enabled, it **re-acquires on `visibilitychange`** whenever the lock was released by the OS, and it releases on unmount.
- The toggle is only rendered on mobile user agents (`/Android|iPhone|iPad|iPod/`). Its labels are "Scherm aanzetten" / "Scherm aan" (keep screen on / screen stays on).
- The setting is not persisted, so it is off on every visit.

### 6.10 Rules assistant (offline, not an LLM) [V `tt`, `ef`, `e8`/`e9`]

- **Availability:** triominos and qwirkle only. Each game has a per-locale "adapter": `{gameId, locale, chunks[{id, ruleNo, title, text, keywords, suggestions?}], concepts, scoring, suggested[], citationsByLabel?}`.
- **Pipeline:**
  1. Normalise the text (lowercase, NFD with accents stripped, punctuation removed).
  2. Run an off-topic guard based on a keyword stem list and adapter matches.
  3. Classify the question with regexes into one of `RULE_LOOKUP`, `SCORING`, `BLOCKED`, `WHO`, `DEFINITION`, `PERMISSION`, `END_CONDITION` or `GENERAL`. NL and EN synonyms are covered.
  4. Rank with Fuse.js (threshold 0.6, weighted on title, keywords and text) and custom scoring. There is also numeric scoring logic, for example "2 keer uit de pot" (drawn twice from the pool) gives −10.
- **Answer:** text plus citations ("Regel N: titel", rule N: title) in a Collapsible "Toon relevante regeltekst" (show relevant rule text), plus quick-reply chips.
- **UX:** a 600 ms fake typing delay with bouncing dots. The UI is a full-screen dialog on mobile and 500×600 on desktop.
- **Labelling:** the UI calls it "AI", but it is deterministic retrieval.

---

## 7. Summary screen and sharing [V `SummaryContent`, `buildSummarySvg`, `svgToPngBlob`, `computeSessionHighlights`]

**Header.** The `AppHeader` title is "Speloverzicht" (game summary). The back fallback is the live session.

**Title.** The game title (or the game name) is shown with a pencil for inline renaming (an input with ✓ and ✕ buttons).

**Podium** (when there are 2 or more players):

- the top 3 arranged as 2nd, 1st, 3rd, with column heights h-32, h-44 and h-24;
- the winner gets a crown, an accent glow and "Rang N" (rank N).

**Leaderboard ("Klassement"):**

- all players by total; the winner's card glows;
- Qwirkle shows "+6 Laatste Tegel Bonus" (+6 last tile bonus).

**Highlights ("Hoogtepunten"),** up to 3, from `computeSessionHighlights`:

- `biggestTurn`: the highest single `points`, regardless of sign;
- `mostConsistent`: the lowest standard deviation of a player's turn points;
- `leadChanges`: the number of times the leader changed, evaluated after each `ts` group. Ties resolve by player order.

**Ad slot.** An AdSense slot `summary` is shown when consent is given (§11).

**Breakdown table** (collapsible):

- "Ronde-per-ronde overzicht" (round-by-round breakdown): rows are rounds, cells are turn points plus settlement;
- "Beurt-per-beurt overzicht" (turn-by-turn breakdown) when rounds are disabled: rows are `ts` groups;
- a "Totaal" (total) row at the end; cells are coloured by sign.

**Buttons:**

- "**Deel afbeelding**" (share image);
- "Nieuw spel met dezelfde spelers" (new game with the same players);
- "Terug naar Home" (back to home).

**Share image pipeline (it renders an image):**

1. On mount, the page fetches `/logo.svg` (`cache:"force-cache"`) and rasterises it to a 40×40 PNG data URI.
2. `buildSummarySvg(session, t, {gameName, endedAtText, logoDataUri})` builds a **1200×630 SVG string** (Open Graph size). It has a dark gradient background, teal (`#00F0C8`) and orange radial blobs, and a header card with logo, "ScoreApp", the title (truncated to 52 characters) and "game name • date". The rows hold up to 6 players with rank, colour dot, name (truncated to 22 characters), score and, for darts, the average. A highlights card holds 3 lines (falling back to "Eindscores", final scores). The footer reads "Bijgehouden met ScoreApp" (tracked with ScoreApp). Text is XML-escaped.
3. `svgToPngBlob` draws the SVG through a Blob URL onto a 1200×630 `<canvas>`. If that fails it retries with a base64 data URI. It then calls `canvas.toBlob("image/png", 0.92)`, with a `toDataURL` fallback when the blob is empty.
4. The page then shares or downloads the image:
   - If `navigator.canShare({files:[file]})` is true, it calls `navigator.share({files:[File "scoreapp-{gameId}-{id}.png"], title:"ScoreApp", text:"{name} • {date}"})` and then `trackEvent("share_score", {method:"native_share"})`.
   - **Otherwise** it downloads the PNG through `<a download>`. There is no clipboard or text-only share.
5. The date is `Intl.DateTimeFormat` (`nl-NL`/`en-GB`, dd/mm/yyyy hh:mm) of `session.endedAt` (a field that never exists) or `updatedAt`.

---

## 8. Home: recent games, resuming, deleting [V `HomeSessionsSection`]

- **Data source:** `useSyncExternalStore(sessionsStore)` returns the 10 most recently **updated** sessions. The list re-renders on `scorelog:sessions-changed` or a cross-tab `storage` event.
- **"Ga verder met laatste spel"** (continue last game): a link to `sessionHref` of the first `status:"active"` session in that list. It fires `trackEvent("resume_game")`.
- **"Recente spellen"** (recent games, "N spellen"):
  - a horizontal snap-scroll row of `w-56` glass cards;
  - each card links to `summaryHref` if the session is finished, otherwise to `sessionHref`;
  - card contents:
    - title or game name;
    - game chip with icon;
    - badge "Live" (active) or "Klaar" (done, finished);
    - top-3 avatar stack plus "+N";
    - relative time from `updatedAt`: "Zojuist" (just now), "{{count}}m geleden" (minutes ago), "{{count}}u geleden" (hours ago), "{{count}}d geleden" (days ago), or a locale date after 7 days;
    - the winner's name if finished.
  - The empty state reads "Nog geen spellen" (no games yet).
- **Delete:** the 🗑 icon on a card calls `deleteSession(id)` immediately, **with no confirmation and no undo**.
- **No full history:** sessions beyond the newest 10 are invisible in the UI. They still exist in storage, in export, and by URL.

---

## 9. i18n

**Dictionaries** [V module 58342 `translate`, 7761 `LanguageProvider`/`useI18n`]:

- `nl` and `en` are two nested JSON objects (`JSON.parse('...')` modules 75989 and 99307).
- **Both are bundled into the client JS of every page.** There is no lazy loading and no ICU library.

**`translate(lang, "a.b.c", vars)`:**

1. It walks the dot path.
2. If the value is not a string, it falls back to **nl**, and then to the **key itself**.
3. It interpolates by literal `replaceAll("{{name}}", value)`.

**Pluralisation** is manual: the component picks `key_one` or `key_other` itself (`home.gamesCount_*`, `summary.rounds_*`, `rules.otherSource_*`).

**Language source:**

- `initialLang` comes from the URL segment, rendered on the server (`<html lang>`), and `HtmlLangSync` keeps `document.documentElement.lang` in sync.
- On mount, the stored `scorelog_lang` overrides the URL language **in state only**.
- `setLang(lang)` writes localStorage and the cookie, then `router.push`es the same path with the prefix swapped (`/nl` maps to `/`).
- A Dutch URL can therefore render English UI (§12).

**Namespaces** (key counts, same in nl and en):

| Namespace | Keys | Contents |
|---|---|---|
| `common` | 34 | Generic UI words. |
| `home` | 39 | Home page, including long SEO copy. |
| `games` | 13 | Game names and descriptions. |
| `newGame` | 50 | Setup form. |
| `session` | 29 | Live screen. |
| `roundForm` | 19 | Score form and settlement. |
| `editTurn` | 5 | Edit-turn drawer. |
| `turnList` | 6 | Turn list. |
| `turnKeypad` | 3 | Keypad labels. |
| `summary` | 27 | Summary, including `highlights.*`. |
| `settings` | 36 | Settings page. |
| `progress` | 4 | Progress page. |
| `darts` | 63 | Darts mode. |
| `rules` | 14 | Rules assistant. |
| `legal` | 64 | Consent banner and legal text. |
| `og` | 30 | Open Graph text. |
| `onboarding` | 6 | Onboarding steps. |
| `notFound` | 3 | 404 page. |
| `gamesPage` | 2 | Games list. |
| `dashboard`, `errors`, `guides` | 0 | Empty. |

**Hard-coded strings outside i18n:**

- Progress page: "Rolling Avg (Last 10)", "Best Leg", "games played".
- Toasts: "N sessions".
- Rules-assistant replies: "Here is Rule…" / "Hier is Regel…".
- Aria labels: "Remove player N".
- The bilingual rulebooks live in code, not in the dictionaries.

**Glossary of Dutch UI terms used in the live game:**

| Dutch | English |
|---|---|
| Score toevoegen | add score |
| Volgende | next |
| Klaar | done |
| Beurt toevoegen | add turn |
| Ronde voltooien | finish round (keypad button) |
| Ronde afronden | settle round (dialog confirm) |
| Resterende stenen | remaining tiles |
| Speler is uit | player went out |
| Geblokkeerd | blocked |
| Bonuspunten | bonus points (settlement) |
| Beurtvolgorde | turn order |
| Met de klok mee | clockwise |
| Wie is er aan de beurt? | whose turn? |
| Spel voltooien | finish game |
| Toch voltooien | finish anyway |
| Verder spelen | continue playing |
| Doel bereikt! | goal reached! |
| nog X | X to go |
| Leider | leader |
| Meer | more |
| Scherm aanzetten | keep screen on |
| Notitie toevoegen | add note |
| Wijzigingen opslaan | save changes |

---

## 10. UI/UX patterns worth reusing

- **Mobile-first single column:**
  - every page is `max-w-lg mx-auto`;
  - fixed bottom nav plus a floating action bar stacked above it (`bottom-[calc(64px+env(safe-area-inset-bottom))]`);
  - content padding reserves `96px+72px+safe-area`;
  - `safe-bottom` utility: `padding-bottom:max(1rem, env(safe-area-inset-bottom))`.
- **Full-screen score drawer:**
  - a vaul drawer forced to `h-[100dvh]`, `rounded-none`, with the handle hidden;
  - the header is `sr-only` for accessibility; a coloured `TurnStatusBar` acts as the visible header.
  - It feels like a modal keypad "mode" and keeps the scoreboard context underneath.
- **Turn-by-turn sequential entry** with a "Volgende • name" button and per-player state is fast for round-based tabletop games. Quick-pick chips that submit immediately and a numeric keypad with large hit targets (h-12 to h-14 keys, `rounded-xl`) add to the speed.
- **Player colour as identity:**
  - an initial in a coloured circle is used everywhere (scoreboard, turn chips, summary, share card);
  - the status bar background animates to the active player's colour.
- **Micro-interactions:**
  - `press-scale` (hover `translateY(-1px)`, active `scale(.97)`, 120 ms);
  - `navigator.vibrate(25)` haptics;
  - animated counters (`tS`, 300 ms ease-out cubic);
  - framer slide transitions between players;
  - `animate-in fade-in slide-in-from-bottom-4` on the keypad;
  - a pulsing ▶ on the current player;
  - `glow-primary` (`box-shadow: 0 10px 40px -10px #16cab580`) on primary CTAs.
- **Theme tokens** (shadcn HSL variables, `.dark` class, dark by default):

| Token | Light | Dark |
|---|---|---|
| `--background` | `220 12% 88%` | `220 15% 13%` |
| `--card` | `220 12% 95%` | `220 15% 22%` |
| `--primary` (teal) | `173 80% 40%` | `173 80% 44%` |
| `--accent` (orange) | `24 100% 45%` | `24 100% 55%` |
| `--destructive` | `0 84% 50%` | `0 72% 51%` |
| `--muted` | `220 10% 80%` | `220 14% 28%` |
| `--border` | `220 10% 75%` | `220 12% 35%` |
| `--radius` | `.75rem` | |

  - `.glass-card` is solid, not blurred: `#4f5869` with border `#677183a6` in dark mode, and `#f6f7f8` / `#c1c5cdb3` in light mode.
  - Fonts are Inter for body text and Space Grotesk for `font-display` headings.
  - Typography conventions: `tabular-nums` for all scores, uppercase tracking-wide micro-labels (`text-[11px] font-black uppercase tracking-wider`), and green/red sign colouring with a "+" prefix for positives.
- **Data safety UX:**
  - a leave guard on a dirty setup (history trap plus `beforeunload`);
  - storage-full and corruption toasts;
  - a dismissible "Opslagmededeling" (storage notice: data lives in your browser);
  - export and import.
- **Setup conveniences:**
  - "Gebruik laatste spelers" (use last players);
  - default names;
  - colour swatches;
  - autofocus on the title;
  - a mount skeleton to avoid SSR/localStorage flicker.
- **Summary as a "trophy moment":** podium, highlights, and a share image ready for social media (1200×630).

---

## 11. Analytics, ads and consent (brief) [V]

- **gtag:**
  - It is loaded with Consent Mode v2 defaults set to denied (`ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`, `wait_for_update:1500`).
  - `trackEvent(name, params)` is a no-op unless `window.gtag && window.__analyticsConsented`.
- **Events:**

| Event | Parameters |
|---|---|
| `game_started` | `{game_type, players}` |
| `game_finished` | `{game_type, players, duration_seconds}` (not for Qwirkle) |
| `resume_game` | `{game_type}` |
| `share_score` | `{game_type, method}` |
| `guide_viewed` | `{guide_slug, language}` |
| `guide_cta_clicked` | |

- **Consent:**
  - The primary path is Google Funding Choices (TCF v2 `__tcfapi`), loaded by `GoogleCmpProvider`.
  - `useConsent` polls for `__tcfapi` (50×100 ms):
    - analytics = TCF purpose 1;
    - ads = purposes 1, 3 and 4.
  - Fallback: their own `ConsentBanner` stored in localStorage `consent`. It uses `gtag('consent','update',…)`.
  - Vercel Analytics and Speed Insights are mounted only with analytics consent. "Cookies beheren" (manage cookies) reopens the CMP.
- **AdSense:**
  - three slots: `home`, `summary` and `guide`;
  - `AdSlot` is suppressed on `BLOCKED_ROUTES` (any `/session/` except `/summary`) and on privacy, cookies and contact pages;
  - `AdBoundary` only allows ads on indexable pages with 800 words or more, or on summary pages;
  - "Advertenties verwijderen (binnenkort)" (remove ads, coming soon) is a placeholder.

---

## 12. Quirks, bugs and limitations

| # | Finding | Evidence |
|---|---|---|
| 1 | **Offline cold start most likely fails.** The service worker never caches HTML, and its offline fallback `caches.match("/")` therefore always misses. New sessions (new URLs) cannot load offline. | [I] from `sw.js` |
| 2 | **Undo is unreachable on phones.** The only trigger is a swipe-down on the keypad display, which is `hidden` below 640 px. There is no undo button. The stack is in memory only, holds 20 states, and is lost on reload. | [V] `TurnKeypad`, `ee()` |
| 3 | **Draw/pass turn types cannot be chosen.** `turnTypes` is declared for triominos and the keypad has UI for it ("Stenen" label, −25 pass display, quick picks 1–3 for draw), but the turn-type state `I` is only ever set to `"play"`. Draw penalties must be typed as negative points. | [V] `P` component |
| 4 | **"Rotate" order mode is dead code.** Nothing writes `orderMode:"rotate"`. The "current player" ring always shows `playerOrder[0]` and never advances during a round. | [V] `tC`, `onUpdateOrder` |
| 5 | **Pick-a-player mode is effectively unreachable.** "Score toevoegen" always starts sequential mode. | [V] `F(!0)` is the only setter |
| 6 | **The all-zero cycle is silently dropped** when more than 1 player is involved and there is no note. A legit "everyone scored 0" round cannot be recorded. | [V] `et()` |
| 7 | **The goal dialog and latch fire even when the goal is disabled.** The settlement path uses `targetScore \|\| 400` without checking `goalEnabled`, which affects generic games with rounds. | [V] `onSubmitSettlement` |
| 8 | **Triominos "out" settlement gives losers 0.** The bundled rulebook (rule 8) says losers get minus points for remaining tiles. | [V] `calculateSettlement` vs. rule chunk 8 |
| 9 | The **settlement dialog copy is triominos-specific** ("Resterende stenen", remaining tiles) even for generic games. | [V] |
| 10 | **The delete-round dialog is dead code.** Its state setter `O` is only ever called with `null`. Rounds cannot be deleted and turns cannot be removed. Editing a turn group writes explicit 0-turns for absent players. | [V] |
| 11 | **Notes are stored but never shown.** | [V] |
| 12 | **Finish URLs lack the lang prefix.** `/{gameId}/session/{id}/summary` gets a 308 to `/nl/...` even for English users (cookie ignored). The UI language then comes from localStorage while the URL says `/nl`. "New game with same players" does the same. | [V] curl and code |
| 13 | **"New game with same players" drops `rules` and `dartsConfig`.** Triominos rules revert to `undefined`, which disables the +25 bonus. | [V] `q` in `SummaryContent` |
| 14 | **Qwirkle finish does not fire `game_finished`.** | [V] `ei()` |
| 15 | **Summary game-name fallback is "Triominos"** for unknown ids (darts is handled separately). The home list maps unknown or legacy ids to triominos as well. | [V] |
| 16 | **Home shows only the 10 most recently updated sessions.** There is no history page. Deleting has no confirmation or undo. | [V] |
| 17 | **Every save rewrites all sessions** (one JSON blob). Writes are O(total history) per turn, and the risk of hitting the localStorage quota grows over time. | [V] `d()` |
| 18 | **Import overwrites `updatedAt` to now** and reorders sessions. The export omits player stats and settings. "Clear all" leaves `scorelog_player_stats`. | [V] |
| 19 | **Darts `bestLeg` starts as `Infinity`**, which `JSON.stringify` writes as `null`. Comparisons then fail and the progress page can show "null darts". | [V] `updatePlayerStatsFromSession` + JSON semantics [I on display] |
| 20 | **Two storage-error toasters** (`eS` and `StorageWatcher`) may both fire. | [I] |
| 21 | **The live session page does not subscribe to store changes.** Two tabs on the same session will overwrite each other (last write wins). | [I] |
| 22 | **The wake lock is not persisted** and is only offered on mobile user agents. | [V] |
| 23 | **Minor issues:** the pencil button's aria-label says "Bewerk notitie" (edit note); hard-coded English in the progress page and toasts; the "AI" badge on a non-AI rules engine; `schemaVersion` is never read. | [V] |
| 24 | **The summary does not mark a session finished.** A user who navigates there directly still sees "Live" on home. | [V] |

---

## 13. Reuse blueprint for a new game (Kwatro)

> Kwatro's exact scoring rules still need to be defined. The decisions below are structural. Replace the placeholders once the rules are known.

### Copy (proven patterns)

1. **The data model shape:**
   - `Session → Round[] → Turn[]`, with per-round `scoresByPlayerId` for end-of-round adjustments;
   - `playerOrder` stored per round;
   - turns of one table cycle grouped by a shared `ts`;
   - `endedByPlayerId` on the round;
   - a latched `gameEndTriggeredAt` object;
   - ISO `createdAt`/`updatedAt`;
   - `crypto.randomUUID()` ids.
   - This model handles round-based tabletop games well.
2. **Derived state, never stored:** compute totals (`getSessionTotals`), the winner, highlights and breakdowns from turns on every render. Only raw events and settlement adjustments are stored.
3. **The `safeStorage` wrapper:**
   - try/catch around every access;
   - quota detection (`QuotaExceededError`, `NS_ERROR_DOM_QUOTA_REACHED`, code 22, code 1014);
   - typed window events;
   - one toast listener.
   - Also keep the `{version, data}` envelope.
4. **A `useSyncExternalStore` store** with a `sessions-changed` event plus the cross-tab `storage` event, and stable snapshots.
5. **The live-screen UX:**
   - sticky scoreboard strip with colour avatars and animated totals;
   - goal progress bar;
   - newest-first turn list with round dividers and per-round summaries;
   - a single big "+ Score toevoegen" (add score) CTA plus a "⋯" sheet for rare actions.
6. **The full-screen keypad drawer:**
   - sequential "Volgende • name" (next, name) → "Klaar" (done) flow;
   - player-coloured status bar;
   - quick-pick chips per game;
   - optional +/- toggle;
   - `minScore` validation;
   - hardware keyboard support;
   - haptics;
   - a turn-order editor (▲▼, "start").
7. **The settlement dialog** as a game hook: `calculateSettlement` returns a `scoresByPlayerId` delta.
8. **A wake-lock hook** with `visibilitychange` re-acquire.
9. **The summary:**
   - podium, leaderboard, highlights (biggest turn, most consistent, lead changes) and a collapsible breakdown table;
   - the **SVG → canvas → PNG → `navigator.share({files})`** pipeline with a download fallback;
   - "Nieuw spel met dezelfde spelers" (new game with the same players).
10. **Setup conveniences:**
    - default names;
    - "use last players";
    - colour swatches;
    - a leave guard (history trap plus `beforeunload`).
11. **The i18n approach** is good enough for 2 languages: a dot-path `t()`, `{{var}}` interpolation, NL fallback and `_one`/`_other`. Move every string into the dictionaries.
12. **A hand-written service worker:**
    - CacheFirst for hashed static assets;
    - versioned cache with cleanup on activate;
    - skip `/_vercel`;
    - `redirect:"manual"` for navigations.
13. **The offline rulebook assistant** (optional): chunked rules with keywords, Fuse.js and cited answers. It is a cheap, credible feature for a single game.

### Change

1. **Make offline real.**
   - Precache an app-shell HTML, or serve a cached shell for any navigation. A static export (SPA) with client routing such as `/game/:id` is simplest for a local-first app.
   - Test an airplane-mode cold start and a new game while offline.
2. **One game definition module.** Kwatro is our only game, but keep a single `GameDefinition` that holds everything the original spreads over five places:
   - scoring: `mapInputToTurn`, `calculateSettlement`, `quickPicks`, `minScore`, `maxPlayers`;
   - turn types **with a real selector UI**;
   - setup schema (rules and defaults);
   - end condition: `isGameOver(session)`, rather than a hard-coded 400 or a Qwirkle special case;
   - labels, icon and routes.
   - No `gameId ===` branches in components.
3. **Real undo.** Add a visible undo button (and an optional toast "Ongedaan maken", undo, after each submit). Persist a bounded undo log, or derive undo from the event list.
4. **Turn order.**
   - Make the "current player" pointer actually advance. Derive it from the number of turns in the round, or implement rotation properly.
   - Decide explicitly who starts the next round (winner, next seat, or fixed) according to Kwatro's rules, and make that a config option.
5. **Allow legitimate zero rounds**, and allow deleting a turn or round, with confirmation and undo.
6. **Show notes** in the turn list and the summary, or drop the feature.
7. **Keep URLs internally consistent.** Always generate `/{lang}/...`, or drop language from the path entirely and use a client setting.
8. **Storage scale.**
   - Prefer IndexedDB, with one record per session (for example via `idb-keyval` or Dexie), instead of rewriting one big localStorage blob on each turn.
   - Keep a `schemaVersion` **and a migration table that is actually applied** (`migrate(raw): Session`).
9. **Export/import:**
   - Export `{app, schemaVersion, exportedAt, sessions, settings}`.
   - On import, keep the original `updatedAt`, validate with a schema library (zod), and report merged vs. new counts.
   - "Clear all" should clear every app key.
10. **History:** a full, searchable history list. Delete with confirmation and an undo toast.
11. **The goal latch** must respect `goalEnabled`, live in the game definition, and be shown once per game.
12. **"Same players" restarts** must copy all rule settings.
13. **Multi-tab safety.** Subscribe the live session to store changes, or use a `BroadcastChannel` and last-writer-wins with `updatedAt` checks.

### Avoid

- Dead or half-wired features: `turnTypes` without a selector, `orderMode` rotation, the delete-round dialog, notes that are never shown, and `schemaVersion` that is never read.
- Gesture-only critical actions such as swipe-to-undo, and controls that are hidden on the smallest breakpoint.
- Silently dropping user input (the all-zero cycle).
- Hard-coded fallbacks to another game (the "triominos" default) and magic numbers (400) in components.
- Calling a deterministic feature "AI".
- Marketing "works offline" before an offline cold start has been tested.
- Ads or third-party scripts on the live game screen. ScoreApp itself blocks ads on `/session/`, and we should keep the game screen just as clean.

### Suggested Kwatro mapping (to be filled in once the rules are known)

```ts
const kwatro: GameDefinition = {
  id: "kwatro",
  nameKey: "games.kwatro",
  minPlayers: 2, maxPlayers: /* TBD */ 4,
  roundsEnabled: true,                 // if Kwatro scores per round
  turnTypes: [/* "play", … only those with UI */],
  quickPicks: [/* most common Kwatro scores */],
  minScore: /* TBD or undefined */,
  showSignToggle: /* true if negative scores exist */,
  mapInputToTurn: ({ rawValue, turnType }) => ({ points: /* … */ }),
  supportsSettlement: /* true if end-of-round bonuses/penalties exist */,
  calculateSettlement: (ctx) => ({ /* playerId → delta */ }),
  nextRoundStarter: (session, lastRound) => /* rule-based */,
  isGameOver: (session) => /* target score / round count / tiles exhausted */,
  winner: (totals) => /* highest or lowest wins? tie-break rule */,
  setupFields: [/* target score, variants */],
};
```
