import type { ClientOrg, Employee } from "@/generated/prisma/client";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { MAX_PHOTO_FILE_LABEL } from "@/lib/photo";

type Props = {
  orgs: Pick<ClientOrg, "id" | "name">[];
  employee?: Employee;
  defaultOrgId?: string;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
};

const sectionLabelClass = "text-xs font-semibold uppercase tracking-widest text-slate-light";

export function EmployeeForm({ orgs, employee, defaultOrgId, action, submitLabel }: Props) {
  const startDateValue = employee ? employee.startDate.toISOString().slice(0, 10) : "";
  const dateOfBirthValue = employee?.dateOfBirth ? employee.dateOfBirth.toISOString().slice(0, 10) : "";
  const salaryValue = employee?.salary != null ? employee.salary.toString() : "";

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-4">
        <p className={sectionLabelClass}>Basic info</p>
        <div className="flex items-center gap-4">
          <EmployeeAvatar name={employee?.name ?? "?"} photoUrl={employee?.photoUrl} size="lg" />
          <div className="flex-1">
            <label className={labelClass} htmlFor="photo">Photo</label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={`${inputClass} file:mr-3 file:rounded-btn file:border-0 file:bg-indigo-tint file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo`}
            />
            <p className="mt-1 text-xs text-slate-light">JPG, PNG, or WEBP, up to {MAX_PHOTO_FILE_LABEL}.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="name">Name</label>
            <input id="name" name="name" defaultValue={employee?.name} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="roleTitle">Role</label>
            <input id="roleTitle" name="roleTitle" defaultValue={employee?.roleTitle} required className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue={employee?.email} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="tel" defaultValue={employee?.phone ?? ""} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="dateOfBirth">Date of birth</label>
            <input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={dateOfBirthValue} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="gender">Gender</label>
            <select id="gender" name="gender" defaultValue={employee?.gender ?? ""} className={inputClass}>
              <option value="">Not specified</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className={sectionLabelClass}>Employment</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="clientOrgId">Organization</label>
            <select id="clientOrgId" name="clientOrgId" defaultValue={employee?.clientOrgId ?? defaultOrgId ?? ""} required className={inputClass}>
              <option value="" disabled>Select organization</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="department">Department</label>
            <input id="department" name="department" defaultValue={employee?.department ?? ""} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="staffId">Staff ID</label>
            <input id="staffId" name="staffId" defaultValue={employee?.staffId ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="startDate">Start date</label>
            <input id="startDate" name="startDate" type="date" defaultValue={startDateValue} required className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div>
            <label className={labelClass} htmlFor="leaveBalanceDays">Leave balance (days)</label>
            <input
              id="leaveBalanceDays"
              name="leaveBalanceDays"
              type="number"
              min="0"
              step="1"
              defaultValue={employee?.leaveBalanceDays ?? 0}
              required
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className={sectionLabelClass}>Address & emergency contact</p>
        <div>
          <label className={labelClass} htmlFor="address">Address</label>
          <input id="address" name="address" defaultValue={employee?.address ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="emergencyContactName">Emergency contact name</label>
            <input
              id="emergencyContactName"
              name="emergencyContactName"
              defaultValue={employee?.emergencyContactName ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="emergencyContactPhone">Emergency contact phone</label>
            <input
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              type="tel"
              defaultValue={employee?.emergencyContactPhone ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className={sectionLabelClass}>Compensation & bank details (admin only)</p>
        <div className="sm:w-1/2 sm:pr-2">
          <label className={labelClass} htmlFor="salary">Salary / pay rate</label>
          <input
            id="salary"
            name="salary"
            type="number"
            min="0"
            step="0.01"
            defaultValue={salaryValue}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-light">
            Visible to Masy Ops and the client&rsquo;s Payroll page. Not shown to the employee.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="bankName">Bank name</label>
            <input id="bankName" name="bankName" defaultValue={employee?.bankName ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="bankAccountNumber">Account number</label>
            <input
              id="bankAccountNumber"
              name="bankAccountNumber"
              defaultValue={employee?.bankAccountNumber ?? ""}
              className={inputClass}
            />
          </div>
        </div>
        <div className="sm:w-1/2 sm:pr-2">
          <label className={labelClass} htmlFor="bankAccountHolderName">Account holder name</label>
          <input
            id="bankAccountHolderName"
            name="bankAccountHolderName"
            defaultValue={employee?.bankAccountHolderName ?? ""}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-light">The employee can also add or correct this from their own profile.</p>
        </div>
      </div>

      <button type="submit" className={buttonClass}>
        {submitLabel}
      </button>
    </form>
  );
}
