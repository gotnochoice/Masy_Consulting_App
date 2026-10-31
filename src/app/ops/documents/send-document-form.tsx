"use client";

import { useState } from "react";
import { sendDocumentToEmployees } from "./actions";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { EMPLOYEE_DOCUMENT_CATEGORY_LABELS, MAX_DOCUMENT_FILE_LABEL } from "@/lib/employee-documents";

type EmployeeOption = { id: string; name: string; roleTitle: string };
type OrgGroup = { orgId: string; orgName: string; employees: EmployeeOption[] };

export function SendDocumentForm({ groups }: { groups: OrgGroup[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(group: OrgGroup, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const emp of group.employees) {
        if (checked) next.add(emp.id);
        else next.delete(emp.id);
      }
      return next;
    });
  }

  return (
    <form action={sendDocumentToEmployees} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="label">Label</label>
        <input id="label" name="label" placeholder="e.g. Updated leave policy" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="category">Category</label>
        <select id="category" name="category" defaultValue="OTHER" className={inputClass}>
          {Object.entries(EMPLOYEE_DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="file">File</label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
          required
          className={`${inputClass} file:mr-3 file:rounded-btn file:border-0 file:bg-indigo-tint file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo`}
        />
        <p className="mt-1 text-xs text-slate-light">PDF, Word, JPG, PNG, or WEBP, up to {MAX_DOCUMENT_FILE_LABEL}.</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className={labelClass}>Send to</span>
          <span className="text-xs text-slate-light">{selected.size} selected</span>
        </div>
        <div className="max-h-80 space-y-4 overflow-y-auto rounded-btn border border-border p-3">
          {groups.map((group) => {
            const allSelected = group.employees.length > 0 && group.employees.every((e) => selected.has(e.id));
            return (
              <div key={group.orgId}>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-light">{group.orgName}</p>
                  {group.employees.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group, !allSelected)}
                      className="text-xs font-medium text-indigo hover:text-indigo-light"
                    >
                      {allSelected ? "Clear all" : "Select all"}
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {group.employees.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        name="employeeIds"
                        value={emp.id}
                        checked={selected.has(emp.id)}
                        onChange={() => toggle(emp.id)}
                        className="rounded border-border"
                      />
                      {emp.name} <span className="text-xs text-slate-light">· {emp.roleTitle}</span>
                    </label>
                  ))}
                  {group.employees.length === 0 && (
                    <p className="text-xs text-slate-light">No active staff.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button type="submit" className={buttonClass}>Send document</button>
    </form>
  );
}
