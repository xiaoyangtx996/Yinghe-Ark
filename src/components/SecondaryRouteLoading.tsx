/**
 * Soft-nav placeholder shared by secondary theater routes.
 * Keeps the chrome feel without waiting for the page client chunk.
 */
export default function SecondaryRouteLoading() {
  return (
    <div className="glass-page min-h-dvh">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 h-8 w-40 animate-pulse rounded bg-[var(--glass-bg-muted)]" />
        <div className="h-4 w-72 animate-pulse rounded bg-[var(--glass-bg-muted)]" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-[var(--glass-radius-md)] bg-[var(--glass-bg-muted)]"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
