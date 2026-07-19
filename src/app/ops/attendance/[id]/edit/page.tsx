import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { updateAttendanceRecord } from "../../actions";
import { AttendanceForm } from "../../attendance-form";

export default async function EditAttendanceRecordPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MASY_OPS");
  const { id } = await params;

  const record = await db.attendanceRecord.findUnique({
    where: { id },
    include: { employee: { include: { clientOrg: true } } },
  });
  if (!record) notFound();

  const updateWithId = updateAttendanceRecord.bind(null, record.id);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Edit attendance record</h1>
        <p className="text-sm text-slate">
          {record.employee.name} — {record.employee.clientOrg.name}
        </p>
      </div>
      <AttendanceForm employees={[]} record={record} action={updateWithId} submitLabel="Save changes" />
    </div>
  );
}
