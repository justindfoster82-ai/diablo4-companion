import { esc } from '../state.js';
const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export function render(el, ctx) {
  const { season: s, index, c } = ctx; const M = s.mechanics;
  const t0 = new Date(s.launched + 'T00:00:00'), t1 = new Date(s.ends + 'T00:00:00'), now = new Date();
  const pct = Math.max(0, Math.min(100, ((now - t0) / (t1 - t0)) * 100)); const left = Math.max(0, Math.ceil((t1 - now) / 864e5));
  el.innerHTML = `
  <section class="card hot reveal"><div class="section-lbl">Season ${s.number} · Patch ${esc(s.patch)}</div>
    <h2 class="serif title-fire" style="font-size:22px;margin:2px 0 4px">${esc(s.name)}</h2>
    <p class="muted" style="margin:0;font-size:13px">${esc(s.expansion.name)} expansion — ${esc(s.expansion.note)}</p>
    <div class="countdown"><i style="width:${pct.toFixed(1)}%"></i></div>
    <div style="display:flex;justify-content:space-between;font-size:11.5px" class="muted"><span>Launched ${fmt(s.launched)}</span><span><b style="color:var(--accent2)">${left} days left</b> · ends ~${fmt(s.ends)}</span></div>
    <dl class="kv" style="margin-top:12px"><dt>Level cap</dt><dd><b>${s.levelCap}</b> for all players</dd><dt>Paragon</dt><dd>${s.paragon.boardsEquipped} boards equipped (${esc(s.paragon.layout)}), ~${s.paragon.pointsRange[0]}–${s.paragon.pointsRange[1]} pts with Season Rank</dd><dt>Next</dt><dd>Season ${s.next.id.slice(1)} · ${esc(s.next.patch)} ~${fmt(s.next.expected)}</dd></dl></section>
  <h2 class="serif reveal" style="margin:18px 2px 10px">Splinters of Evil · Prime Evil Path</h2>
  ${M.primeEvilPaths.map((p) => { const mine = c.builds.filter((b) => b.primeEvil === p.id);
    return `<section class="card reveal prime" style="--pc:${p.color};padding:14px"><h3 class="serif" style="font-size:15px;color:color-mix(in srgb, ${p.color} 70%, white)">${esc(p.name)}</h3>
     <p style="font-size:13.5px"><b>Iconic Power — ${esc(p.iconicPower.name)}:</b> ${esc(p.iconicPower.effect)}</p>
     <ol class="steps">${p.bonuses.map((b) => `<li>${esc(b)}</li>`).join('')}</ol>
     <div class="chips">${p.bestFor.map((t) => `<span class="tag">${t}</span>`).join('')}${mine.map((b) => `<span class="chip accent">${esc(b.name)}</span>`).join('')}</div></section>`; }).join('')}
  <h2 class="serif reveal" style="margin:18px 2px 10px">Soul Splinters <small class="muted" style="font-family:var(--sans);letter-spacing:0;text-transform:none">· up to ${M.soulSplinters.maxEquipped} in ${esc(M.soulSplinters.slots.toLowerCase())}</small></h2>
  <section class="card reveal"><div class="splinters" style="grid-template-columns:1fr 1fr">${M.soulSplinters.list.map((x) => `<div class="spl"><b>${esc(x.name)}</b><span class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.1em">${esc(x.prime)}</span><div class="bl">+ ${esc(x.blessing)}</div><div class="bu">− ${esc(x.burden)}</div></div>`).join('')}</div></section>
  <h2 class="serif reveal" style="margin:18px 2px 10px">Seasonal systems</h2>
  <div class="grid2">${M.activities.map((a) => `<section class="card reveal" style="margin:0"><h3 class="serif" style="color:var(--gold-hi)">${esc(a.name)}${a.maxTier ? ` <span class="chip ember" style="vertical-align:2px">up to ${esc(a.maxTier)}</span>` : ''}</h3><p style="font-size:13.5px;margin-bottom:0">${esc(a.desc)}</p></section>`).join('')}</div>
  <section class="card reveal" style="margin-top:12px"><div class="section-lbl">Data &amp; seasonal updates</div>
    ${index.updateNotes.map((n) => `<p style="font-size:13px"><b style="color:var(--gold-hi)">${fmt(n.date)}</b> — ${esc(n.text)}</p>`).join('')}
    <p class="note">${esc(s.dataNotes)}</p></section>
  <p class="footer-note">Unofficial fan companion · not affiliated with or endorsed by Blizzard Entertainment. All crests and effects are original artwork.</p>`;
}
