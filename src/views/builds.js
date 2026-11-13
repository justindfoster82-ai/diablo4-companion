import { esc, initials } from '../state.js';
import { crestSVG } from '../crests.js';
const PHASES = [['1-15', '1–15'], ['15-70', '15–70'], ['endgame', 'Endgame (70)']];
const ROLE_COLOR = { basic: '#8C7B6B', core: null, class: '#6C5BA8', ultimate: '#C89B3C', key: '#E9C46A' };
export const nodeName = (c, id) => c.nodeById[id]?.name || id;
export function skillHex(c, id, main) {
  const n = c.nodeById[id]; const role = c.skillTree.clusters.find((k) => k.id === n.cluster)?.role;
  const col = ROLE_COLOR[role] || c.accent;
  return `<div class="sk ${main ? 'main' : ''}"><div class="hex" style="--c:${col}">${esc(initials(n.name))}</div><span>${esc(n.name)}</span></div>`;
}
export const tierBadge = (t, sm) => `<span class="tier tier-${t[0]} ${sm ? 'sm' : ''}">${esc(t)}</span>`;
const srcChips = (season, b) => b.sources.map((s) => `<span class="chip">${esc(season.sources[s]?.short || s)}</span>`).join('');

export function render(el, ctx) {
  const { c, season, state, setState, go } = ctx;
  const lev = c.builds.filter((b) => b.phase === 'leveling'), end = c.builds.filter((b) => b.phase === 'endgame');
  const phase = state.phase || 'endgame';
  let body = '';
  if (phase === '1-15') body = lev.map((b) => {
    const g = b.guide['1-15'];
    return `<section class="card reveal"><div style="display:flex;gap:10px;align-items:center">${tierBadge(b.tiers.leveling)}<div class="build-title"><h3>${esc(b.name)}</h3><div class="chips">${b.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div></div></div>
      <p>${esc(b.playstyle)}</p>
      <div class="section-lbl">Core unlocks</div><div class="chips">${g.unlocks.map((id) => `<span class="chip accent">${esc(nodeName(c, id))}</span>`).join('')}</div>
      <div class="section-lbl" style="margin-top:12px">Exact spend order · points 1–14 (Lv 2–15)</div>
      <div class="spend-grid">${g.spendOrder.map((id, i) => `<div><b>Lv ${i + 2}</b><span>${esc(nodeName(c, id))}</span></div>`).join('')}</div>
      <div class="callout" style="margin-top:12px">🛡 <b>Survive early:</b> ${esc(g.tip)}</div>
      <div class="actions" style="margin-top:12px"><button class="btn" data-tree="${b.id}">Full skill tree →</button></div></section>`; }).join('');
  else if (phase === '15-70') {
    const g = lev[0].guide['15-70']; const checks = state.checks[c.id] || [];
    body = `<section class="card hot reveal"><div class="section-lbl">Class mechanic breakpoint · Lv 15</div><h3 class="serif" style="color:var(--accent2)">${esc(c.mechanic.name)}</h3><p>${esc(g.breakpoint)}</p></section>
    ${lev.map((b) => `<section class="card reveal"><div style="display:flex;gap:10px;align-items:center">${tierBadge(b.tiers.leveling, true)}<h3>${esc(b.name)}</h3></div>
      <div class="section-lbl" style="margin-top:10px">Codex aspects to imprint</div><ol class="steps">${b.guide['15-70'].aspects.map((a) => `<li>${esc(a)}</li>`).join('')}</ol></section>`).join('')}
    <section class="card reveal"><div class="section-lbl">Tempering priorities</div><ol class="steps">${g.tempering.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></section>
    <section class="card reveal"><div class="section-lbl">Torment T1 transition checklist</div>
      ${g.t1Checklist.map((t, i) => `<label class="check"><input type="checkbox" data-chk="${i}" ${checks.includes(i) ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}
      <p class="muted" style="font-size:12px">${checks.length}/${g.t1Checklist.length} done · saved on this device</p></section>`;
  } else body = end.map((b, i) => buildCard(c, season, b, state.openBuild ? state.openBuild === b.id : i === 0)).join('');

  el.innerHTML = `
  <section class="card hot reveal"><div class="hero">${crestSVG(c, { size: 74, cls: 'crest-pop' })}<div><h2 class="serif">${esc(c.name)}</h2><div class="muted" style="font-size:12.5px">${esc(c.role)} · ${esc(c.resource)}</div>
    <div class="chips" style="margin-top:6px"><span class="chip gold">${lev.length} leveling</span><span class="chip ember">${end.length} endgame</span></div></div></div>
    <div class="mech"><b>${esc(c.mechanic.name)}</b> — ${esc(c.mechanic.desc)}</div></section>
  <div class="seg reveal" role="group" aria-label="Phase">${PHASES.map(([id, l]) => `<button data-phase="${id}" aria-pressed="${phase === id}">${l}</button>`).join('')}</div>
  ${body}
  <p class="footer-note">${esc(c.dataStatus === 'representative' ? 'Build names & tiers: S15 research snapshot. Ranks, items & paths are representative — verify in-game.' : 'Build names & tiers: S15 research snapshot. ' + c.dataStatus + '.')}</p>`;

  el.querySelectorAll('[data-phase]').forEach((b) => b.onclick = () => { setState({ phase: b.dataset.phase, openBuild: null }, { silent: true }); ctx.rerender('enter'); });
  el.querySelectorAll('[data-chk]').forEach((cb) => cb.onchange = () => { const all = new Set(state.checks[c.id] || []); cb.checked ? all.add(+cb.dataset.chk) : all.delete(+cb.dataset.chk); setState({ checks: { ...state.checks, [c.id]: [...all] } }, { silent: true }); ctx.rerender(); });
  el.querySelectorAll('[data-tree]').forEach((b) => b.onclick = () => go('skills', { treeSel: { ...state.treeSel, [c.id]: b.dataset.tree } }));
  el.querySelectorAll('[data-par]').forEach((b) => b.onclick = () => go('paragon', { paragonSel: { ...state.paragonSel, [c.id]: b.dataset.par }, boardIdx: 0 }));
}

function buildCard(c, season, b, open) {
  const M = season.mechanics; const pe = M.primeEvilPaths.find((p) => p.id === b.primeEvil);
  const spl = b.soulSplinters.map((id) => M.soulSplinters.list.find((s) => s.id === id));
  return `<details class="card build reveal" ${open ? 'open' : ''} id="b-${b.id}"><summary>${tierBadge(b.tier)}<div class="build-title"><h3>${esc(b.name)}</h3><div class="chips">${b.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div></div><span class="chev">▾</span></summary>
   <div class="body">
    <p style="margin:0">${esc(b.playstyle)}</p>
    <div class="chips">${srcChips(season, b)}${b.tiers.pushing ? `<span class="chip">Pushing: <b>${b.tiers.pushing}</b></span>` : ''}</div>
    <div><div class="section-lbl">Skill bar</div><div class="skillbar">${b.skillBar.map((id) => skillHex(c, id, id === b.mainSkill)).join('')}</div>
      <p class="muted" style="font-size:12.5px;margin-top:8px">Key passive: <b style="color:var(--gold-hi)">${esc(nodeName(c, b.keyPassive))}</b></p></div>
    <div><div class="section-lbl">Core rotation</div><ol class="steps">${b.rotation.map((r) => `<li>${esc(r)}</li>`).join('')}</ol></div>
    <div><div class="section-lbl">Required Uniques & Mythics</div><div class="chips">${b.mythics.map((m) => `<span class="chip gold">✦ ${esc(m)}</span>`).join('')}${b.uniques.map((u) => `<span class="chip ember">${esc(u)}</span>`).join('')}${!b.mythics.length && !b.uniques.length ? '<span class="muted" style="font-size:12.5px">No uniques required — runs on Legendary aspects.</span>' : ''}</div></div>
    <div class="loadout"><div class="section-lbl">Season 15 loadout</div>
      <div class="prime" style="--pc:${pe.color}"><b>${esc(pe.name)}</b><br><span class="muted">Iconic Power:</span> ${esc(pe.iconicPower.name)} — ${esc(pe.iconicPower.effect)}</div>
      <div class="splinters">${spl.map((s) => `<div class="spl"><b>${esc(s.name)}</b><div class="bl">+ ${esc(s.blessing)}</div><div class="bu">− ${esc(s.burden)}</div></div>`).join('')}</div></div>
    <div><div class="section-lbl">Gear · aspects · tempering</div><p style="margin-top:0;font-size:13.5px">${esc(b.gear.summary)}</p>
      <dl class="kv"><dt>Aspects</dt><dd>${b.gear.aspects.map(esc).join(' · ')}</dd><dt>Temper</dt><dd>${b.gear.tempering.map(esc).join(' · ')}</dd><dt>Paragon</dt><dd>${b.paragon.totalPoints} pts · 5 boards</dd></dl></div>
    <div class="actions"><button class="btn primary" data-tree="${b.id}">Skill Tree</button><button class="btn" data-par="${b.id}">Paragon Boards</button></div>
   </div></details>`;
}
