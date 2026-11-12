import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { ASK_QUESTIONS, runAskQuestion, type AskQuestionKey } from "@/lib/ask-your-data";

function isValidKey(q: string | undefined): q is AskQuestionKey {
  return !!q && ASK_QUESTIONS.some((item) => item.key === q);
}

export default async function AskYourDataPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("MASY_OPS");
  const { q } = await searchParams;
  const selected = isValidKey(q) ? q : null;
  const result = selected ? await runAskQuestion(selected) : null;
  const selectedLabel = selected ? ASK_QUESTIONS.find((item) => item.key === selected)?.label : null;

  return (
    <div className="space-y-6">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Ask your data</h1>
        <p className="text-sm text-slate">
          Plain-language answers to a fixed set of common questions -- pick one below.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ASK_QUESTIONS.map((item) => (
          <Link
            key={item.key}
            href={`/ops/ask?q=${item.key}`}
            className={`rounded-btn border px-3.5 py-2 text-xs font-medium transition-colors ${
              selected === item.key
                ? "border-indigo bg-indigo-tint text-indigo"
                : "border-border text-slate hover:border-indigo/40 hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {result && (
        <div className="rounded-card border border-border bg-paper">
          <div className="border-b border-border px-5 py-3">
            <p className="text-sm font-semibold text-ink">{selectedLabel}</p>
            <p className="text-xs text-slate-light">{result.rows.length} result{result.rows.length === 1 ? "" : "s"}</p>
          </div>
          {result.rows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-light">Nobody matches right now.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-paper-2">
                  <tr>
                    {result.columns.map((col) => (
                      <th key={col} className="px-5 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-paper-2">
                      <td className="px-5 py-2.5 font-medium text-ink">{row.primary}</td>
                      {row.secondary !== undefined && <td className="px-5 py-2.5 text-slate">{row.secondary}</td>}
                      {row.tertiary !== undefined && <td className="px-5 py-2.5 text-slate">{row.tertiary}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
