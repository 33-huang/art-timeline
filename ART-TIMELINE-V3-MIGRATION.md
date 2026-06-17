# 艺术史时间轴 v3 — React 迁移说明

> 开新对话时把这个文件发给 AI，作为完整的上下文引导。

---

## 背景

这是一个交互式艺术史时间轴项目。目前是纯 HTML + CSS + JS 单文件版本，准备迁移到 React + Vite，做成 v3。

**目标：**
- 代码组件化，方便后续持续加功能
- 只保留中文（去掉日文）
- 内容由作者维护，数据直接写在 JS 文件里（不需要数据库）
- 最终部署到 GitHub Pages 或 Cloudflare Pages

---

## 文件说明

```
/Users/dear33/33/art-timeline/
├── art_timeline_v2_local.html   ← ⭐ 核心源文件，所有数据和逻辑都在这里
├── art_timeline_v2_local_README.md  ← v2 的功能说明，迁移时参考
├── art_timeline_v1_public.html  ← 旧版本，不需要看
├── index.html                   ← 旧的公开版，不需要看
├── REFACTOR_PLAN.md             ← 旧的重构计划，已被本文件取代
└── img/
    └── screenshot1-4.png        ← 截图，仅作参考，不需要复制到 v3
```

**唯一需要读的源文件：`art_timeline_v2_local.html`**

---

## 旧文件归档

以下文件暂时移到 `old/` 子文件夹备用，不需要时再清理：

```bash
cd /Users/dear33/33/art-timeline
mkdir -p old
mv art_timeline_v1_public.html old/   # 旧版本，已被 v2 取代
mv index.html old/                    # 旧的精简公开版，不含完整数据
mv REFACTOR_PLAN.md old/              # 旧重构计划，已被本文件取代
```

保留在根目录：
- `art_timeline_v2_local.html` — 唯一的数据来源，v3 从这里提取数据
- `art_timeline_v2_local_README.md` — 功能说明参考
- `ART-TIMELINE-V3-MIGRATION.md` — 本文件
- `img/` — 截图，留作参考
- `.gitignore` — 保留

---

## v3 新建位置

```
/Users/dear33/33/art-timeline-v3/
```

用 Vite 新建 React 项目在这个路径，不要修改原 `art-timeline/` 文件夹。

---

## 当前功能（从 v2 迁移）

### 要保留
- 横向时间轴，展示流派跨度（彩色色块）和艺术家生卒年（圆点）
- 点击流派色块 → 显示流派详情卡片（名称、年代、特征、代表艺术家）
- 点击艺术家圆点 → 显示艺术家详情卡片（名称、生卒、流派、代表作）
- 过滤器：全部 / 仅流派 / 仅艺术家
- 时间轴可横向滚动

### 要去掉
- ❌ 日文（所有 `ja` 相关的文本和逻辑）
- ❌ 编辑功能（卡片内的编辑表单、保存按钮、`saveFile()` 函数）
- ❌ 语言切换按钮

### 可以之后再加
- 搜索
- 移动端适配

---

## 数据管理策略（v3）

架构代码和内容数据**分两个分支**，保持 git 历史干净：

- `main` 分支：React 组件、样式、构建配置
- `data` 分支：`movements.json`、`artists.json`

React 运行时通过 GitHub API 拉取数据（art-timeline 是公开仓库，不需要 token）：

```js
const GITHUB_OWNER = '33-huang';
const GITHUB_REPO = 'art-timeline';
const GITHUB_DATA_BRANCH = 'data';

async function loadData(filename) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}?ref=${GITHUB_DATA_BRANCH}`,
    { headers: { 'Accept': 'application/vnd.github.v3+json' } }
  );
  const json = await res.json();
  return JSON.parse(atob(json.content.replace(/\n/g, '')));
}

// 启动时
const [movements, artists] = await Promise.all([
  loadData('movements.json'),
  loadData('artists.json'),
]);
```

**好处：**
- 更新艺术史内容 → 只提交到 `data` 分支，不需要重新构建和部署
- 代码变更和内容变更的 git 历史完全分开

**初始化 data 分支**（开始 v3 前执行一次）：
```bash
cd /Users/dear33/33/art-timeline
git checkout --orphan data
git rm -rf .
# 把从 v2 提取的 movements.json 和 artists.json 放在这里
git add movements.json artists.json
git commit -m "初始化数据分支"
git push origin data
git checkout main
```

---

## 数据结构

数据在 `art_timeline_v2_local.html` 里，找 `const MOVEMENTS` 和 `const ARTISTS` 两个数组。

**流派（MOVEMENTS）核心字段：**
```js
{
  id: 'impressionism',
  zh: '印象主义',       // 中文名，迁移时只用这个，删掉 ja 字段
  start: 1860,
  end: 1900,
  color: '#...',
  description_zh: '...',
  characteristics_zh: [...],
  representatives: ['artist_id_1', 'artist_id_2'],
}
```

**艺术家（ARTISTS）核心字段：**
```js
{
  id: 'monet',
  zh: '克劳德·莫奈',    // 只保留中文
  birth: 1840,
  death: 1926,
  movements: ['impressionism'],
  works_zh: [...],      // 代表作列表
  url: 'https://...',   // 作品外链（可选）
}
```

迁移时把所有 `_ja` / `ja` 字段删掉，只保留 `_zh` / `zh` 版本，并把 `_zh` 后缀去掉（如 `description_zh` → `description`）。

---

## 推荐组件拆分

```
src/
├── App.jsx                  ← 顶层，管理选中状态
├── data/
│   ├── movements.js         ← export const MOVEMENTS = [...]
│   └── artists.js           ← export const ARTISTS = [...]
├── components/
│   ├── Timeline.jsx         ← 横向时间轴容器，负责滚动和坐标计算
│   ├── MovementBar.jsx      ← 单条流派色块
│   ├── ArtistDot.jsx        ← 单个艺术家圆点
│   ├── DetailCard.jsx       ← 流派/艺术家详情卡片（只读）
│   └── FilterBar.jsx        ← 顶部过滤器
└── index.css                ← 全局样式
```

---

## 时间轴坐标计算逻辑

从 v2 的 JS 里提取，核心思路：
- 时间范围：约 1400–2000 年
- 每年对应固定像素宽度（如 `px_per_year = 8`）
- 流派色块：`left = (start - MIN_YEAR) * px_per_year`，`width = (end - start) * px_per_year`
- 艺术家圆点：`left = (birth - MIN_YEAR) * px_per_year`

具体数值从 `art_timeline_v2_local.html` 里找 `PX_PER_YEAR` 或类似常量。

---

## 部署

GitHub Pages（仓库已有：`33-huang/art-timeline`）：

```bash
npm run build
# 把 dist/ 内容推到 gh-pages 分支，或直接用 GitHub Actions
```

或 Cloudflare Pages：通过 Dashboard 连接 GitHub 仓库自动构建部署，无需命令行 token。

---

## 开发环境

- Node.js 必须用 nvm v22：`export PATH="/Users/dear33/.nvm/versions/node/v22.22.3/bin:$PATH"`
- 系统 Node 20.5.0 有 ICU 冲突，不能直接用

---

## 开始的第一步

1. 读 `art_timeline_v2_local.html`，理解现有结构和数据
2. 在 `/Users/dear33/33/art-timeline-v3/` 新建 Vite + React 项目
3. 提取 MOVEMENTS 和 ARTISTS 数据到 `src/data/`（去掉所有日文字段）
4. 搭 Timeline 骨架，确认时间轴能正确渲染
5. 再加 DetailCard 和 FilterBar
