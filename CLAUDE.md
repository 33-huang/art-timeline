# art-timeline-v3 — Claude 工作须知

> 本文件每次对话自动加载,是日常改动的**首选参考**。
> 更深的历史/背景在 `HANDOFF.md`(仅大改动或本文件没覆盖时才去读)。

## 一句话
React + Vite 的**竖向**艺术史时间轴。公开艺术史数据 + 私密个人笔记;数据存 GitHub,Cloudflare 部署。访客只读,持 token 的作者能编辑。

## 数据架构(最关键,先记住)
**数据不在本项目代码里**,运行时从独立 GitHub 仓库读写:
- 公开数据(流派/艺术家):仓库 `33-huang/art-timeline` 的 **`data` 分支** → `movements.json` / `artists.json`。**匿名 `fetch` 读**(不用 token),编辑时用 token `PUT` 回 `data` 分支。
- 私密笔记:私有仓 `33-huang/art-timeline-notes` 的 `main` → `notes.json`。结构 `{ itemId: [ {id,title,content(HTML)}, ... ] }`。仅在有 token 时加载;>1MB 时 `loadNotes` 改用 Git Blobs API 按 sha 读。
- ⚠️ 编辑用的 fine-grained token 必须**同时对 `art-timeline` + `art-timeline-notes` 两个仓**有 Contents 读写(笔记在后者;只给一个仓 → 私密笔记读不出但不报错)。
- ⚠️ `public/data/*.json` 只是**过时的本地初始副本**,线上不用。看真实数据要拉 `?ref=data`。
- ⚠️ 数据**必须 `fetch`,不能 `import`**(import 会把数据打进代码包)。
- 推论:**改代码不会碰到用户数据**(只要不改数据格式)。无需"迁移/导入数据"。

## 文件地图(改动先按这里定位,别全项目乱翻)
- `src/lib/dataStore.js` — `loadData/saveData`(公开,data 分支)、`loadNotes/saveNotes`(私密仓)、token 读取、UTF-8 base64、sha 缓存
- `src/App.jsx` — 全部状态;hover/固定(pin)/Shift/⌘/Esc;数据&笔记加载;保存/新增/删除编排;卡片定位
- `src/components/Timeline.jsx` — 竖向布局/年→Y、`orderGroups()`(按 posAfter「排在其后=跟随」动态排序列)、三遍渲染(bars→避碰→labels+conns)、hover 联动变色、孤儿艺术家自动配色、大事件灰色 `EVENT_GRAY`+单年只显示一个年份
- `src/components/DetailCard.jsx` — **主组件(~354行)**:卡片外壳 + 编辑/笔记的状态与编排(handleSave/handleSaveNotes/renderPublicCard/renderPrivateCard)。子组件已拆到 `src/components/detail/`:
  - `detail/styles.js`(样式对象 `s` + 调色板常量)
  - `detail/helpers.js`(computePosAfter、粘贴清洗 cleanPastedHtml/handleEditorPaste、genModId 等纯函数)
  - `detail/Forms.jsx`(ColorPicker/RichTextArea/PosAfterSelector/MvSelector/MovementEditForm/ArtistEditForm)
  - `detail/Notes.jsx`(NoteSummary/NoteAccordion/ModuleEditor)
  - `detail/PublicViews.jsx`(MovementView/ArtistView)
- `src/components/FilterBar.jsx`、`TokenSettings.jsx`
- `src/index.css` — v2 浅色皮肤、CSS 变量、笔记 `.note-content`/`[contenteditable]` 样式

## 构建 / 推送 / 部署
- Node 必须 nvm v22:`export PATH="/Users/dear33/.nvm/versions/node/v22.22.3/bin:$PATH"`(系统 node 20 有 ICU 冲突)
- 构建:`npm run build` / 校验:`npm run lint`
- 远程用 **SSH**(`git@github.com:33-huang/art-timeline.git`,不含 token)。**Claude sandbox 能直接 `git push`**(SSH 密钥 `~/.ssh/id_ed25519`)。改完直接 push,用户只刷新网页。
- 部署:Cloudflare Workers 静态资源(`wrangler.jsonc` `assets.directory=./dist`),从 `main` push 后自动 build+deploy。线上:https://art-timeline.moncar8012.workers.dev/
- sandbox **做不了**(须用户操作):Cloudflare 控制台、建/改 fine-grained token、`gh repo create/rename`。
- ⚠️ 部署只用干净目录,`data/` 和带 token 的文档**绝不**上公开 CDN。

## 硬性约束(用户要求)
- **commit message 用中文**
- **涉及 UI 改动:先描述方案让用户确认,确认后才写代码**
- **视觉严格对齐 v2**(忠实还原,不自由发挥):浅色暖白 `#FAFAF8`、`Noto Sans SC`、胶囊过滤按钮、标签在条上方+虚线连接
- **安全第一**:token 只存 localStorage(key `gh_token`),绝不进代码/URL/日志/报错;私密仓必须 Private
- 用户已给定位信息时直接定位,别做多余探索(省 token)

## 每次改动必查(踩过的坑)
1. **白屏守卫**(交互最易回归):`usePrivate && data ?`、公开卡 `if(!data) return null`、`(isAdding||editing)&&formData`、`works/movements ?? []`
2. **React key 唯一**:跨多流派的艺术家会渲染多份,key 用 `流派id:艺术家id`
3. **交互改动必须在浏览器真点**验证(build 通过 ≠ 不白屏;运行时崩溃 build 查不出)
4. id 规则:流派 `mvNN`、艺术家 `arNN`,新增=现有最大数字+1 两位补零
5. 孤儿艺术家(`movements` 为空)=独立先驱:单独成列、按 id 哈希自动配色
6. 每步 build 通过再提交

## 核心常量
`MIN_YEAR=1580, MAX_YEAR=1990, PX_PER_YEAR=4.5`;竖向 `yearToY(yr)=TOP_PAD+(yr-MIN_YEAR)*PX_PER_YEAR`(年→top)
