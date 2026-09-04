/** Mock data for Film DI optimization preview (dev only) */

import type { AppIconName } from '@/components/ui/icons'

export type OptScreenId =
  | 'gallery'
  | 'confirm-wizard'
  | 'task-stages'
  | 'event-graph'
  | 'skills-pack'
  | 'project-cards'
  | 'agent-stream'
  | 'vendor-probe'
  | 'editor-gate'
  | 'quota-plan'
  | 'library-states'

export type OptScreenMeta = {
  id: OptScreenId
  title: string
  source: '借鉴 UI' | '借鉴 Toonflow' | '补强缺口' | '总览'
  priority: '高' | '中' | '低'
  desc: string
  icon: AppIconName
}

export const optScreens: OptScreenMeta[] = [
  {
    id: 'gallery',
    title: '优化预览总览',
    source: '总览',
    priority: '高',
    desc: '对照分析结论，逐屏预览可落地界面（Film DI 现有样式）',
    icon: 'clapperboard',
  },
  {
    id: 'confirm-wizard',
    title: '五步确认向导',
    source: '借鉴 UI',
    priority: '高',
    desc: '创意→剧本→角色→分镜→风格，确认后再进入生成',
    icon: 'sparkles',
  },
  {
    id: 'task-stages',
    title: '任务阶段进度',
    source: '借鉴 UI',
    priority: '高',
    desc: '剧本/角色图/分镜/视频三态清单，替代纯 loading',
    icon: 'loader',
  },
  {
    id: 'event-graph',
    title: '小说事件图',
    source: '借鉴 Toonflow',
    priority: '高',
    desc: '章节事件抽取后再改编，结构比一次性长文更稳',
    icon: 'idea',
  },
  {
    id: 'skills-pack',
    title: '题材画风 Skills',
    source: '借鉴 Toonflow',
    priority: '中',
    desc: '题材 + 画风技能包，影响后续提示与出图方向',
    icon: 'package',
  },
  {
    id: 'project-cards',
    title: '项目卡信息密度',
    source: '借鉴 Toonflow',
    priority: '中',
    desc: '画风标签、来源标签、摘要、时间与操作',
    icon: 'folder',
  },
  {
    id: 'agent-stream',
    title: 'Agent 流式进度',
    source: '借鉴 Toonflow',
    priority: '中',
    desc: '决策 / 执行 / 监督分层，可阅读的实时过程',
    icon: 'bolt',
  },
  {
    id: 'vendor-probe',
    title: '厂商能力探测',
    source: '借鉴 Toonflow',
    priority: '中',
    desc: '连接测试步骤报告，不只「成功/失败」两态',
    icon: 'unplug',
  },
  {
    id: 'editor-gate',
    title: '编辑器状态决策',
    source: '补强缺口',
    priority: '高',
    desc: '成片编辑：上线预览 vs 明确下线，避免空头承诺',
    icon: 'video',
  },
  {
    id: 'quota-plan',
    title: '额度与套餐',
    source: '借鉴 UI',
    priority: '中',
    desc: '侧栏额度深化：用量、套餐档位、升级入口',
    icon: 'coins',
  },
  {
    id: 'library-states',
    title: '作品库多状态',
    source: '借鉴 UI',
    priority: '中',
    desc: '草稿/生成中/失败/已完成统一状态色与操作',
    icon: 'folderOpen',
  },
]

export const eventNodes = [
  {
    id: 'e1',
    chapter: '第 1 章',
    title: '顶层办公室 · 隐婚协议',
    summary: '顾沉舟以协议逼婚，苏晚晴被迫签字。',
    type: '开端',
    characters: ['顾沉舟', '苏晚晴'],
  },
  {
    id: 'e2',
    chapter: '第 3 章',
    title: '顾宅晚宴 · 身份试探',
    summary: '顾夫人公开刁难，晚晴首次正面回应。',
    type: '冲突',
    characters: ['苏晚晴', '顾夫人'],
  },
  {
    id: 'e3',
    chapter: '第 6 章',
    title: '雨夜街头 · 真心暴露',
    summary: '沉舟追进雨里，隐婚关系出现裂缝与转机。',
    type: '转折',
    characters: ['顾沉舟', '苏晚晴'],
  },
  {
    id: 'e4',
    chapter: '第 9 章',
    title: '公司危机 · 并肩作战',
    summary: '外部对手发难，二人由契约走向同盟。',
    type: '高潮',
    characters: ['顾沉舟', '苏晚晴', '对手'],
  },
]

export const skillStoryPacks = [
  { id: 'ss1', key: 'Sweet_romance_novel', name: '都市甜宠', desc: '甜虐节奏、身份差、打脸和解', hot: true },
  { id: 'ss2', key: 'Historical_epic', name: '古装宫廷', desc: '权谋、名分、朝堂博弈', hot: false },
  { id: 'ss3', key: 'Mystery_thriller', name: '悬疑推理', desc: '线索埋设、反转、完播钩子', hot: true },
  { id: 'ss4', key: 'Coming_of_age', name: '校园青春', desc: '成长、初恋、群体关系', hot: false },
]

export const skillArtPacks = [
  { id: 'sa1', key: 'realpeople_urban_modern', name: '真人都市现代', tag: '写实' },
  { id: 'sa2', key: 'realpeople_ancient_chinese', name: '真人古装国风', tag: '写实' },
  { id: 'sa3', key: '2D_chinese_guofeng', name: '二维国风', tag: '二次元' },
  { id: 'sa4', key: '3D_anime_render', name: '三维动漫渲染', tag: '三维' },
]

export const denseProjects = [
  {
    id: 'd1',
    title: '值得',
    style: 'realpeople_urban_modern',
    source: '基于小说原文',
    summary: '外卖骑手意外卷入豪门遗产纠纷，用一辆电瓶车换来整座城的目光。',
    updatedAt: '2026-04-24 17:44:02',
    status: '已完成' as const,
  },
  {
    id: 'd2',
    title: '街隅公主归蛮',
    style: 'realpeople_ancient_chinese',
    source: '基于小说原文',
    summary: '落魄公主流落街隅，以绣坊为棋，一步步夺回被夺的封地。',
    updatedAt: '2026-04-22 11:08:15',
    status: '生成中' as const,
  },
  {
    id: 'd3',
    title: '雨夜追凶',
    style: 'realpeople_urban_modern',
    source: '原创一句话',
    summary: '连环案只在暴雨夜发生，探员发现凶手留下的不是脚印，是心跳。',
    updatedAt: '2026-04-18 21:02:40',
    status: '草稿' as const,
  },
]

export const agentLogs = [
  { layer: '决策', status: 'done' as const, text: '选择改编策略：压缩支线，保留 4 个主事件钩子' },
  { layer: '执行', status: 'done' as const, text: '生成故事骨架：开端-冲突-转折-高潮' },
  { layer: '执行', status: 'active' as const, text: '正在写入第 2 集对白… 已完成 12/18 场' },
  { layer: '监督', status: 'pending' as const, text: '待校验：人设一致性 / 节奏密度 / 敏感词' },
]

export const vendorProbeSteps = [
  { name: '鉴权', status: 'pass' as const, message: 'API Key 有效', detail: 'Bearer ···a8f2' },
  { name: '文本模型', status: 'pass' as const, message: 'doubao-seed-1.0 可用', model: 'doubao-seed-1.0' },
  { name: '图像模型', status: 'pass' as const, message: 'seedream 可用', model: 'seedream-4.5' },
  { name: '视频模型', status: 'fail' as const, message: '超时 / 区域未开通', detail: 'HTTP 403 region_not_allowed' },
  { name: '能力目录', status: 'skip' as const, message: '跳过：视频能力不可用' },
]

export const taskStageRows = [
  { key: 'script', label: '剧本解析', desc: '拆解剧情与台词', status: 'done' as const, eta: '已完成' },
  { key: 'character', label: '角色与配音', desc: '人物形象 + 音色', status: 'done' as const, eta: '已完成' },
  { key: 'storyboard', label: '分镜画面', desc: '逐幕关键帧', status: 'active' as const, eta: '约 40 秒' },
  { key: 'video', label: '视频合成', desc: '画面 + 声画同步', status: 'pending' as const, eta: '排队中' },
  { key: 'export', label: '成片输出', desc: '导出可播放文件', status: 'pending' as const, eta: '等待上游' },
]

export const libraryStateDemo = [
  { title: '总裁的隐婚新娘', status: '已完成', action: '播放 / 导出', tone: 'success' as const },
  { title: '凤鸣长安', status: '生成中 62%', action: '查看进度', tone: 'info' as const },
  { title: '雨夜追凶', status: '失败', action: '重试 / 查看原因', tone: 'danger' as const },
  { title: '樱花树下的约定', status: '草稿', action: '继续编辑', tone: 'neutral' as const },
]
