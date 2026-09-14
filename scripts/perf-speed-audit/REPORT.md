# Yinghe-Ark 页面切换 & 接口速度测试报告

- **测试时间**：2026-09-07（UTC+8 约 19:10–19:40）
- **环境**：Windows 10；本机 `next dev` → `http://localhost:3000`；locale=`zh`
- **浏览器**：Chrome/Playwright MCP（UA: Chrome/152 Windows）
- **网络**：本机 loopback（非公网）；**DEV 热更新环境**，API 基线含 Next DEV 开销（约 300–400ms 即使 boot-id）
- **项目夹具**：`projectId=06c4e547-e580-413c-b61c-2dd8f10cdc96`，`episodeId=b7a75069-1fb8-4117-91c3-b6c80daf2ff2`
- **Reqable MCP**：首轮 `127.0.0.1:9000` 不可达；**2026-09-07 ~20:28 复测时已可达**（见 §8）。耗时仍以浏览器 `performance.now()` / ResourceTiming 为准（Reqable MCP 记录无毫秒 duration 字段）
- **扫描清单**：`scripts/perf-speed-audit/inventory.py` → 14 页面路由、126 前端 API 路径模板
- **非目标遵守**：未改业务逻辑/接口行为；写类接口未实测（避免改生产数据）

---

## 1. 页面清单（扫描）

| # | 路由 |
|---|------|
| 1 | `/[locale]` 落地 |
| 2 | `/[locale]/home` |
| 3 | `/[locale]/workspace` |
| 4 | `/[locale]/workspace/:projectId` |
| 5 | `/[locale]/workspace/asset-hub` |
| 6 | `/[locale]/workspace/films` |
| 7 | `/[locale]/account` |
| 8 | `/[locale]/profile` |
| 9 | `/[locale]/logs` |
| 10 | `/[locale]/auth/signin` |
| 11 | `/[locale]/auth/signup` |
| 12–14 | `/dev/*`（opt-preview / workspace-redesign / segmented-control-test）**本次未测**（开发页） |

### 计时定义

| 类型 | 起点 | 终点 |
|------|------|------|
| 全页 `goto` 切换 | `page.goto(to)` 调用前 | `domcontentloaded` + 目标 `readySelector`（多为 `body`；进项目为 `.workspace-stage-switcher__tab`） |
| 导航栏点击 | `a[aria-label].click` | `location` 含目标 path |
| 阶段 Tab | `tab.click` | 同步：`?stage=` + pane 非 `hidden` |
| History | `goBack` / `goForward` | URL 回到期望 path |

---

## 2. 页面切换实测（每项 ≥3 次）

### 2.1 全页路由 `goto`（含文档加载，DEV）

| 切换 | n | 三次(ms) | min | max | avg | median | 成败 |
|------|---|----------|-----|-----|-----|--------|------|
| workspace → asset-hub | 3 | 2714 / 2111 / 2390 | 2111 | 2714 | 2405 | 2390 | 全成功 |
| asset-hub → films | 3 | 3828 / 5307 / 3258 | 3258 | 5307 | 4131 | 3828 | 全成功 |
| films → profile | 3 | 4037 / 3764 / 4508 | 3764 | 4508 | 4103 | 4037 | 全成功 |
| profile → account | 3 | 3487 / 3751 / 4945 | 3487 | 4945 | 4061 | 3751 | 全成功 |
| account → logs | 3 | 3435 / 3729 / 3409 | 3409 | 3729 | 3524 | 3435 | 全成功 |
| logs → workspace | 3 | 3634 / 3956 / 3999 | 3634 | 3999 | 3863 | 3956 | 全成功 |
| workspace → 项目工作区 | 3 | 6909 / 7252 / 5835 | 5835 | 7252 | 6665 | 6909 | 全成功 |
| 项目工作区 → home | 3 | 10120 / 3765 / 3894 | 3765 | 10120 | 5926 | 3894 | 全成功；**run1 异常偏高** |
| `/` → auth/signin | 3 | 3485 / 3253 / 2883 | 2883 | 3485 | 3207 | 3253 | 全成功 |
| signin → signup | 3 | 3631 / 2435 / 1732 | 1732 | 3631 | 2599 | 2435 | 全成功 |
| signup → workspace | 3 | 3166 / 3118 / 3054 | 3054 | 3166 | 3113 | 3118 | 全成功 |

### 2.2 导航栏点击（SPA 软导航）

| 切换 | n | 三次(ms) | min | max | avg | median | 备注 |
|------|---|----------|-----|-----|-----|--------|------|
| 资产 | 3 | 719 / 914 / 663 | 663 | 914 | 765 | 719 | 成功 |
| 成片管理 | 3 | 447 / 797 / 700 | 447 | 797 | 648 | 700 | 成功 |
| 日志 | 3 | 840 / 681 / 727 | 681 | 840 | 749 | 727 | 成功 |
| 设置(profile) | 3 | 1076 / 658 / 783 | 658 | 1076 | 839 | 783 | 成功（href 匹配） |
| 账户 | 3 | 712 / 629 / 721 | 629 | 721 | 687 | 712 | 成功 |
| 项目卡片进工作区 | 3 | 436 / 447 / 652 | 436 | 652 | 512 | 447 | 成功（等列表就绪后点 UUID 链接） |

### 2.3 History

| 操作 | n | 三次(ms) | min | max | avg | median |
|------|---|----------|-----|-----|-----|--------|
| back (asset-hub→workspace) | 3 | 2198 / 1800 / 2191 | 1800 | 2198 | 2063 | 2191 |
| forward (workspace→asset-hub) | 3 | 2448 / 3030 / 2483 | 2448 | 3030 | 2654 | 2483 |

### 2.4 工作区内阶段 Tab（命令式 pane）

| 切换 | n | 三次(ms) | min | max | avg |
|------|---|----------|-----|-----|-----|
| → script | 3 | 1/1/1 | 1 | 1 | 1 |
| → storyboard | 3 | 3/1/2 | 1 | 3 | 2 |
| → voice | 3 | 1/1/1 | 1 | 1 | 1 |
| → videos | 3 | 1/1/1 | 1 | 1 | 1 |
| → config | 3 | 1/2/1 | 1 | 2 | 1 |
| → editor | 3 | 1/3/1 | 1 | 3 | 2 |

全成功（pane + href）。

---

## 3. 接口清单与实测

### 3.1 扫描规模

- 前端引用 API 模板：**126**
- 估算写/副作用类（未测，防改数据）：约 **66**
- 本次实测只读 GET（已登录 fetch×3）：**34**

### 3.2 已测 GET（每项 3 次）

| API | 状态码 | 三次(ms) | min | max | avg | median | 成败 |
|-----|--------|----------|-----|-----|-----|--------|------|
| GET `/api/system/boot-id` | 200 | 903/458/370 | 370 | 903 | 577 | 458 | 成功 |
| GET `/api/user-preference` | 200 | 646/385/371 | 371 | 646 | 467 | 385 | 成功 |
| GET `/api/user/balance` | 200 | 357/362/358 | 357 | 362 | 359 | 358 | 成功 |
| GET `/api/user/models` | 200 | 350/371/359 | 350 | 371 | 360 | 359 | 成功 |
| GET `/api/user/costs` | 200 | 569/360/370 | 360 | 569 | 433 | 370 | 成功 |
| GET `/api/user/transactions?page=1&pageSize=10` | 200 | 565/369/354 | 354 | 565 | 429 | 369 | 成功 |
| GET `/api/user/costs/details` | 200 | 570/355/358 | 355 | 570 | 428 | 358 | 成功 |
| GET `/api/user/api-config` | 200 | 694/423/429 | 423 | 694 | 515 | 429 | 成功 |
| GET `/api/projects?page=1&pageSize=20` | 200 | 367/361/374 | 361 | 374 | 367 | 367 | 成功 |
| GET `/api/projects/:id/data` | 200 | 380/410/383 | 380 | 410 | 391 | 383 | 成功 |
| GET `/api/projects/:id/assets` | 200 | 1798/368/393 | 368 | 1798 | 853 | 393 | 成功；**run1 异常高** |
| GET `/api/projects/:id/costs` | 200 | 1607/377/651 | 377 | 1607 | 878 | 651 | 成功；**run1 异常高** |
| GET `/api/novel-promotion/:id` | 200 | 1606/374/391 | 374 | 1606 | 790 | 391 | 成功；**run1 异常高** |
| GET `.../episodes?view=index` | 200 | 1609/385/411 | 385 | 1609 | 802 | 411 | 成功；**run1 异常高** |
| GET `.../episodes?view=text` | 200 | 618/515/541 | 515 | 618 | 558 | 541 | 成功 |
| GET `.../episodes/:eid?view=script` | 200 | 446/402/409 | 402 | 446 | 419 | 409 | 成功 |
| GET `.../episodes/:eid?view=full` | 200 | 373/388/382 | 373 | 388 | 381 | 382 | 成功 |
| GET `.../storyboards?episodeId=` | 200 | 1606/375/389 | 375 | 1606 | 790 | 389 | 成功；**run1 异常高** |
| GET `.../voice-lines?episodeId=` | 200 | 366/386/378 | 366 | 386 | 377 | 378 | 成功 |
| GET `.../voice-lines?speakersOnly=1` | 200 | 430/391/394 | 391 | 430 | 405 | 394 | 成功 |
| GET `.../speaker-voice?episodeId=` | 200 | 376/386/394 | 376 | 394 | 385 | 386 | 成功 |
| GET `/api/assets?scope=project&projectId=` | 200 | 382/377/375 | 375 | 382 | 378 | 377 | 成功 |
| GET `/api/assets?scope=global&kind=character` | 200 | 367/360/358 | 358 | 367 | 362 | 360 | 成功 |
| GET `...kind=location` | 200 | 361/362/358 | 358 | 362 | 360 | 361 | 成功 |
| GET `...kind=prop` | 200 | 368/361/631 | 361 | 631 | 453 | 368 | 成功 |
| GET `...kind=voice` | 200 | 551/397/351 | 351 | 551 | 433 | 397 | 成功 |
| GET `/api/asset-hub/folders` | 200 | 358/356/348 | 348 | 358 | 354 | 356 | 成功 |
| GET `/api/runs?...story_to_script_run` | 200 | 373/356/360 | 356 | 373 | 363 | 360 | 成功 |
| GET `/api/runs?...script_to_storyboard_run` | 200 | 361/359/360 | 359 | 361 | 360 | 360 | 成功 |
| GET `/api/tasks` | 200 | 363/363/376 | 363 | 376 | 367 | 363 | 成功 |
| GET `/api/admin/logs` | 200 | 594/345/344 | 344 | 594 | 428 | 345 | 成功 |
| GET `/api/admin/logs/events?kind=audit&limit=20` | 200 | 360/384/381 | 360 | 384 | 375 | 381 | 成功 |
| GET `/api/task-target-states` | **405** | 351/340/342 | 340 | 351 | 344 | 342 | **失败**（需正确 query/method） |
| GET `.../video-urls?episodeId=` | **405** | 1570/379/365 | 365 | 1570 | 771 | 379 | **失败**（方法/参数不匹配） |

### 3.3 未测接口（原因与后续）

| 类别 | 数量/示例 | 原因 | 后续 |
|------|-----------|------|------|
| Reqable 采集全量 | — | §8 已开 live capture 核对状态；MCP 无 ms | 若需 Reqable 自带时延，用 GUI 或外部 curl 经代理 |
| 写/副作用 API | ~66（generate/upload/analyze/delete/stream start/register/password…） | 禁止改生产数据 | 在隔离环境或 dry-run/staging 用合成项目测 3 次 |
| SSE / stream | `/api/sse`, `*-stream`, `/api/runs/:id/events` | 长连接，非单次 RTT | 单独做 TTFB/首事件延迟协议 |
| `/api/files/*`, `/api/storage/sign` | 媒体签名 | 依赖具体 key | 用真实 media key 抽样 3 次 |
| `/api/tasks/:id` | 需有效 taskId | 无稳定夹具 | 从 `/api/tasks` 取 id 再测 |
| `/dev/*` 页面 | 3 | 非产品路径 | 可选补测 |

---

## 4. 异常与环境说明（不得忽略）

1. **Reqable**：首轮不可用；§8 已复测抓包（无 ms duration，计时仍靠浏览器）。
2. **`next dev` 基线**：多数暖 GET ≈ 350–430ms；冷/首包常冒出 ~1.6–1.8s（见 episodes-index / storyboards / project-assets / novel-promotion root）。
3. **home 首跳 10120ms**：明显异常值，疑似编译/冷缓存；后两次回落到 ~3.8s。
4. **405**：`task-target-states`、`video-urls` GET 调用方式与路由契约不符（测到失败，非静默）。
5. **Navbar 文案不等于 aria**：早期用「资产库/成片库」失败；改为 `aria-label` 后可测。
6. **项目卡片选择器**：过宽会点到 asset-hub；应用 UUID href。

---

## 5. 最慢项排序（按影响 / 平均耗时）

### 页面切换（慢 → 快）

1. **workspace → 项目工作区** avg **6665ms**（等阶段 Tab）
2. **项目 → home** avg **5926ms**（含 10s 异常值；median 3894）
3. **asset-hub → films** avg **4131ms**
4. **films → profile** avg **4103ms**
5. **profile → account** avg **4061ms**
6. **logs → workspace** avg **3863ms**
7. **account → logs** avg **3524ms**
8. History forward/back ≈ **2.0–2.7s**
9. Navbar 软导航 ≈ **0.6–0.8s**（明显快于满页 goto）
10. 阶段 Tab ≈ **1–3ms**

### 接口（慢 → 快，看 avg；标注冷启动尖刺）

1. **GET project costs** avg 878（max 1607）
2. **GET project assets** avg 853（max 1798）
3. **GET episodes?view=index** avg 802（max 1609）
4. **GET novel-promotion/:id / storyboards** avg ~790（max ~1606）
5. **GET boot-id** avg 577（DEV 地板参考）
6. **GET episodes?view=text** avg 558
7. **GET user/api-config** avg 515
8. 其余暖 GET 多在 **350–430ms** 带

---

## 6. 验收对照

| 要求 | 状态 |
|------|------|
| 完整页面/接口清单 | 有（扫描 14 页 / 126 API） |
| 每项页面切换 ≥3 次 | **是**（goto / 导航点击 / history / 阶段 Tab / 项目卡片） |
| 每项接口 ≥3 次 | **34** 条只读 GET 各 3 次；写接口明确未测 |
| 耗时/成败/统计 | 有 |
| 未测项+原因+后续 | 有 |
| 慢项排序 | 有 |
| 不优化/不伪造 | 遵守 |

---

## 7. 原始数据位置

- 清单：`scripts/perf-speed-audit/inventory.json`
- 本报告：`scripts/perf-speed-audit/REPORT.md`
- 夹具说明：`scripts/perf-speed-audit/fixtures.mjs`

---

## 8. Reqable 复测（2026-09-07 ~20:28 UTC+8）

### 8.1 方法

| 项 | 说明 |
|----|------|
| Reqable | MCP 可达；`capture_live_set_enabled` 已开；Chrome 经代理抓到 `localhost:3000` |
| 发流 | 已登录 Playwright 页内 `fetch`×3（同夹具 project/episode） |
| 计时 | `performance.now()` 包 `arrayBuffer()`；辅证 ResourceTiming `duration` |
| 抓包核对 | `capture_live_filter` + `capture_live_get_by_id` 核对 path/status（**无 ms 字段**） |
| 未做 | 写接口；Reqable REST「发送」工具（MCP 仅建 Tab，无 send+timing） |

### 8.2 Reqable 抓包核对（抽样）

| path | Reqable record | response.code | app |
|------|-----------------|---------------|-----|
| `/api/system/boot-id` | id=201 | 200 | chrome |
| `/api/projects/.../costs` | id=247 | 200 | chrome |
| `/api/task-target-states` | id=303 | **405** | chrome |
| `/api/admin/logs` | id=314 | 200 | chrome |
| `.../video-urls` | ids=304/306/310 | **404**（复测） | chrome |

关键词 `localhost:3000/api` 一次 filter 命中 **百余条** 抓包 ID（含本次 battery + 页面旁路请求）。

### 8.3 复测 GET 耗时（每项 3 次，按 avg 降序）

| API | 状态 | 三次(ms) | min | max | avg | 成败 |
|-----|------|----------|-----|-----|-----|------|
| GET `.../projects/:id/costs` | 200 | 972/445/451 | 445 | 972 | 623 | 成功 |
| GET `/api/assets?scope=project&...` | 200 | 500/682/629 | 500 | 682 | 604 | 成功 |
| GET `.../projects/:id/data` | 200 | 589/544/480 | 480 | 589 | 538 | 成功 |
| GET `.../projects/:id/assets` | 200 | 459/469/600 | 459 | 600 | 509 | 成功 |
| GET `.../episodes?view=index` | 200 | 476/532/455 | 455 | 532 | 488 | 成功 |
| GET `/api/projects?page=1&pageSize=20` | 200 | 400/559/462 | 400 | 559 | 474 | 成功 |
| GET `.../episodes/:eid?view=full` | 200 | 469/465/468 | 465 | 469 | 467 | 成功 |
| GET `.../episodes/:eid?view=script` | 200 | 457/457/464 | 457 | 464 | 459 | 成功 |
| GET `/api/system/boot-id` | 200 | 488/444/436 | 436 | 488 | 456 | 成功 |
| GET `/api/novel-promotion/:id` | 200 | 466/460/443 | 443 | 466 | 456 | 成功 |
| GET `.../storyboards`（无 episodeId） | **400** | 434/456/440 | 434 | 456 | 443 | **失败**（缺参） |
| GET `/api/assets?scope=global&kind=character` | 200 | 456/457/403 | 403 | 457 | 439 | 成功 |
| GET `/api/tasks` | 200 | 437/433/410 | 410 | 437 | 427 | 成功 |
| GET `/api/asset-hub/folders` | 200 | 425/436/403 | 403 | 436 | 421 | 成功 |
| GET `/api/admin/logs` | 200 | 466/391/401 | 391 | 466 | 419 | 成功 |
| GET `/api/user/models` | 200 | 424/402/409 | 402 | 424 | 412 | 成功 |
| GET `/api/user-preference` | 200 | 407/402/405 | 402 | 407 | 405 | 成功 |
| GET `/api/user/costs` | 200 | 409/406/401 | 401 | 409 | 405 | 成功 |
| GET `/api/user/transactions?...` | 200 | 406/392/406 | 392 | 406 | 401 | 成功 |
| GET `/api/runs?...story_to_script_run` | 200 | 403/401/399 | 399 | 403 | 401 | 成功 |
| GET `/api/task-target-states` | **405** | 397/418/381 | 381 | 418 | 399 | **失败** |
| GET `/api/user/balance` | 200 | 406/383/386 | 383 | 406 | 392 | 成功 |
| GET `.../episodes/:eid/video-urls` | **404** | 587/256/223 | 223 | 587 | 355 | **失败**（本轮 404，首轮曾 405） |

### 8.4 相对首轮结论

1. **Reqable 已可用**：Chrome→`localhost:3000` 抓包成功；状态码与浏览器一致。
2. **毫秒计时仍靠浏览器**：Reqable MCP `capture_live_get_by_id` 仅有 connection `timestamp` + 响应 `Date`（秒级），**不能替代** `performance.now()`。
3. **暖路径地板略抬高**：多数成功 GET avg ≈ **390–490ms**（首轮多 350–430）；`boot-id` avg 456（首轮 577，本轮更稳、无 900ms 尖刺）。
4. **仍偏慢**：`project/costs`、`assets?scope=project`、`projects/:id/data|assets`、`episodes?view=index`。
5. **失败未静默**：`task-target-states`→405；`video-urls`→404；裸 `storyboards`→400。
6. **写接口 / SSE / 媒体签名**：仍未测（同 §3.3）。

---

## 9. 优化落地（2026-09-07 ~20:50 UTC+8）

### 9.1 改动摘要

| 区域 | 改动 |
|------|------|
| 项目冷启动 | 不再等 episode GET 才卸 `AppBootScreen`；有 `selectedEpisodeId` 即可挂 workspace |
| 软导航 Tab | 新增 `loading.tsx` 立即画阶段 Tab；`EarlyWorkspaceShell` + lazy `NovelPromotionWorkspace` |
| Prefetch | 项目卡片 / 首页最近项目 hover·focus → `prefetchProjectData` |
| `/data` | 先 `requireProjectAuthLight`，再单次 novel shell+index；auth 带齐 project 字段 |
| `/costs` | groupBy/recent 并行，total 由 byType 汇总；直引 `billing/reporting`；recent `take:20` |
| `/assets` read | `kind=` 时跳过无关角色/场景/道具/音色加载 |
| Episodes list | 一次 novel+episodes nested select |
| SSE | idle 后再连 EventSource |
| 次级页 | profile/films/account/logs：仅 `status===loading` 全屏 boot |

### 9.2 复测对比（DEV）

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 软导航 → 阶段 Tab（×3） | ~3500ms | **~992–1573ms（avg ≈1228）** |
| 暖 `GET .../costs`（×5） | 尖刺常 1–2s | **~450–520ms**（贴近 DEV 地板） |
| 暖 `GET .../data` | ~538–695 | **~720ms 量级**（仍受 DEV 地板约束） |

说明：`next dev` 下 boot-id 仍 ~400ms+；生产请用 `next start` 重基线。满页 `goto` 编译开销未消除，优先靠软导航 + loading shell。

### 9.3 续优化（~21:00）

| 改动 | 说明 |
|------|------|
| `prefetchProjectWorkspaceEntry` | hover 同时预热 `/data` + workspace JS chunk（稳定相对路径） |
| Boot gate | `!project?.novelPromotionData && !error` — 有 RQ 缓存则跳过 `AppBootScreen` |
| 次级路由 `loading.tsx` | films / profile / account / logs / asset-hub / workspace list |
| ModelCapabilityDropdown / SmartImport | dynamic import，减 page chunk |

| 指标（SPA 软导航，DEV） | 结果 |
|------|------|
| 列表↔项目 → 阶段 Tab ×3 | **977 / 1195 / 1358ms（avg ≈1177）** |
| 暖 boot-id | ~500ms |
### 9.4 干净重启后复测（~21:18 UTC+8）

| 指标 | 结果 |
|------|------|
| 冷进入项目 → 阶段 Tab | **3109ms**（原满页 goto ~6665ms） |
| SPA 暖 hop → 阶段 Tab ×3 | **533 / 497 / 523ms（avg ≈518）** |
| 暖 `/data` | avg **485**（min 441） |
| 暖 `/assets?scope=project` | avg **386** |
| 暖 boot-id | avg **539**（min 402） |
| Hover 预热 | `/data` + default episode(`script`) + workspace chunk |

相对审计基线：项目入口暖路径约 **6–7×** 提升；阶段 Tab 交互仍为毫秒级命令式翻页。

### 9.5 侧栏软导航（~22:08）

| 改动 | 说明 |
|------|------|
| Navbar | 全部 rail `prefetch` + idle `router.prefetch` 预热次级路由 |
| profile / logs / account | 重面板 `dynamic()`，首屏只挂壳 |
| films | React Query 缓存列表（再进秒开） |

| 指标（DEV，到 `data-page`） | 冷首跳 | 暖 hop（后两次） |
|------|--------|------------------|
| films | ~2.9–4.3s | **341ms** |
| profile | ~2.3–6.5s | **269ms** |
| logs | ~0.6–4.8s | **492ms** |

冷首跳仍受 `next dev` 编译主导；同会话再进已接近或优于原 Navbar 软导航基线（~0.6–0.8s）。

### 9.6 生产基线（`next start`，2026-09-07 ~23:10 UTC+8）

构建曾被若干既有 TS 错误挡住，已最小修复后 `npm run build` 通过；进程以 `next start` 跑在 `:3000`。Playwright 认证会话复测（fixture 同前）。

| 指标 | DEV（§9.4/9.5） | **PROD** |
|------|-----------------|----------|
| 冷软进入 → 阶段 Tab | ~3109ms | **1078ms** |
| SPA 暖 hop → 阶段 Tab ×3 | avg ≈518 | **741 / 695 / 748（avg ≈728）** |
| rail films → 可见页 ×3 | 暖 ~341 | **151 / 353 / 151** |
| rail profile ×3 | 暖 ~269 | **73 / 91 / 314** |
| rail logs ×3 | 暖 ~492 | **154 / 81 / 228** |
| 暖 `GET /api/system/boot-id` ×3 | avg ~400–540 | **10 / 12 / 10** |
| 暖 `GET .../projects/:id/data` ×3 | avg ~485 | **42 / 127 / 40** |
| 暖 `GET .../projects/:id/costs` ×3 | avg ~450–520 | **13 / 11 / 13** |
| 暖 `GET /api/assets?scope=project` ×3 | avg ~386 | **20 / 18 / 20** |

结论：

1. **DEV 地板已证实**：同一套代码在 `next start` 下 API 从数百毫秒掉到十余～百毫秒量级；boot-id ~11ms 说明此前 ~400ms+ 主要是 `next dev` 开销。
2. **项目入口 / 侧栏**：生产冷进入 Tab ~1.1s；侧栏暖跳多数 **&lt;200ms**。
3. **暖项目 hop ~728ms** 仍高于侧栏，主要仍是 workspace chunk + `/data`/episode 填充；已明显好于优化前满页 goto（~6.7s）与 DEV 冷软进（~3.1s）。
4. 构建顺带修了挡 `next build` 的类型问题（`countStoryboardStats` panels null、`WorkspaceEpisodeContext` import、Episode 断言、Navbar loading 窄化、`episode-index` Partial 联合、`ai-story-expand` locale、`prefetchProjectData`→`ensureQueryData`）。
