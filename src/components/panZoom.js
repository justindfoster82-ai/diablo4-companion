// Minimal pan/zoom for an SVG <g>: drag, wheel, pinch, +/-/reset. Exposes wasDrag() so taps still work.
export function panZoom(svg, g, { min = 0.3, max = 4, fit } = {}) {
  let x = 0, y = 0, k = 1; let drag = false; const pts = new Map(); let last = null, pinch = null;
  const apply = (anim) => { g.style.transition = anim ? 'transform .35s cubic-bezier(.2,.8,.2,1)' : 'none'; g.style.transform = `translate(${x}px, ${y}px) scale(${k})`; };
  const vb = () => svg.viewBox.baseVal; const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(); const v = vb(); const s = Math.max(v.width / r.width, v.height / r.height); return [(cx - r.left - (r.width - v.width / s) / 2) * s + v.x, (cy - r.top - (r.height - v.height / s) / 2) * s + v.y]; };
  const zoomAt = (f, px, py, anim) => { const nk = Math.max(min, Math.min(max, k * f)); const r = nk / k; x = px - (px - x) * r; y = py - (py - y) * r; k = nk; apply(anim); };
  svg.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); drag = false; last = toSvg(e.clientX, e.clientY); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k }; } });
  const move = (e) => {
    if (!pts.has(e.pointerId)) return; const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const c = toSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); zoomAt((pinch.k * d / pinch.d) / k, c[0], c[1]); drag = true; return; }
    if (Math.hypot(e.clientX - prev[0], e.clientY - prev[1]) > 0.5) { const p = toSvg(e.clientX, e.clientY); if (last) { x += p[0] - last[0]; y += p[1] - last[1]; apply(); } last = p; }
  };
  let startPt = null;
  svg.addEventListener('pointerdown', (e) => { startPt = [e.clientX, e.clientY]; });
  const onMove = (e) => { if (startPt && Math.hypot(e.clientX - startPt[0], e.clientY - startPt[1]) > 7) drag = true; move(e); };
  addEventListener('pointermove', onMove);
  const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) { last = null; startPt = null; } else last = toSvg(...[...pts.values()][0]); };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  svg.addEventListener('wheel', (e) => { e.preventDefault(); const p = toSvg(e.clientX, e.clientY); zoomAt(Math.exp(-e.deltaY * 0.0015), p[0], p[1]); }, { passive: false });
  const center = () => { const v = vb(); return [v.x + v.width / 2, v.y + v.height / 2]; };
  const api = {
    zoomBy(f) { const [cx, cy] = center(); zoomAt(f, cx, cy, true); },
    reset() { if (fit) { [x, y, k] = fit(); } else { x = 0; y = 0; k = 1; } apply(true); },
    focus(px, py, nk) { const [cx, cy] = center(); k = nk; x = cx - px * k; y = cy - py * k; apply(true); },
    wasDrag: () => drag,
    destroy() { removeEventListener('pointermove', onMove); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); },
  };
  api.reset(); return api;
}
