// Original procedural SVG class crests (no game artwork). Each crest = etched shield + class rune.
let uid = 0;
const RUNES = {
  axes: 'M30 26 L70 74 M70 26 L30 74 M24 20 q-6 14 8 18 q4-10 -8-18z M76 20 q6 14 -8 18 q-4-10 8-18z',
  pentacle: 'M50 22 L66 72 L24 41 H76 L34 72 Z M50 14 A36 36 0 1 1 49.9 14',
  skull: 'M32 46 a18 18 0 1 1 36 0 v8 l-5 4 v8 h-26 v-8 l-5 -4 z M41 48 a4 4 0 1 0 .1 0 M59 48 a4 4 0 1 0 .1 0 M45 66 v6 M50 66 v6 M55 66 v6',
  sun: 'M50 22 V78 M28 44 H72 M50 30 a14 14 0 1 1 -.1 0 M50 12 V18 M50 82 V88 M14 50 H20 M80 50 H86 M24 24 L29 29 M76 24 L71 29 M24 76 L29 71 M76 76 L71 71',
  feather: 'M50 82 C30 62 34 32 58 18 C64 40 66 62 50 82 Z M50 82 L56 24 M53 52 L40 46 M54 40 L44 34 M52 64 L40 60',
  daggers: 'M30 22 L66 70 M70 22 L34 70 M62 66 L72 64 L70 74 M38 66 L28 64 L30 74 M26 18 L34 26 M74 18 L66 26 M50 40 l4 4 l-4 4 l-4 -4z',
  orb: 'M50 34 a16 16 0 1 1 -.1 0 M18 50 C18 36 82 36 82 50 C82 64 18 64 18 50 M32 22 C22 30 78 76 68 78 C78 70 22 24 32 22',
  claw: 'M30 24 C44 40 46 58 36 78 M48 20 C62 38 62 58 52 80 M66 24 C78 40 78 58 70 76',
};
export function crestSVG(c, { size = 40, cls = '' } = {}) {
  const id = 'cr' + (++uid); const a = c.accent, b = c.accent2;
  return `<svg class="crest ${cls}" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
  <defs><radialGradient id="${id}g" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="${b}" stop-opacity=".55"/><stop offset=".55" stop-color="${a}" stop-opacity=".35"/><stop offset="1" stop-color="#08070B" stop-opacity=".95"/></radialGradient>
  <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4D58A"/><stop offset=".5" stop-color="#C89B3C"/><stop offset="1" stop-color="#7A5A1E"/></linearGradient>
  <filter id="${id}f" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <path d="M50 4 L90 20 V50 C90 72 72 88 50 96 C28 88 10 72 10 50 V20 Z" fill="url(#${id}g)" stroke="url(#${id}r)" stroke-width="3.5"/>
  <path d="M50 12 L82 25 V50 C82 68 68 81 50 88 C32 81 18 68 18 50 V25 Z" fill="none" stroke="${a}" stroke-opacity=".5" stroke-width="1" stroke-dasharray="3 3"/>
  <path d="${RUNES[c.crest] || RUNES.orb}" fill="none" stroke="${b}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#${id}f)"/>
  </svg>`;
}
