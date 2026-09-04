# 影核 Ark Knowledge

## Product positioning

- **Primary product**: Yinghe Ark (影核) Web AI short-drama studio — project folder `Yinghe-Ark/`.
- **Reference-only**: `UI/` (beginner UX mockups), `Toonflow-app/` (capability ideas), `drama-skills/` (craft knowledge for prompt distillation — not a C-end runtime).

## P0 beginner UX (shipped)

- **Create confirm wizard** (`/home`): 「开始创作」opens a five-step confirm dialog; project is created only on final confirm. Still launches with `autoRun=storyToScript`.
- **Pipeline checklist**: While creating / story→script / script→storyboard runs, workspace shows a readable stage checklist (`lib/task/pipeline-checklist.ts`).
- **Editor honesty gate**: `stage=editor` is **not** silently remapped to `videos`. Capsule nav can open editor; content is an explicit “not available yet” gate with CTA to videos export (`EditorGateStage`).

## P1 genre packs + vendor probe (shipped)

- **Genre packs** (`src/lib/genre-packs.ts`): `urban_slice` / `romance_mogul` / `mystery_rules` — distilled from drama-skills; shown as StylePreset options on home **and** workspace story config.
- Persisted on `NovelPromotionProject.genrePack`; create launch PATCHes it; workspace story page can change it via `handleUpdateConfig('genrePack')`.
- Injected via `resolveVisualGenerationPrompt` into analyze + character/location/panel image prompts.
- Injected into **story→script** via `genreConstraint` / `applyGenreConstraint` in `runStoryToScriptOrchestrator` (handler reads `novelData.genrePack`).
- Home recent projects show a genre label when `genrePack` is set.
- **Vendor probe report**: `VendorProbeReport` + `resolveVendorProbeSummary` in settings provider card (uses existing `test-provider` steps).

## P2 (shipped through P2.3)

- **P2.1 Agent activity feed**: Run console defaults to **Simple** view — `resolveAgentActivityFeed` (理解/创作/核对). **Detailed** restores raw stream.
- **P2.2 Clip event graph**: Script stage horizontal **剧情节点** from clips (`resolveClipEventNodes` + `ClipEventGraph`).
- **P2.3 Script review checklist**: Beginner self-check on script stage (`script-review-gates.ts` + `ScriptReviewChecklist`); auto hints from clip gaps; checkbox state in `localStorage` per project/episode. Does **not** block storyboard. Distilled from drama-skills rubric — no STY/SCR IDs at runtime.

## P3 (shipped through P3.6)

- **P3.1 Storyboard review checklist**: Storyboard stage (`storyboard-review-gates.ts` + `StoryboardReviewChecklist`); hints for missing images/descriptions; does **not** block video generation.
- **P3.2 Video review checklist**: Video stage (`video-review-gates.ts` + `VideoReviewChecklist`); hints for missing clips/prompts/failures; does **not** block batch generate.
- **P3.3 Clip event reorder**: Script **剧情节点** Earlier/Later buttons; reuses `PUT …/storyboard-group` (swap clip `createdAt`); helper `resolveAdjacentClipMove`.
- **P3.4 Adjacent clip merge**: `POST …/clips/merge` keeps selected clip, absorbs next; clears VoiceLine panel matches before delete; cascades delete absorb storyboard; UI confirm on event graph (warns keep storyboard is not auto-updated). Single location stays plain string; multi → JSON array.
- **P3.5 Clip drag reorder**: Horizontal `@dnd-kit` on event graph; `PUT …/storyboard-group` with `overClipId` reassigns `createdAt` timeline in one transaction (`resolveClipDragReorder` + `buildClipCreatedAtUpdates` with unique timestamps). Earlier/Later via `resolveAdjacentClipMove`.
- **P3.6 Hardening**: Vendor probe `redactSensitiveText` / `sanitizeVendorProbeSteps` on probe return + UI; review checklists use `usePersistedReviewChecks` (`hydratedKey === storageKey` before write).
- **storyboard-group ownership**: POST/PUT/DELETE verify episode (or storyboard→episode) belongs to URL `projectId` (same pattern as `clips/merge`).

## P4 (shipped through P4.3)

- **P4.1 Script LLM auto-review**: Sync `POST …/script-review` uses project `analysisModel` + `executeAiTextStep`; pure helpers in `script-llm-review.ts`; Script checklist 「AI 核对」 shows findings. Does **not** block storyboard; no new TASK_TYPE.
- **P4.2 Storyboard LLM auto-review**: Sync `POST …/storyboard-review`; helpers in `storyboard-llm-review.ts` (text + hasImage only, no image URLs); Storyboard checklist 「AI 核对」. Does **not** block video generate.
- **P4.3 Video LLM auto-review**: Sync `POST …/video-review`; helpers in `video-llm-review.ts` (`hasImage`/`hasVideo`/`videoPrompt` only); Video checklist 「AI 核对」. Does **not** block batch generate.

## P5 (shipped through P5.3)

- **P5.1 Merge → storyboard stale badge**: After adjacent clip merge, if keep clip has a storyboard, set `lastError` to `waoowaoo:script_stale:merged`; Storyboard group shows warning banner + regenerate CTA (`storyboard-script-stale.ts`). Cleared via existing close-error / regenerate-text paths.
- **P5.2 Clip event drag optimistic UI**: `ClipEventGraph` uses `DragOverlay` + local optimistic order; Earlier/Later and drag apply `applyClipIdOrder` to `episodeData.clips` before API, rollback on failure (`clip-reorder.ts`).
- **P5.3 Create compensation**: `createHomeProjectLaunch` best-effort `DELETE /api/projects/:id` if config PATCH or first-episode create fails after the shell project exists (`compensateCreatedHomeProject`). Original error is always rethrown; delete failure must not mask it.

## P6 (shipped through P6.3)

- **P6.1 Pipeline video/voice active**: Checklist lights `video` / `voice` from active `video_panel` / `voice_line` tasks (`usePipelineMediaTaskActivity` + `PIPELINE_*_TASK_TYPES`). Episode-scoped when `task.episodeId` is set; project-scoped tasks without episode count for any episode. Same flags fold into capsule `isAnyOperationRunning`.
- **P6.2 API ownership scan**: Shared helpers in `resource-ownership.ts` (`requireEpisode/Clip/Storyboard/PanelOwnedByProject`). Wired into `clips/[clipId]` PATCH, `panel` POST/PATCH/PUT/DELETE, `speaker-voice` GET, `generate-video` batch + single. Cross-project IDs → `NOT_FOUND` (same as merge). Remaining novel-promotion routes still deferred for follow-up sweeps.
- **P6.3 Voice-stage self-check**: `voice-review-gates` + `VoiceReviewChecklist`（8 条白话核对 + 自动建议）；挂在配音主内容下方；勾选按 project+episode `localStorage`；**不阻断**分析/生成。无 LLM 审查（与 P3 自检同级，P4 式 AI 核对后置）。

## UI P0 (viewport honesty)

- Review checklists (script/storyboard/video/voice) **default collapsed**; expand restores full list + hints.
- Mount order: creative surface first (clips / storyboard canvas / video timeline+panels / voice toolbar+lines), checklist after.
- Mobile (`≤900px`): `admin-page-header` gets top padding so fixed `theater-secondary-toggle` does not overlap H1.
- Home / workspace / profile loading: spinner + copy (not bare text).

## Browser QA follow-ups

- **Capsule activeId**: `resolveCapsuleActiveId` maps `assets→script`, `novel|text→config`. **Voice is its own capsule step** (no longer remapped to `videos`).
- **Collapsed warn peek**: while checklist is collapsed, show the first `warn` auto-hint (+N) so blockers stay visible without eating the viewport.

## UI P1 (contrast / CTA)

- Light accent deepened (`--glass-accent-from: #8f5a28`, hover `#a56b32`); `--glass-text-on-accent` → cream `#fff8f0` for ≥4.5:1 on primary buttons.
- `--glass-text-tertiary` / placeholder deepened to `#5a4f45`.
- Film stages: inactive labels use primary at 82% opacity; active wash uses accent; disabled opacity 0.55; gold step numbers slightly heavier.
- Review checklist 「AI 核对」/展开按钮: `text-[10px]` → `text-xs` + slightly larger padding (script/storyboard/video; voice expand matched).

## UI Alibaba style pass (foundation)

- Tokens: 8px spacing scale only (`space-1…10` → 4/8/16/24/32/40/48); radius control/card/modal → 4/8/8; elevation `shadow-0/1/2`; typography size/line-height/weight tokens; `--glass-control-min-size` 44 / compact 32; motion 250ms ease-out.
- Surfaces: normal cards `shadow-0`; elevated `shadow-1`; modal `shadow-2`.
- `body` font stack = brand + system Alibaba fallback; body line-height 1.5715; h1–h3 map to tokens.
- `glass-btn-base`: token padding/duration/focus; disabled via token colors (no opacity hack); optional `.glass-btn-comfortable` → 44px min.
- Asset Hub: empty/scope copy clarifies global ≠ project assets; header uses type tokens.
- AssetToolbar episode chip: remove hardcoded `#f2f2f7` / iOS greys → glass muted/fill tokens.
- Shell cleanup: home / workspace list / profile / logs / AiWriteModal / CreateConfirmWizard / ProjectCardCover / ProviderCardShell — magic 10–15px sizes & hardcoded radii/overlays → font/radius/overlay tokens; cover gradients via `--cover-gradient-*`.
- API config + billing: `DefaultModelCards` / Provider fields / `ApiConfigTabContainer` / `BillingRecordsPanel` — magic 10–15px & `rounded-[8|10px]` → tokens; drop `disabled:opacity-40`; section titles `font-medium`.
- Workspace deep parallel pass: ReviewChecklists ×4, script-view, storyboard, video/voice, assets cards — caption/body/title tokens; overlays → `--glass-overlay*`; role tier hex centralized as `--glass-role-tier-*`.
- Production token sweep (continued): landing/auth/shell already clean; batch + targeted pass on model-dropdown variants/innovative (Ant blue / coral / purple active → `--glass-accent-*` / fill-active / tone tokens), workspace error banners → danger tone, video-stage / voice / assistant / script asset disabled opacity → token disabled colors, AI sparkles gradients → brand tungsten. Skip `dev/*` playgrounds. Do not invent Ant blue for selected states.
- Model dropdown weight/contrast: `font-bold` → `font-medium`; selected black/white chips → accent + `--glass-text-on-accent`; drop hardcoded Inter stack on variant trigger.
- Style re-check pass: production hard patterns remain 0; remaining `font-bold` (19 files) → `font-medium`; `body` font stack drops `Roboto`, keeps Source Sans + PingFang/YaHei. Defer bulk `text-white` on media overlays; skip `dev/*`.
- Style optimize pass: production `text-white` / `text-white/N` / hover variants → `--glass-text-on-accent` (70 files); indigo glow in video panel + ratio selector → accent shadow/mix. Skip `dev/*` and role-tier token gradients.
- Media letterbox: `--glass-media-letterbox` token; video panel `bg-black` → token; script selected card shadow → `--glass-shadow-md`.
- Role-tier recolor: S–D badges use brand/functional tokens (gold/danger, accent, teal/info, success, neutral) — no Ant purple/blue/cyan hex; modal + ratio preview hard rgba shadows → glass shadow/stroke tokens.

- Projects API `stats.coverImageUrl`: first storyboard panel `imageUrl` for list covers.
- Home + workspace cards: real cover or genre/seed gradient + name initial (`ProjectCardCover`); stats as readable 「N 集 · N 镜 · N 视频」 (`formatProjectStatsLine`).
- Asset empty slots (character/location): dashed +「待生成」+ name when idle; pulse only while generating.
- Asset hub loading: skeleton grid (not lone 「生成中」); empty copy unchanged.
- Secondary sidebar header: contain `headerAction` (+) so it does not sit on the rail/content seam.
- **C1**: Home recent grid `max-width` scales with project count (1→sm, 2→2xl, 3→5xl) so a lone card is not left-aligned in a 1400px void.
- **C2**: Story stage `max-w-6xl/7xl` + lg side rail for asset tip / narration.
- **C3**: Settings basic pane `max-w-3xl` + single-column cards (`max-w-2xl`).
- **C4**: Script body expands only the selected clip; others show 2-line peek + scroll-into-view.
- **C5**: Script/assets grid `9/3`; character spotlight cards compact horizontal thumbs.

## UI P4 (nav / voice entry)

- Capsule Film stages include **配音** (`voice`) between 成片 and AI剪辑 (`useWorkspaceStageNavigation`).
- `resolveCapsuleActiveId('voice')` → `voice` (first-class underline).
- i18n `stages.voice` = 配音 / Voice; stage strip widened to ~860px for six steps.
- Theater Rail already exposes hover/focus `rail-tip` labels (E1 confirmed).
- **E4**: Settings sidebar title →「个人账户」+ displayName；主区 eyebrow「设置」+ 唯一 H1 分区名。Logs 主区同结构（eyebrow「日志」+ 分区 H1）。
- **E5**: Workspace top actions (资产库/设置/刷新) 均补 `title` + `aria-label`（窄屏图标态可读）。

## UI P5 (partial)

- **F5**: Home hero subtitle drops terminal `>_` typewriter; static Film support line. **Do not** reintroduce infinite blur/opacity pulse on H1 (hurts contrast); prefer one-shot rise. Visual QA 2026-09-03 fixed: TYPE-01/MOB-01/MOB-02/FOCUS-01/LAY-01 + primary:disabled brand tint + ASSET-01/NAV-01 + LAND-01/DEV-01.
- **Media display**: Never put raw storage keys (`images/…`) in `<img src>` — they resolve under `/zh/…` and 404. Always `toDisplayImageUrl` (MediaImage does this). Prefer new URLs `stage=script` + `assetLibrary=1` over legacy `stage=assets`.
- **Landing**: Authenticated `/{locale}` redirects **server-side** to `/home` (`page.tsx` + `getServerSession`). Marketing UI lives in `LandingPageClient` for guests only.
- **Dev overlays**: `devIndicators: false` in `next.config.ts`. React Grab loads only when `NEXT_PUBLIC_ENABLE_REACT_GRAB=1` in development.
- **Storage sign**: `/api/storage/sign` must redirect with an absolute URL built from request `Host` (never `0.0.0.0` from `next dev -H 0.0.0.0`). Missing files → `/api/files` 404, not sign 400.
- **Home composer**: On narrow screens, selector row scrolls independently; primary CTA stays on its own row (`StoryInputComposer`).

## Brand assets (Yinghe Ark / 影核)

- **Source**: `Yinghe-Ark-design-assets/` (01-logo, 03-icons/core-20). Rasters copied to `public/brand/`; legacy root aliases kept (`/logo.png`, `/logo-small.png`, `/icon.png`, `/favicon.png`).
- **Code map**: `src/lib/brand/assets.ts` — logo + rail nav paths; cache-bust via `BRAND_ASSET_VERSION` (`?v=` on all brand URLs). `next.config.ts` `images.localPatterns` allows `/brand/**` (and root logo aliases) with query strings.
- **Components**: `BrandLogo` (horizontal/onLight/mark/etc.) for top bars & auth — base classes are `h-auto w-auto max-w-full object-contain`; callers pass `max-h-8` / `max-h-10` (do **not** add `max-h-full` or it overrides). `BrandIcon` for Theatre Rail shell nav only; `BrandOpIcon` for common ops (`op-new`, `op-search` — e.g. asset hub new folder). In-app ops still use Lucide `AppIcon` — do not bulk-replace without product ask.
- **Shell wiring**: `Navbar` — authed rail uses `logo-icon-app` mark + `BrandIcon` PNGs; guest top bar uses `BrandLogo variant="onLight"`. `layout.tsx` metadata icons → `/brand/favicon.png` + `/brand/app-icon-512.png`.
- **CSS**: `.theater-rail__brand` is transparent image container (no gold “W” letter).

## Settings UI chrome

- **Default models** and **provider pool** share `admin-section-card` + `admin-tile` + gold icon box (`--glass-tone-info-bg` / `--film-gold`). **Basic settings** uses the same shell: one section card with two `admin-tile` columns (appearance / language), full `max-w-[1440px]` content width like defaults. Provider cards use `.admin-provider-card`; model list fixed **280px** height with internal scroll (`.admin-provider-card__model-list`); grid uses `items-stretch` + card `h-full` for row alignment. Header title/badge vertically centered with icon (`items-center`). List top shows `dragToSortHint`. Shell icons via `getProviderVisualIcon()` in `api-config/types.ts`.

- **F2**: Review checklists use `.review-checklist-body` (`grid-template-rows` 0fr→1fr, ~250ms) so expand/collapse is animated; respects `prefers-reduced-motion`.
- **F3**: Radius layering — controls `glass-btn-base` → `--glass-radius-sm`; panels `glass-surface*` / checklist shells → `--glass-radius-panel`; modals → `--glass-radius-xl`.
- **F1**: Light canvas deepened (`#e6ddd2`) away from common cream cluster; body uses SVG film-grain blend (`--film-grain-blend` / opacity tokens).
- **F4**: `.glass-surface-soft` is borderless muted fill; new `.glass-inset` for creative wells; script panel + story narration + LLM stage nested borders thinned.
- **F6**: Dark tokens rebalanced to match light (deep tungsten accent + cream on-accent); asset menus use `--glass-bg-surface-modal` instead of hardcoded white.

## Dead code cleanup (ecc-refactor-cleaner, conservative)

- Tools: knip / depcheck / ts-prune (no knip config yet; many Next FP).
- SAFE batch 1: unused model-dropdown/select experiments, PanelCardV2/StoryboardHeaderV2, dead About/UpdateNotice chain, orphan barrels (`llm-console/index`, `lib/llm/index`), `generators/audio`, `lib/srt`, tmp scripts.
- SAFE batch 2 (re-check): unused barrel `ui/patterns/index.ts` (keep `PanelEditFormV2` direct import), `resolution-adapter.ts`, unused `llm-observe/internal-task.ts`, stage contract stubs, unused `story-to-script/types.ts` re-export, unused `storyboard-types.ts`, orphan `ModelTemplateAssistantModal`.
- Left alone: app routes (knip still flags prompts-stage/Sidebar/asset modals — often false positive), video-editor/remotion deps, ops scripts, npm deps with no static import yet (`mammoth`/`file-saver`/`@openrouter/sdk`/`react-hot-toast`), `react-grab` (CDN), CSS tokens, workers, `vitest.core-coverage.config.ts` (used by script).
- Do not restore deleted UI experiments unless product re-adopts them; production model UI uses `ModelCapabilityDropdown` / config-modals.

## Bugfixes (flow QA)

- **i18n missing-key crash**: Client `IntlClientProvider` swallows `MISSING_MESSAGE` (warn + fallback) so Next overlay cannot brick the workspace. Do **not** pass `onError`/`getMessageFallback` from the Server `layout` — that crashes RSC serialization.
- **Profile confirm → auto image**: `character_profile_confirm` / batch enqueue `IMAGE_CHARACTER` after creating empty appearances (`character-profile-enqueue-images.ts`). Honors `generateImage: false`. Soft-skips if character model missing. Copy in `assets` pending/confirm toasts aligned.
- **Image preview Escape**: `ImagePreviewModal` listens in capture phase + `stopPropagation` so Esc closes preview without also dismissing the asset library.
- **Progress key in composite subtitle**: `LLMStageStreamCard.resolveProgressText` translates embedded `progress.*` tokens inside strings like `并行组: … | progress.runtime.stage.llmStreaming`.
- **Generate button click zones**: Asset / panel `ImageGenerationInlineCountButton` uses `splitInteractiveZones` so 「生成」and the count `<select>` are separate hit targets.
- **URL param races**: `updateUrlParams` merges from `window.location.search` first so episode backfill cannot drop `stage` from a stale `useSearchParams` snapshot.

## Do not regress

- Do not restore `editor → videos` silent remap in `page.tsx` / `useWorkspaceProjectSnapshot.ts`.
- Do not call `createHomeProjectLaunch` before confirm wizard completion on home.
- Do not load drama-skills / Toonflow trees at runtime — distill only.
- Do not skip project ownership checks on novel-promotion mutations that accept episode/clip/storyboard/panel IDs — use `resource-ownership.ts` helpers (cross-project → `NOT_FOUND`).
