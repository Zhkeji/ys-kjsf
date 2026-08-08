import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, total, limit, onChange }) {
  const totalPages = Math.ceil(total / limit) || 1;
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="p-2 rounded-lg hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        <ChevronLeft size={18} />
      </button>
      {start > 1 && <span className="px-2 text-muted">…</span>}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition ${
            p === page ? 'btn-primary' : 'hover:bg-surface-2'
          }`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && <span className="px-2 text-muted">…</span>}
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="p-2 rounded-lg hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
