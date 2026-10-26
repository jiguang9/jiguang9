// Profile README covers: one Agent-crew member doing each project's job, drawn with the hand-drawn engine.
const BOT_S = 1.15;
const T = 1.5;                         // a still moment: no blink, all pop-ins settled
const CW = 1800, CH = 600, FOOT = 528;
const SUB = '#6A5038';

function frame(inner) {
  return DEFS + `<rect width="${CW}" height="${CH}" fill="${PAPER}"/>` +
    shape(rr(22, 22, CW - 44, CH - 44, 34, 901, 1.4), { fill: WIN, sw: 4.5 }) + inner +
    `<rect width="${CW}" height="${CH}" filter="url(#grain)"/>`;
}

// left column: eyebrow pill, big title with a peach swoosh, slogan, footnote
function heading({ eyebrow, title, slogan, note, size = 104 }) {
  const x = 104, tw = textW(title, size);
  return shape(circ(x + 9, 128, 9, 5), { fill: C.peach, sw: 2.5 }) + txt(eyebrow, x + 32, 138, { size: 28, weight: 700, fill: SUB }) +
    txt(title, x, 280, { size, font: FUN }) +
    stroke(wline(x - 6, 314, x + tw + 10, 306, 77, 2.2, 40), 13, C.peach) +
    txt(slogan, x, 400, { size: 46, weight: 700 }) +
    txt(note, x, 466, { size: 28, fill: SUB });
}

const row = (x, y, s, mark) => (mark === 'ok' ? checkMark(x + 18, y - 12, 1, 15) : mark === 'no' ? crossMark(x + 18, y - 12, 1, 13) : '') +
  txt(s, x + 52, y, { size: 30 });

const COVERS = {
  'geo-judge': () => heading({ eyebrow: 'geo-judge · 开源工具', title: '可见度判定助手', slogan: '看 AI 有没有推荐你', note: '粘一段 AI 回答 · 纯前端单文件 · 不上传数据' }) +
    chatBox(980, 92, 500, 400, 'AI 的回答', 31) +
    txt('团队协作工具推荐：', 1016, 196, { size: 28, fill: SUB }) +
    txt('1. 品牌 A', 1016, 262, { size: 32 }) +
    marker(1008, 322, 236, T, 0) + txt('2. 你的品牌', 1016, 332, { size: 34, weight: 700 }) + checkMark(1290, 318, 1, 18) +
    txt('3. 品牌 B', 1016, 402, { size: 32 }) + textLines(1016, 440, 400, 2, 33, 22) +
    pill(1386, 330, '排第 2', { size: 24, fill: C.butter, seed: 7 }) +
    drawMate('dingding', 1612, FOOT, T, { act: 'point', flip: true, s: 1.12 }) + star4(1700, 160, 16) + star4(1560, 118, 10, C.peach),

  'geo-audit': () => heading({ eyebrow: 'geo-audit · Agent Skill', title: 'GEO 诊断', slogan: '测测 AI 会不会引用你', note: '国内外 AI 平台都覆盖 · 告诉你这周先改什么' }) +
    panel(980, 96, 500, 396, '你的网站', 41) +
    row(1010, 222, 'AI 爬虫进得来', 'ok') + row(1010, 290, '内容好摘取', 'ok') + row(1010, 358, '权威信号够', 'ok') + row(1010, 426, '外部没人提', 'no') +
    stamp('先补这条', 1350, 440, T, 0, { color: C.red, rot: -10, size: 26 }) +
    drawMate('xinxin', 1612, FOOT, T, { act: 'magnify', flip: true, s: 1.15 }) + star4(1712, 150, 15),

  'google-seo-audit': () => heading({ eyebrow: 'google-seo-audit · Agent Skill', title: 'Google SEO 体检', slogan: '九个维度，每条带修法', note: '接 PageSpeed Insights 和 Search Console 数据', size: 92 }) +
    panel(980, 96, 500, 396, '体检清单', 51) +
    [...Array(9)].map((_, i) => {
      const cx = 1060 + (i % 3) * 150, cy = 210 + Math.floor(i / 3) * 96;
      return shape(rr(cx - 52, cy - 34, 104, 68, 16, 60 + i, 1), { fill: i === 5 ? '#FDE3E6' : SOFT, sw: 3 }) +
        (i === 5 ? crossMark(cx, cy, 1, 13) : checkMark(cx, cy, 1, 15));
    }).join('') +
    drawMate('gege', 1612, FOOT, T, { act: 'point', flip: true, s: 1.12 }) + star4(1700, 150, 14, C.sky),

  'competitor-analysis': () => heading({ eyebrow: 'competitor-analysis · Agent Skill', title: '竞品分析', slogan: '每条结论都写清出处', note: '对比 · 口碑 · 爆款拆解 · 定期报告，查不到就写"未知"' }) +
    shape(rr(972, 120, 236, 330, 22, 71, 1.3), { fill: WIN, sw: 4 }) + pill(1090, 162, '我们', { size: 26, fill: C.butter, seed: 72 }) + textLines(1000, 222, 180, 5, 73, 40) +
    shape(rr(1240, 120, 236, 330, 22, 74, 1.3), { fill: WIN, sw: 4 }) + pill(1358, 162, '竞品', { size: 26, fill: '#CFE9F8', seed: 75 }) + textLines(1268, 222, 180, 5, 76, 40) +
    shape(circ(1224, 290, 34, 79), { fill: C.peach, sw: 4 }) + txt('vs', 1224, 302, { size: 34, font: FUN, anchor: 'middle', fill: WIN }) +
    stamp('有出处', 1330, 402, T, 0, { color: C.green, rot: -12, size: 30 }) +
    drawMate('fanfan', 1622, FOOT, T, { act: 'magnify', flip: true, s: 1.12 }) + star4(1712, 160, 14, C.mint),

  'industry-research': () => heading({ eyebrow: 'industry-research · Agent Skill', title: '行业研究', slogan: '会前摸清一个陌生行业', note: '市场 · 产业链 · 商业模式 · 竞争格局 · 趋势' }) +
    panel(980, 96, 500, 396, '产业链', 81) +
    [['上游', C.butter, 210], ['中游', '#CFE9F8', 312], ['下游', '#D3F0E6', 414]].map(([s, f, y], i) =>
      shape(rr(1050, y - 36, 170, 72, 20, 82 + i, 1.1), { fill: f, sw: 3.5 }) + txt(s, 1135, y + 11, { size: 32, weight: 700, anchor: 'middle' }) +
      textLines(1250, y - 14, 180, 2, 85 + i, 26)).join('') +
    arrow(1135, 250, 1135, 272, 1, INK, 88) + arrow(1135, 352, 1135, 374, 1, INK, 89) +
    drawMate('yeye', 1612, FOOT, T, { act: 'folder', flip: true, s: 1.12 }) + star4(1704, 150, 14, C.green),

  'ai-marketing-hot': () => heading({ eyebrow: 'ai-marketing-hot · Agent Skill', title: 'AI 营销热点', slogan: '每条都告诉你该怎么做', note: '不是新闻搬运 · 营销影响 · 建议动作 · 适合谁' }) +
    panel(980, 96, 500, 396, '今日热点', 91) +
    [[200, 92], [350, 93]].map(([y, sd]) =>
      shape(rr(1012, y - 30, 26, 26, 6, sd, .6), { fill: C.peach, sw: 3 }) + textLines(1056, y - 24, 380, 1, sd, 26) +
      textLines(1056, y + 4, 300, 1, sd + 10, 26) +
      pill(1012, y + 64, '营销影响', { anchor: 'start', size: 22, fill: C.butter, seed: sd + 1 }) +
      pill(1160, y + 64, '建议动作', { anchor: 'start', size: 22, fill: '#D3F0E6', seed: sd + 2 })).join('') +
    drawMate('huohuo', 1612, FOOT, T, { act: 'point', flip: true, s: 1.12 }) + star4(1704, 150, 14, C.red),

  'ai-answer-archive': () => heading({ eyebrow: 'ai-answer-archive · Agent Skill', title: '回答存档', slogan: '分享链接里的回答存下来', note: '完整原文 · 来源 · 搜索词 · 原始记录索引' }) +
    panel(980, 96, 500, 396, '回答存档表', 111) +
    row(1010, 222, '完整原文', 'ok') + row(1010, 290, 'AI 返回的来源', 'ok') + row(1010, 358, '原始数据和哈希', 'ok') + row(1010, 426, '打不开的照实标', 'no') +
    stamp('可复核', 1370, 436, T, 0, { color: C.green, rot: -10, size: 28 }) +
    drawMate('xinxin', 1612, FOOT, T, { act: 'folder', flip: true, s: 1.12 }) + star4(1704, 150, 14, C.peach),

  'comment-demand-mining': () => heading({ eyebrow: 'comment-demand-mining · Agent Skill', title: '评论区挖需求', slogan: '从评论里找产品和选题', note: '求资源 · 痛点 · 软广识别 · 每条判断有出处' }) +
    chatBox(980, 92, 500, 400, '评论区', 121) +
    [['有没有现成的模板？', '求资源', C.butter, 216], ['私信领取试用', '疑似软广', '#FDE3E6', 306], ['扒了几个月，头疼', '痛点', '#D3F0E6', 396]].map(([s, tag, f, y], i) =>
      shape(circ(1030, y - 10, 15, 122 + i), { fill: SOFT, sw: 3 }) +
      (i === 2 ? marker(1052, y - 12, 254, T, 0) : '') + txt(s, 1060, y, { size: 30 }) +
      pill(1338, y - 10, tag, { anchor: 'start', size: 22, fill: f, seed: 125 + i })).join('') +
    textLines(1060, 446, 360, 1, 128, 26) +
    drawMate('dingding', 1612, FOOT, T, { act: 'magnify', flip: true, s: 1.12 }) + star4(1704, 150, 14, C.butter),

  'follow': () => {
    const qr = (x, file, label, sd) => shape(rr(x, 150, 236, 236, 22, sd, 1.2), { fill: '#fff', sw: 4 }) +
      `<image href="qr/${file}" x="${x + 20}" y="170" width="196" height="196"/>` + txt(label, x + 118, 440, { size: 34, weight: 700, anchor: 'middle' });
    return txt('扫码关注', 104, 168, { size: 52, weight: 700, fill: SUB }) + txt('硅基光哥', 104, 272, { size: 110, font: FUN }) +
      stroke(wline(98, 306, 104 + textW('硅基光哥', 110) + 10, 298, 77, 2.2, 40), 13, C.peach) +
      txt('公众号、B 站、小红书都叫这个名字', 104, 366, { size: 34, fill: SUB }) +
      ['huohuo', 'fanfan', 'xinxin', 'gege', 'yeye', 'dingding'].map((k, i) =>
        drawMate(k, 150 + i * 100, 552, T, { act: k === 'xinxin' ? 'wave' : 'idle', s: k === 'xinxin' ? .46 : .38 })).join('') +
      qr(900, 'gzh-qr.png', '公众号', 1) + qr(1170, 'bili-qr.png', 'B 站', 2) + qr(1440, 'xhs-qr.png', '小红书', 3);
  },
};

window.renderCover = name => { document.getElementById('stage').innerHTML = frame(COVERS[name]()); };
window.coverNames = Object.keys(COVERS);
