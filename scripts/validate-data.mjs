#!/usr/bin/env node
// Validates data/seasons/index.json and every season file it lists (schema v2: real skill trees from game data).
// Usage: node scripts/validate-data.mjs   (exit code 1 on any error)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = []; const warn = []; const stats = {};
const E = (m) => errors.push(m); const need = (c, m) => { if (!c) E(m); return !!c; }; const W = (c, m) => { if (!c) warn.push(m); };
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const TIERS = ['S','A','B','C','D','F']; const TAGS = ['Pit','Push','Speedfarm','Bossing','Leveling']; const ROTS = [0,90,180,270];
const CELL = /^[.sdiwmRLGSX]+$/; const ATTR_LETTER = { str:'s', dex:'d', int:'i', will:'w' };
const TYPES = ['hub','active','modifier','junction']; const DATE = /^\d{4}-\d{2}-\d{2}$/;

const idx = read('data/seasons/index.json');
need(idx.schemaVersion === 2, 'index.schemaVersion must be 2');
need(idx.levelCap === 70, 'index.levelCap must be 70');
need(idx.maxParagonBoards === 5, 'index.maxParagonBoards must be 5');
need(Array.isArray(idx.classOrder) && idx.classOrder.length === 8, 'index.classOrder needs 8 classes');
const cur = (idx.seasons || []).find((s) => s.id === idx.currentSeasonId);
need(cur, 'currentSeasonId not in seasons[]');

for (const s of idx.seasons || []) {
  const file = s.file.replace(/^\.\//, ''); const d = read(file); const P = s.id + ': ';
  for (const k of ['id','name','patch','launched','ends','levelCap','paragon','mechanics','tierList','classes','sources','gameDataVersion']) need(d[k] !== undefined, P + 'missing ' + k);
  need(d.id === s.id, P + 'id mismatch'); need(d.levelCap === idx.levelCap, P + 'levelCap mismatch');
  need(d.paragon?.boardsEquipped === 5, P + 'paragon.boardsEquipped must be 5');
  Object.entries(d.sources).forEach(([k, v]) => need(v.label && DATE.test(v.date) && /^https:\/\//.test(v.url), P + 'season source ' + k + ' needs label/date/url'));
  const M = d.mechanics || {};
  need(M.primeEvilPaths?.length === 3 && ['diablo','mephisto','baal'].every((i) => M.primeEvilPaths.some((p) => p.id === i && p.iconicPower?.name && p.bonuses?.length)), P + 'Splinters of Evil must be Diablo/Mephisto/Baal with iconic power');
  const splIds = new Set((M.soulSplinters?.list || []).map((x) => x.id));
  need(M.soulSplinters?.maxEquipped === 3 && splIds.size === 8, P + 'soulSplinters: maxEquipped 3 + 8 splinters');
  (M.soulSplinters?.list || []).forEach((x) => need(x.name && x.effect && x.blessing, P + 'splinter ' + x.id + ' needs name + effect'));
  for (const a of ['waking-nightmares','war-plans','horadric-post','talismans','legacy-runewords']) need(M.activities?.some((x) => x.id === a), P + 'missing activity ' + a);
  need(JSON.stringify(d.tierList?.rows) === JSON.stringify(TIERS), P + 'tierList.rows must be S..F');
  need(['endgame','leveling','pushing'].every((a) => d.tierList?.activities?.some((x) => x.id === a)), P + 'tierList activities endgame/leveling/pushing');
  const classIds = d.classes.map((c) => c.id);
  need(JSON.stringify(classIds) === JSON.stringify(idx.classOrder), P + 'classes must match index.classOrder');
  const buildIds = new Set(); let nBuild = 0, nPar = 0, nCells = 0, nNodes = 0;
  for (const c of d.classes) {
    const C = P + c.id + ': ';
    for (const k of ['name','accent','accent2','resource','mechanic','crest','skillTree','paragon','builds','sources']) need(c[k], C + 'missing ' + k);
    need(/^#[0-9A-Fa-f]{6}$/.test(c.accent || ''), C + 'accent must be #RRGGBB');
    // skill tree (real layout from game data)
    const T = c.skillTree; const byId = {}; (T.nodes || []).forEach((n) => { if (byId[n.id]) E(C + 'duplicate node ' + n.id); byId[n.id] = n; });
    nNodes += T.nodes.length;
    const roles = T.clusters.map((k) => k.role);
    need(roles[0] === 'basic' && roles[1] === 'core' && roles.includes('ultimate'), C + 'clusters must start Basic → Core and include Ultimate');
    const cl = Object.fromEntries(T.clusters.map((k) => [k.id, k]));
    T.nodes.forEach((n) => { need(cl[n.cluster], C + 'node ' + n.id + ' bad cluster'); need(TYPES.includes(n.type), C + 'node ' + n.id + ' bad type ' + n.type);
      need(typeof n.x === 'number' && typeof n.y === 'number', C + 'node ' + n.id + ' needs x/y');
      if (n.type === 'modifier') need(byId[n.parent]?.type === 'active', C + 'upgrade ' + n.id + ' needs an active parent');
      if (n.type === 'active' && !n.offTree) { need(n.maxRank === 15, C + 'active ' + n.id + ' needs 15 ranks'); W(n.desc, C + 'active ' + n.id + ' has no description in game data'); } });
    need(T.nodes.filter((n) => n.type === 'active' && !n.offTree).length >= 20, C + 'too few active skills');
    T.edges.forEach(([a, b]) => need(byId[a] && byId[b] && !byId[a].offTree && !byId[b].offTree, C + 'edge ' + a + '→' + b + ' bad'));
    // boards
    const B = c.paragon.boards; const boardById = Object.fromEntries(B.map((b) => [b.id, b]));
    need(B.length === 10 && B[0].kind === 'starter', C + 'need Starter + 9 class boards');
    const glyphById = Object.fromEntries(c.paragon.glyphs.map((g) => [g.id, g]));
    need(c.paragon.glyphs.length >= 5, C + 'need ≥5 glyphs');
    for (const b of B) {
      const Bp = C + 'board ' + b.id + ': ';
      need(b.rows.length === 21 && b.rows.every((r) => r.length === 21 && CELL.test(r)), Bp + 'rows must be 21×21 valid cells');
      const at = (x, y) => b.rows[y]?.[x];
      need(at(...b.socket) === 'G', Bp + 'socket must be G'); need(at(...b.start) === (b.kind === 'starter' ? 'S' : 'X'), Bp + 'start cell');
      if (b.kind === 'class') need(b.legendary && at(...b.legendary.at) === 'L' && b.legendary.effect, Bp + 'legendary node');
      need(b.rares.every((r) => at(...r.at) === 'R' && r.stats.length && r.bonus?.text), Bp + 'rares');
      nCells += b.rows.join('').replace(/\./g, '').length;
    }
    // builds
    const lev = c.builds.filter((b) => b.phase === 'leveling'), end = c.builds.filter((b) => b.phase === 'endgame');
    need(lev.length >= 1, C + 'need ≥1 leveling build'); need(end.length >= 2, C + 'need ≥2 endgame builds');
    for (const b of c.builds) {
      nBuild++; const Q = C + b.id + ': ';
      if (buildIds.has(b.id)) E(Q + 'duplicate build id'); buildIds.add(b.id);
      for (const k of ['name','tier','tags','playstyle','uniques','mythics','soulSplinters','skillBar','mainSkill','rotation','gear','skills','sources']) need(b[k] !== undefined, Q + 'missing ' + k);
      need(TIERS.includes(b.tier), Q + 'bad tier'); need(b.tags.length && b.tags.every((t) => TAGS.includes(t)), Q + 'bad tags');
      Object.values(b.tiers).forEach((t) => need(TIERS.includes(t), Q + 'bad activity tier'));
      need(b.primeEvil === null || ['diablo','mephisto','baal'].includes(b.primeEvil), Q + 'bad primeEvil');
      need(b.soulSplinters.length <= 3 && b.soulSplinters.every((x) => splIds.has(x)), Q + 'soul splinters must be ≤3 known ids');
      need(b.sources.length >= 2 && b.sources.every((x) => x.site && x.what && /^https:\/\//.test(x.url) && DATE.test(x.checked) && DATE.test(x.updated)), Q + 'sources need site/what/url/updated/checked');
      need(b.skillBar.length === 6 && b.skillBar.every((id) => byId[id]?.type === 'active'), Q + 'skillBar must be 6 active skills');
      need(b.skillBar.includes(b.mainSkill), Q + 'mainSkill not on bar');
      if (b.keyUpgrade) need(byId[b.keyUpgrade]?.type === 'modifier' && byId[b.keyUpgrade].parent === b.mainSkill, Q + 'keyUpgrade must be an upgrade of the main skill');
      need(b.gear.aspects && b.gear.tempering?.length, Q + 'gear aspects/tempering');
      // spend order replay
      const so = b.skills.spendOrder; need(so.length >= 60 && so.length <= 95, Q + `spendOrder length ${so.length} out of range`);
      need(['guide-steps','derived'].includes(b.skills.orderSource), Q + 'orderSource');
      const al = {};
      so.forEach((id, i) => { const n = byId[id]; if (!need(n && n.type !== 'hub' && n.type !== 'junction', Q + 'spend #' + (i + 1) + ' bad ' + id)) return;
        if (n.parent) W(al[n.parent] > 0, Q + `point ${i + 1} ${id} before its skill (guide step order)`);
        al[id] = (al[id] || 0) + 1; need(al[id] <= n.maxRank, Q + id + ' over max rank'); });
      need(JSON.stringify(Object.entries(al).sort()) === JSON.stringify(Object.entries(b.skills.allocation).sort()), Q + 'allocation ≠ replayed spendOrder');
      W(b.skillBar.every((id) => al[id] > 0 || byId[id].offTree), Q + 'skill on bar has no points: ' + b.skillBar.filter((id) => !al[id] && !byId[id].offTree));
      const groups = {}; T.nodes.forEach((n) => { if (n.choiceGroup && al[n.id]) groups[n.choiceGroup] = (groups[n.choiceGroup] || 0) + 1; });
      need(Object.values(groups).every((v) => v === 1), Q + 'two upgrades from one row chosen');
      if (b.phase === 'leveling') {
        const g = b.guide; need(g?.['1-15']?.spendOrder?.length === 14 && g['1-15'].tip && g['1-15'].unlocks?.length, Q + '1-15 guide incomplete');
        need(g?.['15-70']?.breakpoint && g['15-70'].aspects?.length && g['15-70'].tempering?.length && g['15-70'].t1Checklist?.length, Q + '15-70 guide incomplete');
        need(JSON.stringify(g['1-15'].spendOrder) === JSON.stringify(so.slice(0, 14)), Q + '1-15 spend order ≠ first 14 points');
      } else {
        nPar++; const pg = b.paragon; if (!need(pg?.boards?.length >= 1 && pg.boards.length <= 5, Q + 'paragon needs 1–5 boards')) continue;
        need(pg.boards[0].boardId === B[0].id, Q + 'board 1 must be Starter');
        need(new Set(pg.boards.map((x) => x.boardId)).size === pg.boards.length, Q + 'boards must be distinct');
        let tot = 0;
        pg.boards.forEach((pb, i) => {
          const bd = boardById[pb.boardId]; const R = Q + 'board ' + (i + 1) + ': ';
          if (!need(bd, R + 'unknown board')) return; need(ROTS.includes(pb.rotation), R + 'bad rotation');
          const seen = new Set(); const at = (x, y) => bd.rows[y]?.[x];
          pb.alloc.forEach(([x, y], k) => { const key = x + ',' + y;
            need(at(x, y) && at(x, y) !== '.', R + 'alloc on empty cell ' + key); need(!seen.has(key), R + 'duplicate ' + key);
            if (k === 0 && i === 0) need(x === bd.start[0] && y === bd.start[1], R + 'starter path must begin at the start node');
            else if (k) W([[1,0],[-1,0],[0,1],[0,-1]].some(([a, c2]) => seen.has((x + a) + ',' + (y + c2))), R + 'node not adjacent to earlier path ' + key);
            seen.add(key); });
          if (pb.glyph) need(glyphById[pb.glyph.id], R + 'unknown glyph ' + pb.glyph.id);
          if (pb.glyph) need(seen.has(bd.socket.join(',')), R + 'glyph socket not allocated');
          const isGate = (xy) => Object.values(bd.gates).some((g) => g[0] === xy[0] && g[1] === xy[1]);
          need(pb.points === pb.alloc.length - (i === 0 || isGate(pb.alloc[0]) ? 1 : 0), R + 'points ≠ alloc'); tot += pb.points; });
        need(tot === pg.totalPoints, Q + 'totalPoints mismatch');
        const [lo, hi] = d.paragon.pointsRange; need(tot <= hi, Q + `paragon total ${tot} above ${hi}`); W(tot >= lo, Q + `paragon total ${tot} below ${lo}`);
      }
    }
  }
  d.tierList.entries.forEach((e) => { need(buildIds.has(e.buildId), P + 'tier entry unknown build ' + e.buildId); need(TIERS.includes(e.tier), P + 'tier entry bad tier'); });
  for (const t of TIERS) stats[s.id + ' tier ' + t] = d.tierList.entries.filter((e) => e.tier === t).length;
  Object.assign(stats, { [s.id + ' classes']: d.classes.length, [s.id + ' skill-tree nodes']: nNodes, [s.id + ' builds']: nBuild, [s.id + ' paragon builds']: nPar, [s.id + ' board cells']: nCells, [s.id + ' tier entries']: d.tierList.entries.length });
}
console.log(JSON.stringify(stats, null, 1));
if (warn.length) console.log(`Warnings (${warn.length}):\n` + warn.slice(0, 40).join('\n'));
if (errors.length) { console.error(`✗ ${errors.length} error(s):\n` + errors.slice(0, 60).join('\n')); process.exit(1); }
console.log('✓ Data valid');
