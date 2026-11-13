import { esc } from '../state.js';
import { panZoom } from '../components/panZoom.js';
import { tierBadge } from './builds.js';
const TYPE_LABEL = { active: 'Active', passive: 'Passive', modifier: 'Upgrade', key: 'Key Passive', hub: 'Cluster' };
export function buildPills(c, list, sel, attr) {
  return `<div class="pills reveal" data-noswipe role="group" aria-label="Build">${list.map((b) => `<button class="pill" ${attr}="${b.id}" aria-pressed="${b.id === sel}"><span class="ph">${b.phase === 'leveling' ? 'Lvl' : 'End'}</span>${esc(b.name)} ${tierBadge(b.tier, true)}</button>`).join('')}</div>`;
}
const replay = (order, n) => { const a = {}; for (let i = 0; i < n; i++) a[order[i]] = (a[order[i]] || 0) + 1; return a; };
const fixVars = (h) => h.replace(/(fill|stroke|stop-color)="var\((--[\w-]+)\)"/g, 'style="$1:var($2)"');
const lvlOf = (p) => (p <= 69 ? p + 1 : 70);

export function render(el, ctx) {
  const { c, state, setState } = ctx; const T = c.skillTree;
  const sel = c.builds.find((b) => b.id === state.treeSel[c.id]) || c.builds.find((b) => b.phase === 'endgame') || c.builds[0];
  const order = sel.skills.spendOrder; const final = sel.skills.allocation; let step = Math.min(70, Math.max(1, state.step || 70));
  const mode = state.skillMode;
  el.innerHTML = `
   <div class="view-title reveal"><h2 class="serif">Skill Tree</h2><span class="chip gold">70 pts · ${esc(c.nodeById[sel.keyPassive].name)}</span></div>
   ${buildPills(c, c.builds, sel.id, 'data-b')}
   <div class="seg reveal" role="group" aria-label="View mode"><button data-m="spine" aria-pressed="${mode === 'spine'}">Cluster Spine</button><button data-m="map" aria-pressed="${mode === 'map'}">Full Tree Map</button></div>
   <div id="stBody"></div>`;
  el.querySelectorAll('[data-b]').forEach((b) => b.onclick = () => { setState({ treeSel: { ...state.treeSel, [c.id]: b.dataset.b }, step: 70 }, { silent: true }); ctx.rerender('enter'); });
  el.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { setState({ skillMode: b.dataset.m }, { silent: true }); ctx.rerender('enter'); });
  const body = el.querySelector('#stBody');
  const inspect = (id) => {
    const n = c.nodeById[id]; const k = T.clusters.find((q) => q.id === n.cluster);
    const pts = order.map((x, i) => (x === id ? i + 1 : 0)).filter(Boolean);
    ctx.drawer(`<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><span class="badge ${n.type}">${TYPE_LABEL[n.type]}</span><span class="muted" style="font-size:12px">${esc(k.name)} · unlocks at ${k.gate} pts</span></div>
     <h2 class="serif" style="color:var(--text);font-size:18px">${esc(n.name)}</h2>
     ${n.type !== 'hub' ? `<p>Rank <b style="color:var(--gold-hi)">${final[id] || 0}/${n.maxRank}</b> in <b>${esc(sel.name)}</b>${pts.length ? ` · spent on point${pts.length > 1 ? 's' : ''} ${pts.map((p) => `#${p} (Lv ${lvlOf(p)})`).join(', ')}` : ' · not taken'}</p>` : `<p>${T.nodes.filter((z) => z.cluster === n.cluster && final[z.id]).length} nodes taken in this cluster.</p>`}
     ${n.desc ? `<p class="muted">${esc(n.desc)}</p>` : ''}${n.parent ? `<p class="note">Requires ${esc(c.nodeById[n.parent].name)}</p>` : ''}`);
  };

  if (mode === 'spine') {
    const roots = (k) => T.nodes.filter((n) => n.cluster === k.id && n.type !== 'hub' && n.type !== 'modifier');
    body.innerHTML = `
    <section class="card hot reveal stepper" data-noswipe><div class="section-lbl">Spend order · point by point</div>
      <div class="now"><div class="pt" id="stPt"></div><div><div id="stName" style="font-weight:700"></div><div class="muted" id="stMeta" style="font-size:12px"></div></div></div>
      <div class="ctl"><button class="icon-btn" id="stPrev" aria-label="Previous point">‹</button><input type="range" id="stRange" min="1" max="70" value="${step}" aria-label="Spend order step"><button class="icon-btn" id="stNext" aria-label="Next point">›</button><button class="icon-btn" id="stPlay" aria-label="Play">▶</button></div></section>
    <label class="check reveal" style="border:0;padding:0 2px 10px"><input type="checkbox" id="showAll" ${state.showAllNodes ? 'checked' : ''}><span class="muted" style="font-size:12.5px">Show unspent nodes</span></label>
    ${T.clusters.map((k) => {
      const spentIn = T.nodes.filter((n) => n.cluster === k.id).reduce((s, n) => s + (final[n.id] || 0), 0);
      return `<details class="card cluster reveal" ${spentIn ? 'open' : ''}><summary><div><h3 class="serif">${esc(k.name)}</h3><small class="muted">Unlocks at ${k.gate} pts</small></div><span class="chip ${spentIn ? 'accent' : ''}">${spentIn} pts</span></summary>
      <div class="nodes">${roots(k).map((n) => row(n) + T.nodes.filter((m) => m.type === 'modifier' && (m.parent === n.id || c.nodeById[m.parent]?.parent === n.id)).map((m) => row(m, true)).join('')).join('')}</div></details>`; }).join('')}`;
    function row(n, mod) { const taken = final[n.id] > 0; return `<button class="nrow ${mod ? 'mod' : ''} ${taken ? '' : 'dim'}" data-n="${n.id}" ${!taken && !state.showAllNodes ? 'hidden' : ''} style="text-align:left"><span>${esc(n.name)}</span><span class="badge ${n.type}">${TYPE_LABEL[n.type]}</span><span class="rk" data-rk="${n.id}"></span></button>`; }
    const rng = body.querySelector('#stRange');
    const update = () => {
      const now = replay(order, step); const id = order[step - 1]; const n = c.nodeById[id];
      body.querySelector('#stPt').textContent = step; body.querySelector('#stName').textContent = n.name;
      body.querySelector('#stMeta').textContent = `Lv ${lvlOf(step)}${step === 70 ? ' (Renown)' : ''} · ${TYPE_LABEL[n.type]} → rank ${now[id]}/${n.maxRank} · ${c.skillTree.clusters.find((k) => k.id === n.cluster).name}`;
      body.querySelectorAll('[data-rk]').forEach((r) => { const nid = r.dataset.rk; const m = c.nodeById[nid]; r.textContent = `${now[nid] || 0}/${m.maxRank}`; });
      body.querySelectorAll('.nrow').forEach((r) => r.classList.toggle('cur', r.dataset.n === id));
      rng.value = step; setState({ step }, { silent: true });
    };
    rng.oninput = () => { step = +rng.value; update(); };
    body.querySelector('#stPrev').onclick = () => { step = Math.max(1, step - 1); update(); };
    body.querySelector('#stNext').onclick = () => { step = Math.min(70, step + 1); update(); };
    let timer = null; const play = body.querySelector('#stPlay');
    play.onclick = () => { if (timer) { clearInterval(timer); timer = null; play.textContent = '▶'; return; } if (step >= 70) step = 0; play.textContent = '❚❚'; timer = setInterval(() => { step++; update(); if (step >= 70) { clearInterval(timer); timer = null; play.textContent = '▶'; } }, 260); };
    body.querySelector('#showAll').onchange = (e) => { setState({ showAllNodes: e.target.checked }, { silent: true }); ctx.rerender(); };
    body.querySelectorAll('[data-n]').forEach((r) => r.onclick = () => inspect(r.dataset.n));
    update();
    return () => clearInterval(timer);
  }

  // Full map
  body.innerHTML = `<div class="mapwrap reveal" data-noswipe><svg id="tree" preserveAspectRatio="xMidYMin meet"><g id="tg"></g></svg>
    <div class="mapctl"><button class="icon-btn" data-z="in" aria-label="Zoom in">+</button><button class="icon-btn" data-z="out" aria-label="Zoom out">−</button><button class="icon-btn" data-z="reset" aria-label="Reset" style="font-size:11px">Reset</button></div>
    <div class="maplegend"><span class="chip"><i class="sw" style="background:var(--accent)"></i>Active</span><span class="chip"><i class="sw" style="background:#8a7f9a"></i>Passive</span><span class="chip"><i class="sw" style="background:var(--gold-hi)"></i>Key</span><span class="chip"><i class="sw" style="background:#5a4f60"></i>Upgrade</span></div></div>
   <p class="muted reveal" style="font-size:12px;text-align:center">Drag to pan · pinch or scroll to zoom · tap any node</p>`;
  const svg = body.querySelector('#tree'), g = body.querySelector('#tg'); const wrap = body.querySelector('.mapwrap');
  const r = wrap.getBoundingClientRect(); const vh = Math.round(T.width * (r.height / Math.max(1, r.width)));
  svg.setAttribute('viewBox', `0 0 ${T.width} ${vh}`);
  const pos = Object.fromEntries(T.nodes.map((n) => [n.id, n]));
  const clusterTaken = (cid) => T.nodes.some((n) => n.cluster === cid && final[n.id]);
  const isOn = (id) => { const n = pos[id]; return n.type === 'hub' ? clusterTaken(n.cluster) : final[id] > 0; };
  const edges = T.edges.map(([a, b]) => { const A = pos[a], B = pos[b]; const on = isOn(a) && isOn(b); const mid = (A.y + B.y) / 2;
    const d = A.type === 'hub' && B.type === 'hub' ? `M${A.x} ${A.y} L${B.x} ${B.y}` : `M${A.x} ${A.y} C${A.x} ${mid} ${B.x} ${mid} ${B.x} ${B.y}`;
    return on ? `<path d="${d}" stroke="var(--accent)" stroke-width="10" opacity=".25" fill="none" filter="url(#glow)"/><path class="rune-path" d="${d}" stroke="var(--accent2)" stroke-width="3.5" fill="none"/>` : `<path d="${d}" stroke="#3a3140" stroke-width="2" fill="none"/>`; }).join('');
  const label = (n, dy) => { const w = n.name.split(' '); const lines = n.name.length > 14 && w.length > 1 ? [w.slice(0, Math.ceil(w.length / 2)).join(' '), w.slice(Math.ceil(w.length / 2)).join(' ')] : [n.name];
    return `<text x="${n.x}" y="${n.y + dy}" text-anchor="middle" font-size="19" fill="${isOn(n.id) ? '#F3E6CF' : '#7d7280'}" font-weight="${isOn(n.id) ? 700 : 400}">${lines.map((l, i) => `<tspan x="${n.x}" dy="${i ? 21 : 0}">${esc(l)}</tspan>`).join('')}</text>`; };
  const nodes = T.nodes.map((n) => { const on = isOn(n.id); const rank = final[n.id] || 0; let shape = '';
    if (n.type === 'hub') shape = `<rect x="${n.x - 26}" y="${n.y - 26}" width="52" height="52" transform="rotate(45 ${n.x} ${n.y})" fill="${on ? 'url(#hubG)' : '#1b161f'}" stroke="#C89B3C" stroke-width="3"/><text x="${n.x}" y="${n.y - 44}" text-anchor="middle" font-size="24" font-family="Georgia,serif" font-weight="700" letter-spacing="3" fill="#E9C46A">${esc(n.name.toUpperCase())}</text>`;
    else if (n.type === 'active') shape = `<circle cx="${n.x}" cy="${n.y}" r="30" fill="${on ? 'var(--accent)' : '#221c26'}" stroke="${on ? '#F4D58A' : '#4a4050'}" stroke-width="3" ${on ? 'filter="url(#glow)"' : ''}/>${on ? `<text x="${n.x}" y="${n.y + 7}" text-anchor="middle" font-size="20" font-weight="800" fill="#1a0d06">${rank}/${n.maxRank}</text>` : ''}` + label(n, 52);
    else if (n.type === 'modifier') shape = `<circle cx="${n.x}" cy="${n.y}" r="13" fill="${on ? 'var(--accent2)' : '#2a2330'}" stroke="${on ? '#fff3' : '#4a4050'}" stroke-width="2"/>`;
    else if (n.type === 'passive') shape = `<rect x="${n.x - 17}" y="${n.y - 17}" width="34" height="34" rx="8" fill="${on ? '#8a7f9a' : '#221c26'}" stroke="${on ? '#E9C46A' : '#4a4050'}" stroke-width="2.5"/>${on ? `<text x="${n.x}" y="${n.y + 6}" text-anchor="middle" font-size="16" font-weight="800" fill="#120c08">${rank}</text>` : ''}` + label(n, 40);
    else shape = `<polygon points="${[0, 1, 2, 3, 4, 5].map((i) => `${n.x + 28 * Math.cos(Math.PI / 3 * i + Math.PI / 6)},${n.y + 28 * Math.sin(Math.PI / 3 * i + Math.PI / 6)}`).join(' ')}" fill="${on ? '#E9C46A' : '#221c26'}" stroke="${on ? '#fff' : '#6b5a30'}" stroke-width="3" ${on ? 'filter="url(#glow)" class="glow-pulse"' : ''}/>` + label(n, 50);
    return `<g class="tn" data-n="${n.id}" style="cursor:pointer">${shape}<circle cx="${n.x}" cy="${n.y}" r="34" fill="transparent"/></g>`; }).join('');
  g.innerHTML = fixVars(`<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="hubG"><stop offset="0" stop-color="#FFD18A"/><stop offset="1" stop-color="var(--accent)"/></radialGradient></defs>${edges}${nodes}`);
  const pz = panZoom(svg, g, { min: 0.35, max: 3.5, fit: () => [0, 0, 1] });
  g.querySelectorAll('.tn').forEach((n) => n.addEventListener('click', () => { if (!pz.wasDrag()) inspect(n.dataset.n); }));
  body.querySelectorAll('[data-z]').forEach((b) => b.onclick = () => (b.dataset.z === 'in' ? pz.zoomBy(1.3) : b.dataset.z === 'out' ? pz.zoomBy(1 / 1.3) : pz.reset()));
  return () => pz.destroy();
}
