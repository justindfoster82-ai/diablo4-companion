// Full-bleed rising hellfire embers on <canvas>. Pre-rendered glow sprites keep it at 60fps.
import { reduceMotion } from './state.js';
export function startEmbers(canvas) {
  const ctx = canvas.getContext('2d'); let W = 0, H = 0, dpr = 1, raf = 0, running = true;
  const sprites = new Map(); let accent = '#E24A29';
  const sprite = (color) => {
    if (sprites.has(color)) return sprites.get(color);
    const s = document.createElement('canvas'); s.width = s.height = 32; const g = s.getContext('2d');
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.25, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32); sprites.set(color, s); return s;
  };
  const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize(); addEventListener('resize', resize);
  const P = []; const base = () => Math.round(Math.min(70, (W * H) / 9000));
  const spawn = (x, y, burst, color) => ({ x: x ?? Math.random() * W, y: y ?? H + 10, vx: burst ? (Math.random() - .5) * 5 : (Math.random() - .5) * .3, vy: burst ? -Math.random() * 5 - 1 : -(Math.random() * .7 + .25),
    s: burst ? Math.random() * 10 + 6 : Math.random() * 9 + 3, life: 0, max: burst ? 50 + Math.random() * 40 : 300 + Math.random() * 400, wob: Math.random() * 6.28, color: color || (Math.random() < .25 ? '#C89B3C' : Math.random() < .5 ? accent : '#E24A29'), burst });
  for (let i = 0; i < base(); i++) { const p = spawn(); p.y = Math.random() * H; p.life = Math.random() * p.max; P.push(p); }
  const tick = () => {
    if (!running) return;
    ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life++; p.wob += .03; p.x += p.vx + Math.sin(p.wob) * .25; p.y += p.vy; if (p.burst) { p.vx *= .96; p.vy = p.vy * .97 - .02; }
      const t = p.life / p.max; const a = t < .1 ? t * 10 : 1 - t;
      if (t >= 1 || p.y < -20) { P.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, a) * (p.burst ? 1 : .7); ctx.drawImage(sprite(p.color), p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    while (P.filter((p) => !p.burst).length < base()) P.push(spawn());
    ctx.globalAlpha = 1; raf = requestAnimationFrame(tick);
  };
  const staticFrame = () => { ctx.clearRect(0, 0, W, H); for (const p of P) { ctx.globalAlpha = .4; ctx.drawImage(sprite(p.color), p.x, p.y, p.s, p.s); } };
  const start = () => { cancelAnimationFrame(raf); if (reduceMotion()) { running = false; staticFrame(); } else { running = true; raf = requestAnimationFrame(tick); } };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else start(); });
  start();
  return {
    burst(x, y, color) { if (reduceMotion()) return; for (let i = 0; i < 34; i++) P.push(spawn(x, y, true, i % 3 ? color : '#FFD18A')); },
    setAccent(c) { accent = c; },
  };
}
