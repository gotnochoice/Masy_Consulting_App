export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)]">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

export function PanelEmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-6 text-center text-sm text-slate">{children}</p>;
}
