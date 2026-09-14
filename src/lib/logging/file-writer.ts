/**
 * Server-side log file writer.
 *
 * Routes log events to per-project log files following the naming convention:
 *   - `admin_{projectName}.log`    – API / user-facing operations
 *   - `Internal_{projectName}.log` – worker / internal operations
 *
 * This module is Edge-safe at import-time: all Node.js APIs are accessed via
 * async dynamic `import('node:fs')` calls that only run at write-time.
 *
 * The writer is intentionally fire-and-forget: callers should never await it
 * and logging failures should never crash the application.
 */

// ─── environment guard ────────────────────────────────────────────────

function isEdgeOrBrowser(): boolean {
    if (typeof window !== 'undefined') return true
    const g = globalThis as { EdgeRuntime?: unknown }
    return typeof g.EdgeRuntime === 'string'
}

// ─── node module cache ────────────────────────────────────────────────
// We cache lazily so the module stays Edge-safe at import time.

type NodeModules = {
    fs: typeof import('node:fs')
    path: typeof import('node:path')
    cwd: string
}

let nodeModulesCache: NodeModules | null | 'pending' | undefined

async function getNodeModules(): Promise<NodeModules | null> {
    if (nodeModulesCache === null) return null
    if (nodeModulesCache && nodeModulesCache !== 'pending') return nodeModulesCache
    if (isEdgeOrBrowser()) {
        nodeModulesCache = null
        return null
    }

    // Only one concurrent initialisation
    if (nodeModulesCache === 'pending') {
        // Another call is already initialising – yield and retry
        await new Promise((r) => setTimeout(r, 0))
        return getNodeModules()
    }
    nodeModulesCache = 'pending'

    try {
        // 使用 new Function() 间接导入，绕过 Next.js 静态分析器的 Edge Runtime 检查。
        // 运行时行为与直接 import() 完全一致，但打包器不会静态追踪这些模块。
        const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<unknown>
        const [fs, path] = await Promise.all([
            dynamicImport('node:fs'),
            dynamicImport('node:path'),
        ]) as [typeof import('node:fs'), typeof import('node:path')]
        // process.cwd() 同理，用 new Function 包裹避免静态分析追踪
        const getCwd = new Function('return process.cwd()') as () => string
        const resolved: NodeModules = { fs, path, cwd: getCwd() }
        nodeModulesCache = resolved
        return resolved
    } catch {
        nodeModulesCache = null
        return null
    }
}

// ─── project-name cache ───────────────────────────────────────────────
const projectNameCache = new Map<string, string>()
const pendingLookups = new Set<string>()

/** Register a known projectId → projectName mapping. */
export function registerProjectName(projectId: string, projectName: string): void {
    if (projectId && projectName) {
        projectNameCache.set(projectId, projectName)
    }
}

/**
 * Resolve projectName from cache or DB.
 * Returns `null` if the name cannot be resolved right now.
 */
async function resolveProjectName(projectId: string): Promise<string | null> {
    const cached = projectNameCache.get(projectId)
    if (cached) return cached

    // Avoid duplicate concurrent lookups for the same projectId.
    if (pendingLookups.has(projectId)) return null
    pendingLookups.add(projectId)

    try {
        const { prisma } = await import('@/lib/prisma')
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { name: true },
        })
        if (project?.name) {
            projectNameCache.set(projectId, project.name)
            return project.name
        }
    } catch {
        // Swallow lookup errors – better to lose a log line than crash.
    } finally {
        pendingLookups.delete(projectId)
    }

    return null
}

// ─── file helpers ─────────────────────────────────────────────────────

/**
 * Sanitize a project name so it can be safely used as part of a file name.
 * Replaces characters that are invalid on macOS/Linux/Windows with '_'.
 */
function sanitizeProjectName(name: string): string {
    return name.replace(/[/\\:\0*?"<>|]/g, '_').trim() || 'unknown'
}

async function appendLineAsync(filePath: string, line: string): Promise<void> {
    const modules = await getNodeModules()
    if (!modules) return

    try {
        // Ensure the logs directory exists
        const dir = modules.path.dirname(filePath)
        modules.fs.mkdirSync(dir, { recursive: true })
        modules.fs.appendFileSync(filePath, line + '\n')
        // 写入后异步检查是否需要清理（fire-and-forget）
        void maybeCleanupProjectLog(filePath)
    } catch (err) {
        // Do not propagate, but surface so file-write failures are visible.
        console.error('[file-writer] Failed to write log line to', filePath, err)
    }
}

function buildLogFilePath(modules: NodeModules, prefix: string, projectName: string): string {
    const fileName = `${prefix}_${sanitizeProjectName(projectName)}.log`
    return modules.path.join(modules.cwd, 'logs', fileName)
}

// ─── 24h cleanup helpers ─────────────────────────────────────────────

const PROJECT_LOG_MAX_BYTES = 2 * 1024 * 1024 // 2 MB 触发清理
const LOG_RETENTION_MS = 24 * 60 * 60 * 1000   // 保留 24 小时

/**
 * 从日志内容中过滤掉 24 小时前的行。
 * 每行是 JSON，通过 "ts" 字段判断时间。
 */
function filterRecentLines(content: string): string {
    const cutoff = Date.now() - LOG_RETENTION_MS
    const lines = content.split('\n')
    const kept = lines.filter((line) => {
        if (!line.trim()) return false
        try {
            const parsed = JSON.parse(line) as { ts?: string }
            if (parsed.ts) {
                return new Date(parsed.ts).getTime() >= cutoff
            }
        } catch {
            // 非 JSON 行（如分隔符）保留
        }
        return true
    })
    return kept.join('\n')
}

/**
 * 若项目日志文件超过阈值，清理 24 小时前的内容。
 */
async function maybeCleanupProjectLog(filePath: string): Promise<void> {
    const modules = await getNodeModules()
    if (!modules) return
    try {
        const stat = modules.fs.statSync(filePath)
        if (stat.size <= PROJECT_LOG_MAX_BYTES) return
        const content = modules.fs.readFileSync(filePath, 'utf-8')
        const cleaned = filterRecentLines(content)
        modules.fs.writeFileSync(filePath, cleaned + '\n')
    } catch {
        // 文件不存在或读写失败，忽略
    }
}

// ─── prefix mapping ──────────────────────────────────────────────────

function getPrefix(module?: string): string {
    if (module && module.startsWith('worker')) return 'Internal'
    return 'admin'
}

// ─── buffered events ─────────────────────────────────────────────────
// When a log event arrives before the project name is resolved we buffer
// it so it can be flushed once the name becomes available.
const bufferedLines = new Map<string, string[]>()

async function flushBuffer(projectId: string, projectName: string): Promise<void> {
    const lines = bufferedLines.get(projectId)
    if (!lines || lines.length === 0) return
    bufferedLines.delete(projectId)

    const modules = await getNodeModules()
    if (!modules) return

    for (const entry of lines) {
        // The prefix was stored as a "|" delimited header: "prefix|json"
        const sepIdx = entry.indexOf('|')
        if (sepIdx === -1) continue
        const prefix = entry.slice(0, sepIdx)
        const json = entry.slice(sepIdx + 1)
        const filePath = buildLogFilePath(modules, prefix, projectName)
        void appendLineAsync(filePath, json)
    }
}

// ─── public API ──────────────────────────────────────────────────────

/**
 * Write a log line to the appropriate project log file.
 *
 * This function is fire-and-forget – the returned promise should be
 * `void`-ed by the caller.
 */
export async function writeLogToProjectFile(
    line: string,
    projectId: string | undefined,
    module: string | undefined,
): Promise<void> {
    if (isEdgeOrBrowser()) return
    if (!projectId) return

    const prefix = getPrefix(module)

    // Fast path – projectName already cached
    const cachedName = projectNameCache.get(projectId)
    if (cachedName) {
        const modules = await getNodeModules()
        if (!modules) return
        const filePath = buildLogFilePath(modules, prefix, cachedName)
        void appendLineAsync(filePath, line)
        return
    }

    // Slow path – resolve asynchronously
    const projectName = await resolveProjectName(projectId)
    if (projectName) {
        // Flush anything that was buffered while we were resolving
        void flushBuffer(projectId, projectName)
        const modules = await getNodeModules()
        if (!modules) return
        const filePath = buildLogFilePath(modules, prefix, projectName)
        void appendLineAsync(filePath, line)
        return
    }

    // Name not yet available – buffer the line
    const buf = bufferedLines.get(projectId) || []
    buf.push(`${prefix}|${line}`)
    bufferedLines.set(projectId, buf)
}

/**
 * Called when a project name becomes available to flush any buffered
 * log events for that project.
 */
export function onProjectNameAvailable(projectId: string, projectName: string): void {
    registerProjectName(projectId, projectName)
    void flushBuffer(projectId, projectName)
}

// ─── global log writer ──────────────────────────────────────────────

const GLOBAL_LOG_MAX_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * Write a log line to the global `app.log` file.
 * Automatically rotates: when the file exceeds 10 MB, the oldest half is removed.
 */
export async function writeGlobalLogLine(line: string): Promise<void> {
    if (isEdgeOrBrowser()) return
    const modules = await getNodeModules()
    if (!modules) return

    const filePath = modules.path.join(modules.cwd, 'logs', 'app.log')
    try {
        modules.fs.mkdirSync(modules.path.dirname(filePath), { recursive: true })

        // Auto-rotate: if file exceeds limit, keep only the last half
        try {
            const stat = modules.fs.statSync(filePath)
            if (stat.size > GLOBAL_LOG_MAX_BYTES) {
                const content = modules.fs.readFileSync(filePath, 'utf-8')
                const lines = content.split('\n')
                const half = Math.floor(lines.length / 2)
                modules.fs.writeFileSync(filePath, lines.slice(half).join('\n'))
            }
        } catch {
            // File may not exist yet, that's fine
        }

        modules.fs.appendFileSync(filePath, line + '\n')
    } catch (err) {
        console.error('[file-writer] Failed to write global log line', err)
    }
}

// ─── log file access (for download API) ─────────────────────────────

export interface LogFileInfo {
    name: string
    sizeBytes: number
    modifiedAt: string
}

/**
 * List all log files in the logs directory.
 */
export async function getLogFilesList(): Promise<LogFileInfo[]> {
    if (isEdgeOrBrowser()) return []
    const modules = await getNodeModules()
    if (!modules) return []

    const logsDir = modules.path.join(modules.cwd, 'logs')
    try {
        const files = modules.fs.readdirSync(logsDir)
        return files
            .filter((f: string) => f.endsWith('.log'))
            .map((f: string) => {
                const stat = modules.fs.statSync(modules.path.join(logsDir, f))
                return {
                    name: f,
                    sizeBytes: stat.size,
                    modifiedAt: stat.mtime.toISOString(),
                }
            })
            .sort((a: LogFileInfo, b: LogFileInfo) => b.modifiedAt.localeCompare(a.modifiedAt))
    } catch {
        return []
    }
}

/**
 * Read and concatenate all log files into a single string for download.
 */
export async function readAllLogs(): Promise<string> {
    if (isEdgeOrBrowser()) return ''
    const modules = await getNodeModules()
    if (!modules) return ''

    const logsDir = modules.path.join(modules.cwd, 'logs')
    try {
        const files = modules.fs.readdirSync(logsDir)
            .filter((f: string) => f.endsWith('.log'))
            .sort()
        const sections: string[] = []
        for (const f of files) {
            const content = modules.fs.readFileSync(modules.path.join(logsDir, f), 'utf-8')
            sections.push(`\n========== ${f} ==========\n${content}`)
        }
        return sections.join('\n')
    } catch {
        return ''
    }
}

/**
 * Safely resolve a log file name within the logs directory (basename only).
 */
function resolveSafeLogFileName(fileName: string): string | null {
    const trimmed = fileName.trim()
    if (!trimmed || trimmed !== modulesBasename(trimmed)) return null
    if (!trimmed.endsWith('.log')) return null
    if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) return null
    return trimmed
}

function modulesBasename(fileName: string): string {
    const normalized = fileName.replace(/\\/g, '/')
    const parts = normalized.split('/')
    return parts[parts.length - 1] || ''
}

export interface ReadLogFileResult {
    name: string
    content: string
    truncated: boolean
    sizeBytes: number
    modifiedAt: string
}

/**
 * Read a single log file for UI preview / single-file download.
 * Pass maxBytes <= 0 to read the entire file.
 */
export async function readLogFile(
    fileName: string,
    maxBytes = 512 * 1024,
): Promise<ReadLogFileResult | null> {
    if (isEdgeOrBrowser()) return null
    const safeName = resolveSafeLogFileName(fileName)
    if (!safeName) return null

    const modules = await getNodeModules()
    if (!modules) return null

    const filePath = modules.path.join(modules.cwd, 'logs', safeName)
    try {
        const stat = modules.fs.statSync(filePath)
        const sizeBytes = stat.size
        const unlimited = maxBytes <= 0
        const truncated = !unlimited && sizeBytes > maxBytes
        let content: string
        if (!truncated) {
            content = modules.fs.readFileSync(filePath, 'utf-8')
        } else {
            const fd = modules.fs.openSync(filePath, 'r')
            try {
                const buffer = Buffer.alloc(maxBytes)
                modules.fs.readSync(fd, buffer, 0, maxBytes, Math.max(0, sizeBytes - maxBytes))
                content = buffer.toString('utf-8')
            } finally {
                modules.fs.closeSync(fd)
            }
        }
        return {
            name: safeName,
            content,
            truncated,
            sizeBytes,
            modifiedAt: stat.mtime.toISOString(),
        }
    } catch {
        return null
    }
}

export type AuditLogKind = 'login' | 'operation'

export interface AuditLogEventRow {
    id: string
    ts: string
    level: string
    module: string
    action: string
    message: string
    userId: string | null
    username: string | null
    projectId: string | null
    success: boolean | null
    source: string
}

const AUTH_ACTIONS = new Set(['LOGIN', 'REGISTER', 'CHANGE_PASSWORD', 'LOGOUT'])

function isLoginEvent(event: {
    module?: string
    action?: string
}): boolean {
    if (event.module === 'auth') return true
    return Boolean(event.action && AUTH_ACTIONS.has(event.action))
}

function isOperationEvent(event: {
    audit?: boolean
    module?: string
    action?: string
}): boolean {
    if (isLoginEvent(event)) return false
    if (event.audit) return true
    if (event.module === 'user') return true
    return false
}

type ParsedAuditCandidate = AuditLogEventRow & { audit?: boolean }

function parseAuditLine(line: string, source: string, index: number): ParsedAuditCandidate | null {
    const trimmed = line.trim()
    if (!trimmed.startsWith('{')) return null
    try {
        const parsed = JSON.parse(trimmed) as {
            ts?: string
            level?: string
            module?: string
            action?: string
            message?: string
            userId?: string
            audit?: boolean
            projectId?: string
            details?: Record<string, unknown> | unknown[] | null
        }
        const details =
            parsed.details && typeof parsed.details === 'object' && !Array.isArray(parsed.details)
                ? parsed.details
                : null
        const username =
            typeof details?.username === 'string'
                ? details.username
                : typeof parsed.message === 'string' && parsed.module === 'auth'
                    ? parsed.message
                    : null
        const success =
            typeof details?.success === 'boolean'
                ? details.success
                : details && 'error' in details
                    ? false
                    : null

        return {
            id: `${source}:${index}:${parsed.ts || ''}`,
            ts: typeof parsed.ts === 'string' ? parsed.ts : '',
            level: typeof parsed.level === 'string' ? parsed.level : 'INFO',
            module: typeof parsed.module === 'string' ? parsed.module : '',
            action: typeof parsed.action === 'string' ? parsed.action : '',
            message: typeof parsed.message === 'string' ? parsed.message : '',
            userId:
                typeof parsed.userId === 'string'
                    ? parsed.userId
                    : typeof details?.userId === 'string'
                        ? details.userId
                        : null,
            username,
            projectId: typeof parsed.projectId === 'string' ? parsed.projectId : null,
            success,
            source,
            audit: parsed.audit,
        }
    } catch {
        return null
    }
}

/**
 * Query recent login / operation audit events from log files (newest first).
 */
export async function queryAuditLogEvents(options: {
    kind: AuditLogKind
    limit?: number
}): Promise<{ events: AuditLogEventRow[]; totalMatched: number }> {
    if (isEdgeOrBrowser()) return { events: [], totalMatched: 0 }
    const modules = await getNodeModules()
    if (!modules) return { events: [], totalMatched: 0 }

    const limit = Math.min(Math.max(options.limit ?? 100, 1), 500)
    const logsDir = modules.path.join(modules.cwd, 'logs')
    const matched: AuditLogEventRow[] = []

    try {
        const files = modules.fs.readdirSync(logsDir)
            .filter((f: string) => f.endsWith('.log'))
            .sort((a: string, b: string) => {
                // Prefer global app.log first, then admin_*, then others
                const rank = (name: string) => {
                    if (name === 'app.log') return 0
                    if (name.startsWith('admin_')) return 1
                    return 2
                }
                return rank(a) - rank(b) || a.localeCompare(b)
            })

        // Login events only live in app.log (auth has no projectId); skip Internal_* forever.
        const scanFiles =
            options.kind === 'login'
                ? files.filter((f: string) => f === 'app.log')
                : files.filter((f: string) => f === 'app.log' || f.startsWith('admin_'))

        for (const fileName of scanFiles) {
            if (matched.length >= limit * 3) break
            const filePath = modules.path.join(logsDir, fileName)
            let content: string
            try {
                const stat = modules.fs.statSync(filePath)
                const maxBytes = 2 * 1024 * 1024
                if (stat.size <= maxBytes) {
                    content = modules.fs.readFileSync(filePath, 'utf-8')
                } else {
                    const fd = modules.fs.openSync(filePath, 'r')
                    try {
                        const buffer = Buffer.alloc(maxBytes)
                        modules.fs.readSync(fd, buffer, 0, maxBytes, Math.max(0, stat.size - maxBytes))
                        content = buffer.toString('utf-8')
                    } finally {
                        modules.fs.closeSync(fd)
                    }
                }
            } catch {
                continue
            }

            const lines = content.split('\n')
            for (let i = lines.length - 1; i >= 0; i -= 1) {
                const row = parseAuditLine(lines[i] || '', fileName, i)
                if (!row) continue
                const probe = {
                    audit: row.audit,
                    module: row.module,
                    action: row.action,
                }
                const ok =
                    options.kind === 'login' ? isLoginEvent(probe) : isOperationEvent(probe)
                if (!ok) continue
                const clean: AuditLogEventRow = {
                    id: row.id,
                    ts: row.ts,
                    level: row.level,
                    module: row.module,
                    action: row.action,
                    message: row.message,
                    userId: row.userId,
                    username: row.username,
                    projectId: row.projectId,
                    success: row.success,
                    source: row.source,
                }
                matched.push(clean)
            }
        }
    } catch {
        return { events: [], totalMatched: 0 }
    }

    matched.sort((a, b) => b.ts.localeCompare(a.ts))
    // Dedupe identical events that appear in both app.log and project logs
    const seen = new Set<string>()
    const deduped: AuditLogEventRow[] = []
    for (const event of matched) {
        const key = `${event.ts}|${event.module}|${event.action}|${event.message}|${event.userId || ''}`
        if (seen.has(key)) continue
        seen.add(key)
        deduped.push(event)
    }

    return {
        events: deduped.slice(0, limit),
        totalMatched: deduped.length,
    }
}

/**
 * 清理所有项目日志文件中 24 小时前的内容。
 * 供 watchdog 定期调用（建议每小时一次）。
 */
export async function cleanupAllProjectLogs(): Promise<void> {
    if (isEdgeOrBrowser()) return
    const modules = await getNodeModules()
    if (!modules) return

    const logsDir = modules.path.join(modules.cwd, 'logs')
    try {
        const files = modules.fs.readdirSync(logsDir)
        for (const f of files) {
            if (!f.endsWith('.log') || f === 'app.log') continue
            const filePath = modules.path.join(logsDir, f)
            try {
                const content = modules.fs.readFileSync(filePath, 'utf-8')
                const cleaned = filterRecentLines(content)
                modules.fs.writeFileSync(filePath, cleaned + '\n')
            } catch {
                // 单个文件失败不影响其他
            }
        }
    } catch {
        // logs 目录不存在等情况，忽略
    }
}
