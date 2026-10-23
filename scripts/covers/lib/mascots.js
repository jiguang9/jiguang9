// 固定角色：硅基光哥的 Agent 小队（2026-10-14 用户定稿，接替团子）。主角芯芯 kind: 'xinxin'，另外五个：huohuo 火火、fanfan 翻翻、gege 格格、yeye 页页、dingding 叮叮。
// 手绘版：抖线描边 + 排线纹理，身子纯色、手脚同色加深，大豆豆眼带高光，头顶弯弯小天线挂琥珀光点。外形颜色名字都是用户定的，不要改。
// 旧主角团子机器人（kind: 'bot'）和几个备用外形（bubble 聊天框、lens 放大镜、folder 文件夹、cloud 耳麦云朵、laptop 笔记本）还留着，用户点名才用。依赖 engine.js 和 widgets.js（star4、textLines）。
// mascot(o, t)：o.kind 角色；(o.x, o.y) 双脚落点；o.s 缩放；o.eyes / o.mouth 表情；o.arms 手势；o.look 视线偏移；
//   o.squash 压扁；o.walkAmp / o.phase 走路；o.rot 旋转；o.sweat 汗滴；o.flip 镜像（只影响视线和手势方向）。
const MASCOT_H = 240; // 角色高度（本地坐标，含腿）


// ---------- Agent 小队 ----------
const CREW = {
  xinxin:   { name: '芯芯', role: '总管', color: '#FFC53D' },   // 柠檬黄芯片（主角）
  huohuo:   { name: '火火', role: '跑腿', color: '#F0544A' },   // 番茄红胶囊
  fanfan:   { name: '翻翻', role: '调研', color: '#22BFA8' },   // 薄荷青拱门
  gege:     { name: '格格', role: '数据', color: '#3D73F0' },   // 宝石蓝六边形
  yeye:     { name: '页页', role: '写稿', color: '#62BD45' },   // 草绿折角便签
  dingding: { name: '叮叮', role: '沟通', color: '#A65CF0' },   // 葡萄紫对话气泡
};
const AMBER = '#FFB547';
function shadeHex(hex, k) { const n = parseInt(hex.slice(1), 16); return `rgb(${[n >> 16, n >> 8 & 255, n & 255].map(v => Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1))).join(',')})`; }
// 圆角多边形采样成点，再走手绘抖动：corners = [[x, y, 圆角半径], …]（顺时针）
function roundPoly(corners, seed, amp = 1.2, step = 24) {
  const pts = [], n = corners.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = corners[(i - 1 + n) % n], [x1, y1, r] = corners[i], [x2, y2] = corners[(i + 1) % n];
    const l1 = Math.hypot(x0 - x1, y0 - y1), l2 = Math.hypot(x2 - x1, y2 - y1), rr2 = Math.min(r, l1 / 2, l2 / 2);
    const a = [x1 + (x0 - x1) / l1 * rr2, y1 + (y0 - y1) / l1 * rr2], b = [x1 + (x2 - x1) / l2 * rr2, y1 + (y2 - y1) / l2 * rr2];
    for (let k = 0; k <= 4; k++) { const u = k / 4; pts.push([(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * x1 + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * y1 + u * u * b[1]]); }
    const [x3, y3] = corners[(i + 1) % n], r3 = corners[(i + 1) % n][2], l3 = Math.hypot(x3 - x1, y3 - y1), rr3 = Math.min(r3, l3 / 2);
    edgePts(pts, b[0], b[1], x3 - (x3 - x1) / l3 * rr3, y3 - (y3 - y1) / l3 * rr3, step);
  }
  return smoothClosed(jitter(pts, seed, amp));
}
// 每个角色的身子：本地坐标，脚在 y = 0，身子大约 x ±95、y -236 ~ -64（和团子一样大）
function crewBody(kind, t, o) {
  const c = o.color || CREW[kind].color, dk = shadeHex(c, .78), glow = .5 + .5 * Math.sin(t * 5);
  const sh = (d, extra = {}) => shape(d, { fill: c, hatch: true, sw: 4.5, ...extra });
  let body = '', back = '', face = [0, -158], top = -236, shoulders = [[-92, -126], [92, -126]];
  if (kind === 'xinxin') {          // 芯片：圆角方块 + 头顶两个小针脚 + 淡淡电路纹
    back = shape(rr(-50, -256, 22, 30, 10, 1201, .5), { fill: dk, sw: 3.5 }) + shape(rr(28, -256, 22, 30, 10, 1202, .5), { fill: dk, sw: 3.5 });
    body = sh(rr(-96, -238, 192, 176, 56, 1203)) + stroke('M58,-96 v-16 h16', 3.5, '#fff', 'opacity=".45"') + stroke('M-70,-196 h14 v-16', 3.5, '#fff', 'opacity=".45"') +
      `<circle cx="74" cy="-112" r="4.5" fill="#fff" opacity=".55"/><circle cx="-56" cy="-212" r="4.5" fill="#fff" opacity=".55"/>`;
  } else if (kind === 'huohuo') {   // 胶囊：横着的圆角长条
    body = sh(rr(-108, -214, 216, 152, 76, 1211)); face = [0, -146]; top = -214; shoulders = [[-100, -130], [100, -130]];
  } else if (kind === 'fanfan') {   // 拱门：圆顶 + 方底
    body = sh(roundPoly([[-88, -244, 88], [88, -244, 88], [88, -62, 20], [-88, -62, 20]], 1221)); face = [0, -146]; top = -244;
  } else if (kind === 'gege') {     // 六边形
    body = sh(roundPoly([[0, -252, 26], [96, -202, 26], [96, -104, 26], [0, -54, 26], [-96, -104, 26], [-96, -202, 26]], 1231)); face = [0, -154]; top = -250;
  } else if (kind === 'yeye') {     // 折角便签
    body = sh(roundPoly([[-88, -240, 24], [44, -240, 6], [88, -196, 6], [88, -62, 24], [-88, -62, 24]], 1241)) +
      shape(poly([[44, -240], [44, -206], [88, -196]], 1242, .6, 20), { fill: shadeHex(c, 1.3), sw: 4 });
    face = [-6, -150]; top = -240;
  } else {                          // dingding 对话气泡：圆角方块 + 左下小尾巴
    body = sh(roundPoly([[-98, -240, 46], [98, -240, 46], [98, -84, 46], [-18, -84, 8], [-74, -52, 6], [-58, -84, 8], [-98, -84, 30]], 1251)); face = [0, -164]; shoulders = [[-94, -140], [94, -140]];
  }
  // 弯弯小天线 + 琥珀光点（干活时 o.bright 更亮）
  const bx = 12, by = top - 30, br = o.bright ? 13 : 11;
  back += stroke(`M0,${top + 6}Q-4,${top - 14} ${bx},${by + 8}`, 5, INK) +
    `<circle cx="${bx}" cy="${by}" r="${br + 9}" fill="${AMBER}" opacity="${((o.bright ? .45 : .22) * (.6 + .4 * glow)).toFixed(2)}"/>` +
    `<circle cx="${bx}" cy="${by}" r="${br}" fill="${AMBER}" stroke="${INK}" stroke-width="3.5"/><circle cx="${bx - 4}" cy="${by - 4}" r="3" fill="#fff"/>`;
  return { back, body, face, eyeGap: 30, eyeR: 1, bean: true, limb: dk, shoulders, top: top - 44, legs: 26, legTop: -64 };
}

function mascotBody(kind, t, o = {}) {
  if (CREW[kind]) return crewBody(kind, t, o);
  if (kind === 'bot') { // 团子机器人：深色屏幕脸 + 发光眼睛，胸前 AI 工牌
    const glow = .6 + .4 * Math.sin(t * 5);
    const body = o.color || C.mint, eye = o.glow || '#8FF5DC', light = o.light || C.red, ear = o.ear || C.grey;
    return {
      back: stroke('M0,-232L0,-262', 5) + `<circle cx="0" cy="-268" r="11" fill="${light}" stroke="${INK}" stroke-width="3.5"/><circle cx="0" cy="-268" r="18" fill="${light}" opacity="${(.25 * glow).toFixed(2)}"/>` +
        shape(rr(-106, -182, 18, 40, 7, 941, .6), { fill: ear, sw: 3.5 }) + shape(rr(88, -182, 18, 40, 7, 942, .6), { fill: ear, sw: 3.5 }),
      body: shape(rr(-92, -236, 184, 172, 80, 943, 1.2), { fill: body, hatch: true, sw: 4.5 }) +
        shape(rr(-66, -214, 132, 94, 36, 944, .8), { fill: '#2E3446', sw: 4 }) +
        shape(rr(-26, -106, 52, 30, 9, 945, .6), { fill: '#fff', sw: 3 }) + txt('AI', 0, -84, { size: 20, anchor: 'middle', weight: 700 }),
      face: [0, -170], eyeGap: 28, eyeR: 1, screen: eye, shoulders: [[-92, -130], [92, -130]], top: -262, legs: 30, legTop: -64,
    };
  }
  if (kind === 'cloud') { // 耳麦云朵：白色云朵 + 红色耳麦，随时待命
    const cs = [[-60, -128, 50], [0, -166, 62], [62, -130, 50], [-30, -98, 46], [32, -98, 46]];
    return {
      back: '',
      body: cs.map(([x, y, r], i) => `<path d="${circ(x, y, r, 950 + i, 1)}" fill="none" stroke="${INK}" stroke-width="9"/>`).join('') +
        cs.map(([x, y, r], i) => `<path d="${circ(x, y, r, 950 + i, 1)}" fill="#fff"/>`).join('') +
        cs.map(([x, y, r], i) => `<path d="${circ(x, y, r, 950 + i, 1)}" fill="url(#hatch)" opacity=".5"/>`).join('') +
        stroke('M-78,-168Q0,-268 78,-168', 12) + stroke('M-78,-168Q0,-268 78,-168', 6, C.red) +
        shape(rr(-100, -186, 30, 50, 12, 956, .6), { fill: C.red, sw: 4 }) + shape(rr(70, -186, 30, 50, 12, 957, .6), { fill: C.red, sw: 4 }) +
        stroke('M-86,-140Q-80,-100 -38,-96', 5) + `<circle cx="-34" cy="-96" r="8" fill="${INK}"/>`,
      face: [0, -140], eyeGap: 30, eyeR: 1, shoulders: [[-104, -118], [104, -118]], top: -250, legs: 30, legTop: -56,
    };
  }
  if (kind === 'laptop') { // 笔记本电脑君：屏幕是脸，键盘是身体，一直在干活
    let keys = '';
    for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++) keys += `<rect x="${-80 + c * 23 + r * 6}" y="${-110 + r * 16}" width="17" height="10" rx="3" fill="${C.grey}"/>`;
    return {
      back: '',
      body: shape(rr(-98, -252, 196, 136, 18, 931, 1.2), { fill: C.lav, hatch: true, sw: 4.5 }) + shape(rr(-82, -238, 164, 108, 12, 932, .8), { fill: '#EEF7FF', sw: 3.5 }) +
        shape(poly([[-110, -118], [110, -118], [98, -70], [-98, -70]], 933, .8, 30), { fill: '#fff', sw: 4.5 }) + keys,
      face: [0, -186], eyeGap: 30, eyeR: .95, shoulders: [[-106, -96], [106, -96]], top: -252, legs: 30, legTop: -70,
    };
  }
  if (kind === 'lens') {
    const cx = 0, cy = -160;
    return {
      back: stroke('M52,-104L104,-52', 30) + stroke('M52,-104L104,-52', 21, '#B8743E') + stroke('M58,-98L98,-58', 21, 'url(#hatch)'),
      body: `<circle cx="${cx}" cy="${cy}" r="90" fill="${C.yellow}" stroke="${INK}" stroke-width="4.5"/>` +
        `<circle cx="${cx}" cy="${cy}" r="90" fill="url(#hatch)"/>` +
        `<circle cx="${cx}" cy="${cy}" r="68" fill="#DDF1FA" stroke="${INK}" stroke-width="4"/>` +
        stroke(`M${cx - 44},${cy - 30}Q${cx - 34},${cy - 50} ${cx - 12},${cy - 56}`, 6, '#fff'),
      face: [cx, cy + 4], eyeGap: 27, eyeR: 1.15, shoulders: [[-88, -150], [88, -150]], top: -250, legs: 30, legTop: -72,
    };
  }
  if (kind === 'folder') {
    return {
      back: shape(rr(-92, -236, 76, 34, 10, 961), { fill: C.fold, sw: 4 }) + shape(rr(-92, -218, 184, 160, 14, 962), { fill: C.fold, sw: 4 }) +
        shape(rr(-68, -250, 136, 90, 6, 963, .8), { fill: '#fff', sw: 3.5 }) + textLines(-50, -228, 100, 2, 964, 20),
      body: shape(poly([[-98, -196], [98, -196], [92, -58], [-92, -58]], 965, 1.2), { fill: C.butter, hatch: true, sw: 4.5 }),
      face: [0, -128], eyeGap: 30, eyeR: 1, shoulders: [[-96, -128], [96, -128]], top: -250, legs: 30, legTop: -60,
    };
  }
  // bubble：聊天气泡，头顶一颗 AI 星星
  const bob = 3 * Math.sin(t * 3);
  return {
    back: stroke(`M0,-226L0,${-252 + bob}`, 5) + `<g transform="rotate(${n2(t * 40)},0,${n2(-266 + bob)})">${star4(0, -266 + bob, 16, C.yellow)}</g>`,
    body: shape(rr(-96, -228, 192, 160, 70, 971, 1.2), { fill: C.sky, hatch: true, sw: 4.5 }) +
      `<path d="M44,-72L86,-40L70,-74Z" fill="${C.sky}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
      `<rect x="40" y="-80" width="36" height="12" fill="${C.sky}"/>`,
    face: [0, -150], eyeGap: 30, eyeR: 1.05, shoulders: [[-92, -140], [92, -140]], top: -270, legs: 30, legTop: -70,
  };
}

function mascotEyes(kind, f, o, t) {
  const [fx, fy] = f.face, gap = f.eyeGap, R = f.eyeR, dir = o.flip ? -1 : 1;
  const [lx, ly] = o.look || [0, 0], px = lx * dir * .9, py = ly * .8;
  const eyes = o.blink ? 'blink' : (o.eyes || 'dot');
  const out = [], ec = f.screen || INK;
  [-1, 1].forEach((side, k) => {
    const ex = fx + side * gap, ey = fy - 4;
    const white = (rx, ry) => `<ellipse cx="${ex}" cy="${ey}" rx="${rx * R}" ry="${ry * R}" fill="#fff" stroke="${INK}" stroke-width="3.5"/>`;
    if (f.bean && (eyes === 'dot' || eyes === 'wide' || eyes === 'sus')) {
      const rx = eyes === 'wide' ? 15 : 13, ry = eyes === 'wide' ? 20 : eyes === 'sus' ? 9 : 17, oy = eyes === 'sus' ? 5 : 0;
      out.push(`<ellipse cx="${n2(ex + px)}" cy="${n2(ey + py + oy)}" rx="${rx}" ry="${ry}" fill="${INK}"/><circle cx="${n2(ex + px + 4)}" cy="${n2(ey + py + oy - ry * .4)}" r="${eyes === 'sus' ? 3 : 5}" fill="#fff"/><circle cx="${n2(ex + px - 4)}" cy="${n2(ey + py + oy + ry * .4)}" r="2.4" fill="#fff"/>`);
      if (eyes === 'sus' && side === dir) out.push(stroke(`M${ex - 14},${ey - 18}L${ex + 14},${ey - 25}`, 5));
    } else if (f.screen && (eyes === 'dot' || eyes === 'wide' || eyes === 'sus')) {
      const w = eyes === 'wide' ? 22 : 17, h = eyes === 'wide' ? 36 : eyes === 'sus' ? 13 : 30;
      out.push(`<rect x="${n2(ex + px - w / 2)}" y="${n2(ey + py - h / 2 + (eyes === 'sus' ? 6 : 0))}" width="${w}" height="${h}" rx="${w / 2}" fill="${ec}"/>`);
      if (eyes === 'sus' && side === dir) out.push(stroke(`M${ex - 12},${ey - 14}L${ex + 12},${ey - 20}`, 5, ec));
    } else if (eyes === 'dot' || eyes === 'sus') {
      out.push(white(17, 21) + `<circle cx="${n2(ex + px)}" cy="${n2(ey + py + 3)}" r="${11 * R}" fill="${INK}"/><circle cx="${n2(ex + px + 4)}" cy="${n2(ey + py - 2)}" r="4" fill="#fff"/><circle cx="${n2(ex + px - 4)}" cy="${n2(ey + py + 8)}" r="2" fill="#fff"/>`);
      if (eyes === 'sus') out.push(`<path d="M${ex - 17 * R},${ey}A${17 * R},${19 * R} 0 0 1 ${ex + 17 * R},${ey}Z" fill="${kind === 'lens' ? '#DDF1FA' : kind === 'folder' ? C.butter : C.sky}" stroke="${INK}" stroke-width="3.5"/>`,
        side === dir ? stroke(`M${ex - 14},${ey - 28}L${ex + 14},${ey - 36}`, 5) : '');
    } else if (eyes === 'wide') {
      out.push(white(20, 24) + `<circle cx="${n2(ex + px)}" cy="${n2(ey + py)}" r="${12 * R}" fill="${INK}"/><circle cx="${n2(ex + px + 4)}" cy="${n2(ey + py - 4)}" r="3.5" fill="#fff"/><circle cx="${n2(ex + px - 3)}" cy="${n2(ey + py + 4)}" r="1.8" fill="#fff"/>`);
    } else if (eyes === 'happy') out.push(stroke(`M${ex - 13},${ey + 5}Q${ex},${ey - 13} ${ex + 13},${ey + 5}`, 5.5, ec));
    else if (eyes === 'blink') out.push(stroke(`M${ex - 13},${ey}Q${ex},${ey + 7} ${ex + 13},${ey}`, 5, ec));
    else if (eyes === 'squint') out.push(stroke(side > 0 ? `M${ex + 11},${ey - 10}L${ex - 9},${ey}L${ex + 11},${ey + 10}` : `M${ex - 11},${ey - 10}L${ex + 9},${ey}L${ex - 11},${ey + 10}`, 5.5, ec));
    else if (eyes === 'star') out.push(star4(ex, ey, 21, C.yellow) + `<circle cx="${ex + 5}" cy="${ey - 5}" r="3" fill="#fff"/>`);
    else if (eyes === 'dizzy') {
      let d = '';
      for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 3.2 + t * 9, r = 1.5 + i * .55; d += (i ? 'L' : 'M') + n2(ex + r * Math.cos(a)) + ',' + n2(ey + r * Math.sin(a)); }
      out.push(f.screen ? stroke(d, 4, ec) : white(15, 18) + stroke(d, 3.5));
    }
  });
  // 腮红
  out.push(`<ellipse cx="${fx - gap - 16}" cy="${fy + 22}" rx="14" ry="8" fill="${C.pink}" opacity=".75"/><ellipse cx="${fx + gap + 16}" cy="${fy + 22}" rx="14" ry="8" fill="${C.pink}" opacity=".75"/>`);
  // 嘴
  const mx = fx + px * .5, my = fy + 26;
  const m = o.mouth || 'smile';
  if (m === 'smile') out.push(stroke(`M${mx - 11},${my}Q${mx},${my + 11} ${mx + 11},${my}`, 4.5, ec));
  else if (m === 'grin') out.push(`<path d="M${mx - 15},${my - 2}Q${mx},${my + 20} ${mx + 15},${my - 2}Z" fill="${f.screen ? ec : '#8C3F3C'}" stroke="${f.screen ? ec : INK}" stroke-width="4" stroke-linejoin="round"/>`);
  else if (m === 'o') out.push(`<ellipse cx="${mx}" cy="${my + 4}" rx="8" ry="10" fill="${f.screen ? 'none' : '#8C3F3C'}" stroke="${ec}" stroke-width="4"/>`);
  else if (m === 'flat') out.push(stroke(`M${mx - 9},${my + 3}L${mx + 9},${my + 3}`, 4.5, ec));
  else if (m === 'wavy') out.push(stroke(`M${mx - 14},${my + 4}q3.5,-6 7,0t7,0t7,0t7,0`, 4, ec));
  else if (m === 'dots') for (let i = 0; i < 3; i++) out.push(`<circle cx="${mx - 14 + i * 14}" cy="${n2(my + 4 - 5 * Math.max(0, Math.sin(t * 10 - i)))}" r="4.5" fill="${ec}"/>`);
  if (o.sweat) out.push(shape(`M${fx + 70},${fy - 70} q-11,17 0,24 q11,-7 0,-24Z`, { fill: C.sky, sw: 3 }));
  return out.join('');
}

// 角色手里的道具（本地坐标，跟着角色缩放）。返回 [画在手臂后面, 画在手臂前面]
function mascotProp(prop, f, dir, t, o) {
  const fy = f.face[1], sy = f.shoulders[0][1];
  if (prop === 'laptop') { // 小笔记本：看到的是屏幕背面，手在键盘上敲
    return [shape(rr(-66, sy - 6, 132, 78, 10, 1101), { fill: '#E6E1D6', sw: 4 }) + star4(0, sy + 32, 13, C.mint) +
      shape(poly([[-78, sy + 70], [78, sy + 70], [70, sy + 86], [-70, sy + 86]], 1102, .5, 30), { fill: '#fff', sw: 4 }), ''];
  }
  if (prop === 'camera') {
    const flash = o.flash ? 1 : 0;
    return ['', shape(rr(-56, fy + 44, 112, 72, 12, 1111), { fill: '#3A3F52', sw: 4 }) + shape(rr(-40, fy + 34, 30, 14, 4, 1112, .4), { fill: '#3A3F52', sw: 3.5 }) +
      `<circle cx="8" cy="${fy + 80}" r="24" fill="#8FA0C8" stroke="${INK}" stroke-width="4"/><circle cx="8" cy="${fy + 80}" r="11" fill="${INK}"/><circle cx="14" cy="${fy + 74}" r="4" fill="#fff"/>` +
      (flash ? `<circle cx="-30" cy="${fy + 40}" r="${n2(40 + 30 * flash)}" fill="#FFF7C2" opacity=".8"/>` + star4(-30, fy + 40, 26, '#FFF3A0') : '')];
  }
  if (prop === 'folder') {
    return ['', shape(rr(-64, fy + 30, 50, 22, 6, 1121, .4), { fill: C.fold, sw: 3.5 }) + shape(rr(-50, fy + 22, 100, 50, 5, 1122, .5), { fill: '#fff', sw: 3 }) +
      shape(rr(-64, fy + 44, 128, 86, 8, 1123), { fill: C.butter, hatch: true, sw: 4 })];
  }
  if (prop === 'magnifier') { // 举在指着的那只手上
    const hx = dir * 138, hy = sy - 62, lx = hx + dir * 34, ly = hy - 30;
    return ['', stroke(`M${hx},${hy}L${n2(lx - dir * 22)},${n2(ly + 22)}`, 12, '#B8743E') +
      `<circle cx="${n2(lx)}" cy="${n2(ly)}" r="36" fill="#fff" fill-opacity=".35" stroke="${INK}" stroke-width="7"/>` +
      stroke(`M${n2(lx - 18)},${n2(ly - 12)}Q${n2(lx - 12)},${n2(ly - 24)} ${n2(lx)},${n2(ly - 26)}`, 5, '#fff')];
  }
  return ['', ''];
}

function mascot(o, t) {
  const kind = o.kind || 'bubble', f = mascotBody(kind, t, o);
  const shift = -f.legTop - 36;   // 短腿：身体下移，腿只露出一小截
  f.shoulders = f.shoulders.map(([x, y]) => [x, y + shift]); f.face = [f.face[0], f.face[1] + shift]; f.top += shift; f.legTop += shift;
  f.back = `<g transform="translate(0,${shift})">${f.back}</g>`; f.body = `<g transform="translate(0,${shift})">${f.body}</g>`;
  const s = (o.s || 1), sq = o.squash || 1, walk = o.walkAmp || 0, ph = o.phase || 0, dir = o.flip ? -1 : 1;
  const bob = -Math.abs(Math.sin(ph)) * 10 * walk;
  const breathe = walk > 0 ? 1 : 1 + 0.015 * Math.sin(t * 4.2);
  const g = [];
  // 腿
  [-1, 1].forEach((side, k) => {
    const off = k ? Math.PI : 0, hx = side * 30;
    const sw = Math.sin(ph + off) * 18 * walk, lift = Math.max(0, Math.cos(ph + off)) * 12 * walk;
    const fx = hx + sw, fy = -lift;
    const leg = `M${hx},${n2(f.legTop + bob)}L${n2(fx)},${n2(fy - 8)}`;
    g.push(f.limb ? stroke(leg, 22) + stroke(leg, 13, f.limb) : stroke(leg, 12));
    g.push(`<ellipse cx="${n2(fx + side * 4)}" cy="${n2(fy - 6)}" rx="${f.limb ? 20 : 17}" ry="${f.limb ? 12 : 10}" fill="${f.limb || '#fff'}" stroke="${INK}" stroke-width="4"/>`);
  });
  // 手臂：o.arms = rest | point | cheer | hold | shrug | wave | busy；也可用 o.armL / o.armR 指定世界坐标目标
  const toLocal = p => [(p[0] - o.x) / s, (p[1] - o.y) / s];
  const swing = Math.sin(ph) * 12 * walk;
  const pose = o.arms || 'rest';
  const hand = (side) => {
    const S = side * dir, osc = Math.sin(t * 14);
    if (side < 0 && o.armL) return toLocal(o.armL);
    if (side > 0 && o.armR) return toLocal(o.armR);
    if (pose === 'point' && S > 0) return [side * 138, f.shoulders[0][1] - 62];
    if (pose === 'cheer') return [side * 122, f.shoulders[0][1] - 58 + 6 * osc];
    if (pose === 'hold') return [side * 46, f.face[1] + 78];
    if (pose === 'shrug') return [side * 150, f.shoulders[0][1] - 40];
    if (pose === 'wave' && S > 0) return [side * 140 + 16 * osc, f.top + 40];
    if (pose === 'chest' && S > 0) return [side * 44, f.face[1] + 62];
    if (pose === 'thumbs' && S > 0) return [side * 116, f.shoulders[0][1] - 14];
    if (pose === 'highfive' && S > 0) return [side * 132, f.shoulders[0][1] - 86];
    if (pose === 'type') return [side * 44, f.shoulders[0][1] + 34 + 8 * Math.max(0, Math.sin(t * 18 + side * 1.6))];
    if (pose === 'busy') return [side * (70 + 30 * Math.sin(t * 20 + side)), f.shoulders[0][1] + 40 + 20 * Math.cos(t * 20 + side)];
    return [side * 112 + (side < 0 ? swing : -swing), f.shoulders[0][1] + 44 + bob];
  };
  const arms = [-1, 1].map((side, k) => {
    const [sx, sy0] = f.shoulders[k], sy = sy0 + bob, [hx, hy] = hand(side);
    const S = side * dir;
    let extra = '';
    if (pose === 'thumbs' && S > 0) extra = shape(rr(hx - 6, hy - 34, 12, 26, 6, 995, .4), { fill: f.limb || '#fff', sw: 4 });
    if (pose === 'highfive' && S > 0) extra = [-1, 0, 1].map(k2 => stroke(`M${n2(hx + k2 * 8)},${n2(hy - 12)}l${k2 * 4},-12`, 4)).join('') + star4(hx + side * 34, hy - 26, 12);
    const armD = wline(sx, sy, hx, hy, 990 + k, .8, 40);
    return (f.limb ? stroke(armD, 26) + stroke(armD, 17, f.limb) : stroke(armD, 10)) + extra + `<circle cx="${n2(hx)}" cy="${n2(hy)}" r="${pose === 'highfive' && S > 0 ? 17 : f.limb ? 16 : 13}" fill="${f.limb || '#fff'}" stroke="${INK}" stroke-width="4"/>`;
  });
  const bodyT = `translate(0,${n2(bob + f.legTop)}) scale(${(1 / Math.sqrt(sq * breathe)).toFixed(3)},${(sq * breathe).toFixed(3)}) translate(0,${-f.legTop})`;
  const [propBack, propFront] = o.prop ? mascotProp(o.prop, f, dir, t, o) : ['', ''];
  g.push(`<g transform="${bodyT}">${f.back}${f.body}${mascotEyes(kind, f, o, t)}</g>`);
  g.push(propBack, ...arms, propFront);
  const shadow = o.shadow === false ? '' : `<ellipse cx="0" cy="2" rx="${n2(80 * s)}" ry="9" fill="${INK}" opacity="${(0.12 * (1 - Math.min(1, -bob / 40))).toFixed(3)}"/>`;
  const inner = `<g transform="translate(${n2(o.x)},${n2(o.y)})">${shadow}<g transform="rotate(${n2(o.rot || 0)}) scale(${s})">${g.join('')}</g></g>`;
  if (!o.clip) return inner;
  const [cx, cy, cw, ch] = o.clip;
  return `<clipPath id="mClip"><rect x="${cx}" y="${cy}" width="${cw}" height="${ch}"/></clipPath><g clip-path="url(#mClip)">${inner}</g>`;
}
