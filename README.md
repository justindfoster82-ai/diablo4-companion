# Hellforge · Diablo IV Companion (unofficial)

A zero-build, mobile-first PWA for Diablo IV **Season 15 — Season of Hell's Legacy** (Patch 3.2.4, Lord of Hatred).
Hell-themed dark-fantasy UI with ember canvas, swipeable class slider, leveling (1–15 / 15–70) and endgame builds,
dual-mode skill trees, 5-board 21×21 paragon grids, an S–F tier list and a Season tab.

Plain HTML + CSS + ES modules + static JSON. **No build step**: whatever is in this folder is what GitHub Pages serves.

## Layout
```
index.html               app shell (iOS PWA meta, manifest, icons)
manifest.webmanifest     standalone PWA, theme #08070B
sw.js                    network-first for data/seasons/*.json, stale-while-revalidate for the shell
.nojekyll                serve files as-is on GitHub Pages
assets/icons/            icon.svg, icon-192.png, icon-512.png, apple-touch-icon.png (original art)
styles/                  theme.css · layout.css · animations.css
src/app.js               boot, routing, class switching, swipe
src/state.js             persisted UI state + data registry
src/embers.js            hellfire ember canvas
src/crests.js            procedural SVG class crests
src/components/          classSlider.js (scrub/swipe pill) · panZoom.js (drag/pinch/wheel)
src/views/               builds · skillTree · paragon · tierList · season
data/seasons/index.json  manifest: currentSeasonId, schemaVersion, levelCap, maxParagonBoards, classOrder, update notes
data/seasons/s15.json    full Season 15 dataset
scripts/validate-data.mjs schema + integrity validator
```
All paths are relative (`./`), so it runs at `/` locally and at `/diablo4-companion/` on GitHub Pages.

## Run locally
```bash
python3 -m http.server 8080      # then open http://localhost:8080
node scripts/validate-data.mjs   # validate data
```

## GitHub Pages
1. Push this folder's contents to the root of `justindfoster82-ai/diablo4-companion` (branch `main`).
2. Repo → Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
3. Open `https://justindfoster82-ai.github.io/diablo4-companion/` on iPhone Safari → Share → **Add to Home Screen**.

## Seasonal update workflow
1. Copy `data/seasons/s15.json` → `data/seasons/s16.json` and edit (season facts, mechanics, builds, tiers).
   New classes (e.g. Amazon in 2027) are just another entry in `classes[]` + `index.json → classOrder`.
2. In `data/seasons/index.json` add the season to `seasons[]`, set `currentSeasonId: "s16"`, add an `updateNotes` line.
3. `node scripts/validate-data.mjs` — must print `✓ Data valid` (exit code 0). Good as a CI check on pull requests.
4. Commit + push. The service worker fetches season JSON network-first, so installed apps pick it up on next open.
   If you change app code (JS/CSS), bump `VERSION` in `sw.js` so every device refreshes its shell cache.

### Data model (per class)
- `skillTree`: `clusters` (Basic → Core → class clusters → Ultimate → Key Passive, each with a point `gate`),
  `nodes` (active / passive / modifier / key, `maxRank`, map `x/y`), `edges`.
- `paragon.boards`: Starter + 9 class boards. `rows` is a 21×21 string grid:
  `.` empty · `s d i w` normal +5 Str/Dex/Int/Will · `m` magic · `R` rare · `L` legendary · `G` glyph socket · `X` gate · `S` start.
  Magic stat = `magicStats[(x*7 + y*3) % magicStats.length]`.
- `paragon.glyphs`: attribute, radius, threshold.
- `builds[]`: `phase` (leveling | endgame), `tier`, `tiers{endgame,pushing,leveling}`, tags, playstyle, uniques/mythics,
  `primeEvil`, 3 `soulSplinters`, 6-slot `skillBar`, `keyPassive`, rotation, gear, `skills.spendOrder` (70 points) +
  `skills.allocation`; leveling builds carry `guide['1-15']` / `guide['15-70']`; endgame builds carry `paragon.boards[5]`
  (board, rotation 0/90/180/270, glyph, ordered allocation path in board-local coords).
- `tierList.entries`: build × activity (endgame / leveling / pushing) × tier S–F with sources.

## Data accuracy
Season facts, class list, build names and tier placements come from the Nov 2026 research snapshot
(Mobalytics Oct 13, Maxroll Sep 26, Icy Veins Sep 14). Per-build skill ranks, spend orders, paragon paths, glyph picks,
item and aspect lists are **representative layouts** generated for this app; Warlock, Paladin and Spiritborn skill/board names are
especially provisional. Verify against a live planner before min-maxing, and replace with sourced data as you go.

Unofficial fan project — not affiliated with or endorsed by Blizzard Entertainment. No game artwork is used.
