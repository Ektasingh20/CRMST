import { connectDatabase } from "../config/db.js";
import User from "../models/User.js";
import { getAttendanceCalendar } from "../services/attendanceCalendar.js";
import { finalizeCompletedAttendance } from "../services/attendanceAutomation.js";
import { indiaDateString } from "../services/attendanceTime.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const allActive = args.includes("--all-active");
const targetArg = args.find((arg) => arg.startsWith("--employee="));
const targetId = targetArg ? targetArg.slice("--employee=".length).trim() : "";
const confirmed = args.includes("--confirm=BACKFILL_COMPLETED_ATTENDANCE");

async function main() {
  if (Number(allActive) + Number(Boolean(targetId)) !== 1) {
    throw new Error("Choose exactly one scope: --all-active or --employee=<Firestore employee ID>.");
  }
  if (apply && !confirmed) {
    throw new Error("Apply mode requires --confirm=BACKFILL_COMPLETED_ATTENDANCE.");
  }

  await connectDatabase();
  const [users, calendar] = await Promise.all([User.find({}), getAttendanceCalendar()]);
  let scopedUsers;
  let backfillEmployeeIds = [];
  if (targetId) {
    const employee = users.find((user) => String(user.id || user._id || "") === targetId);
    if (!employee) throw new Error(`Employee ${targetId} was not found. No writes were made.`);
    scopedUsers = [employee];
    backfillEmployeeIds = [targetId];
  }

  const now = new Date();
  const result = await finalizeCompletedAttendance(now, {
    ...(scopedUsers ? { users: scopedUsers } : {}),
    calendar,
    automationStartDate: calendar.automationStartDate || indiaDateString(now),
    backfillFromJoiningDate: true,
    backfillEmployeeIds,
    dryRun: !apply,
  });
  console.log(JSON.stringify({
    mode: apply ? "APPLY" : "DRY RUN — NO WRITES",
    scope: targetId ? { employeeId: targetId } : "all active, non-student employees",
    completedThrough: result.completedThrough,
    employeesConsidered: result.employees,
    completedBatches: result.finalizedBatches,
    wouldCreateAbsences: result.wouldMark ?? result.marked,
    createdAbsences: apply ? result.marked : 0,
    employees: result.employeePlans || [],
    skipped: result.skipped,
    nextStep: apply
      ? "Review the created count and verify attendance reports."
      : `Review the preview; apply with --apply --confirm=BACKFILL_COMPLETED_ATTENDANCE.`,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
