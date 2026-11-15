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

### Data model (schemaVersion 2, per class)
- `skillTree`: the real Lord of Hatred tree from game data. `clusters` (Basic → Core → class clusters → Ultimate, with unlock `level`),
  `nodes` (`active` with 15 ranks / `modifier` upgrades with `parent` + `choiceGroup` (one per row) / `junction` path dots / `hub`),
  real map `x/y`, `edges`. Off-tree mechanic skills on a bar (e.g. Warlock demon Commands) have `offTree: true`.
  There are no passives or key passives in the current tree.
- `paragon.boards`: Starter + 9 class boards. `rows` is a 21×21 string grid:
  `.` empty · `s d i w` normal +5 Str/Dex/Int/Will · `m` magic (`magic["x,y"]` label) · `R` rare · `L` legendary · `G` glyph socket · `X` gate · `S` start.
- `paragon.glyphs`: real class glyphs with attribute, bonus text.
- `builds[]`: `phase`, `tier`, `tiers{endgame,pushing,leveling}`, tags, `sources[]` (site, what, url, updated, checked), playstyle,
  uniques/mythics, `primeEvil` (null = guide does not specify), up to 3 `soulSplinters`, 6-slot `skillBar`, `mainSkill`, `keyUpgrade`,
  rotation, gear (aspects + tempering), `skills.allocation` + `skills.spendOrder` (`orderSource`: `guide-steps` or `derived`);
  leveling builds carry `guide['1-15']` / `guide['15-70']`; endgame builds carry `paragon.boards[≤5]` (board, rotation, glyph, allocated nodes).
- `tierList.entries`: build × activity (endgame / leveling / pushing) × tier S–F with source site.

## Data accuracy
Rebuilt Nov 15, 2026. Skill trees, upgrades, paragon boards, glyphs, items and aspects come from Maxroll's public Diablo IV game data
(v3.2.1). Builds (skill bar, skill points, gear, paragon) come from Maxroll build-guide planners; tiers from the Mobalytics endgame /
pushing / leveling tier lists and the Maxroll tier lists (each build lists its sources with dates). Leveling spend orders follow
the guide's own steps; endgame guides publish final allocations only, so their point order is derived. Paragon path lines show a
connected order of the guide's allocated nodes, not the guide's click order.

Unofficial fan project — not affiliated with or endorsed by Blizzard Entertainment. No game artwork is used.
