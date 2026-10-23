// 引擎：工具函数、手绘线条、排线纹理、贴纸音效字、气泡。一般不用改。角色在 mascots.js。
// 画面 = f(帧号)。不用 Math.random / Date，所有随机都带种子，保证每次渲染一致。
const W = 1920, H = 1080, FPS = 30, DUR = 10;
// 配色按参考视频取色（2026-09-26 校准）：参考视频的描边 #2C2017、背景 #EAE4D2、窗口底 #FBFAF4
const INK = '#2C2017', PAPER = '#EAE4D2', WIN = '#FBFAF4', SOFT = '#F2ECDF';
const C = { // 参考视频的色相，饱和度提高到约 0.5–0.6：只在小面积元素上用，窗口仍以白底为主
  yellow: '#F5BE2E', fold: '#D99A1C', pink: '#F27288', lav: '#8F76EE', mint: '#4CC7A6',
  butter: '#FFD36B', peach: '#F5985A', sky: '#56B4E6', green: '#3FAE7A', red: '#F2435A',
  grey: '#CFC9BE', cheek: '#F0917F',
};
const PAL = [C.pink, C.lav, C.mint, C.butter, C.peach, C.sky];
const FONT = 'VideoSans';
const FUN = 'VideoSansHeavy';


// ---------- 工具 ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
// 带过冲的弹簧，dt 为开始后的秒数
const spring = dt => dt <= 0 ? 0 : 1 - Math.exp(-7 * dt) * Math.cos(11 * dt);
const n2 = v => v.toFixed(1);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function keyframes(t, kfs) {
  if (t <= kfs[0].t) return kfs[0];
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i + 1];
    if (t < b.t) {
      const p = easeInOut((t - a.t) / (b.t - a.t));
      const o = {};
      for (const k in a) o[k] = lerp(a[k], b[k], p);
      return o;
    }
  }
  return kfs[kfs.length - 1];
}

// ---------- 手绘线条：采样点 + 种子抖动 + Catmull-Rom 平滑 ----------
function jitter(pts, seed, amp) {
  const r = mulberry32(seed);
  return pts.map(([x, y]) => [x + (r() - .5) * 2 * amp, y + (r() - .5) * 2 * amp]);
}
function smoothClosed(p) {
  const n = p.length;
  let d = `M${n2(p[0][0])},${n2(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    d += `C${n2(p1[0] + (p2[0] - p0[0]) / 6)},${n2(p1[1] + (p2[1] - p0[1]) / 6)} ${n2(p2[0] - (p3[0] - p1[0]) / 6)},${n2(p2[1] - (p3[1] - p1[1]) / 6)} ${n2(p2[0])},${n2(p2[1])}`;
  }
  return d + 'Z';
}
function smoothOpen(p) {
  const n = p.length;
  let d = `M${n2(p[0][0])},${n2(p[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(n - 1, i + 2)];
    d += `C${n2(p1[0] + (p2[0] - p0[0]) / 6)},${n2(p1[1] + (p2[1] - p0[1]) / 6)} ${n2(p2[0] - (p3[0] - p1[0]) / 6)},${n2(p2[1] - (p3[1] - p1[1]) / 6)} ${n2(p2[0])},${n2(p2[1])}`;
  }
  return d;
}
function edgePts(pts, x1, y1, x2, y2, step) {
  const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step));
  for (let i = 0; i < n; i++) pts.push([lerp(x1, x2, i / n), lerp(y1, y2, i / n)]);
}
function rr(x, y, w, h, r, seed, amp = 1.3) {
  r = Math.min(r, w / 2, h / 2);
  const pts = [], step = 28;
  const arc = (cx, cy, a0) => { for (let i = 0; i < 4; i++) { const a = a0 + i * Math.PI / 8; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  edgePts(pts, x + r, y, x + w - r, y, step); arc(x + w - r, y + r, -Math.PI / 2);
  edgePts(pts, x + w, y + r, x + w, y + h - r, step); arc(x + w - r, y + h - r, 0);
  edgePts(pts, x + w - r, y + h, x + r, y + h, step); arc(x + r, y + h - r, Math.PI / 2);
  edgePts(pts, x, y + h - r, x, y + r, step); arc(x + r, y + r, Math.PI);
  return smoothClosed(jitter(pts, seed, amp));
}
function poly(points, seed, amp = 1.3, step = 26) {
  const pts = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    edgePts(pts, a[0], a[1], b[0], b[1], step);
  }
  return smoothClosed(jitter(pts, seed, amp));
}
function wline(x1, y1, x2, y2, seed, amp = 1.2, step = 30) {
  const pts = [];
  edgePts(pts, x1, y1, x2, y2, step);
  pts.push([x2, y2]);
  const j = jitter(pts, seed, amp);
  j[0] = [x1, y1]; j[j.length - 1] = [x2, y2];
  return smoothOpen(j);
}
function circ(cx, cy, r, seed, amp = 1) {
  const pts = [], n = Math.max(10, Math.round(r / 3));
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return smoothClosed(jitter(pts, seed, amp));
}

function shape(d, { fill = 'none', hatch = false, sw = 4, stroke = INK, dash = '', op = 1 } = {}) {
  return `<g opacity="${op}"><path d="${d}" fill="${fill}"/>` +
    (hatch ? `<path d="${d}" fill="url(#hatch)"/>` : '') +
    (sw ? `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>` : '') +
    `</g>`;
}
function stroke(d, sw = 4, color = INK, extra = '') {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
}
function txt(s, x, y, { size = 32, fill = INK, font = FONT, anchor = 'start', weight = 400, op = 1, extra = '' } = {}) {
  return `<text x="${n2(x)}" y="${n2(y)}" font-family='${font}' font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" opacity="${op}" ${extra}>${esc(s)}</text>`;
}

const DEFS = `<defs>
  <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
    <line x1="0" y1="-1" x2="0" y2="9" stroke="${INK}" stroke-opacity=".15" stroke-width="1.7"/>
  </pattern>
  <pattern id="hatchCat" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
    <line x1="0" y1="-4" x2="0" y2="40" stroke="${INK}" stroke-opacity=".16" stroke-width="7.5"/>
  </pattern>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="11" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 .17  0 0 0 0 .14  0 0 0 0 .11  .2 0 0 0 -.07"/>
  </filter>
  <radialGradient id="vig" cx="50%" cy="50%" r="75%">
    <stop offset="60%" stop-color="${INK}" stop-opacity="0"/>
    <stop offset="100%" stop-color="${INK}" stop-opacity=".05"/>
  </radialGradient>
</defs>`;

// ---------- 小图标 ----------
function doodle(kind, x, y, seed) {
  const g = [];
  if (kind === 0) { // 文字行
    for (let i = 0; i < 3; i++) g.push(stroke(wline(x, y + 12 + i * 16, x + 58 - i * 12, y + 12 + i * 16, seed + i, .8), 4));
  } else if (kind === 1) { // 柱状图
    [30, 44, 22].forEach((h, i) => g.push(shape(rr(x + i * 20, y + 52 - h, 14, h, 3, seed + i, .6), { fill: '#fff', sw: 3 })));
  } else if (kind === 2) { // 太阳
    g.push(shape(circ(x + 30, y + 28, 14, seed), { fill: C.yellow, sw: 3 }));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.push(stroke(`M${n2(x + 30 + 20 * Math.cos(a))},${n2(y + 28 + 20 * Math.sin(a))}L${n2(x + 30 + 26 * Math.cos(a))},${n2(y + 28 + 26 * Math.sin(a))}`, 3)); }
  } else if (kind === 3) { // 视频
    g.push(shape(rr(x, y + 6, 60, 44, 8, seed, .7), { fill: '#fff', sw: 3 }));
    g.push(shape(poly([[x + 24, y + 17], [x + 40, y + 28], [x + 24, y + 39]], seed + 1, .5, 10), { fill: C.red, sw: 2.5 }));
  } else { // 灯泡
    g.push(shape(circ(x + 30, y + 24, 16, seed), { fill: '#FFF3C4', sw: 3 }));
    g.push(shape(rr(x + 22, y + 40, 16, 12, 3, seed + 1, .5), { fill: C.grey, sw: 3 }));
  }
  return g.join('');
}

function card(i, x, y, opts = {}) {
  const { rot = 0, s = 1, op = 1 } = opts;
  if (s <= 0.001 || op <= 0) return '';
  const w = 222, h = 130, col = PAL[i % PAL.length], title = opts.title || (typeof TITLES !== 'undefined' ? TITLES[i % TITLES.length] : '');
  let g = shape(rr(-w / 2, -h / 2, w, h, 14, 500 + i), { fill: col, sw: 3.5 });
  g += doodle(i % 5, -w / 2 + 16, -h / 2 + 12, 900 + i * 7);
  g += stroke(wline(-w / 2 + 96, -h / 2 + 28, w / 2 - 18, -h / 2 + 28, 700 + i, .8), 3.5, INK, 'opacity=".45"');
  g += stroke(wline(-w / 2 + 96, -h / 2 + 46, w / 2 - 44, -h / 2 + 46, 800 + i, .8), 3.5, INK, 'opacity=".45"');
  g += txt(title, -w / 2 + 16, h / 2 - 18, { size: 28 });
  return `<g transform="translate(${n2(x)},${n2(y)}) rotate(${n2(rot)}) scale(${s.toFixed(3)})" opacity="${op}">${g}</g>`;
}

// ---------- 贴纸音效字 / 对话气泡 ----------
function sticker(s, x, y, t, t0, t1, { fill = C.yellow, rot = -6, size = 76 } = {}) {
  if (t < t0 || t > t1 + .22) return '';
  let sc = spring(t - t0);
  if (t > t1) sc *= 1 - easeIn((t - t1) / .22);
  const a = `x="0" y="0" text-anchor="middle" dominant-baseline="central" font-family='${FUN}' font-size="${size}" stroke-linejoin="round"`;
  return `<g transform="translate(${x},${y}) rotate(${rot + 4 * Math.sin((t - t0) * 9) * Math.exp(-(t - t0) * 4)}) scale(${Math.max(0, sc).toFixed(3)})">
    <text ${a} fill="${INK}" stroke="${INK}" stroke-width="20" transform="translate(5,6)">${esc(s)}</text>
    <text ${a} fill="${INK}" stroke="${INK}" stroke-width="20">${esc(s)}</text>
    <text ${a} fill="${fill}">${esc(s)}</text></g>`;
}
function bubble(s, x, y, t, t0, t1, { size = 36, seed = 1 } = {}) {
  if (t < t0 || t > t1 + .18) return '';
  let sc = spring(t - t0);
  if (t > t1) sc *= 1 - easeIn((t - t1) / .18);
  const w = s.length * size * 0.98 + 44, h = size + 34, bx = -w * 0.35, by = -h - 20;
  let g = shape(rr(bx, by, w, h, 20, seed, 1), { fill: '#fff', sw: 3.5 });
  g += `<path d="M-14,${by + h - 2}L0,0L12,${by + h - 2}Z" fill="#fff"/>`;
  g += stroke(`M-14,${by + h - 1}L0,0L12,${by + h - 1}`, 3.5);
  g += txt(s, bx + w / 2, by + h / 2 + size * 0.36, { size, anchor: 'middle' });
  return `<g transform="translate(${n2(x)},${n2(y)}) scale(${Math.max(0, sc).toFixed(3)})">${g}</g>`;
}
