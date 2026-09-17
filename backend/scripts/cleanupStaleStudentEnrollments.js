import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

async function cleanupStaleStudentEnrollments() {
  await connectDatabase();
  const db = getFirestore();
  const studentRefs = await db.collection("students").listDocuments();
  let removed = 0;

  for (const student of studentRefs) {
    const studentId = student.id;
    const enrollmentRefs = await student.collection("enrolledCourses").listDocuments();
    for (const enrollment of enrollmentRefs) {
      const course = await db.collection("courses").doc(enrollment.id).get();
      const studentIds = course.exists && Array.isArray(course.data()?.studentIds)
        ? course.data().studentIds.map(String)
        : [];
      if (course.exists && studentIds.includes(String(studentId))) continue;

      await db.recursiveDelete(enrollment);
      removed += 1;
      console.log(`Removed stale enrollment ${enrollment.path}`);
    }
  }

  console.log(`Removed ${removed} stale student enrollment records.`);
}

cleanupStaleStudentEnrollments()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });