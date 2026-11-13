// Tiny persisted store + shared data registry.
const KEY = 'hellforge.state.v1';
const defaults = { classId: null, tab: 'builds', phase: 'endgame', treeSel: {}, paragonSel: {}, skillMode: 'spine', paragonMode: 'grid',
  boardIdx: 0, tierActivity: 'endgame', tierClass: 'all', step: 70, checks: {}, openBuild: null, showAllNodes: false };
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
export const state = { ...defaults, ...load() };
const subs = new Set();
export function setState(patch, opts = {}) {
  Object.assign(state, patch);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  if (!opts.silent) subs.forEach((f) => f(patch, opts));
}
export const subscribe = (f) => (subs.add(f), () => subs.delete(f));
export const data = { index: null, season: null, classes: [], byId: {}, buildById: {} };
export function indexData(index, season) {
  data.index = index; data.season = season;
  const order = index.classOrder || season.classes.map((c) => c.id);
  data.classes = order.map((id) => season.classes.find((c) => c.id === id)).filter(Boolean);
  data.byId = Object.fromEntries(data.classes.map((c) => [c.id, c]));
  data.buildById = {};
  for (const c of data.classes) {
    c.nodeById = Object.fromEntries(c.skillTree.nodes.map((n) => [n.id, n]));
    c.boardById = Object.fromEntries(c.paragon.boards.map((b) => [b.id, b]));
    c.glyphById = Object.fromEntries(c.paragon.glyphs.map((g) => [g.id, g]));
    for (const b of c.builds) data.buildById[b.id] = b;
  }
  if (!data.byId[state.classId]) state.classId = data.classes[0].id;
}
export const cls = () => data.byId[state.classId];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const initials = (s) => s.replace(/^(The|Enhanced)\s+/, '').split(/[\s\-–/]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const ATTR = { str: 'Strength', dex: 'Dexterity', int: 'Intelligence', will: 'Willpower' };
export const ATTR_SHORT = { str: 'Str', dex: 'Dex', int: 'Int', will: 'Will' };
export const ATTR_LETTER = { s: 'str', d: 'dex', i: 'int', w: 'will' };
