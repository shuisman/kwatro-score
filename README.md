# Kwatro Score

A free, offline-first score app for the card game **Kwatro**. It is unofficial and not affiliated with the designer or publishers.

**Live:** https://shuisman.github.io/kwatro-score/

- Tap in each turn's total. The app tracks whose turn it is (clockwise, the top of the list starts), the standings and the history.
- No account and no server: all data stays in the browser (IndexedDB). It works offline as an installable PWA.
- Dutch and English. Home, Kwatro (rules) and About are prerendered static HTML.

## Development

```bash
npm install
npm run dev        # http://localhost:5173/kwatro-score/
npm test           # unit tests (engine, db, router)
npm run build      # client build + SSR prerender + service worker → dist/
npm run e2e        # Playwright against the production build (run build first)
npm run preview    # serve dist/ like GitHub Pages (404.html fallback)
```

## Structure

| Path | What |
|---|---|
| `src/engine/` | Pure game logic: totals, turn order, rounds, ranking (shared places), highlights |
| `src/db/` | Dexie (IndexedDB): `games`, `turns` (append-only event log), `names`; export/import |
| `src/pages/` | Home, Play list, New game, Game screen, Summary, Rules/About wrappers |
| `content/<lang>/*.mdx` | Long-form text (Kwatro rules, About/FAQ). Markdown plus `<CardRow>`, `<Calc>`, `<Faq>`, `<Toc>`, `<AppTools>` |
| `src/router.tsx` | Small router with localised slugs (`/nl/spelen/…`, `/en/play/…`) |
| `scripts/prerender.mjs` | Renders static routes, writes `404.html` (SPA fallback), sitemap, robots and `sw.js` |
| `docs/` | Research and decisions (`decisions.md` is the source of truth for scope) |

Content edits only need changes in `content/`. UI strings live in `src/i18n/nl.ts` and `en.ts`.

## Analytics

GoatCounter (cookie-free) is disabled until `GOATCOUNTER_CODE` is set in `src/config.ts`.

## Deploy

Pushing to `main` runs typecheck, unit tests, build and end-to-end tests, then deploys `dist/` to GitHub Pages. In the repo settings, set **Pages → Source: GitHub Actions**.
