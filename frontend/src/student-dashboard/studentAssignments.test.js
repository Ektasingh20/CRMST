import test from "node:test";
import assert from "node:assert/strict";
import { dedupeStudentAssignments, formatAssignmentMarks } from "./studentAssignments.js";

test("duplicate visible tasks keep the submitted course and lesson link", () => {
  const rows = dedupeStudentAssignments([
    { title: "t2", courseTitle: "new stack", courseId: "course-old", lessonUID: "lesson-old", status: "Locked", submitted: false, dueValue: "" },
    { title: " T2 ", courseTitle: "New   Stack", courseId: "course-new", lessonUID: "lesson-new", status: "Submitted", submitted: true, dueValue: "", submission: { taskStudentPdfUpload: "https://example.com/work.pdf" } },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].courseId, "course-new");
  assert.equal(rows[0].lessonUID, "lesson-new");
  assert.equal(rows[0].status, "Submitted");
});

test("tasks in different courses or with different due dates remain separate", () => {
  const rows = dedupeStudentAssignments([
    { title: "Project", courseTitle: "Web", dueValue: "2026-11-10", status: "Ready" },
    { title: "Project", courseTitle: "Web", dueValue: "2026-11-17", status: "Ready" },
    { title: "Project", courseTitle: "Python", dueValue: "2026-11-10", status: "Ready" },
  ]);
  assert.equal(rows.length, 3);
});

test("graded tasks show marks, including zero, while other tasks show a dash", () => {
  assert.equal(formatAssignmentMarks({ status: "Graded", submission: { grade: "85" } }), "85 / 100");
  assert.equal(formatAssignmentMarks({ status: "Graded", submission: { grade: 0 } }), "0 / 100");
  assert.equal(formatAssignmentMarks({ status: "Submitted", submission: { grade: "" } }), "—");
  const rows = dedupeStudentAssignments([
    { title: "Task", courseTitle: "Web", status: "Submitted", submitted: true, dueValue: "" },
    { title: "Task", courseTitle: "Web", status: "Graded", submitted: true, dueValue: "", submission: { grade: "92" } },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(formatAssignmentMarks(rows[0]), "92 / 100");
});
