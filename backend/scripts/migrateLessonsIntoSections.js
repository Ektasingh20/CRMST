import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";

async function migrateLessonsIntoSections() {
  await connectDatabase();
  const db = getFirestore();
  const courses = await db.collection("courses").get();
  let migrated = 0;

  for (const course of courses.docs) {
    const legacyLessons = await course.ref.collection("lessons").get();
    for (const legacyLesson of legacyLessons.docs) {
      const lesson = legacyLesson.data();
      const sectionName = String(lesson.section || "General").trim() || "General";
      const sectionId = sectionName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general";
      const sectionRef = course.ref.collection("sections").doc(sectionId);
      const targetLessonRef = sectionRef.collection("lessons").doc(legacyLesson.id);
      const tasks = await legacyLesson.ref.collection("tasks").get();

      await sectionRef.set({ name: sectionName, updatedAt: new Date().toISOString() }, { merge: true });
      await targetLessonRef.set({ ...lesson, id: legacyLesson.id, section: sectionName }, { merge: true });
      for (const task of tasks.docs) {
        await targetLessonRef.collection("tasks").doc(task.id).set(task.data(), { merge: true });
      }

      await legacyLesson.ref.delete();
      migrated += 1;
    }
  }

  console.log(`Migrated ${migrated} legacy lessons into course sections.`);
}

migrateLessonsIntoSections()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
