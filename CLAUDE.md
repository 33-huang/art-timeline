# art-timeline-v3 — Claude 工作须知

> 本文件每次对话自动加载,是日常改动的**首选参考**。
> 更深的历史/背景在 `HANDOFF.md`(仅大改动或本文件没覆盖时才去读)。

进程文档（给她看的，每次改完在进程表最上面加一行，界面改动备注写 UIUX）：「260807-艺术时间轴（进程）」https://docs.google.com/document/d/11ImGu9luXYO5Y0AJwfZV71Un09qGmycXieDJjtDipS0/edit ，在网盘「App 开发记录」文件夹。

## 一句话
React + Vite 的艺术史时间轴(网页标题「知识时间轴」):电脑版**竖向**,手机版(≤700px)横向全宽时间轴。公开艺术史数据 + 私密个人笔记;数据存 GitHub,Cloudflare 部署。访客只读,持 token 的作者能编辑。

## 开局先做(2026-11-25 她定)
在电脑上打开这个项目、动手做任何事之前,先跑 `python3 scripts/links.py check`(只读,几秒钟):
- 有 `needsLink` 或没换掉的 `data-wiki` 标记 → 先告诉她「有 N 条待补链接:××、××,要不要先补」,她说补就照 `加内容规范.md` 第 6 节补完、删掉 `needsLink`;
- 显示「全部正常」→ 不用提,直接做她交代的事。
她不用自己记哪些要补。

## 加内容 → 先读 `加内容规范.md`
加单条流派/人物/事件(纯数据,不改代码)全部照 `加内容规范.md` 做:数据格式、id、标签、介绍结构、图片和链接规则、`bookChapters`/`needsLink` 字段。手机上的 AI 助理也照它(信息部在 `外出助理说明.md` 里登记,随 ai-rules 同步)。回电脑补链接用 `scripts/links.py`(check / resolve)。
- 本文件只管**改代码、改结构**;规范里的规则改了,改 `加内容规范.md`,本文件不重复写。
- **改了 `加内容规范.md` 之后跑一次 `bash ~/33/projects/261124-AI体系迁移/同步规则.sh`**(已登记进 `外出助理说明.md`,会自动同步到 ai-rules,手机 AI 才读得到新版)。
- 在家加单条交给「文本输入」会话(信息部会在它的交接说明里写「读加内容规范」);改代码照「🔧改App」开会话。

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
  - `detail/viewStyle.js`(`ViewStyleContext`:PublicViews 的样式;手机视图传入 `sMobile` 放大字号)
- `src/components/MobileView.jsx` — **手机视图**(2026-11-25 第三版):屏宽 ≤700px 时 `App` 直接返回它。时间轴**全宽**(1580–2030,3px/年),**名字在每条轴上方、固定不随左右滑动**。做法:上下滚动区 `.tl-v` 里叠两层——下层 `.tl-h` 只能横滚(色条),上层 `.tl-names` 绝对定位、`pointer-events:none`(只有名字按钮可点),两层行高必须一致。**别改回一个容器双向滚 + sticky**,iPhone 上会晃。年份刻度在滚动区外、用 transform 跟着 `.tl-h`。点名字=横滑到它的位置并闪一下,点轴那一行=底部弹卡(复用 MovementView/ArtistView,可往下钻、可返回)。右上角标签图标 → 右侧栏勾选标签(按「流派和事件」「人物」分组,新标签进「其他」),选择存 localStorage `m_tags_v2`;**切换标签不丢位置**:先记下最近点过且在屏幕上的那条(否则屏幕最上面那条),重排后放回原位,左右不动;只在刚打开时跳到最早一条;流派和人物同时显示时人物缩进在自己流派下(多流派的人两处都出现,没流派/流派没显示的人按出生年插在中间),否则全部按开始年排。**只读**:不含编辑、私密笔记、新增。样式在 `index.css` 末尾 `.m-*`/`.tl-*`。上一版(左侧名字列)打了 tag `mobile-name-column`,要回滚就 checkout 那个 tag 的 `src/components/MobileView.jsx` 和 `src/index.css`
- `src/components/FilterBar.jsx`、`TokenSettings.jsx`
- `src/index.css` — v2 浅色皮肤、CSS 变量、笔记 `.note-content`/`[contenteditable]` 样式

## 构建 / 推送 / 部署
- Node:大白那台必须 nvm v22(`export PATH="/Users/dear33/.nvm/versions/node/v22.22.3/bin:$PATH"`,系统 node 20 有 ICU 冲突);她这台(huangshan)系统 node v24 直接能 build
- 构建:`npm run build` / 校验:`npm run lint`
- 远程用 **SSH**(`git@github.com:33-huang/art-timeline.git`,不含 token)。**Claude sandbox 能直接 `git push`**(SSH 密钥 `~/.ssh/id_ed25519`)。改完直接 push,用户只刷新网页。
- 部署:Cloudflare Workers 静态资源(`wrangler.jsonc` `assets.directory=./dist`),从 `main` push 后自动 build+deploy。线上:https://art-timeline.moncar8012.workers.dev/
- sandbox **做不了**(须用户操作):Cloudflare 控制台、建/改 fine-grained token、`gh repo create/rename`。
- ⚠️ 部署只用干净目录,`data/` 和带 token 的文档**绝不**上公开 CDN。

## 硬性约束(用户要求)
- **commit message 用中文**
- **涉及 UI 改动:先描述方案让用户确认,确认后才写代码**。用户回复澄清细节(如指出图放哪、发张示意图)**不等于**"开始"——除非用户明确说"开始"/"做吧"/等同意开工的话,否则只更新方案、不动代码。
- 电脑版视觉沿用 v2(浅色暖白 `#FAFAF8`、`Noto Sans SC`、胶囊按钮、标签在条上方+虚线连接);她想改界面颜色(见「以后想做」),改时以她新的要求为准,颜色集中在 `index.css` 的 CSS 变量
- **安全第一**:token 只存 localStorage(key `gh_token`),绝不进代码/URL/日志/报错;私密仓必须 Private
- 用户已给定位信息时直接定位,别做多余探索(省 token)

## 每次改动必查(踩过的坑)
1. **白屏守卫**(交互最易回归):`usePrivate && data ?`、公开卡 `if(!data) return null`、`(isAdding||editing)&&formData`、`works/movements ?? []`
2. **React key 唯一**:跨多流派的艺术家会渲染多份,key 用 `流派id:艺术家id`
3. **交互改动必须在浏览器真点**验证(build 通过 ≠ 不白屏;运行时崩溃 build 查不出)
4. id 规则:流派 `mvNN`、艺术家 `arNN`,新增=现有最大数字+1 两位补零(超过 99 就三位,如 ar111)
5. 孤儿艺术家(`movements` 为空)=独立先驱:单独成列、按 id 哈希自动配色
6. 每步 build 通过再提交

## 标签(`tags` 字段,2026-11-25 她定)
流派/事件和人物都有 `tags` 数组,手机版按它筛选(一条只要有一个标签被选中就显示)。默认只选「艺术和设计」。
- 流派/事件:`艺术和设计` / `建筑` / `历史大事件` / `艺术相关事件`。只标建筑:芝加哥建筑学派、哥特复兴风格、帝政风格;艺术和设计+建筑:包豪斯、新艺术运动、后现代主义(**看内容占比**:建筑占比大才加建筑,美术工艺运动只标艺术和设计);
- 大事件分两种(2026-11-25 她定):**历史大事件**=大家都知道的大事(战争、革命、一战二战、工业革命、登月等 24 条);**艺术相关事件**=不一定大但和艺术直接有关(凡尔赛、庞贝发掘、摄影术、万博、奥斯曼改造、日本开国、1889 世博、电影诞生、堕落艺术展、德国工艺联盟、包豪斯关闭 11 条)。一条事件只标其中一个。
- 人物:`艺术家` / `其他人物和团体`(蓬皮杜夫人、拉斯金、桥社、青骑士)。建筑师也算艺术家。
- `其他主题`:她看书时零碎加的、不属于上面任何一类的内容都放这里,**一直攒着,等她自己决定拆出去**(第一次用时才会出现在侧栏)。
- 以后加对照轴(如「英国史」)= 给事件加新标签,手机版自动多出一个按钮,不用改代码。
- 新增条目时记得带 `tags`;没有 `tags` 的按类型给默认值(流派=艺术和设计,事件=历史大事件,人物=艺术家)。电脑版编辑保存是 `{...data, ...payload}`,不会丢 tags。

## 简介由 AI 撰写(2026-11-25 她定)
维基百科式简介她觉得「说了跟没说一样」,改由 AI 按固定结构重写,条目加 `aiWritten: true`(卡片简介下方自动显示「简介由 AI 撰写」)。直接用 `gh api` 改 `data` 分支(先读最新、串行写、写完读回),不用改代码。
- **流派**:一句话定位(只写正文,**不加小标题**,其他段都有小标题)→ 为什么出现(反对什么、当时发生了什么)→ 发展阶段(每段带年份)→ 流派特征(看画时看什么:笔触、颜色、光、题材、构图)→ 代表人物和作品 → 后来影响了谁
- **不是艺术家的人物**(蓬皮杜夫人、拉斯金):一句话定位 → 和艺术的关系 → 生平和影响的阶段;**团体**(桥社、青骑士)用流派结构;雕塑家/建筑师/设计师把「绘画特征」换成「作品特征」。
- **艺术家**:一句话定位(同上,不加小标题)→ 绘画特征(怎么认出他的画,和同流派的人比)→ 绘画的发展阶段(人生事件只写改变了画风的)。**不写「重要相关人」**(她删了)
- **历史大事件**:`<p><b>起因：</b>…</p>` 发生了什么 / 社会影响 三段,**不写对艺术的影响**(可以不写,不是不能有:手写的工业革命那段保留)。
- **艺术相关事件**:起因 / 发生了什么 / **对艺术的影响**(重点)/ 社会影响(一两句,放最后)。
- 大事件来历:2026-11-25 加了 30 条(mv38–mv67,1588 无敌舰队 … 1969 登月),都是 aiWritten
- HTML 格式:开头 `<p>一句话定位</p>`,之后 `<p><b>小标题</b></p><ul><li>…</li></ul>`,**不含换行符**(description 是 pre-wrap)。样板:印象派(mv10)、莫奈
- 现状:全部条目已重写(2026-11-25);工业革命是手写的,只加了图片链接

## 简介里的图片链接(2026-11-25)
简介正文里提到的具体作品/建筑/物件写成 `<a href="图" data-img="图" data-src="来源页" target="_blank" rel="noreferrer">《名》</a>`:手机版点了在页面里弹大图(`ImageViewer`),电脑版新标签页打开。图取英文维基条目的主图(API `prop=pageimages&pithumbsize=1600`,去掉 `?utm…`),来源页是 `en.wikipedia.org/wiki/File:…`。
- 写新简介时:先写 `<a data-wiki="英文维基准确标题">名</a>`,再用脚本统一换成上面的格式;查不到主图的去掉链接只留文字。主图是标志而不是实物的(如 V&A 博物馆)不要链。
- 只链具体的东西,不链人名、流派、事件、城市;同一条里只链第一次出现。
- 版权期内的作品**不放图**(维基上那些是「合理使用」的低分辨率图,只给维基自己用),改链美术馆官网,见下一节「图源规则」。
- 2026-11-25 全部 128 条简介已按新结构重写(AI 撰写),共 414 个图片链接;写稿规范现在是 `加内容规范.md`。

## 图源规则(2026-11-25 她定:不盗链)
- **不用别人文章里的图**(以前代表作里有 editst.com 的图和链接,已全部换掉)。回滚点:数据仓 tag `data-before-relink`、代码 tag `code-before-relink`。
- **版权已开放**(作者 1955 年及以前去世,即去世满 70 年):图用维基共享资源/维基条目主图,手机在页面里弹大图、图下写来源(`imageSource`)。代表作字段:`imageUrl`(约 1600px)、`thumbUrl`(约 400px,列表缩略图用)、`imageSource`(来源页)、`url`(作品页)。
- **版权期内**:不放图,链到收藏馆官网作品页(没有就英文维基),简介里写成 `<a href data-ext target="_blank" rel="noreferrer">`(虚线下划线)。
- 代表作有图的排成缩略图,没图的另起一列文字链接。

## 在世 / 至今(2026-11-25)
在世的人:`alive: true, death: null`;延续到今天的流派:`ongoing: true, end: null`。`dataStore.loadData` 读入时临时填成今年(画图照常),显示「至今」(`spanText`);`saveData` 存回时还原成 null。时间轴手机和电脑都到 2030。

## 数据来源
- `bookChapters: [..]` = 在书的第几章(2026-11-25 从 fromBook 改来:书按章节分,和个人版的流派结构对不上,所以记章节不记「是否来自书」)。22 个流派、103 位人物有章节。以后发布「书的版本」= 同一套代码按第 1–20 章排出有 bookChapters 的条目,另部署一个站。
她在读 editst.com「150 年现代艺术」(20 章)。2026-11-25 把第 13–20 章里还没登记的补上了:新增 7 个流派(观念主义、激浪派、贫穷艺术、行为艺术、极简主义、后现代主义、今日艺术)、48 位艺术家,代表作用文章里列的作品。文章里只拿来对比的古代画家(委拉斯开兹等)没加。

## 手机版 UI 演变(做作品集时要截图就照这个调出来,2026-11-25)
她很满意这次改版,作品集可能重点介绍。当时没截图,但每一版都打了 git tag,可以 checkout 出来本地 build、用手机尺寸截真实界面(内容会是现在的数据):
- `ui-v1-list`:按世纪分组的列表,一屏约 6 行,「流派和事件 / 艺术家」两个分页
- `ui-v2a-name-column-chips`:左名字列 + 右时间轴,标签是顶部一排按钮(已修晃动:上下、左右拆成两个滚动区)
- `ui-v2b-name-column-drawer`:同上,标签收进右上角侧栏
- `ui-v3-fullwidth`:时间轴全宽、名字在色条上方固定;之后的提交只改了内容和图片弹窗,界面结构就是现版
建议每版截同样的画面并排对比:首页、点开卡片、流派+艺术家一起显示、横滑后;第三版另录 GIF 演示「点名字自动滑到位置」「切换标签不丢位置」。素材放项目里 `UI版本截图/`,用法交给「找工作」部门。

## 艺术时间轴讨论会话(2026-11-28 她定)
顶层会话「💬持续讨论：艺术时间轴」长期留着,她读时间轴时随时来问。做法:
- 她问一个词、一段历史 → 先讲清楚(深浅看下面「她的偏好」),讲完问一句:「要加进时间轴(流派/人物/事件),加成名词解释,还是看懂就算了?」她说「好」再写。大块内容(如英国史)先和她商量加哪些,再一条条加。
- 写入全照 `加内容规范.md`(含开局 `python3 scripts/links.py check`)。**只写数据,不改代码**;想改界面、加功能,照常另开「🔧改App：艺术时间轴 - ××」会话,改完归档,讨论会话不在中间转话(2026-11-28 她定;同一时间只有一个会话改代码)。
- 公开仓库只写历史知识;她的感想放私密笔记(`art-timeline-notes`)或转文本输入记备忘。
- 名词解释(不上时间轴、点词弹出的小卡片)由「🔧改App：艺术时间轴 - 名词解释」做出来后,数据格式写进 `加内容规范.md`,在那之前先不加。
- 记忆放文件不放对话:她纠正讲解方式、说已经懂的背景,记进下面「她的偏好」;上下文过半时更新这里,提醒她开新对话「接手 艺术时间轴讨论」。

### 她的偏好
(还没有)

## 以后想做(还没做)
- 电脑版:新加的大事件每条占一列,画面变宽、流派被挤开;要不要给电脑版也加标签筛选,等她定
- 界面颜色:她想改,定在手机版之后改(颜色集中在 `index.css` 的 CSS 变量)
- 发布「书的版本」:按 `bookChapters` 排第 1–20 章,另部署一个站
- 作品集要用 UI 截图时,照「手机版 UI 演变」一节调出各版截图
- 电脑版「新增条目」功能:不删、不再改进

## 核心常量
电脑版 `Timeline.jsx`:`MIN_YEAR=1580, MAX_YEAR=2030, PX_PER_YEAR=4.5`;手机版 `MobileView.jsx`:`MIN_YEAR=1580, MAX_YEAR=2030, PX=3`;竖向 `yearToY(yr)=TOP_PAD+(yr-MIN_YEAR)*PX_PER_YEAR`(年→top)
