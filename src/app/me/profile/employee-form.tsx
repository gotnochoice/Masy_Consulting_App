import type { Employee } from "@/generated/prisma/client";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { MAX_PHOTO_FILE_LABEL } from "@/lib/photo";

type Props = {
  employee: Employee;
  action: (formData: FormData) => void | Promise<void>;
};

const sectionLabelClass = "text-xs font-semibold uppercase tracking-widest text-slate-light";

export function MyDetailsForm({ employee, action }: Props) {
  const dateOfBirthValue = employee.dateOfBirth ? employee.dateOfBirth.toISOString().slice(0, 10) : "";
  const startDateValue = employee.startDate.toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-4">
        <p className={sectionLabelClass}>Contact info</p>
        <div className="flex items-center gap-4">
          <EmployeeAvatar name={employee.name} photoUrl={employee.photoUrl} size="lg" />
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
            <label className={labelClass} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue={employee.email} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="tel" defaultValue={employee.phone ?? ""} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="whatsappNumber">WhatsApp number</label>
            <input
              id="whatsappNumber"
              name="whatsappNumber"
              type="tel"
              defaultValue={employee.whatsappNumber ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="dateOfBirth">Date of birth</label>
            <input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={dateOfBirthValue} className={inputClass} />
          </div>
        </div>
        <div className="sm:w-1/2 sm:pr-2">
          <label className={labelClass} htmlFor="gender">Gender</label>
          <select id="gender" name="gender" defaultValue={employee.gender ?? ""} className={inputClass}>
            <option value="">Not specified</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <p className={sectionLabelClass}>Employment</p>
        <div className="sm:w-1/2 sm:pr-2">
          <label className={labelClass} htmlFor="startDate">Date you started at the firm</label>
          <input id="startDate" name="startDate" type="date" defaultValue={startDateValue} required className={inputClass} />
          <p className="mt-1 text-xs text-slate-light">Helps us track your tenure accurately. Correct it if it&rsquo;s off.</p>
        </div>
      </div>

      <div className="space-y-4">
        <p className={sectionLabelClass}>Address & emergency contact</p>
        <div>
          <label className={labelClass} htmlFor="address">Address</label>
          <input id="address" name="address" defaultValue={employee.address ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="emergencyContactName">Emergency contact name</label>
            <input
              id="emergencyContactName"
              name="emergencyContactName"
              defaultValue={employee.emergencyContactName ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="emergencyContactPhone">Emergency contact phone</label>
            <input
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              type="tel"
              defaultValue={employee.emergencyContactPhone ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className={sectionLabelClass}>Bank details (for payroll)</p>
        <p className="text-xs text-slate-light">
          Used by Masy to pay your salary. Only Masy Ops and {"your organization's"} owner can see this &mdash; never
          shown to other staff.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="bankName">Bank name</label>
            <input id="bankName" name="bankName" defaultValue={employee.bankName ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="bankAccountNumber">Account number</label>
            <input
              id="bankAccountNumber"
              name="bankAccountNumber"
              defaultValue={employee.bankAccountNumber ?? ""}
              className={inputClass}
            />
          </div>
        </div>
        <div className="sm:w-1/2 sm:pr-2">
          <label className={labelClass} htmlFor="bankAccountHolderName">Account holder name</label>
          <input
            id="bankAccountHolderName"
            name="bankAccountHolderName"
            defaultValue={employee.bankAccountHolderName ?? ""}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-light">Only fill this in if it&rsquo;s different from your name above.</p>
        </div>
      </div>

      <button type="submit" className={buttonClass}>Save changes</button>
    </form>
  );
}
