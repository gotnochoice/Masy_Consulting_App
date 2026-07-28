export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-paper">
      <div className="border-b border-border bg-paper-2/60 px-5 py-3.5">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

export function PanelEmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-slate-light">{children}</p>;
}
