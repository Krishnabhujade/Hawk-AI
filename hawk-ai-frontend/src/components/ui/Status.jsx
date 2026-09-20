/** Grey placeholder blocks shown while data loads. */
export function Skeleton({ height = 16, width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} aria-hidden="true" />;
}

/** Loading state for a panel. */
export function Loading({ lines = 4, label = 'Loading…' }) {
  return (
    <div className="status-box" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={14} width={`${92 - i * 11}%`} />
      ))}
    </div>
  );
}

/** Error state with a retry button. */
export function ErrorBox({ error, onRetry }) {
  return (
    <div className="status-box status-error" role="alert">
      <span className="kicker kicker-accent">Couldn’t load this</span>
      <span>{error?.message || 'Something went wrong.'}</span>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
