"use client";

export function SectionMoveSelect({
  action,
  sections,
  defaultValue,
}: {
  action: (formData: FormData) => void;
  sections: { id: string; title: string }[];
  defaultValue: string;
}) {
  return (
    <form action={action}>
      <select
        name="sectionId"
        defaultValue={defaultValue}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label="Move to section"
        className="rounded-btn border border-border bg-paper px-2 py-1 text-xs text-slate hover:text-ink focus:border-indigo focus:outline-none"
      >
        <option value="">No section</option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>{s.title}</option>
        ))}
      </select>
    </form>
  );
}
