import { Timestamp } from "firebase-admin/firestore";

const MONTH = "2026-11";
export const ATTENDANCE_TEST_SOURCE = "integration_test_seed";

const sampleDays = [
  { day: "01", status: "holiday" },
  { day: "02", status: "present", checkIn: "09:26", checkOut: "18:04" },
  { day: "03", status: "present", checkIn: "09:31", checkOut: "18:02" },
  { day: "04", status: "present", checkIn: "09:28", checkOut: "18:10" },
  { day: "05", status: "present", checkIn: "09:34", checkOut: "18:01" },
  { day: "06", status: "present", checkIn: "09:25", checkOut: "18:00" },
  { day: "07", status: "absent" },
  { day: "08", status: "holiday" },
  { day: "09", status: "present", checkIn: "09:32", checkOut: "18:07" },
  { day: "10", status: "leave" },
  { day: "11", status: "absent" },
  { day: "12", status: "leave" },
  { day: "13", status: "absent" },
  { day: "14", status: "absent" },
  { day: "15", status: "holiday" },
  { day: "16", status: "absent" },
];

function indiaTimestamp(date, time) {
  return Timestamp.fromDate(new Date(`${date}T${time}:00+05:30`));
}

function elapsedMinutes(checkIn, checkOut) {
  const [inHour, inMinute] = checkIn.split(":").map(Number);
  const [outHour, outMinute] = checkOut.split(":").map(Number);
  return (outHour * 60 + outMinute) - (inHour * 60 + inMinute);
}

function formatClock(value) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

export function buildNovemberRamTestRecords({
  employeeId,
  employeeName,
  employeeUid = "",
  seedOperationId,
  now = Timestamp.now(),
}) {
  const id = String(employeeId || "").trim();
  const name = String(employeeName || "").trim();
  const operationId = String(seedOperationId || "").trim();
  if (!id || id.includes("/") || !name || !operationId) {
    throw new Error("A valid employee ID, employee name, and operation ID are required.");
  }

  return sampleDays.map(({ day, status, checkIn, checkOut }) => {
    const date = `${MONTH}-${day}`;
    const present = status === "present";
    return {
      date,
      status,
      record: {
        recordId: `ATT-${date.replaceAll("-", "")}-${id}`,
        employeeId: id,
        employeeUid: String(employeeUid || "") || null,
        employeeName: name,
        date,
        workDate: date,
        month: MONTH,
        status,
        attendanceState: present ? "checked_out" : status,
        checkInAt: present ? indiaTimestamp(date, checkIn) : null,
        checkOutAt: present ? indiaTimestamp(date, checkOut) : null,
        checkIn: present ? formatClock(checkIn) : "",
        checkOut: present ? formatClock(checkOut) : "",
        workedMinutes: present ? elapsedMinutes(checkIn, checkOut) : null,
        remark: "Temporary test record — not verified attendance",
        source: ATTENDANCE_TEST_SOURCE,
        reason: "integration_test_seed",
        isTestData: true,
        simulatedPunches: present,
        excludedFromPayroll: true,
        seedOperationId: operationId,
        payable: false,
        autoMarked: false,
        createdAt: now,
        updatedAt: now,
      },
    };
  });
}
