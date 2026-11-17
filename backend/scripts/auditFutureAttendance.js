import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";
import { indiaDateString, isValidAttendanceDate } from "../services/attendanceTime.js";

function classify(data) {
  const source = String(data.source || "").trim().toLowerCase();
  const status = String(data.status || "").trim().toLowerCase();
  if (data.isTestData === true || data.simulatedPunches === true || source === "developer_demo_seed") {
    return "test_data";
  }
  if (data.autoMarked === true || source === "attendance_five_day_finalization") {
    return "automatically_generated";
  }
  if (data.correctedAt || source === "admin_correction") return "manually_corrected";
  if (status === "leave" || status === "holiday") return "attendance_leave_or_holiday";
  if (data.checkInAt || data.checkOutAt || source === "employee_self_service") return "punch_or_manual_record";
  return "unclassified_review";
}

function summarize(snapshot, storageType, getFields) {
  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      storageType,
      path: document.ref.path,
      ...getFields(document, data),
      category: classify(data),
      status: String(data.status || ""),
      source: String(data.source || ""),
      autoMarked: data.autoMarked === true,
      isTestData: data.isTestData === true,
    };
  });
}

function mergeDocuments(...snapshots) {
  const documentsByPath = new Map();
  snapshots.forEach((snapshot) => snapshot.docs.forEach((document) => {
    documentsByPath.set(document.ref.path, document);
  }));
  return [...documentsByPath.values()];
}

function hasFutureAttendanceDate(data, today) {
  return [data.date, data.workDate]
    .map((date) => String(date || ""))
    .some((date) => isValidAttendanceDate(date) && date > today);
}

async function main() {
  await connectDatabase();
  const db = getFirestore();
  const today = indiaDateString();
  const [nestedByWorkDate, legacyByDate, legacyByWorkDate] = await Promise.all([
    db.collectionGroup("attendanceDays").where("workDate", ">", today).get(),
    db.collection("attendance").where("date", ">", today).get(),
    db.collection("attendance").where("workDate", ">", today).get(),
  ]);
  const nestedDocuments = mergeDocuments(nestedByWorkDate)
    .filter((document) => hasFutureAttendanceDate(document.data(), today));
  const legacyDocuments = mergeDocuments(legacyByDate, legacyByWorkDate)
    .filter((document) => String(document.data().employeeId || "").trim()
      && hasFutureAttendanceDate(document.data(), today));
  const records = [
    ...summarize({ docs: nestedDocuments }, "nested", (document, data) => ({
      employeeId: document.ref.path.split("/")[1] || "",
      workDate: [data.workDate, data.date].map((date) => String(date || ""))
        .find((date) => isValidAttendanceDate(date) && date > today) || document.id,
    })),
    ...summarize({ docs: legacyDocuments }, "legacy", (_document, data) => ({
      employeeId: String(data.employeeId || ""),
      workDate: [data.workDate, data.date].map((date) => String(date || ""))
        .find((date) => isValidAttendanceDate(date) && date > today) || "",
    })),
  ];
  const counts = records.reduce((result, record) => {
    result[record.category] = (result[record.category] || 0) + 1;
    return result;
  }, {});
  console.log(JSON.stringify({
    mode: "read-only-dry-run",
    todayIndia: today,
    totalFutureAttendanceDocuments: records.length,
    categoryCounts: counts,
    records,
    writes: 0,
    deletes: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error("Future attendance audit failed:", error);
  process.exitCode = 1;
});
