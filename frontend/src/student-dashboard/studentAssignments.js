function normalizedLabel(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function assignmentPriority(assignment) {
  if (assignment.status === "Graded") return 4;
  if (assignment.submitted || assignment.status === "Submitted") return 3;
  if (assignment.status === "Pending") return 2;
  return 1;
}

export function dedupeStudentAssignments(assignments) {
  const rows = [];
  const positions = new Map();

  for (const assignment of assignments) {
    const courseName = normalizedLabel(assignment.courseTitle);
    const taskName = normalizedLabel(assignment.title);
    const dueDate = normalizedLabel(assignment.dueValue);
    // Keep unnamed records separate because their visible identity is unknown.
    const key = courseName && taskName ? `${courseName}\u001f${taskName}\u001f${dueDate}` : null;
    const previousIndex = key == null ? undefined : positions.get(key);
    if (previousIndex === undefined) {
      if (key != null) positions.set(key, rows.length);
      rows.push(assignment);
      continue;
    }

    const previous = rows[previousIndex];
    const betterStatus = assignmentPriority(assignment) > assignmentPriority(previous);
    const betterSubmission = assignmentPriority(assignment) === assignmentPriority(previous)
      && Boolean(assignment.submission?.taskStudentPdfUpload)
      && !previous.submission?.taskStudentPdfUpload;
    if (betterStatus || betterSubmission) rows[previousIndex] = assignment;
  }

  return rows;
}

export function formatAssignmentMarks(assignment) {
  const grade = assignment?.submission?.grade;
  if (assignment?.status !== "Graded" || grade === null || grade === undefined || String(grade).trim() === "") return "—";
  const value = String(grade).trim();
  return /\/\s*100$/.test(value) ? value : `${value} / 100`;
}
