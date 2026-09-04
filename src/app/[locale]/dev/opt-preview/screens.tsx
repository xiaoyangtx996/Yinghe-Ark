'use client'

import { useState } from 'react'
import { AppIcon } from '@/components/ui/icons'
import {
  agentLogs,
  denseProjects,
  eventNodes,
  libraryStateDemo,
  optScreens,
  skillArtPacks,
  skillStoryPacks,
  taskStageRows,
  vendorProbeSteps,
  type OptScreenId,
} from './data'

function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--glass-bg-muted)]">
      <div
        className="h-full rounded-full bg-[var(--film-gold)] transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function PriorityChip({ priority }: { priority: '高' | '中' | '低' }) {
  const tone =
    priority === '高' ? 'glass-chip-warning' : priority === '中' ? 'glass-chip-info' : 'glass-chip-neutral'
  return <span className={`glass-chip ${tone} text-[10px]`}>{priority}优</span>
}

export function GalleryScreen({ onNavigate }: { onNavigate: (id: OptScreenId) => void }) {
  const items = optScreens.filter((s) => s.id !== 'gallery')
  return (
    <div className="space-y-4">
      <section className="admin-section-card !flex-none">
        <div className="admin-section-card__body">
          <p className="text-sm font-medium text-[var(--glass-text-primary)]">
            对照 UI × Toonflow 分析结论的可落地界面
          </p>
          <p className="mt-1 text-xs text-[var(--glass-text-secondary)]">
            以下原型复用影核 Ark 现有 Film DI / glass 样式与 theater 壳层。确认视觉后再决定是否正式加功能任务。
          </p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className="glass-surface rounded-[var(--glass-radius-lg)] p-4 text-left transition hover:border-[var(--film-gold)]/40"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--glass-tone-info-bg)] text-xs font-bold text-[var(--film-gold)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex flex-wrap justify-end gap-1.5">
                <span className="glass-chip glass-chip-neutral text-[10px]">{item.source}</span>
                <PriorityChip priority={item.priority} />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">{item.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--glass-text-secondary)]">{item.desc}</p>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--film-gold)]">
              查看原型 <AppIcon name="arrowRight" className="h-3.5 w-3.5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ConfirmWizardScreen() {
  const [step, setStep] = useState(0)
  const steps = ['创意确认', '剧本大纲', '角色卡', '分镜预览', '风格与生成']

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="film-stages" role="tablist" aria-label="确认步骤">
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            data-active={i === step ? 'true' : 'false'}
            className="film-stages__item"
            onClick={() => setStep(i)}
          >
            <span className="film-stages__n">{i + 1}</span>
            <span className="film-stages__t">{label}</span>
          </button>
        ))}
      </div>

      <section className="admin-section-card !flex-none">
        <div className="admin-section-card__body space-y-3">
          {step === 0 && (
            <>
              <h3 className="font-display text-base font-semibold text-[var(--glass-text-primary)]">确认你的创意</h3>
              <p className="rounded-[var(--glass-radius-md)] bg-[var(--glass-bg-muted)] p-3 text-sm leading-relaxed text-[var(--glass-text-primary)]">
                都市甜宠 · 隐婚总裁 · 女主被逼签协议，却在雨夜发现对方藏了真心。
              </p>
              <p className="text-xs text-[var(--glass-text-tertiary)]">可返回修改一句话；确认后进入剧本大纲。</p>
            </>
          )}
          {step === 1 && (
            <>
              <h3 className="font-display text-base font-semibold">剧本大纲（可编辑）</h3>
              {['第1集 协议逼婚', '第2集 晚宴试探', '第3集 雨夜真心'].map((ep) => (
                <div
                  key={ep}
                  className="rounded-[var(--glass-radius-md)] border border-[var(--glass-stroke-base)] px-3 py-2.5 text-sm"
                >
                  {ep}
                </div>
              ))}
            </>
          )}
          {step === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {['顾沉舟 · 冷面总裁', '苏晚晴 · 倔强女主'].map((c) => (
                <div key={c} className="rounded-[var(--glass-radius-md)] border border-[var(--glass-stroke-base)] p-3">
                  <div className="mb-2 aspect-[3/4] rounded-lg bg-[var(--glass-bg-muted)]" />
                  <p className="text-sm font-medium">{c}</p>
                </div>
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="space-y-2">
              <h3 className="font-display text-base font-semibold">分镜预览</h3>
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="flex gap-3 rounded-[var(--glass-radius-md)] border border-[var(--glass-stroke-base)] p-2.5"
                >
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-[var(--glass-bg-muted)]" />
                  <div>
                    <p className="text-sm font-medium">镜头 {n}</p>
                    <p className="text-xs text-[var(--glass-text-secondary)]">中景 · 办公室落地窗 · 对峙</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {step === 4 && (
            <>
              <h3 className="font-display text-base font-semibold">风格确认 · 开始生成</h3>
              <div className="flex flex-wrap gap-2">
                {['真人都市', '电影感', '竖屏 9:16'].map((t) => (
                  <span key={t} className="glass-chip glass-chip-info text-[10px]">
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-xs text-[var(--glass-text-tertiary)]">本页仅演示确认流，不触发真实任务。</p>
            </>
          )}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              className="glass-btn-base glass-btn-secondary px-3.5 py-2 text-sm disabled:opacity-40"
            >
              上一步
            </button>
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              className="glass-btn-base glass-btn-primary px-3.5 py-2 text-sm font-semibold"
            >
              {step === 4 ? '开始生成' : '确认并继续'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export function TaskStagesScreen() {
  const done = taskStageRows.filter((r) => r.status === 'done').length
  const pct = Math.round((done / taskStageRows.length) * 100) + 12

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="admin-section-card !flex-none">
        <div className="admin-section-card__body">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[var(--glass-text-primary)]">总裁的隐婚新娘 · 生成中</h3>
              <p className="text-xs text-[var(--glass-text-secondary)]">总体进度可解释，而不是只有转圈</p>
            </div>
            <span className="font-display text-2xl font-bold text-[var(--film-gold)]">{pct}%</span>
          </div>
          <ProgressBar value={pct} />
        </div>
      </section>

      <div className="space-y-2">
        {taskStageRows.map((row) => (
          <div
            key={row.key}
            className={`glass-list-row flex items-center gap-3 rounded-[var(--glass-radius-md)] px-4 py-3 ${
              row.status === 'active' ? 'border border-[var(--film-gold)]/35 bg-[var(--glass-tone-info-bg)]' : ''
            } ${row.status === 'pending' ? 'opacity-60' : ''}`}
          >
            {row.status === 'done' ? (
              <AppIcon name="check" className="h-5 w-5 text-[var(--glass-tone-success-fg)]" />
            ) : row.status === 'active' ? (
              <AppIcon name="loader" className="h-5 w-5 animate-spin text-[var(--film-gold)]" />
            ) : (
              <span className="h-5 w-5 rounded-full border border-[var(--glass-stroke-base)]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--glass-text-primary)]">{row.label}</p>
              <p className="text-xs text-[var(--glass-text-secondary)]">{row.desc}</p>
            </div>
            <span className="text-xs text-[var(--glass-text-tertiary)]">{row.eta}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" className="glass-btn-base glass-btn-secondary px-3 py-2 text-sm">
          后台运行
        </button>
        <button type="button" className="glass-btn-base glass-btn-danger px-3 py-2 text-sm">
          取消任务
        </button>
      </div>
    </div>
  )
}

export function EventGraphScreen() {
  const [selected, setSelected] = useState(eventNodes[0].id)
  const node = eventNodes.find((n) => n.id === selected)!

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-xs text-[var(--glass-text-secondary)]">
        <AppIcon name="idea" className="h-3.5 w-3.5 text-[var(--film-gold)]" />
        小说原文 → 事件抽取 → 人工确认 → 改编剧本
      </p>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="admin-section-card !flex-none">
          <div className="admin-section-card__body">
            <div className="flex flex-wrap items-center gap-2">
              {eventNodes.map((n, i) => (
                <div key={n.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(n.id)}
                    className={`rounded-[var(--glass-radius-md)] border px-3 py-2 text-left transition ${
                      selected === n.id
                        ? 'border-[var(--film-gold)] bg-[var(--glass-tone-info-bg)]'
                        : 'border-[var(--glass-stroke-base)] hover:border-[var(--film-gold)]/40'
                    }`}
                  >
                    <p className="text-[10px] text-[var(--glass-text-tertiary)]">{n.chapter}</p>
                    <p className="max-w-[140px] truncate text-xs font-semibold text-[var(--glass-text-primary)]">
                      {n.title}
                    </p>
                    <span className="glass-chip glass-chip-neutral mt-1 text-[9px]">{n.type}</span>
                  </button>
                  {i < eventNodes.length - 1 ? (
                    <AppIcon name="arrowRight" className="h-4 w-4 shrink-0 text-[var(--glass-text-tertiary)]" />
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-[var(--glass-text-tertiary)]">
              点击节点查看详情；正式版可拖拽排序 / 合并 / 删除事件。
            </p>
          </div>
        </section>

        <section className="admin-section-card !flex-none">
          <div className="admin-section-card__head">
            <h3 className="admin-section-card__title">{node.title}</h3>
          </div>
          <div className="admin-section-card__body space-y-3">
            <p className="text-xs leading-relaxed text-[var(--glass-text-secondary)]">{node.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              {node.characters.map((c) => (
                <span key={c} className="glass-chip glass-chip-neutral text-[10px]">
                  {c}
                </span>
              ))}
            </div>
            <button type="button" className="glass-btn-base glass-btn-primary w-full px-3 py-2 text-sm font-semibold">
              以此改编剧本
            </button>
            <button type="button" className="glass-btn-base glass-btn-secondary w-full px-3 py-2 text-sm">
              编辑事件
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

export function SkillsPackScreen() {
  const [story, setStory] = useState(skillStoryPacks[0].id)
  const [art, setArt] = useState(skillArtPacks[0].id)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section>
        <div className="mb-3 flex items-center gap-2">
          <AppIcon name="package" className="h-4 w-4 text-[var(--film-gold)]" />
          <h3 className="text-sm font-semibold text-[var(--glass-text-primary)]">题材 Skill</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {skillStoryPacks.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setStory(p.id)}
              className={`rounded-[var(--glass-radius-lg)] border p-4 text-left transition ${
                story === p.id
                  ? 'border-[var(--film-gold)] bg-[var(--glass-tone-info-bg)]'
                  : 'border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)]'
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-semibold">{p.name}</span>
                {p.hot ? <span className="glass-chip glass-chip-warning text-[10px]">热门</span> : null}
              </div>
              <p className="text-xs text-[var(--glass-text-secondary)]">{p.desc}</p>
              <p className="mt-2 font-mono text-[10px] text-[var(--glass-text-tertiary)]">{p.key}</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <AppIcon name="sparkles" className="h-4 w-4 text-[var(--film-gold)]" />
          <h3 className="text-sm font-semibold">画风 Skill</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {skillArtPacks.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setArt(p.id)}
              className={`rounded-[var(--glass-radius-lg)] border p-3 text-left ${
                art === p.id
                  ? 'border-[var(--film-gold)] bg-[var(--glass-tone-info-bg)]'
                  : 'border-[var(--glass-stroke-base)]'
              }`}
            >
              <div className="mb-2 aspect-video rounded-lg bg-[var(--glass-bg-muted)]" />
              <p className="text-xs font-semibold">{p.name}</p>
              <span className="glass-chip glass-chip-neutral mt-1 text-[9px]">{p.tag}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="rounded-[var(--glass-radius-md)] border border-dashed border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] px-4 py-3 text-xs text-[var(--glass-text-secondary)]">
        已选：{skillStoryPacks.find((s) => s.id === story)?.name} × {skillArtPacks.find((a) => a.id === art)?.name}
        —— 后续生成将注入对应提示与约束（原型示意）。
      </div>
    </div>
  )
}

export function ProjectCardsScreen() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--glass-text-secondary)]">
        Toonflow 式密度：画风标签 · 来源 · 摘要 · 时间 · 快捷操作（卡片壳层沿用 glass-surface）
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {denseProjects.map((p) => (
          <article key={p.id} className="glass-surface overflow-hidden rounded-[var(--glass-radius-lg)]">
            <div className="aspect-[16/10] bg-[var(--glass-bg-muted)]" />
            <div className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-sm font-semibold text-[var(--glass-text-primary)]">{p.title}</h3>
                <span
                  className={`admin-badge text-[10px] ${
                    p.status === '已完成'
                      ? 'admin-badge--success'
                      : p.status === '生成中'
                        ? 'admin-badge--neutral'
                        : 'admin-badge--neutral'
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="glass-chip glass-chip-neutral text-[10px]">{p.style}</span>
                <span className="glass-chip glass-chip-info text-[10px]">{p.source}</span>
              </div>
              <p className="line-clamp-2 text-xs leading-relaxed text-[var(--glass-text-secondary)]">{p.summary}</p>
              <p className="text-[10px] text-[var(--glass-text-tertiary)]">{p.updatedAt}</p>
              <div className="flex gap-2 pt-1">
                <button type="button" className="glass-btn-base glass-btn-secondary flex-1 px-2 py-1.5 text-xs">
                  打开
                </button>
                <button type="button" className="glass-btn-base glass-btn-ghost px-2 py-1.5 text-xs text-[var(--glass-tone-danger-fg)]">
                  删除
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function AgentStreamScreen() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '决策 Agent', icon: 'cpu' as const },
          { label: '执行 Agent', icon: 'bolt' as const },
          { label: '监督 Agent', icon: 'badgeCheck' as const },
        ].map(({ label, icon }) => (
          <div
            key={label}
            className="glass-surface flex items-center gap-2 rounded-[var(--glass-radius-md)] px-3 py-2"
          >
            <AppIcon name={icon} className="h-4 w-4 text-[var(--film-gold)]" />
            <span className="text-xs font-medium text-[var(--glass-text-primary)]">{label}</span>
          </div>
        ))}
      </div>

      <section className="admin-section-card !flex-none">
        <div className="admin-section-card__head">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--film-gold)]" />
            <h3 className="admin-section-card__title">实时过程流</h3>
          </div>
        </div>
        <div className="admin-section-card__body !space-y-1 !p-2">
          {agentLogs.map((log, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-[var(--glass-radius-md)] px-3 py-2.5 hover:bg-[var(--glass-bg-muted)]"
            >
              <span
                className={`glass-chip text-[10px] ${
                  log.layer === '决策'
                    ? 'glass-chip-info'
                    : log.layer === '执行'
                      ? 'glass-chip-warning'
                      : 'glass-chip-success'
                }`}
              >
                {log.layer}
              </span>
              <p
                className={`min-w-0 flex-1 text-sm ${
                  log.status === 'pending'
                    ? 'text-[var(--glass-text-tertiary)]'
                    : 'text-[var(--glass-text-primary)]'
                }`}
              >
                {log.text}
              </p>
              {log.status === 'done' ? (
                <AppIcon name="check" className="h-4 w-4 shrink-0 text-[var(--glass-tone-success-fg)]" />
              ) : log.status === 'active' ? (
                <AppIcon name="loader" className="h-4 w-4 shrink-0 animate-spin text-[var(--film-gold)]" />
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--glass-stroke-base)]" />
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function VendorProbeScreen() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <section className="admin-section-card !flex-none">
        <div className="admin-section-card__head">
          <div>
            <h3 className="admin-section-card__title">火山引擎 · 连接测试报告</h3>
            <p className="admin-section-card__desc">逐步探测能力，而不是只显示「成功 / 失败」</p>
          </div>
          <span className="admin-badge admin-badge--danger">部分失败</span>
        </div>
      </section>

      <div className="space-y-2">
        {vendorProbeSteps.map((step) => (
          <div key={step.name} className="glass-surface rounded-[var(--glass-radius-md)] px-4 py-3">
            <div className="flex items-start gap-3">
              {step.status === 'pass' ? (
                <AppIcon name="check" className="mt-0.5 h-4 w-4 text-[var(--glass-tone-success-fg)]" />
              ) : step.status === 'fail' ? (
                <AppIcon name="close" className="mt-0.5 h-4 w-4 text-[var(--glass-tone-danger-fg)]" />
              ) : (
                <span className="mt-0.5 h-4 w-4 rounded-full border border-[var(--glass-stroke-base)]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--glass-text-primary)]">{step.name}</span>
                  <span
                    className={`admin-badge text-[10px] ${
                      step.status === 'pass'
                        ? 'admin-badge--success'
                        : step.status === 'fail'
                          ? 'admin-badge--danger'
                          : 'admin-badge--neutral'
                    }`}
                  >
                    {step.status === 'pass' ? '通过' : step.status === 'fail' ? '失败' : '跳过'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--glass-text-secondary)]">{step.message}</p>
                {'model' in step && step.model ? (
                  <p className="mt-1 font-mono text-[10px] text-[var(--glass-text-tertiary)]">{step.model}</p>
                ) : null}
                {'detail' in step && step.detail ? (
                  <p className="mt-1 font-mono text-[10px] text-[var(--glass-tone-danger-fg)]">{step.detail}</p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="glass-btn-base glass-btn-primary w-full px-3.5 py-2 text-sm font-semibold">
        重新探测
      </button>
    </div>
  )
}

export function EditorGateScreen() {
  const [mode, setMode] = useState<'online' | 'offline'>('offline')

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('offline')}
          className={`glass-btn-base px-3 py-1.5 text-sm ${mode === 'offline' ? 'glass-btn-primary' : 'glass-btn-ghost'}`}
        >
          下线态（当前建议）
        </button>
        <button
          type="button"
          onClick={() => setMode('online')}
          className={`glass-btn-base px-3 py-1.5 text-sm ${mode === 'online' ? 'glass-btn-primary' : 'glass-btn-ghost'}`}
        >
          上线预览态
        </button>
      </div>

      {mode === 'offline' ? (
        <div className="admin-empty mx-auto max-w-lg py-16">
          <AppIcon name="film" className="mb-4 h-10 w-10 text-[var(--glass-text-tertiary)]" />
          <h3 className="font-display text-lg font-semibold text-[var(--glass-text-primary)]">成片编辑暂未开放</h3>
          <p className="mt-2 text-sm text-[var(--glass-text-secondary)]">
            避免空头承诺。生成完成后可导出，时间线精剪将在能力就绪后上线。
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button type="button" className="glass-btn-base glass-btn-secondary px-3.5 py-2 text-sm">
              导出成片
            </button>
            <button type="button" className="glass-btn-base glass-btn-ghost px-3.5 py-2 text-sm">
              预约通知
            </button>
          </div>
        </div>
      ) : (
        <section className="admin-section-card !flex-none overflow-hidden">
          <div className="admin-section-card__head">
            <h3 className="admin-section-card__title">时间线编辑器 · 预览</h3>
            <span className="glass-chip glass-chip-warning text-[10px]">Beta 预览</span>
          </div>
          <div className="aspect-video bg-[var(--film-rail-bg)]" />
          <div className="space-y-2 border-t border-[var(--glass-stroke-base)] p-3">
            <div className="h-8 rounded-md bg-[var(--glass-bg-muted)]" />
            <div className="flex gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-12 flex-1 rounded bg-[var(--glass-bg-muted)]" />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export function QuotaPlanScreen() {
  return (
    <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-[280px_1fr]">
      <section className="admin-section-card !flex-none">
        <div className="admin-section-card__body">
          <div className="mb-3 flex items-center gap-2">
            <AppIcon name="coins" className="h-4 w-4 text-[var(--film-gold)]" />
            <h3 className="text-sm font-semibold">本月额度</h3>
          </div>
          <p className="font-display text-3xl font-bold tabular-nums text-[var(--glass-text-primary)]">
            7<span className="text-lg text-[var(--glass-text-tertiary)]"> / 10</span>
          </p>
          <div className="mt-3">
            <ProgressBar value={70} />
          </div>
          <p className="mt-2 text-xs text-[var(--glass-text-secondary)]">免费版 · 剩余 3 次成片生成</p>
          <button type="button" className="glass-btn-base glass-btn-primary mt-4 w-full px-3 py-2 text-sm font-semibold">
            升级套餐
          </button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { name: '免费', price: '¥0', feats: ['10 次/月', '标清导出', '社区模型'], hot: false },
          { name: '创作者', price: '¥49', feats: ['80 次/月', '高清导出', '优先队列'], hot: true },
          { name: '工作室', price: '¥199', feats: ['无限额度', '4K 导出', '专属厂商池'], hot: false },
        ].map((plan) => (
          <div
            key={plan.name}
            className={`admin-section-card !flex-none ${plan.hot ? 'ring-1 ring-[var(--film-gold)]' : ''}`}
          >
            <div className="admin-section-card__body">
              {plan.hot ? (
                <span className="glass-chip glass-chip-warning mb-2 text-[10px]">推荐</span>
              ) : (
                <div className="mb-2 h-5" />
              )}
              <h4 className="font-semibold text-[var(--glass-text-primary)]">{plan.name}</h4>
              <p className="mt-1 font-display text-2xl font-bold">
                {plan.price}
                <span className="text-xs font-normal text-[var(--glass-text-tertiary)]">/月</span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {plan.feats.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-[var(--glass-text-secondary)]">
                    <AppIcon name="check" className="h-3 w-3 text-[var(--glass-tone-success-fg)]" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={`glass-btn-base mt-4 w-full px-3 py-2 text-sm ${
                  plan.hot ? 'glass-btn-primary font-semibold' : 'glass-btn-secondary'
                }`}
              >
                {plan.hot ? '立即升级' : '选择'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LibraryStatesScreen() {
  return (
    <div className="mx-auto max-w-2xl space-y-2">
      {libraryStateDemo.map((row) => (
        <div
          key={row.title}
          className="glass-surface flex items-center gap-4 rounded-[var(--glass-radius-md)] px-4 py-3"
        >
          <div className="h-14 w-14 shrink-0 rounded-lg bg-[var(--glass-bg-muted)]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--glass-text-primary)]">{row.title}</p>
            <span
              className={`mt-1 text-[10px] ${
                row.tone === 'success'
                  ? 'admin-badge admin-badge--success'
                  : row.tone === 'danger'
                    ? 'admin-badge admin-badge--danger'
                    : row.tone === 'info'
                      ? 'glass-chip glass-chip-info'
                      : 'admin-badge admin-badge--neutral'
              }`}
            >
              {row.status}
            </span>
          </div>
          <span className="hidden text-xs text-[var(--glass-text-tertiary)] sm:inline">{row.action}</span>
          <button type="button" className="glass-btn-base glass-btn-secondary px-2.5 py-1.5 text-xs">
            操作
          </button>
        </div>
      ))}
    </div>
  )
}

export function OptScreenBody({ screen }: { screen: OptScreenId }) {
  switch (screen) {
    case 'gallery':
      return null
    case 'confirm-wizard':
      return <ConfirmWizardScreen />
    case 'task-stages':
      return <TaskStagesScreen />
    case 'event-graph':
      return <EventGraphScreen />
    case 'skills-pack':
      return <SkillsPackScreen />
    case 'project-cards':
      return <ProjectCardsScreen />
    case 'agent-stream':
      return <AgentStreamScreen />
    case 'vendor-probe':
      return <VendorProbeScreen />
    case 'editor-gate':
      return <EditorGateScreen />
    case 'quota-plan':
      return <QuotaPlanScreen />
    case 'library-states':
      return <LibraryStatesScreen />
    default:
      return null
  }
}
