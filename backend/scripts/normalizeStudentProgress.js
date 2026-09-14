import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";

const studentId = String(process.argv[2] || "students_01").trim();

function taskMapFrom(data, tasks) {
  const submissions = { ...(data.taskSubmissions || {}) };
  if (data.taskId && data.taskStudentPdfUpload) {
    submissions[String(data.taskId)] = {
      ...(submissions[String(data.taskId)] || {}),
      taskId: String(data.taskId),
      submitted: true,
      taskStudentPdfUpload: String(data.taskStudentPdfUpload),
    };
  }
  for (const task of tasks) {
    const id = String(task.id);
    submissions[id] = {
      ...(submissions[id] || {}),
      taskId: id,
      submitted: Boolean(submissions[id]?.submitted),
      taskStudentPdfUpload: submissions[id]?.taskStudentPdfUpload || "",
      grade: submissions[id]?.grade ?? "",
      feedback: submissions[id]?.feedback || "",
    };
  }
  if (data.grade !== undefined || data.feedback) {
    const id = String(data.taskId || tasks.find((task) => submissions[String(task.id)]?.submitted)?.id || tasks[0]?.id || "");
    if (id) submissions[id] = { ...(submissions[id] || {}), taskId: id, grade: data.grade ?? "", feedback: data.feedback || "" };
  }
  return submissions;
}

await connectDatabase();
const db = getFirestore();
const enrolledCourses = await db.collection("students").doc(studentId).collection("enrolledCourses").get();
let migrated = 0;

for (const enrolledCourse of enrolledCourses.docs) {
  const course = db.collection("courses").doc(enrolledCourse.id);
  const courseSnapshot = await course.get();
  const courseData = courseSnapshot.exists ? courseSnapshot.data() : {};
  const sourceSections = await course.collection("sections").get();
  const generatedSyllabus = [];
  for (const sourceSection of sourceSections.docs) {
    const lessons = await sourceSection.ref.collection("lessons").get();
    generatedSyllabus.push(`${sourceSection.data().name || sourceSection.id}: ${lessons.docs.map((lesson) => lesson.data().title || lesson.id).join(", ")}`);
  }
  const syllabus = String(courseData.syllabus || "").startsWith("Imported from folder:")
    ? generatedSyllabus.join(". ")
    : courseData.syllabus || "";
  await enrolledCourse.ref.set({
    courseId: enrolledCourse.id,
    courseTitle: courseData.title || enrolledCourse.data().courseTitle || enrolledCourse.id,
    syllabus,
    duration: courseData.duration || "",
    fees: courseData.fees || courseData.price || "",
    mode: courseData.mode || "",
    tools: courseData.tools || "",
    thumbnail: courseData.thumbnail || "",
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  const sourceLessons = new Map();
  for (const sourceSection of sourceSections.docs) {
    const sectionName = sourceSection.data().name || sourceSection.id;
    const lessons = await sourceSection.ref.collection("lessons").get();
    for (const lesson of lessons.docs) {
      const tasks = (await lesson.ref.collection("tasks").get()).docs.map((task) => ({ id: task.id }));
      sourceLessons.set(`${sourceSection.id}:${lesson.id}`, { section: sectionName, tasks });
      sourceLessons.set(lesson.id, { section: sectionName, tasks });
    }
  }

  const progressSections = await enrolledCourse.ref.collection("sections").get();
  for (const progressSection of progressSections.docs) {
    const progressLessons = await progressSection.ref.collection("lessons").get();
    for (const progressLesson of progressLessons.docs) {
      const data = progressLesson.data();
      const source = sourceLessons.get(`${progressSection.id}:${progressLesson.id}`)
        || sourceLessons.get(progressLesson.id)
        || { section: data.section || progressSection.id, tasks: [] };
      const taskSubmissions = taskMapFrom(data, source.tasks);
      const allTasksCompleted = source.tasks.length === 0 || source.tasks.every((task) => taskSubmissions[task.id]?.submitted === true);
      const notesCompleted = typeof data.notesCompleted === "boolean" ? data.notesCompleted : true;
      const completed = Boolean(data.videoCompleted && notesCompleted && allTasksCompleted);
      await progressLesson.ref.set({
        section: source.section,
        notesCompleted,
        taskSubmissions,
        completed,
        taskId: FieldValue.delete(),
        taskStudentPdfUpload: FieldValue.delete(),
        taskCompleted: FieldValue.delete(),
        grade: FieldValue.delete(),
        feedback: FieldValue.delete(),
      }, { merge: true });
      migrated += 1;
    }
  }
}

console.log(`Normalized ${migrated} student progress lesson document(s) for ${studentId}.`);
process.exit(0);
