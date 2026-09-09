import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const legacyFields = [
  "video",
  "notes",
  "assignment",
  "assignmentCompleted",
  "notesCompleted",
  "notesUrl",
  "assignmentUrl",
  "studentNotesPdfUrl",
  "studentAssignmentPdfUrl",
];

async function cleanupStudentProgressDuplicates() {
  await connectDatabase();
  const db = getFirestore();
  const students = await db.collection("students").get();
  let scanned = 0;
  let updated = 0;

  for (const student of students.docs) {
    const courses = await student.ref.collection("enrolledCourses").get();
    for (const course of courses.docs) {
      const lessons = await course.ref.collection("lessons").get();
      for (const lesson of lessons.docs) {
        scanned += 1;
        const data = lesson.data();
        const update = {};

        if (data.videoCompleted === undefined && data.video !== undefined) {
          update.videoCompleted = Boolean(data.video);
        }
        if (data.taskCompleted === undefined && data.assignmentCompleted !== undefined) {
          update.taskCompleted = Boolean(data.assignmentCompleted);
        }
        if (!data.taskStudentPdfUpload && data.studentAssignmentPdfUrl) {
          update.taskStudentPdfUpload = String(data.studentAssignmentPdfUrl);
        }
        for (const field of legacyFields) {
          update[field] = FieldValue.delete();
        }

        await lesson.ref.set(update, { merge: true });
        updated += 1;
      }
    }
  }

  console.log(`Scanned ${scanned} student lesson progress documents; cleaned ${updated}.`);
}

cleanupStudentProgressDuplicates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
