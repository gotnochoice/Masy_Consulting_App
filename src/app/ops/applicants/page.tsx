import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { CandidateStageBadge, CandidateSourceBadge, CANDIDATE_STAGE_ORDER, CANDIDATE_STAGE_LABELS } from "@/components/stage-badge";
import { formatDateShort } from "@/lib/leave";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import type { CandidateStage } from "@/generated/prisma/client";

export default async function OpsApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; roleId?: string; stage?: string }>;
}) {
  await requireRole("MASY_OPS");
  const { q, roleId, stage } = await searchParams;
  const validStage = stage && (CANDIDATE_STAGE_ORDER as string[]).includes(stage) ? (stage as CandidateStage) : undefined;

  const [candidates, roles] = await Promise.all([
    db.candidate.findMany({
      where: {
        ...(roleId ? { openRoleId: roleId } : {}),
        ...(validStage ? { stage: validStage } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { openRole: { include: { clientOrg: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.openRole.findMany({ include: { clientOrg: true }, orderBy: [{ clientOrg: { name: "asc" } }, { title: "asc" }] }),
  ]);

  const hasFilters = !!(q || roleId || validStage);

  return (
    <div className="space-y-6">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Applicants</h1>
        <p className="text-sm text-slate">Every candidate across every open role, in one place.</p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-paper p-4">
        <div className="min-w-[180px] flex-1">
          <label className={labelClass} htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={q ?? ""} placeholder="Name or email" className={inputClass} />
        </div>
        <div className="min-w-[220px]">
          <label className={labelClass} htmlFor="roleId">Role</label>
          <select id="roleId" name="roleId" defaultValue={roleId ?? ""} className={inputClass}>
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.title}, {r.clientOrg.name}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className={labelClass} htmlFor="stage">Stage</label>
          <select id="stage" name="stage" defaultValue={validStage ?? ""} className={inputClass}>
            <option value="">All stages</option>
            {CANDIDATE_STAGE_ORDER.map((s) => (
              <option key={s} value={s}>{CANDIDATE_STAGE_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <button type="submit" className={buttonClass}>Filter</button>
        {hasFilters && (
          <Link href="/ops/applicants" className="text-sm font-medium text-slate hover:text-ink">
            Clear
          </Link>
        )}
      </form>

      <p className="text-xs text-slate-light">
        {candidates.length} applicant{candidates.length === 1 ? "" : "s"}
        {!hasFilters && " · every stage, all time. The Recruitment/Applicants badge only counts those still unreviewed."}
      </p>

      {/* Mobile: stacked cards */}
      <div className="space-y-3 sm:hidden">
        {candidates.map((c) => (
          <Link
            key={c.id}
            href={`/ops/applicants/${c.id}`}
            className="block rounded-card border border-border bg-paper p-4 hover:bg-paper-2"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-ink">{c.name}</p>
              <CandidateStageBadge stage={c.stage} />
            </div>
            <p className="mt-1 text-xs text-slate">
              {c.openRole.title} · {c.openRole.clientOrg.name}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <CandidateSourceBadge source={c.source} />
              <span className="text-xs text-slate-light">{formatDateShort(c.createdAt)}</span>
            </div>
          </Link>
        ))}
        {candidates.length === 0 && (
          <p className="rounded-card border border-border bg-paper px-4 py-8 text-center text-sm text-slate-light">
            No applicants match.
          </p>
        )}
      </div>

      {/* Desktop: table */}
      {candidates.length > 0 && (
        <div className="hidden overflow-x-auto rounded-card border border-border bg-paper sm:block">
          <table className="min-w-full divide-y divide-border text-xs">
            <thead className="bg-paper-2">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Role</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Company</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Stage</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Source</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {candidates.map((c) => (
                <tr key={c.id} className="hover:bg-paper-2">
                  <td className="px-3 py-2.5 font-medium text-ink">
                    <Link href={`/ops/applicants/${c.id}`} className="block hover:text-indigo">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-slate">{c.openRole.title}</td>
                  <td className="px-3 py-2.5 text-slate">{c.openRole.clientOrg.name}</td>
                  <td className="px-3 py-2.5"><CandidateStageBadge stage={c.stage} /></td>
                  <td className="px-3 py-2.5"><CandidateSourceBadge source={c.source} /></td>
                  <td className="px-3 py-2.5 text-xs text-slate">{formatDateShort(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
