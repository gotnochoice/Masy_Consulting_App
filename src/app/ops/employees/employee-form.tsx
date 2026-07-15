import type { ClientOrg, Employee } from "@/generated/prisma/client";

type Props = {
  orgs: Pick<ClientOrg, "id" | "name">[];
  employee?: Employee;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
};

const inputClass = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-neutral-700";

export function EmployeeForm({ orgs, employee, action, submitLabel }: Props) {
  const startDateValue = employee ? employee.startDate.toISOString().slice(0, 10) : "";

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="name">Name</label>
          <input id="name" name="name" defaultValue={employee?.name} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="roleTitle">Role</label>
          <input id="roleTitle" name="roleTitle" defaultValue={employee?.roleTitle} required className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" defaultValue={employee?.email} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="startDate">Start date</label>
          <input id="startDate" name="startDate" type="date" defaultValue={startDateValue} required className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="clientOrgId">Organization</label>
          <select id="clientOrgId" name="clientOrgId" defaultValue={employee?.clientOrgId ?? ""} required className={inputClass}>
            <option value="" disabled>Select organization</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
        {employee && (
          <div>
            <label className={labelClass} htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={employee.status} required className={inputClass}>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On leave</option>
              <option value="OFFBOARDED">Offboarded</option>
            </select>
          </div>
        )}
      </div>
      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}
