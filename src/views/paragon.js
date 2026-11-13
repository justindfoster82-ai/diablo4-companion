import { esc, ATTR, ATTR_SHORT, ATTR_LETTER } from '../state.js';
import { panZoom } from '../components/panZoom.js';
import { buildPills } from './skillTree.js';
const CS = 20, PAD = 10, SIZE = 21 * CS + PAD * 2, MID = SIZE / 2;
const SIDES = ['bottom', 'left', 'top', 'right'];
const cx = (x) => PAD + x * CS + CS / 2;
const fixVars = (h) => h.replace(/(fill|stroke)="var\((--[\w-]+)\)"/g, 'style="$1:var($2)"');
const rotPt = (px, py, deg) => { const a = deg * Math.PI / 180, dx = px - MID, dy = py - MID; return [MID + dx * Math.cos(a) - dy * Math.sin(a), MID + dx * Math.sin(a) + dy * Math.cos(a)]; };
export function nodeInfo(bd, x, y) {
  const ch = bd.rows[y]?.[x];
  if (!ch || ch === '.') return null;
  if (ATTR_LETTER[ch]) return { type: 'Normal', stat: `+5 ${ATTR[ATTR_LETTER[ch]]}`, attr: ATTR_LETTER[ch] };
  if (ch === 'm') return { type: 'Magic', stat: bd.magicStats[(x * 7 + y * 3) % bd.magicStats.length] };
  if (ch === 'R') { const r = bd.rares.find((q) => q.at[0] === x && q.at[1] === y); return { type: 'Rare', name: r.name, stat: r.stats.join(' · '), bonus: `Bonus: ${r.bonus.text} (requires ${r.bonus.requires.amount} ${ATTR[r.bonus.requires.attr]})` }; }
  if (ch === 'L') return { type: 'Legendary', name: bd.legendary.name, stat: bd.legendary.effect };
  if (ch === 'G') return { type: 'Glyph Socket', stat: 'Socket a Glyph. Its radius counts attribute points from allocated nodes.' };
  if (ch === 'X') return { type: 'Board Gate', stat: 'Attach the next board here.' };
  if (ch === 'S') return { type: 'Start', stat: 'Starting node of the Paragon path.' };
}
export function glyphCheck(gl, pb) { return `${pb.glyph.achieved}/${gl.threshold} ${ATTR_SHORT[gl.attr]} ${pb.glyph.achieved >= gl.threshold ? '✓' : '✗'}`; }

export function render(el, ctx) {
  const { c, state, setState } = ctx;
  const ends = c.builds.filter((b) => b.phase === 'endgame');
  const sel = ends.find((b) => b.id === state.paragonSel[c.id]) || ends[0];
  const P = sel.paragon; const bi = Math.min(4, state.boardIdx || 0); const mode = state.paragonMode;
  const bname = (pb) => c.boardById[pb.boardId].name;
  el.innerHTML = `
   <div class="view-title reveal"><h2 class="serif">Paragon</h2><span class="chip gold">${P.totalPoints} pts · 5 boards</span></div>
   ${buildPills(c, ends, sel.id, 'data-b')}
   <div class="seg reveal" role="group" aria-label="View mode"><button data-m="grid" aria-pressed="${mode === 'grid'}">Board Grid</button><button data-m="summary" aria-pressed="${mode === 'summary'}">Path Summary</button></div>
   <div class="chain reveal" data-noswipe>${P.boards.map((pb, i) => { const bd = c.boardById[pb.boardId]; const gl = c.glyphById[pb.glyph.id];
     return `<button class="bcard" data-bi="${i}" aria-pressed="${mode === 'grid' && i === bi}"><span class="bn">Board ${i + 1}${i ? '' : ' · Starter'}</span><h3>${esc(bd.name)}</h3>
      <div class="row"><span>Rotation</span><b>${pb.rotation}°</b></div><div class="row"><span>Legendary</span><b>${bd.legendary ? esc(bd.legendary.name) : '—'}</b></div>
      <div class="row"><span>Glyph</span><b>${esc(gl.name)}</b></div><div class="row"><span>Spent</span><b style="color:var(--gold-hi)">${pb.points} pts</b></div></button>`; }).join('<span style="align-self:center;color:var(--gold)">›</span>')}</div>
   <div id="pBody"></div>`;
  el.querySelectorAll('[data-b]').forEach((b) => b.onclick = () => { setState({ paragonSel: { ...state.paragonSel, [c.id]: b.dataset.b }, boardIdx: 0 }, { silent: true }); ctx.rerender('enter'); });
  el.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { setState({ paragonMode: b.dataset.m }, { silent: true }); ctx.rerender('enter'); });
  el.querySelectorAll('[data-bi]').forEach((b) => b.onclick = () => { setState({ boardIdx: +b.dataset.bi, paragonMode: 'grid' }, { silent: true }); ctx.rerender('enter'); });
  const body = el.querySelector('#pBody');

  if (mode === 'summary') {
    body.innerHTML = P.boards.map((pb, i) => { const bd = c.boardById[pb.boardId]; const gl = c.glyphById[pb.glyph.id]; const ok = pb.glyph.achieved >= gl.threshold;
      const rares = bd.rares.filter((r) => pb.alloc.some(([x, y]) => x === r.at[0] && y === r.at[1]));
      return `<section class="card reveal"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div><div class="section-lbl" style="margin:0">Board ${i + 1} · attach order ${pb.attachOrder}</div><h3 class="serif" style="font-size:16px">${esc(bd.name)}</h3></div><span class="chip gold">${pb.points} pts</span></div>
       <dl class="kv" style="margin-top:10px"><dt>Rotation</dt><dd>${pb.rotation}° ${i ? '· attached via previous board\'s top gate' : '· starting board'}</dd>
       <dt>Glyph</dt><dd><b>${esc(gl.name)}</b> (radius ${gl.radius}) · <span class="glyphcheck ${ok ? 'ok' : 'no'}">${glyphCheck(gl, pb)}</span></dd>
       <dt>Legendary</dt><dd>${bd.legendary ? `<b style="color:var(--accent2)">${esc(bd.legendary.name)}</b> — ${esc(bd.legendary.effect)}` : '—'}</dd>
       <dt>Key rares</dt><dd>${rares.map((r) => `<b>${esc(r.name)}</b> <span class="muted">(${esc(r.bonus.text)})</span>`).join('<br>') || '—'}</dd></dl>
       <p class="muted" style="font-size:12px;margin-bottom:0">${esc(gl.bonus)}</p></section>`; }).join('') + `<p class="footer-note">Paths are representative layouts for planning — verify node-by-node in a live planner.</p>`;
    return;
  }

  const pb = P.boards[bi]; const bd = c.boardById[pb.boardId]; const gl = c.glyphById[pb.glyph.id];
  const on = new Set(pb.alloc.map(([x, y]) => x + ',' + y));
  const inR = (x, y) => Math.abs(x - bd.socket[0]) + Math.abs(y - bd.socket[1]) <= gl.radius;
  let cells = '';
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    const ch = bd.rows[y][x]; if (ch === '.') continue; const a = on.has(x + ',' + y); const X = PAD + x * CS, Y = PAD + y * CS; let s;
    if (ATTR_LETTER[ch]) s = `<rect x="${X + 3}" y="${Y + 3}" width="14" height="14" rx="3" fill="${a ? 'var(--accent)' : '#2a2330'}" stroke="${a ? '#F4D58A' : '#3b3242'}" stroke-width="${a ? 1.2 : .8}" opacity="${a ? 1 : .85}"/>`;
    else if (ch === 'm') s = `<rect x="${X + 3}" y="${Y + 3}" width="14" height="14" rx="3" fill="${a ? '#5AA0FF' : '#1f3150'}" stroke="${a ? '#cfe4ff' : '#2f4a78'}" stroke-width="1"/>`;
    else if (ch === 'R') s = `<rect x="${X + 1.5}" y="${Y + 1.5}" width="17" height="17" rx="4" fill="${a ? '#FFD45A' : '#5b4718'}" stroke="#E9C46A" stroke-width="1.5" ${a ? 'filter="url(#pglow)"' : ''}/>`;
    else if (ch === 'L') s = `<circle cx="${X + 10}" cy="${Y + 10}" r="13" fill="${a ? '#FF6A3A' : '#4a1c12'}" stroke="#FFD18A" stroke-width="2" ${a ? 'filter="url(#pglow)" class="glow-pulse"' : ''}/><circle cx="${X + 10}" cy="${Y + 10}" r="5" fill="#FFE3B0"/>`;
    else if (ch === 'G') s = `<circle cx="${X + 10}" cy="${Y + 10}" r="9.5" fill="#1a0f26" stroke="#B57CFF" stroke-width="3" ${a ? 'filter="url(#pglow)"' : ''}/><circle cx="${X + 10}" cy="${Y + 10}" r="4" fill="#E0C6FF" class="glow-pulse"/>`;
    else if (ch === 'X') s = `<rect x="${X + 2}" y="${Y + 2}" width="16" height="16" fill="#0b0a0d" stroke="#C89B3C" stroke-width="2" transform="rotate(45 ${X + 10} ${Y + 10})"/>`;
    else s = `<rect x="${X + 2}" y="${Y + 2}" width="16" height="16" fill="#E9C46A" stroke="#fff" stroke-width="1.5" transform="rotate(45 ${X + 10} ${Y + 10})"/>`;
    cells += `<g data-c="${x},${y}">${s}${inR(x, y) && ATTR_LETTER[ch] === gl.attr ? `<circle cx="${X + 10}" cy="${Y + 10}" r="2" fill="#E0C6FF" opacity=".9"/>` : ''}</g>`;
  }
  const seen = []; let lines = '';
  pb.alloc.forEach(([x, y], i) => { if (i) { const p = seen.find(([a, b]) => Math.abs(a - x) + Math.abs(b - y) === 1); if (p) lines += `M${cx(p[0])} ${cx(p[1])}L${cx(x)} ${cx(y)}`; } seen.push([x, y]); });
  const [gx, gy] = [cx(bd.socket[0]), cx(bd.socket[1])], rr = (gl.radius + 0.5) * CS;
  const entrySide = SIDES[(pb.rotation / 90) % 4];
  body.innerHTML = fixVars(`<div class="mapwrap reveal" data-noswipe style="height:min(58vh,520px)"><svg id="pg" viewBox="0 0 ${SIZE} ${SIZE}" preserveAspectRatio="xMidYMid meet"><g id="pgz"><g transform="rotate(${pb.rotation} ${MID} ${MID})">
     <defs><filter id="pglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
     <rect x="2" y="2" width="${SIZE - 4}" height="${SIZE - 4}" rx="14" fill="rgba(10,8,12,.6)" stroke="#C89B3C" stroke-opacity=".35"/>
     <polygon points="${gx},${gy - rr} ${gx + rr},${gy} ${gx},${gy + rr} ${gx - rr},${gy}" fill="#B57CFF" fill-opacity=".09" stroke="#B57CFF" stroke-opacity=".7" stroke-dasharray="4 4" stroke-width="1.5"/>
     <path d="${lines}" stroke="var(--accent)" stroke-width="7" opacity=".3" fill="none" stroke-linecap="round" filter="url(#pglow)"/>
     ${cells}
     <path class="rune-path" d="${lines}" stroke="#FFE3B0" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".9" pointer-events="none"/>
     </g></g></svg>
     <div class="rotbadge"><svg viewBox="0 0 24 24" style="transform:rotate(${pb.rotation}deg)"><circle cx="12" cy="12" r="10" fill="none" stroke="#C89B3C" stroke-width="1.5"/><path d="M12 5 L16 13 H8 Z" fill="var(--accent2)"/></svg><span>Rotation ${pb.rotation}° · entry ${entrySide}</span></div>
     <div class="mapctl" style="top:auto;bottom:10px"><button class="icon-btn" data-z="in" aria-label="Zoom in">+</button><button class="icon-btn" data-z="out" aria-label="Zoom out">−</button></div></div>
   <div class="actions reveal" style="margin:10px 0 12px"><button class="btn primary" data-z="glyph">◎ Zoom to Glyph</button><button class="btn" data-z="reset">Reset View</button></div>
   <section class="card reveal inspect" id="pInspect"><div class="section-lbl">Node inspector</div><p class="muted" style="margin:0;font-size:13px">Tap any node on the board.</p></section>
   <section class="card hot reveal"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><div class="section-lbl" style="margin:0">Glyph · radius ${gl.radius}</div><h3 class="serif" style="font-size:16px">${esc(gl.name)}</h3></div><span class="glyphcheck ${pb.glyph.achieved >= gl.threshold ? 'ok' : 'no'}" style="font-size:18px">${glyphCheck(gl, pb)}</span></div>
     <p style="font-size:13px">${esc(gl.effect)}</p><p class="muted" style="font-size:12.5px;margin:0">${esc(gl.bonus)}</p></section>
   ${bd.legendary ? `<section class="card reveal"><div class="section-lbl">Legendary node</div><h3 class="serif" style="color:var(--accent2)">${esc(bd.legendary.name)}</h3><p style="font-size:13.5px;margin-bottom:0">${esc(bd.legendary.effect)}</p></section>` : ''}
   <section class="card reveal"><div class="section-lbl">Legend</div><div class="legend-grid" style="font-size:12px">
     <span><i class="sw" style="background:var(--accent)"></i>Normal (taken)</span><span><i class="sw" style="background:#2a2330;border:1px solid #3b3242"></i>Normal</span><span><i class="sw" style="background:#5AA0FF"></i>Magic</span><span><i class="sw" style="background:#FFD45A"></i>Rare</span><span><i class="sw" style="background:#FF6A3A;border-radius:50%"></i>Legendary</span><span><i class="sw" style="border:2px solid #B57CFF;border-radius:50%"></i>Glyph socket</span><span><i class="sw" style="border:2px solid #C89B3C;transform:rotate(45deg)"></i>Gate</span><span><i class="sw" style="background:#E0C6FF;border-radius:50%;width:5px;height:5px"></i>Counts for glyph</span></div></section>`);
  const svg = body.querySelector('#pg'), g = body.querySelector('#pgz');
  const pz = panZoom(svg, g, { min: 0.8, max: 5, fit: () => [0, 0, 1] });
  const insp = body.querySelector('#pInspect');
  g.querySelectorAll('[data-c]').forEach((n) => n.addEventListener('click', () => { if (pz.wasDrag()) return; const [x, y] = n.dataset.c.split(',').map(Number); const info = nodeInfo(bd, x, y); if (!info) return;
    const taken = on.has(x + ',' + y); const counts = info.attr === gl.attr && inR(x, y);
    insp.innerHTML = `<div class="section-lbl">Node inspector · (${x}, ${y})</div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b class="serif" style="color:var(--gold-hi)">${esc(info.name || info.type)}</b><span class="badge">${info.type}</span>${taken ? '<span class="chip accent">Allocated</span>' : '<span class="chip">Not taken</span>'}${counts ? '<span class="chip" style="border-color:#B57CFF;color:#E0C6FF">In glyph radius</span>' : ''}</div><p style="font-size:13.5px;margin-bottom:0">${esc(info.stat)}</p>${info.bonus ? `<p class="muted" style="font-size:12.5px;margin:4px 0 0">${esc(info.bonus)}</p>` : ''}`;
    g.querySelectorAll('.sel').forEach((s) => s.remove()); n.insertAdjacentHTML('beforeend', `<rect class="sel" x="${PAD + x * CS}" y="${PAD + y * CS}" width="${CS}" height="${CS}" rx="4" fill="none" stroke="#fff" stroke-width="1.5"/>`); }));
  body.querySelectorAll('[data-z]').forEach((b) => b.onclick = () => { const z = b.dataset.z; if (z === 'in') pz.zoomBy(1.35); else if (z === 'out') pz.zoomBy(1 / 1.35); else if (z === 'reset') pz.reset(); else { const [px, py] = rotPt(gx, gy, pb.rotation); pz.focus(px, py, 2.4); } });
  return () => pz.destroy();
}
