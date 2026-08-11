'use client'

/**
 * AnimatedBackground - 流光极光背景动画
 * 用于页面全局背景
 */
export function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-[var(--glass-bg-canvas)]">
            <div
                className="absolute inset-0 opacity-80"
                style={{
                    background:
                        'radial-gradient(ellipse at 20% 0%, rgba(224,163,106,0.08), transparent 45%), radial-gradient(ellipse at 90% 20%, rgba(111,158,154,0.06), transparent 40%)',
                }}
            />
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.035]"
                style={{
                    backgroundImage:
                        'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
                }}
            />
        </div>
    )
}

/**
 * GlassPanel - 毛玻璃卡片容器
 */
export function GlassPanel({
    children,
    className = ''
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={`
      glass-surface-elevated
      ${className}
    `}>
            {children}
        </div>
    )
}

/**
 * Button - 通用按钮组件
 */
export function Button({
    children,
    primary = false,
    onClick,
    disabled = false,
    icon,
    className = ''
}: {
    children: React.ReactNode
    primary?: boolean
    onClick?: () => void
    disabled?: boolean
    icon?: React.ReactNode
    className?: string
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
        glass-btn-base px-6 py-2.5
        ${primary
                    ? 'glass-btn-primary'
                    : 'glass-btn-secondary'}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
        >
            {icon && <span>{icon}</span>}
            {children}
        </button>
    )
}
