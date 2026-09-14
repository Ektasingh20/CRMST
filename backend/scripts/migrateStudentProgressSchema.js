import { connectDatabase } from "../config/db.js";
import { getStudentCourseProgress } from "../config/firestoreCourseModel.js";

const studentId = String(process.argv[2] || "students_01").trim();

try {
  await connectDatabase();
  await getStudentCourseProgress(studentId);
  console.log(`Student progress schema normalized for ${studentId}`);
  process.exit(0);
} catch (error) {
  console.error(`Student progress migration failed for ${studentId}:`, error);
  process.exit(1);
}
