#!/usr/bin/env node
// Validates data/seasons/index.json and every season file it lists.
// Usage: node scripts/validate-data.mjs   (exit code 1 on any error)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = []; const warn = []; const stats = {};
const E = (m) => errors.push(m); const need = (c, m) => { if (!c) E(m); return !!c; };
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const TIERS = ['S','A','B','C','D','F']; const TAGS = ['Pit','Push','Speedfarm','Bossing','Leveling']; const ROTS = [0,90,180,270];
const CELL = /^[.sdiwmRLGSX]+$/; const ATTR_LETTER = { str:'s', dex:'d', int:'i', will:'w' };

const idx = read('data/seasons/index.json');
need(idx.schemaVersion === 1, 'index.schemaVersion must be 1');
need(idx.levelCap === 70, 'index.levelCap must be 70');
need(idx.maxParagonBoards === 5, 'index.maxParagonBoards must be 5');
need(Array.isArray(idx.classOrder) && idx.classOrder.length >= 8, 'index.classOrder needs ≥8 classes');
const cur = (idx.seasons || []).find((s) => s.id === idx.currentSeasonId);
need(cur, 'currentSeasonId not in seasons[]');

for (const s of idx.seasons || []) {
  const file = s.file.replace(/^\.\//, ''); const d = read(file); const P = s.id + ': ';
  for (const k of ['id','name','patch','launched','ends','levelCap','paragon','mechanics','tierList','classes','sources']) need(d[k] !== undefined, P + 'missing ' + k);
  need(d.id === s.id, P + 'id mismatch'); need(d.levelCap === idx.levelCap, P + 'levelCap mismatch');
  need(d.paragon?.boardsEquipped === 5, P + 'paragon.boardsEquipped must be 5');
  const M = d.mechanics || {};
  need(M.primeEvilPaths?.length === 3 && ['diablo','mephisto','baal'].every((i) => M.primeEvilPaths.some((p) => p.id === i && p.iconicPower?.name && p.bonuses?.length)), P + 'primeEvilPaths must be Diablo/Mephisto/Baal with iconic power + bonuses');
  const splIds = new Set((M.soulSplinters?.list || []).map((x) => x.id));
  need(M.soulSplinters?.maxEquipped === 3 && splIds.size >= 3, P + 'soulSplinters: maxEquipped 3 + list');
  (M.soulSplinters?.list || []).forEach((x) => need(x.blessing && x.burden, P + 'splinter ' + x.id + ' needs blessing + burden'));
  for (const a of ['waking-nightmares','war-plans','horadric-post','talismans','legacy-runewords']) need(M.activities?.some((x) => x.id === a), P + 'missing activity ' + a);
  need(JSON.stringify(d.tierList?.rows) === JSON.stringify(TIERS), P + 'tierList.rows must be S..F');
  need(['endgame','leveling','pushing'].every((a) => d.tierList?.activities?.some((x) => x.id === a)), P + 'tierList activities endgame/leveling/pushing');
  const classIds = d.classes.map((c) => c.id);
  need(JSON.stringify(classIds) === JSON.stringify(idx.classOrder), P + 'classes must match index.classOrder');
  need(classIds.length >= 8, P + 'need ≥8 classes');
  const buildIds = new Set(); let nBuild = 0, nPar = 0, nCells = 0;
  for (const c of d.classes) {
    const C = P + c.id + ': ';
    for (const k of ['name','accent','accent2','resource','mechanic','crest','skillTree','paragon','builds']) need(c[k], C + 'missing ' + k);
    need(/^#[0-9A-Fa-f]{6}$/.test(c.accent || ''), C + 'accent must be #RRGGBB');
    // skill tree
    const T = c.skillTree; const byId = {}; (T.nodes || []).forEach((n) => { if (byId[n.id]) E(C + 'duplicate node ' + n.id); byId[n.id] = n; });
    const roles = T.clusters.map((k) => k.role);
    need(roles[0] === 'basic' && roles[1] === 'core' && roles.includes('ultimate') && roles.at(-1) === 'key', C + 'clusters must run Basic → Core → … → Ultimate → Key Passive');
    const cl = Object.fromEntries(T.clusters.map((k) => [k.id, k]));
    T.nodes.forEach((n) => { need(cl[n.cluster], C + 'node ' + n.id + ' bad cluster'); need(typeof n.x === 'number' && typeof n.y === 'number', C + 'node ' + n.id + ' needs x/y'); if (n.parent) need(byId[n.parent], C + 'node ' + n.id + ' bad parent'); });
    T.edges.forEach(([a, b]) => need(byId[a] && byId[b], C + 'edge ' + a + '→' + b + ' bad'));
    need(T.nodes.some((n) => n.type === 'key'), C + 'no key passives');
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
      need(b.rares.length >= 2 && b.rares.every((r) => at(...r.at) === 'R' && r.stats.length && r.bonus?.text), Bp + 'rares');
      nCells += b.rows.join('').replace(/\./g, '').length;
    }
    // builds
    const lev = c.builds.filter((b) => b.phase === 'leveling'), end = c.builds.filter((b) => b.phase === 'endgame');
    need(lev.length >= 1, C + 'need ≥1 leveling build'); need(end.length >= 2, C + 'need ≥2 endgame builds');
    for (const b of c.builds) {
      nBuild++; const Q = C + b.id + ': ';
      if (buildIds.has(b.id)) E(Q + 'duplicate build id'); buildIds.add(b.id);
      for (const k of ['name','tier','tags','playstyle','uniques','mythics','primeEvil','soulSplinters','skillBar','rotation','gear','skills']) need(b[k] !== undefined, Q + 'missing ' + k);
      need(TIERS.includes(b.tier), Q + 'bad tier'); need(b.tags.length && b.tags.every((t) => TAGS.includes(t)), Q + 'bad tags');
      Object.values(b.tiers).forEach((t) => need(TIERS.includes(t), Q + 'bad activity tier'));
      need(['diablo','mephisto','baal'].includes(b.primeEvil), Q + 'bad primeEvil');
      need(b.soulSplinters.length === 3 && b.soulSplinters.every((x) => splIds.has(x)), Q + 'needs 3 valid soul splinters');
      need(b.skillBar.length === 6 && b.skillBar.every((id) => byId[id]?.type === 'active'), Q + 'skillBar must be 6 active skills');
      need(byId[b.keyPassive]?.type === 'key', Q + 'keyPassive invalid');
      need(b.gear.aspects?.length && b.gear.tempering?.length, Q + 'gear aspects/tempering');
      // spend order replay
      const so = b.skills.spendOrder; need(so.length === 70, Q + 'spendOrder must have 70 points');
      const al = {}; let spent = 0;
      so.forEach((id, i) => { const n = byId[id]; if (!need(n, Q + 'spend #' + (i + 1) + ' unknown ' + id)) return;
        need(cl[n.cluster].gate <= spent, Q + `point ${i + 1} ${id} spent before cluster gate ${cl[n.cluster].gate}`);
        if (n.parent) need(al[n.parent] > 0, Q + `point ${i + 1} ${id} before parent`);
        al[id] = (al[id] || 0) + 1; need(al[id] <= n.maxRank, Q + id + ' over max rank'); spent++; });
      need(JSON.stringify(Object.entries(al).sort()) === JSON.stringify(Object.entries(b.skills.allocation).sort()), Q + 'allocation ≠ replayed spendOrder');
      need(b.skillBar.every((id) => al[id] > 0) && al[b.keyPassive] === 1, Q + 'skill bar / key passive not allocated');
      need(T.nodes.filter((n) => n.type === 'key' && al[n.id]).length === 1, Q + 'exactly one key passive');
      const groups = {}; T.nodes.forEach((n) => { if (n.choiceGroup && al[n.id]) groups[n.choiceGroup] = (groups[n.choiceGroup] || 0) + 1; });
      need(Object.values(groups).every((v) => v === 1), Q + 'two variants of one skill chosen');
      if (b.phase === 'leveling') {
        const g = b.guide; need(g?.['1-15']?.spendOrder?.length === 14 && g['1-15'].tip && g['1-15'].unlocks?.length, Q + '1-15 guide incomplete');
        need(g?.['15-70']?.breakpoint && g['15-70'].aspects?.length && g['15-70'].tempering?.length && g['15-70'].t1Checklist?.length, Q + '15-70 guide incomplete');
        need(JSON.stringify(g['1-15'].spendOrder) === JSON.stringify(so.slice(0, 14)), Q + '1-15 spend order ≠ first 14 points');
      } else {
        nPar++; const pg = b.paragon; if (!need(pg?.boards?.length === 5, Q + 'paragon needs 5 boards')) continue;
        need(pg.boards[0].boardId === B[0].id, Q + 'board 1 must be Starter');
        need(new Set(pg.boards.map((x) => x.boardId)).size === 5, Q + 'boards must be distinct');
        need(new Set(pg.boards.map((x) => x.glyph.id)).size === 5, Q + 'glyphs must be distinct');
        let tot = 0;
        pg.boards.forEach((pb, i) => {
          const bd = boardById[pb.boardId]; const R = Q + 'board ' + (i + 1) + ': ';
          if (!need(bd, R + 'unknown board')) return; need(ROTS.includes(pb.rotation), R + 'bad rotation');
          const gl = glyphById[pb.glyph.id]; need(gl, R + 'unknown glyph');
          const seen = new Set(); const at = (x, y) => bd.rows[y]?.[x];
          pb.alloc.forEach(([x, y], k) => { const key = x + ',' + y;
            need(at(x, y) && at(x, y) !== '.', R + 'alloc on empty cell ' + key); need(!seen.has(key), R + 'duplicate ' + key);
            if (k === 0) need(x === bd.start[0] && y === bd.start[1], R + 'path must begin at start/entry gate');
            else need([[1,0],[-1,0],[0,1],[0,-1]].some(([a, c2]) => seen.has((x + a) + ',' + (y + c2))), R + 'disconnected node ' + key);
            seen.add(key); });
          need(seen.has(bd.socket.join(',')), R + 'glyph socket not reached');
          if (bd.legendary) need(seen.has(bd.legendary.at.join(',')), R + 'legendary not allocated');
          if (i < 4) need(seen.has(bd.gates.top.join(',')), R + 'exit gate not reached');
          const L = ATTR_LETTER[gl?.attr]; const got = pb.alloc.filter(([x, y]) => Math.abs(x - bd.socket[0]) + Math.abs(y - bd.socket[1]) <= gl.radius && at(x, y) === L).length * 5;
          need(got === pb.glyph.achieved, R + `glyph achieved ${pb.glyph.achieved} ≠ recomputed ${got}`);
          need(got >= gl.threshold, R + `glyph ${gl.name} ${got}/${gl.threshold} ${gl.attr} below threshold`);
          need(pb.points === pb.alloc.length - 1, R + 'points ≠ alloc'); tot += pb.points; });
        need(tot === pg.totalPoints, Q + 'totalPoints mismatch');
        const [lo, hi] = d.paragon.pointsRange; need(tot >= lo && tot <= hi, Q + `paragon total ${tot} outside ${lo}–${hi}`);
      }
    }
  }
  d.tierList.entries.forEach((e) => { need(buildIds.has(e.buildId), P + 'tier entry unknown build ' + e.buildId); need(TIERS.includes(e.tier), P + 'tier entry bad tier'); });
  for (const t of TIERS) stats[s.id + ' tier ' + t] = d.tierList.entries.filter((e) => e.tier === t).length;
  Object.assign(stats, { [s.id + ' classes']: d.classes.length, [s.id + ' builds']: nBuild, [s.id + ' paragon builds']: nPar, [s.id + ' board cells']: nCells, [s.id + ' tier entries']: d.tierList.entries.length });
}
console.log(JSON.stringify(stats, null, 1));
if (warn.length) console.log('Warnings:\n' + warn.join('\n'));
if (errors.length) { console.error(`✗ ${errors.length} error(s):\n` + errors.slice(0, 60).join('\n')); process.exit(1); }
console.log('✓ Data valid');
