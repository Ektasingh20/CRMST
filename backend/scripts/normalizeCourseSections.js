import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";

function sectionId(name) {
  return String(name || "General").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general";
}

async function copyTasks(sourceRef, targetRef) {
  const tasks = await sourceRef.collection("tasks").get();
  for (const task of tasks.docs) {
    await targetRef.collection("tasks").doc(task.id).set(task.data(), { merge: true });
  }
}

async function removeLesson(ref) {
  const tasks = await ref.collection("tasks").get();
  for (const task of tasks.docs) await task.ref.delete();
  await ref.delete();
}

async function normalizeCourseSections() {
  await connectDatabase();
  const db = getFirestore();
  const courses = await db.collection("courses").get();
  let normalized = 0;

  for (const course of courses.docs) {
    const entries = [];
    const directLessons = await course.ref.collection("lessons").get();
    directLessons.docs.forEach((lesson) => entries.push({ ref: lesson.ref, data: lesson.data() }));

    const sections = await course.ref.collection("sections").get();
    for (const section of sections.docs) {
      const sectionName = String(section.data().name || section.id || "General").trim() || "General";
      const lessons = await section.ref.collection("lessons").get();
      lessons.docs.forEach((lesson) => entries.push({ ref: lesson.ref, data: { ...lesson.data(), section: lesson.data().section || sectionName } }));
    }

    const byLesson = new Map();
    entries.forEach((entry) => byLesson.set(String(entry.data.id || entry.ref.id), entry));
    const sectionCounters = new Map();
    let courseLessonCount = 0;

    for (const [lessonId, entry] of byLesson) {
      const rawSection = String(entry.data.section || "General").trim() || "General";
      const sectionKey = rawSection.toLowerCase();
      const sectionName = sections.docs.map((section) => String(section.data().name || section.id || "").trim()).find((name) => name.toLowerCase() === sectionKey) || rawSection;
      const order = (sectionCounters.get(sectionKey) || 0) + 1;
      sectionCounters.set(sectionKey, order);
      const targetSection = course.ref.collection("sections").doc(sectionId(sectionName));
      const targetLesson = targetSection.collection("lessons").doc(lessonId);
      await targetSection.set({ name: sectionName, updatedAt: new Date().toISOString() }, { merge: true });
      await targetLesson.set({ ...entry.data, id: lessonId, section: sectionName, order }, { merge: true });
      await copyTasks(entry.ref, targetLesson);
      if (entry.ref.path !== targetLesson.path) await removeLesson(entry.ref);
      normalized += 1;
      courseLessonCount += 1;
    }

    await course.ref.set({ totalLessons: courseLessonCount, updatedAt: new Date().toISOString() }, { merge: true });
  }

  console.log(`Normalized ${normalized} course lessons into case-insensitive sections.`);
}

normalizeCourseSections()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
