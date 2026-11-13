// iOS-style scrubbable class switcher: tap a crest, or drag your thumb across the pill.
import { crestSVG } from '../crests.js';
import { esc } from '../state.js';
export function mountClassSlider(el, { classes, active, onChange }) {
  el.innerHTML = `<div class="slider" role="tablist" aria-label="Class" data-noswipe>
    <div class="nameplate"><span class="nm"></span><span class="rl"></span></div>
    <div class="track" style="--n:${classes.length}"><div class="thumb"></div>
    ${classes.map((c, i) => `<button class="cb" role="tab" data-i="${i}" aria-label="${esc(c.name)}" aria-selected="false">${crestSVG(c, { size: 32 })}</button>`).join('')}</div></div>`;
  const root = el.firstElementChild, track = root.querySelector('.track'), thumb = root.querySelector('.thumb');
  const nm = root.querySelector('.nm'), rl = root.querySelector('.rl'), btns = [...root.querySelectorAll('.cb')];
  let cur = Math.max(0, classes.findIndex((c) => c.id === active)), preview = cur;
  const paint = (i) => {
    thumb.style.transform = `translateX(${i * 100}%)`;
    btns.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    nm.textContent = classes[i].name; rl.textContent = classes[i].role;
    nm.style.color = classes[i].accent2;
  };
  paint(cur);
  const idxAt = (x) => { const r = track.getBoundingClientRect(); return Math.max(0, Math.min(classes.length - 1, Math.floor(((x - r.left) / r.width) * classes.length))); };
  let down = null;
  track.addEventListener('pointerdown', (e) => { down = { x: e.clientX, moved: false }; track.setPointerCapture(e.pointerId); root.classList.add('scrubbing'); preview = idxAt(e.clientX); paint(preview); });
  track.addEventListener('pointermove', (e) => { if (!down) return; if (Math.abs(e.clientX - down.x) > 4) down.moved = true; const i = idxAt(e.clientX); if (i !== preview) { preview = i; paint(i); navigator.vibrate?.(4); } });
  const end = (e) => { if (!down) return; root.classList.remove('scrubbing'); down = null; if (e.type === 'pointercancel') { paint(cur); return; } commit(preview); };
  track.addEventListener('pointerup', end); track.addEventListener('pointercancel', end);
  track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') commit(Math.min(classes.length - 1, cur + 1)); if (e.key === 'ArrowLeft') commit(Math.max(0, cur - 1)); });
  function commit(i) { const prev = cur; cur = i; paint(i); if (i !== prev) onChange(classes[i].id, i > prev ? 1 : -1, btns[i]); }
  return { set(id) { const i = classes.findIndex((c) => c.id === id); if (i >= 0) { cur = preview = i; paint(i); } }, crestEl: (id) => btns[classes.findIndex((c) => c.id === id)] };
}
