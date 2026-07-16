import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";

type EmployeeOption = {
  id: string;
  name: string;
  clientOrg: { name: string };
};

type RecordValue = {
  employeeId: string;
  date: Date;
  clockIn: Date;
  clockOut: Date | null;
};

type Props = {
  employees: EmployeeOption[];
  record?: RecordValue;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
};

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toTimeInput(date: Date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function AttendanceForm({ employees, record, action, submitLabel }: Props) {
  return (
    <form action={action} className="space-y-4">
      {!record && (
        <div>
          <label className={labelClass} htmlFor="employeeId">Employee</label>
          <select id="employeeId" name="employeeId" required defaultValue="" className={inputClass}>
            <option value="" disabled>Select employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} — {employee.clientOrg.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass} htmlFor="date">Date</label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={record ? toDateInput(record.date) : ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="clockIn">Clock in</label>
          <input
            id="clockIn"
            name="clockIn"
            type="time"
            required
            defaultValue={record ? toTimeInput(record.clockIn) : ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="clockOut">Clock out</label>
          <input
            id="clockOut"
            name="clockOut"
            type="time"
            defaultValue={record?.clockOut ? toTimeInput(record.clockOut) : ""}
            className={inputClass}
          />
        </div>
      </div>
      <button type="submit" className={buttonClass}>
        {submitLabel}
      </button>
    </form>
  );
}
