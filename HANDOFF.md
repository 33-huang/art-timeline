# 艺术史时间轴 v3 — AI 协作工作说明 (Handoff)

> 开新对话时,把本文件发给 AI(或让它读 `art-timeline-v3/HANDOFF.md`),即可无缝接手。
> 本文件不含任何 token/密钥,可安全提交。
>
> **维护本文件(审查 AI 的职责,自行判断、无需用户提醒)**:出现以下情况就顺手更新本文件并随提交一起 push ——
> 完成新 Step/功能、架构或数据结构变化、新增约束/决定/账号配置、发现新的反复踩的坑。
> 小 bug 修复、样式微调、文案、一次性小调整**不必**更新。每完成大步骤记得补 §10 进度。

---

## 0. 一句话
React + Vite 的**竖向**艺术史时间轴;**公开**艺术史数据 + **私密**个人笔记;数据存 GitHub;Cloudflare 部署。访客只读公开内容,只有持 token 的作者能编辑、能看/写私密笔记。

---

## 1. 两个 AI 的分工
- **执行 AI**:写代码。一次只做一步,做完停下汇报(改了哪些文件、贴关键代码、列出浏览器自测项)。
- **审查 AI**(接手本文件的你,默认角色):**不写新功能代码**;用工具核对执行 AI 的真实改动、把关安全与正确性、`commit + push`、给下一步指令。小 bug / 小样式可直接改并 push。
- **用户**:只做"账号动作"(见 §3),其余 push 由审查 AI 经 SSH 完成,用户只需刷新网页验收。

---

## 2. 位置 & 仓库
- 本地:`/Users/dear33/33/art-timeline-v3/`
- 公开仓:`github.com/33-huang/art-timeline` — `main`=代码,`data` 分支=数据 JSON
- 私密仓:`github.com/33-huang/art-timeline-notes`(**Private**) — `main`/`notes.json`
- 旧仓归档:`art-timeline-v2`(勿动)
- 旧 v2 单文件(**设计/数据基准**):`/Users/dear33/33/art-timeline/art_timeline_v2_local.html`
- 线上:https://art-timeline.moncar8012.workers.dev/

---

## 3. 认证 & 推送(关键!)
- 远程用 **SSH**(`git@github.com:33-huang/art-timeline.git`),URL **不含 token**。
- **Claude sandbox 能直接 `git push`**:走 SSH 密钥 `~/.ssh/id_ed25519`(不经 macOS 钥匙串)。`ssh -T git@github.com` 返回 "Hi 33-huang!"。→ **审查 AI 改完直接 push,用户只刷新网页**。
- sandbox **做不了**的(走 gh API token/钥匙串,够不到):`gh repo create/rename`、建/改 fine-grained token、Cloudflare 控制台操作 → **这些让用户做**。
- HTTPS 推送会失败(`-25308 / Device not configured`,钥匙串不可达),所以**坚持用 SSH 远程**。
- Node 必须用 nvm v22:`export PATH="/Users/dear33/.nvm/versions/node/v22.22.3/bin:$PATH"`(系统 node 20 有 ICU 冲突)。
- 构建:`npm run build`;开发预览须用户在自己 VSCode 终端跑(sandbox 起的 dev server 浏览器连不上)。

---

## 4. 架构
- **公开数据**:`movements.json` / `artists.json` 在 `data` 分支;app 用 GitHub Contents API **匿名读**(读不用 token)。**必须用 fetch,不能 import**(import 会把数据打包进代码)。
- **编辑公开数据**:用 localStorage 里的 fine-grained token,Contents API `PUT` 写回 `data` 分支(带上次读到的 `sha`,写后更新 sha 防 409)。
- **私密笔记**:`notes.json` 在私密仓;`loadNotes` **仅在有 token 时**加载(访客读不到);结构 `{ itemId: [ {id,title,content(HTML)} , ... ] }`(每条目=可折叠模块数组)。
- **token**:fine-grained,对 `art-timeline` + `art-timeline-notes` 两仓 **Contents 读写**;存 localStorage(key `gh_token`);**绝不进代码/URL/日志/报错**。
- **部署**:Cloudflare **Workers 静态资源**(`wrangler.jsonc` 里 `assets.directory=./dist`),从 `main` push 后自动 build(构建命令 `npm run build`,部署命令 `npx wrangler deploy`)。不是 Pages(构建环境 token 只有 Workers 权限)。

---

## 5. 关键文件
- `src/lib/dataStore.js` — `loadData/saveData`(公开,data 分支)、`loadNotes/saveNotes`(私密仓)、token 读取、UTF-8 base64、sha 缓存
- `src/App.jsx` — 全部状态;hover/固定(pin)/Shift/⌘/Esc;数据&笔记加载;保存/新增/删除编排;卡片定位 clampTip
- `src/components/Timeline.jsx` — 竖向布局 `computeLayout`/`yearToY`、三遍渲染(bars→避碰→labels+conns)、hover 联动变色 `computeRelated`/`barBg`、孤儿艺术家自动配色 `autoColor`
- `src/components/DetailCard.jsx` — 公开卡(MovementView/ArtistView)+ 公开编辑表单 + 私密卡(NoteSummary/NoteAccordion/ModuleEditor)
- `src/components/FilterBar.jsx`、`TokenSettings.jsx`
- `src/index.css` — v2 浅色皮肤、CSS 变量、笔记 `.note-content`/`[contenteditable]` 样式
- `public/data/*.json` — **本地初始数据(会过时!)**。线上真实数据在 `data` 分支,要看真实数据请拉 `?ref=data`。

---

## 6. 核心常量 / 不变量
- `MIN_YEAR=1580, MAX_YEAR=1990, PX_PER_YEAR=4.5`;**竖向**`yearToY(yr)=TOP_PAD+(yr-MIN_YEAR)*PX_PER_YEAR`(年→top,不是横向!)
- 设计**忠实还原 v2**:浅色暖白 `#FAFAF8`、`Noto Sans SC`、胶囊过滤按钮、标签在条上方+虚线连接、网格线、左侧年份轴浅灰
- id:流派 `mvNN`、艺术家 `arNN`;新增=取现有最大数字+1 两位补零
- **孤儿艺术家**(`movements` 为空)=独立先驱:单独成列、`autoColor` 按 id 哈希自动配色、`posStart`(年份)控制左右列位置(留空按 birth)
- React **key 必须唯一**:跨多个流派的艺术家会渲染多份,key 用 `流派id:艺术家id`(曾因重复 key 导致切 filter 时条目删不掉)
- 卡片显示规则:**默认公开卡**;按住 **Shift → 私密卡(peek)**;单击固定(普通单击=公开、Shift+单击=私密,`pinnedPrivate`);**私密卡 + 固定 = 屏幕居中大窗口(`cardCentered`)**,其余(公开卡、hover peek)小窗贴条目;⌘ 抑制 hover;公开卡(持 token、固定时)有「📝 笔记/添加笔记」按钮(`onShowPrivate`)直接开私密大窗口。`usePrivate = hasToken && showPrivate && !isAdding && !editing`(`showPrivate = pinnedId ? pinnedPrivate : Shift按住`)

---

## 7. 审查 AI 每步必查(踩过的坑)
1. **数据**:字段名对、`fetch` 非 `import`、计数(25 流派/19 艺术家为初始基线,之后用户会增删)
2. **token**:绝不入 state/源码/URL/日志/报错;公开匿名读、私密仅 token 才读(`loadNotes` 无 token 返回 `{}`)
3. **白屏守卫**(交互最易回归):`usePrivate && data ?`、公开卡 `if(!data) return null`、`(isAdding||editing)&&formData`、`works/movements ?? []`、`adding` 模式 formData 未就绪不渲染表单
4. **React key 唯一**
5. **交互改动必须在浏览器真点**(build 通过 ≠ 不白屏;点击触发的运行时崩溃 build 查不出)
6. 每步 **build 通过**再提交;**commit message 用中文**(用户硬性要求)
7. 富文本:`contenteditable` + `prompt()` 会丢选区,插入图片/链接要先存选区再恢复

---

## 8. 每步工作流程
执行 AI 做一步 → 审查 AI:① 用工具读真实文件核对(别只信汇报)② 重点盯 数据格式 + token + 白屏守卫 ③ `npm run build` ④ 通过则 `git add -A && git commit`(中文)`&& git push origin main`(SSH);不过则打回返工 → 用户刷新线上验收 → 视觉/交互细节由用户反馈、审查 AI 直接小修+push。

---

## 9. 用户偏好(硬性)
- commit message **中文**
- 视觉**严格对齐 v2**(忠实还原,不自由发挥)
- **安全第一**:不重蹈 token 泄露 —— 远程 URL 不内嵌 token、私密仓必须 Private、token 只存 localStorage
- 喜欢"**审查 AI 直接 push,我只刷新网页看**"的节奏;本地 dev 预览对用户不方便,优先推线上看

---

## 10. 进度(截至本文件)
迁移 Step 1–10 完成 → 竖向还原(11)→ 完整编辑 新增/删除(12)→ v2 浅色皮肤(13a)→ hover/固定/⌘ 交互(13b)→ 私密笔记 双卡+Shift(14)→ 笔记改可折叠模块(15)→ 编辑体验(16:大输入框/换行/Shift+固定锁公开)→ 按有无笔记定默认卡(17)→ 多处修复(白屏、重复 key、孤儿配色、卢梭去灰、笔记插图)。
功能已相当完整,当前处于**视觉/交互细节打磨**阶段。

---

## 11. 相关 memory(用户 ~/.claude 自动记忆里已有)
- art-timeline 用 SSH 推送(sandbox 可直接 push)
- GitHub token 安全审计 / wrangler 部署用干净目录 / git commit 用中文 / 数据迁移先复制再部署
