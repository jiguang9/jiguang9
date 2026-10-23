// 通用小部件 + 猫的姿势时间线 + 渲染入口。场景文件（scene.js）只需要定义：
//   TOTAL、GROUND、BOT_S、REGIONS、CAM、TRACK，以及各场景区的绘制函数；贴纸字用 S()，气泡用 B()，音效用 cue()。
const MUTED = '#A79F92';
const CUES = [];                       // 音效事件 [类型, 秒, 音量]，由 render.js cues 导出给 make_audio.py
const cue = (type, t, vol = 1) => CUES.push([type, +t.toFixed(3), vol]);
const STK = [];                        // 贴纸音效字（世界坐标）：S(x, y, 文字, 出现, 消失, {fill, rot, size})
const S = (x, y, text, t0, t1, opts = {}) => { STK.push([x, y, text, t0, t1, opts]); cue('pop', t0, .8); };
const BUB = [];                        // 对话气泡（世界坐标）：B(尖角x, 尖角y, 文字, 出现, 消失, {size})
const B = (x, y, text, t0, t1, opts = {}) => { BUB.push([x, y, text, t0, t1, opts]); cue('soft', t0, .8); };
const typeCues = (t0, n, dt) => { for (let i = 0; i < n; i++) cue('tick', t0 + i * dt, .6); };

// 一笔一笔画出来的线（pathLength=1 的描边动画）
function drawOn(d, p, sw, color) {
  if (p <= 0) return '';
  return `<path d="${d}" pathLength="1" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 1" stroke-dashoffset="${(1 - clamp(p)).toFixed(3)}"/>`;
}
function star4(cx, cy, r, fill = C.yellow) {
  const q = r * 0.32;
  return shape(`M${cx},${cy - r}Q${cx + q},${cy - q} ${cx + r},${cy}Q${cx + q},${cy + q} ${cx},${cy + r}Q${cx - q},${cy + q} ${cx - r},${cy}Q${cx - q},${cy - q} ${cx},${cy - r}Z`, { fill, sw: 3 });
}

// ---------- 通用小部件 ----------
const textW = (s, size) => [...s].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? size : size * .56), 0);
function popG(t, t0, cx, cy, inner, t1 = 1e9) { // 以 (cx,cy) 为中心弹出，t1 之后缩回
  if (t < t0 || t > t1 + 0.25 || !inner) return '';
  let s = spring(t - t0);
  if (t > t1) s *= 1 - easeIn((t - t1) / 0.25);
  return `<g transform="translate(${n2(cx)},${n2(cy)}) scale(${Math.max(0, s).toFixed(3)}) translate(${n2(-cx)},${n2(-cy)})">${inner}</g>`;
}
function fadeG(t, t0, t1, inner) { // t0 淡入，t1 淡出
  if (t < t0 || t > t1 + .3) return '';
  const op = Math.min(prog(t, t0, t0 + .2), 1 - prog(t, t1, t1 + .3));
  return `<g opacity="${op.toFixed(3)}">${inner}</g>`;
}
function panel(x, y, w, h, title, seed, { fill = WIN, size = 30 } = {}) {
  let g = shape(rr(x, y, w, h, 20, seed, 1.3), { fill, sw: 4 });
  if (title) g += stroke(wline(x, y + 58, x + w, y + 58, seed + 1), 3) + txt(title, x + 26, y + 41, { size, weight: 700 });
  return g;
}
function pill(x, y, s, { fill = SOFT, size = 28, color = INK, seed = 1, anchor = 'middle', weight = 400 } = {}) {
  const w = textW(s, size) + 40, h = size + 22, x0 = anchor === 'middle' ? x - w / 2 : x;
  return shape(rr(x0, y - h / 2, w, h, h / 2, seed, .8), { fill, sw: 3 }) + txt(s, x0 + w / 2, y + size * .36, { size, anchor: 'middle', fill: color, weight });
}
const checkMark = (x, y, p, sz = 20, color = C.green) => drawOn(`M${x - sz},${y}L${x - sz * .3},${y + sz * .7}L${x + sz},${y - sz * .8}`, p, 7, color);
const crossMark = (x, y, p, sz = 20, color = C.red) =>
  drawOn(`M${x - sz},${y - sz}L${x + sz},${y + sz}`, p * 2, 7, color) + drawOn(`M${x + sz},${y - sz}L${x - sz},${y + sz}`, p * 2 - 1, 7, color);
function textLines(x, y, w, n, seed, gap = 26, color = '#CFC6B6') {
  let g = '';
  for (let i = 0; i < n; i++) g += stroke(wline(x, y + i * gap, x + w * (i === n - 1 ? .6 : 1), y + i * gap, seed + i, .7), 5, color);
  return g;
}
function stamp(text, x, y, t, t0, { color = C.red, rot = -12, size = 40 } = {}) {
  if (t < t0) return '';
  const p = prog(t, t0, t0 + .12), sc = lerp(1.9, 1, easeIn(p)), w = textW(text, size) + 44;
  const inner = `<g opacity="${(.3 + .6 * p).toFixed(2)}">` + shape(rr(-w / 2, -size * .9, w, size * 1.8, 12, 700 + (x | 0), 1.4), { sw: 6, stroke: color }) +
    txt(text, 0, size * .36, { size, anchor: 'middle', fill: color, font: FUN }) + `</g>`;
  return `<g transform="translate(${n2(x)},${n2(y)}) rotate(${rot}) scale(${sc.toFixed(3)})">${inner}</g>`;
}
function typedText(s, t, t0, dt) { return t < t0 ? '' : s.slice(0, clamp(Math.floor((t - t0) / dt) + 1, 0, s.length)); }
function drop(t, t0, x, y, inner, h = 300) { // 从上方掉下来落到 (x,y)，落地压扁回弹
  if (t < t0) return '';
  const p = prog(t, t0, t0 + .28), dy = lerp(-h - 400, 0, easeIn(p));
  const sq = t > t0 + .28 ? 1 - .15 * Math.exp(-(t - t0 - .28) * 12) * Math.cos((t - t0 - .28) * 30) : 1;
  return `<g transform="translate(${n2(x)},${n2(y + dy)}) scale(${(1 / Math.sqrt(sq)).toFixed(3)},${sq.toFixed(3)})">${inner}</g>`;
}
function marker(x, y, w, t, t0, color = C.yellow) { // 荧光笔划过
  const p = easeOut(prog(t, t0, t0 + .25));
  return p > 0 ? `<path d="M${x},${y - 34}L${x + w * p},${y - 38}L${x + 2 + w * p},${y + 10}L${x - 2},${y + 8}Z" fill="${color}" opacity=".85"/>` : '';
}
function titleCard(t, t0, num, title) {
  const p = prog(t, t0 + .3, t0 + .9);
  return txt(title, 480, 208, { size: 62, weight: 700, op: clamp(prog(t, t0 + .15, t0 + .4)) }) +
    drawOn(wline(480, 236, 480 + textW(title, 62), 232, 800 + num, 2, 40), p, 7, C.red);
}

// ---------- 小图标（原点在底部中心，高约 150） ----------
function icMonitor(s = 1) {
  return `<g transform="scale(${s})">` + shape(rr(-95, -170, 190, 125, 12, 11), { fill: '#fff', sw: 4 }) +
    stroke('M-70,-80L-40,-105L-10,-90L25,-130L65,-110', 5, C.green) + shape(rr(-18, -45, 36, 30, 4, 12, .6), { fill: C.grey, sw: 3.5 }) +
    shape(rr(-60, -16, 120, 16, 6, 13, .6), { fill: C.grey, sw: 3.5 }) + `</g>`;
}
function icToolbox(s = 1) {
  return `<g transform="scale(${s})">` + stroke('M-40,-110Q-40,-140 0,-140Q40,-140 40,-110', 8) +
    shape(rr(-100, -115, 200, 115, 12, 21), { fill: C.red, hatch: true, sw: 4 }) + stroke('M-100,-72L100,-72', 4) +
    shape(rr(-18, -84, 36, 24, 4, 22, .5), { fill: C.butter, sw: 3 }) + `</g>`;
}
function icPapers(s = 1) {
  let g = `<g transform="scale(${s})">`;
  [[-12, -8, 6], [8, -4, -4], [0, 0, 0]].forEach(([dx, dy, r], i) => {
    g += `<g transform="translate(${dx},${dy}) rotate(${r})">` + shape(rr(-70, -150, 140, 150, 8, 31 + i), { fill: '#fff', sw: 3.5 }) + (i === 2 ? textLines(-48, -118, 96, 4, 40, 24) : '') + `</g>`;
  });
  return g + `</g>`;
}
function icGauge(s = 1) {
  return `<g transform="scale(${s})">` + shape('M-90,0A90,90 0 0 1 90,0Z', { fill: '#fff', sw: 4 }) +
    stroke('M0,0L55,-55', 7, C.red) + `<circle cx="0" cy="0" r="9" fill="${INK}"/>` + stroke('M-70,-10L-58,-18M0,-80L0,-66M70,-10L58,-18', 4) + `</g>`;
}
function icPerson(x, y, r, fill) {
  return shape(circ(x, y, r, 60 + (x | 0), 1), { fill, sw: 3.5 }) +
    `<circle cx="${x - r * .32}" cy="${y - r * .08}" r="${r * .1}" fill="${INK}"/><circle cx="${x + r * .32}" cy="${y - r * .08}" r="${r * .1}" fill="${INK}"/>` +
    stroke(`M${x - r * .28},${y + r * .3}Q${x},${y + r * .5} ${x + r * .28},${y + r * .3}`, 3);
}
function icLock(x, y, open) {
  return stroke(`M${x - 18},${y - 10}L${x - 18},${y - 34 - (open ? 18 : 0)}Q${x - 18},${y - 58 - (open ? 18 : 0)} ${x + 2},${y - 58 - (open ? 18 : 0)}Q${x + 20},${y - 58 - (open ? 18 : 0)} ${x + 20},${y - 34 - (open ? 18 : 0)}${open ? '' : `L${x + 20},${y - 10}`}`, 7) +
    shape(rr(x - 32, y - 14, 64, 52, 8, 71, .6), { fill: C.yellow, sw: 3.5 }) + `<circle cx="${x}" cy="${y + 10}" r="6" fill="${INK}"/>`;
}
function icHourglass(x, y, p) {
  const top = 1 - p;
  return shape(`M${x - 26},${y - 44}L${x + 26},${y - 44}L${x + 4},${y}L${x + 26},${y + 44}L${x - 26},${y + 44}L${x - 4},${y}Z`, { fill: '#fff', sw: 4 }) +
    `<path d="M${x - 20 * top},${y - 40 * top}L${x + 20 * top},${y - 40 * top}L${x},${y - 2}Z" fill="${C.butter}"/>` +
    `<path d="M${x - 22 * p},${y + 42}L${x + 22 * p},${y + 42}L${x},${y + 42 - 36 * p}Z" fill="${C.butter}"/>` +
    stroke(`M${x - 32},${y - 46}L${x + 32},${y - 46}M${x - 32},${y + 46}L${x + 32},${y + 46}`, 6);
}
function icPin(x, y) { return shape(`M${x},${y + 36}Q${x - 34},${y - 4} ${x - 34},${y - 24}A34,34 0 1 1 ${x + 34},${y - 24}Q${x + 34},${y - 4} ${x},${y + 36}Z`, { fill: C.red, sw: 4 }) + `<circle cx="${x}" cy="${y - 24}" r="12" fill="#fff"/>`; }
function icQBubble(x, y) { return shape(rr(x - 40, y - 34, 80, 58, 18, 81), { fill: C.sky, sw: 4 }) + `<path d="M${x - 14},${y + 22}L${x - 22},${y + 40}L${x + 2},${y + 23}Z" fill="${C.sky}" stroke="${INK}" stroke-width="3"/>` + txt('?', x, y + 12, { size: 38, anchor: 'middle', weight: 700 }); }
function icDocChart(x, y) {
  return shape(rr(x - 34, y - 44, 68, 88, 8, 91), { fill: '#fff', sw: 4 }) +
    [[-18, 16], [-2, 26], [14, 36]].map(([dx, h]) => `<rect x="${x + dx - 6}" y="${y + 30 - h}" width="12" height="${h}" fill="${C.green}"/>`).join('') + textLines(x - 22, y - 26, 44, 1, 92, 20);
}
function icPaw(x, y, s, color = C.red, op = 1) {
  return `<g transform="translate(${x},${y}) scale(${s})" opacity="${op}" fill="${color}"><ellipse cx="0" cy="18" rx="34" ry="28"/>` +
    `<ellipse cx="-38" cy="-18" rx="13" ry="17"/><ellipse cx="-14" cy="-38" rx="13" ry="17"/><ellipse cx="14" cy="-38" rx="13" ry="17"/><ellipse cx="38" cy="-18" rx="13" ry="17"/></g>`;
}
function icLoop(x, y, r, t) {
  const a = t * 3;
  return `<g transform="rotate(${n2(a * 57.3)},${x},${y})">` + stroke(`M${x + r},${y}A${r},${r} 0 0 1 ${x - r},${y}`, 7, C.green) + stroke(`M${x - r},${y}A${r},${r} 0 0 1 ${x + r},${y}`, 7, C.sky) +
    `<path d="M${x - r - 12},${y - 4}L${x - r},${y + 14}L${x - r + 12},${y - 4}Z" fill="${C.green}"/><path d="M${x + r - 12},${y + 4}L${x + r},${y - 14}L${x + r + 12},${y + 4}Z" fill="${C.sky}"/></g>`;
}
function icSparkles(x, y, t, t0, n = 3, r = 60) {
  if (t < t0) return '';
  let g = '';
  for (let i = 0; i < n; i++) { const a = i / n * 6.28 + 0.6, k = spring(t - t0 - i * .06) * (1 + .12 * Math.sin(t * 9 + i)); g += `<g transform="translate(${n2(x + r * Math.cos(a))},${n2(y + r * Math.sin(a))}) scale(${k.toFixed(3)})">${star4(0, 0, 14 - i * 2)}</g>`; }
  return g;
}
function arrow(x1, y1, x2, y2, p, color = INK, seed = 1) {
  if (p <= 0) return '';
  const d = wline(x1, y1, x2, y2, seed, 2, 50), a = Math.atan2(y2 - y1, x2 - x1);
  const head = p > .95 ? stroke(`M${n2(x2 - 18 * Math.cos(a - .5))},${n2(y2 - 18 * Math.sin(a - .5))}L${x2},${y2}L${n2(x2 - 18 * Math.cos(a + .5))},${n2(y2 - 18 * Math.sin(a + .5))}`, 5, color) : '';
  return drawOn(d, p, 5, color) + head;
}
// 聊天小窗（名称只写文字，不用平台 logo）
function chatBox(x, y, w, h, name, seed, fill = WIN) {
  return shape(rr(x, y, w, h, 18, seed, 1.3), { fill, sw: 4 }) + stroke(wline(x, y + 58, x + w, y + 58, seed + 1), 3) +
    [0, 1, 2].map(i => `<circle cx="${x + 30 + i * 26}" cy="${y + 29}" r="7" fill="${[C.red, C.yellow, C.green][i]}" stroke="${INK}" stroke-width="2.5"/>`).join('') +
    txt(name, x + w / 2, y + 41, { size: 30, anchor: 'middle', weight: 700 });
}
function userBubble(xr, y, text, size = 30) {
  const w = textW(text, size) + 40;
  return shape(rr(xr - w, y, w, size + 30, 18, 110 + text.length), { fill: C.sky, sw: 3 }) + txt(text, xr - w + 20, y + size + 6, { size });
}


// ---------- 主角：芯芯（Agent 小队的总管，2026-10-14 接替团子） ----------
// 时间线 TRACK 驱动的主角是芯芯；小队其他成员用 drawMate() 放进场景。旧团子：BOT_STYLE 换回 { kind: 'bot', color: '#4CC7A6', glow: '#8FF5DC', light: C.red, ear: C.grey }
const BOT_STYLE = { kind: 'xinxin' };
const WORK_ACTS = ['type', 'magnify', 'camera', 'folder', 'busy'];   // 干活时头顶光点更亮
// 自动眨眼：每个角色节奏不同，只在睁眼的默认表情上眨
const autoBlink = (t, seed = 0) => ((t + seed * 1.7) % (3.3 + seed % 1.1)) < .13;
// 动作库：TRACK 里用 act 指定。道具 prop：laptop 笔记本 / camera 相机 / magnifier 放大镜 / folder 文件夹
const ACTS = {
  idle: {},                                                             // 平常站着
  look: { look: [9, 0] },                                               // 看向前方（配合 flip 看左边）
  point: { eyes: 'happy', mouth: 'grin', arms: 'point' },               // 指重点
  wave: { eyes: 'happy', mouth: 'grin', arms: 'wave' },                 // 打招呼
  surprise: { eyes: 'wide', mouth: 'o', arms: 'cheer' },                // 惊讶
  sus: { eyes: 'sus', mouth: 'flat' },                                  // 怀疑、审视
  flat: { mouth: 'flat', arms: 'shrug' },                               // 无语、摊手
  worry: { look: [0, -9], eyes: 'wide', mouth: 'wavy', sweat: true },   // 发愁
  think: { mouth: 'dots', look: [6, -6], arms: 'hold' },                // 思考中
  wait: { eyes: 'blink', mouth: 'flat', arms: 'hold', squash: .94 },    // 耐心等待
  busy: { eyes: 'squint', mouth: 'wavy', arms: 'busy' },                // 手忙脚乱地整理
  dizzy: { eyes: 'dizzy', mouth: 'wavy', squash: .85 },                 // 晕了、被砸中、没兴趣
  chest: { eyes: 'happy', mouth: 'smile', arms: 'chest' },              // 交给我
  done: { eyes: 'star', mouth: 'grin', arms: 'thumbs' },                // 搞定（竖大拇指 + 星星眼）
  highfive: { eyes: 'happy', mouth: 'grin', arms: 'highfive' },         // 击掌（加 hand: true 会有你的手伸进来）
  type: { prop: 'laptop', arms: 'type', mouth: 'dots', look: [0, 7] },  // 抱着笔记本敲键盘干活
  camera: { prop: 'camera', arms: 'hold', eyes: 'sus', look: [9, -2] }, // 端相机拍照（加 flash: 秒数 在那一刻闪光）
  magnify: { prop: 'magnifier', arms: 'point', eyes: 'sus', mouth: 'flat', look: [9, 2] }, // 举放大镜审视
  folder: { prop: 'folder', arms: 'hold', eyes: 'happy', mouth: 'grin' },                  // 抱文件夹整理资料
};

// TRACK 每一项：{ t, act, x, y?, flip?, s?, move?, dur?, clip?, hand?, flash? }
//   move: 'hop' 蹦蹦跳跳走过去（dur 秒）；'walk' 小步走；'peek' 从画面底部探出上半身（y 设在镜头下沿以下约 70px）
//   flip: true 朝左（视线和指的方向跟着变）；clip: [x, y, w, h] 世界坐标裁切框（比如跳进某个窗口里）
function trackState(t) {
  let i = 0;
  while (i + 1 < TRACK.length && TRACK[i + 1].t <= t) i++;
  const e = TRACK[i], prev = TRACK[Math.max(0, i - 1)], next = TRACK[i + 1];
  const act = ACTS[e.act || 'idle'] || {};
  const o = { ...act, act: e.act, x: e.x, y: e.y != null ? e.y : GROUND, flip: !!e.flip, s: BOT_S * (e.s || 1), squash: act.squash || 1,
    walkAmp: 0, phase: 0, rot: 0, clip: e.clip, entry: e };
  if (e.move === 'hop' && t < e.t + e.dur) {
    const p = prog(t, e.t, e.t + e.dur);
    Object.assign(o, { eyes: 'dot', mouth: 'smile', arms: 'rest', prop: null, look: [9, 0], flip: e.x < prev.x, x: lerp(prev.x, e.x, easeInOut(p)), y: GROUND, clip: null, s: BOT_S });
    o.walkAmp = Math.min(1, prog(t, e.t, e.t + .1), 1 - prog(t, e.t + e.dur - .1, e.t + e.dur));
    o.phase = o.x / 45; o.y -= 26 * Math.abs(Math.sin(p * Math.PI * Math.max(1, Math.round(e.dur * 4))));
    return o;
  }
  const settle = e.move === 'hop' ? e.t + e.dur : e.t;
  if (e.move === 'walk' && t < e.t + e.dur) {
    const p = prog(t, e.t, e.t + e.dur);
    o.x = lerp(prev.x, e.x, p); o.walkAmp = Math.min(1, prog(t, e.t, e.t + .1), 1 - prog(t, e.t + e.dur - .1, e.t + e.dur)); o.phase = o.x / 30;
  }
  if (e.move === 'peek') {
    o.front = true; o.shadow = false; o.s = BOT_S * (e.s || 1.2);
    o.y = e.y + 420 * (1 - easeOut(prog(t, e.t, e.t + .28)));
    if (next) o.y += 420 * easeIn(prog(t, next.t - .22, next.t));
    o.rot = 2.5 * Math.sin((t - e.t) * 2.4);
  }
  if (e.clip) o.shadow = false;
  o.pop = t < settle ? 1 : 0.9 + 0.1 * spring(t - settle);   // 换动作时轻轻弹一下
  if (e.act === 'surprise') o.y -= 26 * Math.sin(prog(t, e.t, e.t + .3) * Math.PI);
  if (e.act === 'camera' && e.flash != null && t >= e.flash && t < e.flash + .25) o.flash = true;
  if (e.act === 'highfive' && t > e.t + .3 && t < e.t + .55) o.squash = 1 - .08 * Math.sin(prog(t, e.t + .3, e.t + .55) * Math.PI);
  return o;
}

// 你的手：从画面外伸进来和芯芯击掌（TRACK 项 act: 'highfive', hand: true 时出现）
function partnerHand(o, t) {
  const e = o.entry;
  if (!e || e.act !== 'highfive' || !e.hand) return '';
  const t0 = e.t, t1 = e.t + .3, t2 = e.t + .8;
  if (t < t0 || t > t2 + .3) return '';
  const s = o.s, dir = o.flip ? -1 : 1;
  const hx = o.x + dir * (132 + 34) * s, hy = o.y - 214 * s;
  const p = easeOut(prog(t, t0, t1)) * (1 - easeIn(prog(t, t2, t2 + .3)));
  const sx = hx + dir * 1500, sy = hy - 420, tx = lerp(sx, hx, p), ty = lerp(sy, hy, p);
  const d = `M${n2(sx)},${n2(sy)}L${n2(tx)},${n2(ty)}`;
  let g = stroke(d, 50) + stroke(d, 40, C.sky) + `<path d="${d}" fill="none" stroke="url(#hatch)" stroke-width="40"/>` +
    `<circle cx="${n2(tx)}" cy="${n2(ty)}" r="26" fill="#F2C9A0" stroke="${INK}" stroke-width="4"/>` +
    [-1, 0, 1].map(k => stroke(`M${n2(tx + k * 9)},${n2(ty - 18)}l${k * 3},-14`, 4)).join('');
  if (t > t1 && t < t1 + .45) {
    const k = spring(t - t1);
    g += `<g transform="translate(${n2(hx - dir * 16 * s)},${n2(hy)}) scale(${k.toFixed(3)})">` + [0, 1, 2, 3, 4, 5].map(i => { const a = i / 6 * 6.28; return stroke(`M${n2(40 * Math.cos(a))},${n2(40 * Math.sin(a))}L${n2(62 * Math.cos(a))},${n2(62 * Math.sin(a))}`, 5, C.yellow); }).join('') + `</g>`;
  }
  return g;
}
function drawBot(o, t) {
  const s = o.s * (o.pop == null ? 1 : o.pop);
  const blink = !o.eyes && !o.walkAmp && autoBlink(t);
  return mascot({ ...o, ...BOT_STYLE, s, blink, bright: WORK_ACTS.includes(o.act), shadow: o.shadow !== false }, t) + partnerHand(o, t);
}
// 小队其他成员（火火 huohuo、翻翻 fanfan、格格 gege、页页 yeye、叮叮 dingding，也可以再放一个芯芯 xinxin）：
// 在场景区函数或 frontLayer 里调用，(x, y) 是脚底；act 用 ACTS 里的动作名；t0 给了就从这一刻弹出（音效另外写 cue('pop', t0)）
function drawMate(kind, x, y, t, { act = 'idle', s = BOT_S * .85, t0 = null, t1 = null, ...rest } = {}) {
  if (t0 != null && t < t0) return '';
  if (t1 != null && t > t1 + .25) return '';
  let k = t0 == null ? 1 : Math.max(.01, spring(t - t0));
  if (t1 != null && t > t1) k *= 1 - easeIn(prog(t, t1, t1 + .25));
  const a = ACTS[act] || {}, seed = Object.keys(CREW).indexOf(kind) + 1;
  return mascot({ ...a, ...rest, kind, x, y, s: s * k, squash: a.squash || 1, blink: !a.eyes && autoBlink(t, seed), bright: WORK_ACTS.includes(act) }, t);
}
// 主角当前的头顶 y（放头顶气泡用）
const botTop = o => o.y - 250 * o.s;

// ---------- 字幕 ----------
function subtitle(t) {
  const s = SUBS.find(([a, b]) => t >= a && t < b);
  if (!s) return '';
  const op = Math.min(prog(t, s[0], s[0] + .08), 1 - prog(t, s[1] - .08, s[1]));
  return `<text x="960" y="1036" text-anchor="middle" font-family='${FONT}' font-weight="700" font-size="50" fill="${INK}" stroke="${PAPER}" stroke-width="14" stroke-linejoin="round" paint-order="stroke" opacity="${op.toFixed(2)}">${esc(s[2])}</text>`;
}

// ---------- 渲染入口：画面 = f(帧号) ----------
// REGIONS 每一项：[左边界, 右边界, 绘制函数(t), 出现时间, 结束时间]；只画镜头里看得见、且在时间段内的区。
function renderFrame(f) {
  const t = f / FPS;
  const cam = keyframes(t, CAM);
  const o = trackState(t);
  const half = W / 2 / cam.s + 200, vx0 = cam.cx - half, vx1 = cam.cx + half;
  const see = (x0, x1) => x1 > vx0 && x0 < vx1;
  const w = [];
  REGIONS.forEach(([x0, x1, fn, t0, t1]) => { if (t >= t0 && t <= t1 && see(x0, x1)) w.push(`<g transform="translate(${x0},0)">${fn(t)}</g>`); });
  if (!o.front) w.push(drawBot(o, t));
  // 桌面画在主角之后；从底部探头（peek）的主角画在桌面前面
  w.push(shape(rr(Math.floor(vx0 / 500) * 500 - 200, GROUND, 2 * half + 1400, 400, 0, 500, 1.5), { fill: SOFT, sw: 4.5 }));
  if (o.front) w.push(drawBot(o, t));
  if (typeof frontLayer === 'function') w.push(frontLayer(t, see));   // 场景可选：画在主角和桌面之上的东西
  STK.forEach(([x, y, text, t0, t1, opts]) => { if (see(x - 300, x + 300)) w.push(sticker(text, x, y, t, t0, t1, opts)); });
  BUB.forEach(([x, y, text, t0, t1, opts]) => { if (see(x - 300, x + 300)) w.push(bubble(text, x, y, t, t0, t1, { seed: 9, ...opts })); });
  const camT = `translate(${W / 2},${H / 2}) scale(${cam.s.toFixed(4)}) translate(${n2(-cam.cx)},${n2(-cam.cy)})`;
  document.getElementById('frame').innerHTML = DEFS +
    `<rect width="${W}" height="${H}" fill="${PAPER}"/>` +
    `<g transform="${camT}">${w.join('')}</g>` +
    `<rect width="${W}" height="${H}" filter="url(#grain)"/>` +
    `<rect width="${W}" height="${H}" fill="url(#vig)"/>` +
    subtitle(t);
}

// ---------- 启动：等 scene.js 等全部脚本加载完，再加载字体和猫咪贴纸；任何一样没加载成功就停止渲染 ----------
window.ready = new Promise(r => window.addEventListener('load', r)).then(async () => {
  window.TOTAL_FRAMES = Math.round(TOTAL * FPS);
  const sample = SUBS.map(s => s[2]).join('') + '0123456789ABC?!';
  document.getElementById('preload').innerHTML = `<span style='font-family:${FONT}'>${sample}</span><span style='font-family:${FONT};font-weight:700'>${sample}</span><span style='font-family:${FUN}'>${sample}</span>`;
  await Promise.all([document.fonts.load(`40px ${FONT}`, sample), document.fonts.load(`700 40px ${FONT}`, sample), document.fonts.load(`40px ${FUN}`, sample)]);
  await document.fonts.ready;
  const faces = [...document.fonts].filter(f => f.family.includes('Video'));
  if (faces.length < 3 || faces.some(f => f.status !== 'loaded'))
    throw new Error('字体未加载，停止渲染：' + faces.map(f => `${f.family} ${f.weight} ${f.status}`).join(', '));
  document.getElementById('preload').innerHTML = ''; // 清掉预加载文字，免得溢出到画面里
  document.getElementById('stage').innerHTML = '<g id="frame"></g>';
  renderFrame(0);
  await new Promise(r => setTimeout(r, 200));
  return true;
});
window.renderFrame = renderFrame;
