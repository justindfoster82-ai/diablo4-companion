// Hellforge — Diablo IV companion PWA (unofficial). Zero-build ES modules + seasonal JSON.
import { state, setState, data, indexData, cls, esc } from './state.js';
import { startEmbers } from './embers.js';
import { crestSVG } from './crests.js';
import { mountClassSlider } from './components/classSlider.js';
import * as builds from './views/builds.js';
import * as skillTree from './views/skillTree.js';
import * as paragon from './views/paragon.js';
import * as tierList from './views/tierList.js';
import * as season from './views/season.js';

const VIEWS = { builds, skills: skillTree, paragon, tiers: tierList, season };
const TABS = [
  ['builds', 'Builds', '<path d="M5 19 L15 9 M13 5 l6 6 M11 7 l6 6 M4 20 l3-1 -2-2z" />'],
  ['skills', 'Skill Tree', '<circle cx="12" cy="5" r="2.2"/><circle cx="6" cy="13" r="2.2"/><circle cx="18" cy="13" r="2.2"/><circle cx="12" cy="20" r="2"/><path d="M12 7.2V18 M10.4 6.6 L7.4 11.3 M13.6 6.6 L16.6 11.3"/>'],
  ['paragon', 'Paragon', '<rect x="4" y="4" width="16" height="16" rx="2" transform="rotate(45 12 12)"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4 M12 18v4 M2 12h4 M18 12h4"/>'],
  ['tiers', 'Tier List', '<path d="M4 6h16 M4 12h11 M4 18h6"/><circle cx="19" cy="17" r="2.4"/>'],
  ['season', 'Season', '<path d="M12 3c2 4 6 5 6 10a6 6 0 0 1-12 0c0-3 2-4 3-7 1 2 2 3 3 3 0-2-1-4 0-6z"/>'],
];
const $ = (s) => document.querySelector(s);
let embers, slider, cleanup = null;

function shell() {
  $('#app').innerHTML = `
  <header class="topbar"><div id="topCrest"></div><div class="ttl"><h1 class="title-fire" id="clsName"></h1><div class="sub" id="clsSub"></div></div>
    <div class="season-chip" id="seasonChip"></div></header>
  <main id="view" class="view" aria-live="polite"></main>
  <div class="dock"><div id="classSlider"></div>
    <nav class="tabs" aria-label="Sections">${TABS.map(([id, label, ic]) => `<button data-tab="${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ic}</svg><span>${label}</span></button>`).join('')}</nav></div>
  <div class="drawer-backdrop" id="drawerBg"></div><aside class="drawer" id="drawer" aria-modal="true" role="dialog"></aside>`;
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
  $('#drawerBg').addEventListener('click', closeDrawer);
  slider = mountClassSlider($('#classSlider'), { classes: data.classes, active: state.classId, onChange: (id, dir, el) => switchClass(id, dir, el) });
  const s = data.season; const end = new Date(s.ends + 'T00:00:00'); const days = Math.max(0, Math.ceil((end - new Date()) / 864e5));
  $('#seasonChip').innerHTML = `<b>S${s.number}</b>${days ? days + 'd left' : 'ending'}`;
  installSwipe();
}

function paintClass(pop) {
  const c = cls(); const root = document.documentElement;
  root.style.setProperty('--accent', c.accent); root.style.setProperty('--accent2', c.accent2);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', '#08070B');
  embers?.setAccent(c.accent);
  $('#topCrest').innerHTML = crestSVG(c, { size: 44, cls: pop ? 'crest-pop' : '' });
  if (pop) { const el = $('#topCrest .crest'); el.classList.add('bloom'); }
  $('#clsName').textContent = c.name; $('#clsSub').textContent = `${c.mechanic.name} · ${c.resource}`;
}

function render(anim = 'enter') {
  cleanup?.(); cleanup = null;
  const view = $('#view'); view.className = 'view';
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === state.tab ? 'page' : 'false'));
  const v = VIEWS[state.tab] || builds;
  const ctx = { c: cls(), season: data.season, index: data.index, data, state, setState, go, rerender: (anim = 'none') => render(anim), drawer: openDrawer, switchClass };
  cleanup = v.render(view, ctx) || null;
  view.querySelectorAll('.reveal').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 14)));
  if (anim !== 'none') { void view.offsetWidth; view.classList.add(anim); }
}

export function go(tab, patch = {}) { closeDrawer(); setState({ ...patch, tab }, { silent: true }); render('enter'); scrollTo({ top: 0, behavior: 'instant' }); }

function switchClass(id, dir = 1, crestEl) {
  if (id === state.classId) return;
  setState({ classId: id, boardIdx: 0, step: 0, openBuild: null }, { silent: true });
  slider.set(id); paintClass(true); render(dir > 0 ? 'swap-left' : 'swap-right'); scrollTo({ top: 0, behavior: 'instant' });
  const el = crestEl || slider.crestEl(id); if (el) { const r = el.getBoundingClientRect(); embers?.burst(r.left + r.width / 2, r.top + r.height / 2, cls().accent); }
  const t = $('#topCrest')?.getBoundingClientRect(); if (t) embers?.burst(t.left + t.width / 2, t.top + t.height / 2, cls().accent2);
}

function installSwipe() {
  let s = null; const view = $('#view');
  view.addEventListener('pointerdown', (e) => { if (e.target.closest('[data-noswipe],input,textarea,.mapwrap')) { s = null; return; } s = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; });
  const finish = (x, y) => {
    if (!s) return; const dx = x - s.x, dy = y - s.y, dt = performance.now() - s.t; s = null;
    if (Math.abs(dx) > 60 && Math.abs(dy) < Math.abs(dx) * 0.6 && dt < 700) {
      const i = data.classes.findIndex((c) => c.id === state.classId); const n = data.classes.length;
      const j = dx < 0 ? (i + 1) % n : (i - 1 + n) % n; switchClass(data.classes[j].id, dx < 0 ? 1 : -1);
    }
  };
  view.addEventListener('pointerup', (e) => finish(e.clientX, e.clientY));
  // iOS Safari may cancel pointer streams during pan-y; fall back to touch events for the swipe.
  view.addEventListener('touchstart', (e) => { const t = e.touches[0]; if (e.touches.length !== 1 || e.target.closest('[data-noswipe],input,.mapwrap')) { s = null; return; } s = { x: t.clientX, y: t.clientY, t: performance.now() }; }, { passive: true });
  view.addEventListener('touchend', (e) => { const t = e.changedTouches[0]; finish(t.clientX, t.clientY); }, { passive: true });
}

function openDrawer(html) { const d = $('#drawer'); d.innerHTML = `<div class="grip"></div>${html}<div style="margin-top:12px"><button class="btn" id="drawerClose">Close</button></div>`; d.classList.add('open'); $('#drawerBg').classList.add('open'); $('#drawerClose').onclick = closeDrawer; }
function closeDrawer() { $('#drawer')?.classList.remove('open'); $('#drawerBg')?.classList.remove('open'); }
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

async function boot() {
  embers = startEmbers($('#embers'));
  try {
    const index = await (await fetch('./data/seasons/index.json', { cache: 'no-cache' })).json();
    const cur = index.seasons.find((s) => s.id === index.currentSeasonId) || index.seasons.at(-1);
    const seasonData = await (await fetch(cur.file, { cache: 'no-cache' })).json();
    indexData(index, seasonData);
  } catch (err) {
    $('#app').innerHTML = `<div class="loading"><div class="card" style="max-width:320px;text-align:center"><h2>The gate is sealed</h2><p class="muted">Could not load season data. Check your connection and reload.</p><p class="muted"><small>${esc(err.message)}</small></p></div></div>`; return;
  }
  shell(); paintClass(false); render('enter');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
}
boot();
