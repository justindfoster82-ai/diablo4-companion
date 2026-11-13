import { esc } from '../state.js';
import { crestSVG } from '../crests.js';
export function render(el, ctx) {
  const { season, data, state, setState } = ctx; const TL = season.tierList;
  const act = state.tierActivity || 'endgame'; const cf = state.tierClass || 'all';
  const entries = TL.entries.filter((e) => e.activity === act && (cf === 'all' || e.classId === cf));
  el.innerHTML = `
   <div class="view-title reveal"><h2 class="serif">Tier List</h2><span class="chip gold">Season ${season.number}</span></div>
   <div class="seg reveal" role="group" aria-label="Activity">${TL.activities.map((a) => `<button data-a="${a.id}" aria-pressed="${a.id === act}">${a.label}</button>`).join('')}</div>
   <div class="pills reveal" data-noswipe role="group" aria-label="Class filter"><button class="pill" data-cf="all" aria-pressed="${cf === 'all'}">All classes</button>${data.classes.map((c) => `<button class="pill" data-cf="${c.id}" aria-pressed="${cf === c.id}" style="--accent:${c.accent}">${crestSVG(c, { size: 18 })}${esc(c.name)}</button>`).join('')}</div>
   ${TL.rows.map((t) => { const row = entries.filter((e) => e.tier === t);
     return `<section class="card tier-row reveal"><span class="tier tier-${t}">${t}</span><div class="tier-entries">${row.length ? row.map((e) => { const b = data.buildById[e.buildId], c = data.byId[e.classId];
       return `<button class="tentry" data-go="${b.id}" style="--ca:${c.accent}">${crestSVG(c, { size: 24 })}<div><b>${esc(b.name)}</b><small class="muted">${esc(c.name)} · ${e.sources.map((s) => esc(season.sources[s].label)).join(', ')}</small></div></button>`; }).join('')
       : `<div class="empty">${esc(TL.empty.default.replace('{tier}', t))}${cf !== 'all' ? ` for ${esc(data.byId[cf].name)}` : ''}</div>`}</div></section>`; }).join('')}
   <section class="card reveal"><div class="section-lbl">Support / zDPS</div><p style="font-size:13.5px;margin:0">${esc(TL.supportNote)}</p></section>
   <section class="card reveal"><div class="section-lbl">Sources</div><div class="chips">${Object.values(season.sources).map((s) => `<span class="chip">${esc(s.label)} · ${new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>`).join('')}</div>
     <p class="muted" style="font-size:12px;margin-bottom:0">Consensus of the three sources; where they differ the build shows each rating (e.g. Ultimate Blood Wave S on Mobalytics, A on Maxroll).</p></section>`;
  el.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => { setState({ tierActivity: b.dataset.a }, { silent: true }); ctx.rerender('enter'); });
  el.querySelectorAll('[data-cf]').forEach((b) => b.onclick = () => { setState({ tierClass: b.dataset.cf }, { silent: true }); ctx.rerender('enter'); });
  el.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => { const bd = data.buildById[b.dataset.go];
    if (bd.classId !== state.classId) ctx.switchClass(bd.classId, 1);
    ctx.go('builds', { phase: bd.phase === 'leveling' ? '1-15' : 'endgame', openBuild: bd.id });
    requestAnimationFrame(() => document.getElementById('b-' + bd.id)?.scrollIntoView({ block: 'start', behavior: 'smooth' })); });
}
