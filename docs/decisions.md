# Product & tech decisions (v1)

Decided on 2026-10-05. Background research: [scoreapp-overview.md](scoreapp-overview.md), [kwatro-game-overview.md](kwatro-game-overview.md), [tech-setup.md](tech-setup.md).

## Vision (grilling round 1)
| Topic | Decision |
|---|---|
| Why | **Convenience:** no paper or pen, history kept, clear standings. It focuses on one game. Later it can be extended with more for that game, starting with the rules page and later more helpers. It is also partly a personal and learning project. |
| Who holds the phone | **One scorekeeper** enters every turn. Turns always go clockwise, so the app doesn't need to help decide whose turn it is. The order of players in the app must match the seating order, and the screen must always show clearly **who is playing now** and **who is next**. |
| Success | **User adoption**: real people using it for their games. |
| Name/brand | A name with Kwatro in it (e.g. "Kwatro Score") plus a disclaimer ("unofficial, not affiliated with the publisher"). Nothing from the publisher is copied: rules in our own words, card drawings as our own SVG. |
| IOTA | **Not targeted.** Kwatro only. |
| Builder | Claude builds; the user reviews and steers. |

## Grilling round 2 (overrides earlier entries below where they conflict)
| Topic | Decision |
|---|---|
| Turn entry | The scorekeeper types the **turn total**. The interface has a large, clear number pad. **No multiplier buttons and no helper calculator in v1** (possible later as helpers). |
| Languages | **NL + EN** in v1. |
| Seating | **Seating order is what counts.** In the setup, players are added by name and can be reordered by **drag and drop**. Once the game has started, the order can't change. |
| Analytics | **GoatCounter**: cookie-free, so no banner. The v1 event is **"game started"**. |
| Hosting | **GitHub Pages** (public repo) for now. |
| Adoption features in v1 | (a) Install hint ("add to home screen"), (b) a shareable results image with a link to the app, (c) "Play again" with the same players. Player stats are **not** in v1. |

## Grilling round 3
| Topic | Decision |
|---|---|
| Name / domain | Working name "Kwatro Score". **No purchases for now:** hosted at `<username>.github.io/kwatro-score/`, so Vite `base` and the PWA `scope`/`start_url` are `/kwatro-score/`. Project folder and repo are renamed to **`kwatro-score`**. (kwatroscore.nl/.com/.app were free on 2026-10-05, if a domain is wanted later.) |
| Starting player | **The top of the list starts.** One concept: drag a player to the top to make them start. |
| Game screen | **Keep it minimal:** current player (large), next player, number pad, **Pass** button, **End game** button. No standings or score table on the main screen. A **"peek" button** opens the score table with running totals up to now. |
| Pass | A separate **Pass** button records the turn as a pass worth 0. |
| End of game | An **End game** button (with confirmation), then the summary. Ties share the win. |
| Players | **2–8 players.** This goes beyond the official 2–4, by choice. Names from earlier games are suggested. |

## Grilling round 4
| Topic | Decision |
|---|---|
| Corrections | **None.** A submitted turn is final: no undo and no editing. (This overrides the earlier "undo on phones" item.) |
| Play again | Opens the **setup pre-filled** with the same players and order. You can reorder, then tap Start. |
| Summary | **Top 3** plus **a few highlights**, with the buttons Share (results image) and Play again. |
| Current game | **Only one game in progress at a time.** |
| Backup & settings | **Export/import (JSON)** in v1, on the About page, along with the theme and language settings. No separate Settings section. |
| Look | Theme follows the device, with a manual switch. **8 fixed player colours**, assigned in list order and distinguishable for colour-blind players. |

## Grilling round 5
| Topic | Decision |
|---|---|
| New game while one is in progress | Allowed after confirmation. The current game is saved as **"stopped"**: no winner, scores still visible in the list. |
| Preventing typos | The confirm button shows **name + number** ("Anna +52"). An extra confirmation for **unusually high scores (> 200)**. Pass has no confirmation. |
| Highlights | **Highest turn** (who, how many points), **game duration**, **number of rounds**. |
| Ranking | **Top 3 as a podium**, with the remaining players in a compact list underneath. Ties share a place (1, 1, 3). |
| Finished games | Kept indefinitely; deletable after confirmation. |
| Build order | **The whole site in one go**: Home, Play, Kwatro and About together. |

## Grilling round 6
| Topic | Decision |
|---|---|
| Default language | Detected from the browser language: NL for nl/nl-BE browsers, EN otherwise. The choice is remembered, and the switch is in the header. |
| Kwatro page | **Complete:** components, setup, turn, all scoring rules including the doublings, 2–3 worked examples with our own card SVGs, end of game, and an FAQ of common mistakes. All in our own words. |
| Share image | Podium (top 3), highlights, date, plus a **referral link back to the app**. The link appears in the image and in the share text, with `?ref=share` so GoatCounter can measure it. |
| Install hint | Shown **after the first finished game**: a real install button on Android, short instructions on iOS. Shown once, and always available on the About page. |
| GoatCounter | The user creates the account before launch and provides the site code. |

## Product
| Topic | Decision |
|---|---|
| Audience | Public and free. No ads or monetisation, so no consent banner. |
| Scope | Kwatro only. Every stored game carries a `gameType` so more games can be added later. |
| Devices | One scoring device in v1. The data model is ready for sync (event log, UUIDv7 ids, a clock that doesn't depend on the device). A live viewer is a v2 candidate. |
| Turn entry | Both ways. Typing the turn total is the quick default. An optional helper takes the line sums and ×2 toggles (one per kwatro completed, all 4 cards played, last card) and calculates the total. |
| Languages | NL first, plus EN. |
| Distribution | Web app that installs to the home screen and works offline. No app stores in v1. |
| Hosting | Cloudflare Pages and a new domain (none exists yet). |

## Site structure
Four main sections. Each one exists in Dutch and English.

**Navigation placement:**
- **Desktop/tablet (≥ 768 px):** a menu bar at the top with the logo, the four sections and a language toggle.
- **Mobile (< 768 px):** a fixed bottom tab bar with four icons and labels, within thumb reach. It respects the iPhone safe area (`env(safe-area-inset-bottom)`). Only a slim header with the logo and language toggle stays at the top.
- One shared navigation component handles both layouts, switched by a CSS breakpoint rather than by detecting the device type.

| Section | NL route | EN route | Content |
|---|---|---|---|
| **Home** | `/nl/` | `/en/` | Short pitch and a prominent "Start een spel" / "Start a game" button that goes straight to a new game in Play. Below it, a "continue" card for any game in progress. |
| **Play** | `/nl/spelen` | `/en/play` | The app itself (see below). |
| **Kwatro** | `/nl/kwatro` | `/en/kwatro` | What the game is, its components, how a turn works, scoring with worked examples, end of game. Source: [kwatro-game-overview.md](kwatro-game-overview.md). |
| **About** | `/nl/over` | `/en/about` | What the project is, privacy (all data stays on the device), and an FAQ: installing, offline use, export/import, data loss on iOS. |

Home, Kwatro and About are content pages, pre-rendered to static HTML so search engines can index them. Play is client-only.

### Play: screens inside the app
| Screen | Path | Purpose |
|---|---|---|
| Games list | `/play` | Games in progress and finished games: continue, view or delete (with confirmation), plus a "new game" button. |
| New game | `/play/new` | Add 2–4 players (names reused from earlier games), set the turn order and who starts, then start. |
| Game | `/play/game/:id` | The score sheet. Current player's turn with keypad and optional helper, score table, undo and editing turns, and "end game". |
| Summary | `/play/game/:id/summary` | Final ranking (ties share the win), highlights, share image. |

The exact form of the in-app paths depends on the host. GitHub Pages can't redirect every URL to the app, so there the in-app screens may need hash URLs (`#/game/:id`).

## Game rules
| Topic | Decision |
|---|---|
| "All 4 cards played" ×2 | Applies only when the player played all 4 cards in hand. |
| Last card ×2 | When the draw pile is empty, a player can hold fewer than 4 cards. If they play their last cards, the game ends and that turn is doubled. This stacks with the other doublings, so playing all 4 when the pile is empty gives ×2 ×2. |
| Game end | Ends immediately when a player plays their last card while the draw pile is empty. No equalising round. |
| Ties | Equal top scores share the win. |
| Rounds | The game has no rounds. A "round" is only a display grouping in the score table. |

## Tech
The user had no framework preference, so the recommendation from [tech-setup.md](tech-setup.md) stands: **Vite + React 19 + TypeScript**, Tailwind 4 + shadcn/ui, and Dexie (IndexedDB) holding an append-only event log. vite-plugin-pwa caches the HTML too, so the app also works when started offline. Tests use Vitest for the scoring engine and Playwright for end-to-end flows.

## Learned from scoreapp: do better
- Undo is available on phones too, and a turn can be undone or edited from the score table.
- The whole app works when it's started offline, not just pages already loaded.
- Deleting a game asks for confirmation. History isn't capped at 10 games.
- Export/import covers all data and has a version number.
- Turn order with an actual "current player" pointer that advances after each turn.
