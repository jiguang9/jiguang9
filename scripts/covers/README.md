# 主页封面

主页 README 里每个项目的封面和底部的关注图，都由这里的代码生成：一个 Agent 小队成员在干这个项目的活，手绘抖线风格。

```
covers.js     每张封面画什么（改这个文件）
index.html    渲染用的页面，加载字体和下面三个库
lib/          手绘引擎、部件、芯芯和小队（从 tuanzi-handdrawn-video Skill 的模板复制来）
qr/           关注图里的三个二维码（和官网 assets/images 里的同一份）
render.py     渲染成 assets/<名字>.jpg
```

## 怎么渲染

```bash
python3 scripts/covers/render.py              # 全部重新生成
python3 scripts/covers/render.py geo-judge    # 只生成一张（可以写多个名字）
```

输出是 `assets/<名字>.jpg`，1800×600，约 260KB，直接覆盖旧图。

需要：

- Playwright 和 Chromium：`pip3 install playwright && python3 -m playwright install chromium`
- 思源黑体：`~/Library/Fonts/SourceHanSansCN-Regular.otf`、`-Bold.otf`、`-Heavy.otf`。脚本会自动链接到 `fonts/`，缺了会直接报错
- macOS 自带的 `sips`，用来转 JPG

## 加一张新封面

1. 在 `covers.js` 的 `COVERS` 里加一项，名字就是图片文件名，一般用仓库名：

   ```js
   'new-repo': () => heading({ eyebrow: 'new-repo · Agent Skill', title: '中文名', slogan: '一句话说它帮你做什么', note: '小字补充 · 用中点隔开' }) +
     panel(980, 96, 500, 396, '窗口标题', 101) +           // 右边的道具，画在 x 980–1480、y 96–492 这块
     row(1010, 222, '第一项', 'ok') + row(1010, 290, '第二项', 'no') +
     drawMate('gege', 1612, FOOT, T, { act: 'point', flip: true, s: 1.12 }) + star4(1700, 150, 14, C.sky),
   ```

2. 跑 `python3 scripts/covers/render.py new-repo`，看 `assets/new-repo.jpg`
3. 在主页 `README.md` 对应的分组里加上：

   ```md
   [![new-repo：一句话卖点](assets/new-repo.jpg)](https://github.com/jiguang9/new-repo)

   一句话说清好处。 [打开 new-repo →](https://github.com/jiguang9/new-repo)
   ```

写法要点：

- **左边固定用 `heading()`**：`title` 用中文名，4 到 7 个字最好看，字多时把 `size` 调小（默认 104，`Google SEO 体检` 用的 92）；`slogan` 一行，大约 12 个字以内
- **右边道具**：`panel()` 窗口、`chatBox()` 带红黄绿点的聊天窗、`pill()` 标签、`row(x, y, 文字, 'ok'|'no')` 打勾或打叉的一行、`stamp()` 印章、`marker()` 荧光笔、`textLines()` 假文字行、`arrow()` 箭头。更多部件见 `lib/widgets.js` 开头的注释，或 tuanzi-handdrawn-video Skill 的 `references/scene-api.md`
- **每个元素的种子数字（最后那个参数）别和别的封面重复**，否则抖线形状会一模一样
- 改完同一张多渲染几次，结果应该完全一样；不一样说明用了 `Math.random()`，要换成带种子的写法

## 选哪个成员

| 成员 | kind | 岗位 | 已经用在 |
|------|------|------|----------|
| 芯芯 | `xinxin` | 总管 | geo-audit（拿放大镜检查网站）、ai-answer-archive（抱文件夹） |
| 叮叮 | `dingding` | 沟通 | geo-judge（指着 AI 回答）、comment-demand-mining（拿放大镜看评论区） |
| 格格 | `gege` | 数据 | google-seo-audit（指着体检清单） |
| 翻翻 | `fanfan` | 调研 | competitor-analysis（拿放大镜对比） |
| 页页 | `yeye` | 写稿 | industry-research（抱文件夹） |
| 火火 | `huohuo` | 跑腿 | ai-marketing-hot（指着热点小报） |

动作 `act` 常用：`point` 指着、`magnify` 放大镜、`folder` 抱文件夹、`type` 敲笔记本、`camera` 端相机、`wave` 挥手、`done` 竖大拇指。完整列表在 `lib/widgets.js` 的 `ACTS`。成员站在右边、面朝道具时加 `flip: true`。

## 画面规则

和视频风格规范一致：

- 品牌写成"你的品牌""品牌 A"，不画 ChatGPT、豆包等平台的官方 logo
- 只用思源黑体
- 颜色只用在标签、印章、勾叉这些小地方，窗口保持白底
- 芯芯和小队在"干活"，不替光哥说话，不做成光哥的卡通替身

## lib 从哪来

`lib/` 是 tuanzi-handdrawn-video Skill 里 `assets/template/lib/` 的复制品。Skill 里的角色以后改了外形或颜色，想让封面跟着变，就把那三个文件重新复制过来再全部渲染一遍。渲染时控制台出现的 `TOTAL is not defined` 是 `widgets.js` 里视频渲染入口的报错，封面用不到，脚本已经忽略。
