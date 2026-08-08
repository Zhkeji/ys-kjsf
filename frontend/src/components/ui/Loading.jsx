export function Spinner({ size = 24 }) {
  return (
    <div className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent" style={{ width: size, height: size, color: '#6366f1' }} />
  );
}

export function FullSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size={40} />
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} style={{ background: 'linear-gradient(90deg, var(--surface-2), var(--border), var(--surface-2))', backgroundSize: '1000px 100%' }} />;
}

export function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && <div className="mb-4 p-4 rounded-2xl bg-surface-2"><Icon size={40} className="text-muted" /></div>}
      <h3 className="text-lg font-semibold font-display">{title}</h3>
      {desc && <p className="text-muted text-sm mt-1 max-w-sm">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
