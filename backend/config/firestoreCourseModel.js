import { getFirestore } from "firebase-admin/firestore";

const COURSES_CACHE_TTL_MS = 60 * 1000;
let coursesCache = null;
let coursesCacheAt = 0;

function invalidateCoursesCache() {
  coursesCache = null;
  coursesCacheAt = 0;
}

function sectionDocumentId(sectionName) {
  const value = String(sectionName || "General").trim() || "General";
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general";
}

function sectionRef(courseRef, sectionName) {
  const name = String(sectionName || "General").trim() || "General";
  return courseRef.collection("sections").doc(sectionDocumentId(name));
}

async function readTasks(lessonRef) {
  const snapshot = await lessonRef.collection("tasks").get();
  return snapshot.docs
    .sort((left, right) => Number(left.data().order || 0) - Number(right.data().order || 0))
    .map((task) => ({ id: task.id, ...task.data() }));
}

async function readCourseLessons(courseRef) {
  const lessons = [];
  const sectionNames = new Map();
  const sections = await courseRef.collection("sections").get();
  sections.forEach((section) => {
    const name = String(section.data().name || section.id || "General").trim() || "General";
    sectionNames.set(name.toLowerCase(), name);
  });
  const directLessons = await courseRef.collection("lessons").get();
  for (const lesson of directLessons.docs) {
    lessons.push({ id: lesson.id, ...lesson.data(), tasks: await readTasks(lesson.ref) });
  }
  for (const section of sections.docs) {
    const sectionData = section.data();
    const sectionLessons = await section.ref.collection("lessons").get();
    for (const lesson of sectionLessons.docs) {
      lessons.push({ id: lesson.id, section: lesson.data().section || sectionData.name || "General", ...lesson.data(), tasks: await readTasks(lesson.ref) });
    }
  }
  const uniqueLessons = new Map();
  lessons.forEach((lesson) => {
    const sectionName = String(lesson.section || "General").trim() || "General";
    const key = `${sectionName.toLowerCase()}::${String(lesson.id)}`;
    uniqueLessons.set(key, lesson);
  });
  const normalizedLessons = [...uniqueLessons.values()].map((lesson) => {
    const rawSection = String(lesson.section || "General").trim() || "General";
    return { ...lesson, section: sectionNames.get(rawSection.toLowerCase()) || rawSection };
  });
  const sectionOrders = new Map();
  return normalizedLessons
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
    .map((lesson) => {
      const sectionKey = lesson.section.toLowerCase();
      const order = (sectionOrders.get(sectionKey) || 0) + 1;
      sectionOrders.set(sectionKey, order);
      return { ...lesson, order };
    });
}

async function readCourseSections(courseRef) {
  const snapshot = await courseRef.collection("sections").get();
  return snapshot.docs
    .map((section) => ({ id: section.id, name: String(section.data().name || section.id || "General").trim() || "General" }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function findLessonRef(courseRef, lessonId, sectionName = "") {
  if (sectionName) {
    const section = sectionRef(courseRef, sectionName);
    const sectionLesson = section.collection("lessons").doc(String(lessonId));
    if ((await sectionLesson.get()).exists) return sectionLesson;
  }
  const directRef = courseRef.collection("lessons").doc(String(lessonId));
  if ((await directRef.get()).exists) return directRef;
  const sections = await courseRef.collection("sections").get();
  for (const section of sections.docs) {
    const ref = section.ref.collection("lessons").doc(String(lessonId));
    if ((await ref.get()).exists) return ref;
  }
  return null;
}

async function getStudentProgressRefs(studentId, courseId, lessonRef) {
  const enrolledCourseRef = getFirestore().collection("students").doc(String(studentId))
    .collection("enrolledCourses").doc(String(courseId));
  const sectionRef = lessonRef.parent.parent;
  const isNestedSection = sectionRef?.parent?.id === "sections";
  const sectionData = isNestedSection ? (await sectionRef.get()).data() || {} : {};
  const sectionName = String(sectionData.name || (isNestedSection ? sectionRef.id : "General")).trim() || "General";
  const sectionProgressRef = enrolledCourseRef.collection("sections").doc(isNestedSection ? sectionRef.id : sectionDocumentId(sectionName));
  const progressRef = sectionProgressRef.collection("lessons").doc(String(lessonRef.id));
  return { enrolledCourseRef, sectionProgressRef, progressRef, sectionName };
}

function toDocument(Model, ref, data) {
  return {
    ...data,
    _id: ref.id,
    _ref: ref,
    toObject() {
      const { _id, _ref, toObject, ...value } = this;
      return value;
    },
  };
}

export function assembleCourseResponse(courseData = {}, lessons = [], sections = []) {
  const normalizedLessons = Array.isArray(lessons) ? lessons.map((lesson, index) => ({
    ...lesson,
    id: String(lesson?.id || lesson?._id || `lesson-${index + 1}`),
    section: String(lesson?.section || "General").trim() || "General",
    order: Number(lesson?.order || index + 1),
    tasks: Array.isArray(lesson?.tasks) ? lesson.tasks.map((task, taskIndex) => ({
      ...task,
      id: String(task?.id || task?._id || `task-${taskIndex + 1}`),
      order: Number(task?.order || taskIndex + 1),
    })) : [],
  })) : [];

  const orderedSections = Array.isArray(sections) && sections.length
    ? sections
    : [...new Map(normalizedLessons.map((lesson) => {
        const sectionName = String(lesson.section || "General").trim() || "General";
        return [sectionName.toLowerCase(), { name: sectionName }];
      })).values()];

  const normalizedSections = orderedSections.map((section, index) => ({
    id: section?.id || `section-${index + 1}`,
    name: String(section?.name || section?.title || "General").trim() || "General",
  }));
  const lessonsBySection = new Map(normalizedSections.map((section) => [section.name.toLowerCase(), []]));

  normalizedLessons.forEach((lesson) => {
    const sectionName = String(lesson.section || "General").trim() || "General";
    const sectionKey = sectionName.toLowerCase();
    if (!lessonsBySection.has(sectionKey)) {
      normalizedSections.push({ id: `section-${normalizedSections.length + 1}`, name: sectionName });
      lessonsBySection.set(sectionKey, []);
    }
    lessonsBySection.get(sectionKey).push(lesson);
  });

  const sortLessons = (left, right) => Number(left.order || 0) - Number(right.order || 0)
    || String(left.title || left.id).localeCompare(String(right.title || right.id));
  lessonsBySection.forEach((sectionLessons) => sectionLessons.sort(sortLessons));
  const groupedLessons = normalizedSections.flatMap((section) => lessonsBySection.get(section.name.toLowerCase()) || []);

  return {
    id: String(courseData.id || courseData._id || "course-unknown"),
    ...courseData,
    totalLessons: normalizedLessons.length,
    sections: normalizedSections.map((section) => ({
      ...section,
      lessons: lessonsBySection.get(section.name.toLowerCase()) || [],
    })),
    lessons: groupedLessons,
  };
}

export async function listCourses() {
  if (coursesCache && Date.now() - coursesCacheAt < COURSES_CACHE_TTL_MS) {
    return coursesCache;
  }

  const snapshot = await getFirestore().collection("courses").get();
  const courses = await Promise.all(snapshot.docs.map(async (courseDoc) => {
    // Read nested documents without requiring manually-created Firebase records
    // to contain order fields, then apply a stable fallback order in memory.
    const lessons = await readCourseLessons(courseDoc.ref);
    const sections = await readCourseSections(courseDoc.ref);
    return { id: courseDoc.id, ...courseDoc.data(), sections, lessons };
  }));
  coursesCache = courses;
  coursesCacheAt = Date.now();
  return courses;
}

export async function createCourse(data) {
  const db = getFirestore();
  const courseId = String(data.id || `course-${Date.now()}`);
  const courseRef = db.collection("courses").doc(courseId);
  const { lessons = [], ...courseData } = data;

  await courseRef.set({
    ...courseData,
    id: courseId,
    totalLessons: lessons.length,
    status: courseData.status || "active",
    createdAt: courseData.createdAt || new Date().toISOString(),
  });

  const sectionOrders = new Map();
  for (const [lessonIndex, lesson] of lessons.entries()) {
    const lessonSection = String(lesson.section || "General").trim() || "General";
    const section = sectionRef(courseRef, lessonSection);
    await section.set({ name: lessonSection, updatedAt: new Date().toISOString() }, { merge: true });
    const sectionLessons = await section.collection("lessons").get();
    const order = (sectionOrders.get(lessonSection) || sectionLessons.size) + 1;
    sectionOrders.set(lessonSection, order);
    const lessonId = String(lesson.id || `lesson-${Date.now()}-${lessonIndex + 1}`);
    const lessonRef = section.collection("lessons").doc(lessonId);
    const { tasks = [], ...lessonData } = lesson;
    await lessonRef.set({ ...lessonData, id: lessonId, order: lesson.order || order });

    for (const [taskIndex, task] of tasks.entries()) {
      const taskId = String(task.id || `task-${taskIndex + 1}`);
      await lessonRef.collection("tasks").doc(taskId).set({ ...task, id: taskId, order: task.order || taskIndex + 1 });
    }
  }

  invalidateCoursesCache();
  return getCourse(courseId);
}

export async function updateCourse(courseId, data) {
  const db = getFirestore();
  const ref = db.collection("courses").doc(String(courseId));
  const { lessons: _lessons, ...courseData } = data;
  await ref.set({ ...courseData, id: String(courseId), updatedAt: new Date().toISOString() }, { merge: true });
  invalidateCoursesCache();
  return getCourse(courseId);
}

export async function addCourseLesson(courseId, lesson) {
  const db = getFirestore();
  const courseRef = db.collection("courses").doc(String(courseId));
  const courseSnapshot = await courseRef.get();
  if (!courseSnapshot.exists) return null;
  const lessonSection = String(lesson.section || "General").trim() || "General";
  const section = sectionRef(courseRef, lessonSection);
  await section.set({ name: lessonSection, updatedAt: new Date().toISOString() }, { merge: true });
  const sectionLessons = await section.collection("lessons").get();
  const order = sectionLessons.size + 1;
  const lessonId = String(lesson.id || `lesson-${Date.now()}-${order}`);
  const lessonRef = section.collection("lessons").doc(lessonId);
  const { tasks = [], ...lessonData } = lesson;
  await lessonRef.set({ ...lessonData, id: lessonId, order });
  for (const [taskIndex, task] of tasks.entries()) {
    const taskId = String(task.id || `task-${taskIndex + 1}`);
    await lessonRef.collection("tasks").doc(taskId).set({ ...task, id: taskId, order: taskIndex + 1 });
  }
  await courseRef.set({ totalLessons: (await readCourseLessons(courseRef)).length, updatedAt: new Date().toISOString() }, { merge: true });
  invalidateCoursesCache();
  return getCourse(courseId);
}

export async function deleteCourseLesson(courseId, lessonId) {
  const db = getFirestore();
  const courseRef = db.collection("courses").doc(String(courseId));
  const lessonRef = await findLessonRef(courseRef, lessonId);
  if (!lessonRef) return null;

  const tasks = await lessonRef.collection("tasks").get();
  for (const task of tasks.docs) await task.ref.delete();
  await lessonRef.delete();

  const remainingLessons = await readCourseLessons(courseRef);
  await courseRef.set({ totalLessons: remainingLessons.length, updatedAt: new Date().toISOString() }, { merge: true });
  invalidateCoursesCache();
  return getCourse(courseId);
}

export async function updateCourseLesson(courseId, lessonId, lesson) {
  const db = getFirestore();
  const courseRef = db.collection("courses").doc(String(courseId));
  const existingLessonRef = await findLessonRef(courseRef, lessonId);
  if (!existingLessonRef) return null;

  const { tasks = [], ...lessonData } = lesson;
  const targetSection = sectionRef(courseRef, lessonData.section || "General");
  await targetSection.set({ name: String(lessonData.section || "General"), updatedAt: new Date().toISOString() }, { merge: true });
  const lessonRef = targetSection.collection("lessons").doc(String(lessonId));
  const targetSnapshot = await lessonRef.get();
  const targetLessons = targetSnapshot.exists ? null : await targetSection.collection("lessons").get();
  const order = targetSnapshot.exists ? targetSnapshot.data().order : (targetLessons.size + 1);
  await lessonRef.set({ ...lessonData, id: String(lessonId), order }, { merge: true });
  const taskSnapshot = await existingLessonRef.collection("tasks").get();
  for (const task of taskSnapshot.docs) await task.ref.delete();
  for (const [taskIndex, task] of tasks.entries()) {
    const taskId = String(task.id || `task-${taskIndex + 1}`);
    await lessonRef.collection("tasks").doc(taskId).set({ ...task, id: taskId, order: task.order || taskIndex + 1 });
  }
  if (existingLessonRef.path !== lessonRef.path) await existingLessonRef.delete();

  invalidateCoursesCache();
  return getCourse(courseId);
}

export async function gradeCourseTask(courseId, lessonId, taskId, studentId, grade, feedback = "") {
  const taskLessonRef = await findLessonRef(getFirestore().collection("courses").doc(String(courseId)), lessonId);
  if (!taskLessonRef) return null;
  const taskRef = taskLessonRef.collection("tasks").doc(String(taskId));
  const snapshot = await taskRef.get();
  if (!snapshot.exists) return null;
  const task = snapshot.data();
  const grades = { ...(task.grades || {}), [String(studentId)]: { grade: String(grade).trim(), feedback: String(feedback || "").trim(), updatedAt: new Date().toISOString() } };
  await taskRef.set({ grades }, { merge: true });
  const { progressRef } = await getStudentProgressRefs(studentId, courseId, taskLessonRef);
  await progressRef.set({ grade: String(grade).trim(), feedback: String(feedback || "").trim(), updatedAt: new Date().toISOString() }, { merge: true });
  invalidateCoursesCache();
  return { id: taskRef.id, ...task, grades };
}

export async function saveStudentTaskSubmission(courseId, lessonId, taskId, studentId, field, url, requestedSectionName = "") {
  const db = getFirestore();
  const courseRef = db.collection("courses").doc(String(courseId));
  const lessonRef = await findLessonRef(courseRef, lessonId, requestedSectionName);
  if (!lessonRef) return null;
  const [courseSnapshot, lessonSnapshot] = await Promise.all([courseRef.get(), lessonRef.get()]);
  if (!courseSnapshot.exists || !lessonSnapshot.exists) return null;

  const { enrolledCourseRef, sectionProgressRef, progressRef, sectionName } = await getStudentProgressRefs(studentId, courseId, lessonRef);
  const existing = await progressRef.get();
  const current = existing.exists ? existing.data() : {};
  const next = {
    studentId: String(studentId),
    courseId: String(courseId),
    courseTitle: courseSnapshot.data().title || "",
    lessonId: String(lessonId),
    lessonTitle: lessonSnapshot.data().title || "",
    taskId: String(taskId),
    videoCompleted: Boolean(current.videoCompleted),
    taskStudentPdfUpload: field === "taskUrl" ? String(url) : String(current.taskStudentPdfUpload || ""),
    taskCompleted: field === "taskUrl" ? true : Boolean(current.taskCompleted),
    grade: current.grade ?? null,
    feedback: current.feedback || "",
    updatedAt: new Date().toISOString(),
  };
  await enrolledCourseRef.set({
    studentId: String(studentId),
    courseId: String(courseId),
    courseTitle: courseSnapshot.data().title || "",
    updatedAt: next.updatedAt,
  }, { merge: true });
  await sectionProgressRef.set({ name: sectionName, updatedAt: next.updatedAt }, { merge: true });
  await progressRef.set(next, { merge: true });
  invalidateCoursesCache();
  return { id: progressRef.id, ...next };
}

export async function saveStudentLessonProgress(courseId, lessonId, studentId, videoCompleted, requestedSectionName = "") {
  const db = getFirestore();
  const courseRef = db.collection("courses").doc(String(courseId));
  const lessonRef = await findLessonRef(courseRef, lessonId, requestedSectionName);
  if (!lessonRef) return null;
  const [courseSnapshot, lessonSnapshot] = await Promise.all([courseRef.get(), lessonRef.get()]);
  if (!courseSnapshot.exists || !lessonRef || !lessonSnapshot.exists) return null;
  const { enrolledCourseRef, sectionProgressRef, progressRef, sectionName } = await getStudentProgressRefs(studentId, courseId, lessonRef);
  const existing = await progressRef.get();
  const current = existing.exists ? existing.data() : {};
  const next = {
    studentId: String(studentId),
    courseId: String(courseId),
    courseTitle: courseSnapshot.data().title || "",
    lessonId: String(lessonId),
    lessonTitle: lessonSnapshot.data().title || "",
    taskId: current.taskId || "",
    videoCompleted: Boolean(videoCompleted),
    taskStudentPdfUpload: current.taskStudentPdfUpload || "",
    taskCompleted: Boolean(current.taskCompleted),
    grade: current.grade ?? null,
    feedback: current.feedback || "",
    updatedAt: new Date().toISOString(),
  };
  await enrolledCourseRef.set({
    studentId: String(studentId),
    courseId: String(courseId),
    courseTitle: courseSnapshot.data().title || "",
    updatedAt: next.updatedAt,
  }, { merge: true });
  await sectionProgressRef.set({ name: sectionName, updatedAt: next.updatedAt }, { merge: true });
  await progressRef.set(next, { merge: true });
  return { id: progressRef.id, ...next };
}

export async function getStudentCourseProgress(studentId) {
  const enrolledCoursesRef = getFirestore().collection("students").doc(String(studentId)).collection("enrolledCourses");
  const coursesSnapshot = await enrolledCoursesRef.get();
  const progress = [];
  for (const courseDoc of coursesSnapshot.docs) {
    const courseRef = getFirestore().collection("courses").doc(String(courseDoc.id));
    const courseLessons = await readCourseLessons(courseRef);
    const byLessonId = new Map(courseLessons.map((lesson) => [`${lesson.id}:${String(lesson.title || "").trim().toLowerCase()}`, lesson]));
    const merged = new Map();
    const addProgress = (doc, sectionName = "") => {
      const data = doc.data ? doc.data() : doc;
      const lessonId = String(data.lessonId || doc.id || "");
      const lessonMatch = byLessonId.get(`${lessonId}:${String(data.lessonTitle || "").trim().toLowerCase()}`)
        || courseLessons.find((lesson) => String(lesson.id) === lessonId);
      const section = String(data.section || lessonMatch?.section || sectionName || "General").trim() || "General";
      const key = `${section.toLowerCase()}:${lessonId}`;
      const previous = merged.get(key) || {};
      const next = { ...previous, ...data, id: doc.id || data.id, section };
      const taskGrade = lessonMatch?.tasks?.find((task) => String(task.id) === String(data.taskId))?.grades?.[String(studentId)];
      if ((next.grade === null || next.grade === undefined || next.grade === "") && taskGrade?.grade !== undefined) next.grade = taskGrade.grade;
      if (!next.feedback && taskGrade?.feedback) next.feedback = taskGrade.feedback;
      ["grade", "feedback", "taskStudentPdfUpload", "taskId", "lessonTitle"].forEach((field) => {
        if ((data[field] === null || data[field] === undefined || data[field] === "") && previous[field] !== undefined) next[field] = previous[field];
      });
      merged.set(key, next);
    };
    const legacySnapshot = await courseDoc.ref.collection("lessons").get();
    legacySnapshot.docs.forEach((doc) => addProgress(doc));
    const sectionsSnapshot = await courseDoc.ref.collection("sections").get();
    for (const sectionDoc of sectionsSnapshot.docs) {
      const lessonsSnapshot = await sectionDoc.ref.collection("lessons").get();
      lessonsSnapshot.docs.forEach((doc) => addProgress(doc, sectionDoc.data().name || sectionDoc.id));
    }
    progress.push(...merged.values());
  }
  return progress;
}

export async function listStudentTaskSubmissions() {
  const snapshot = await getFirestore().collectionGroup("lessons").get();
  return snapshot.docs.flatMap((lessonDoc) => {
    const pathParts = lessonDoc.ref.path.split("/");
    if (pathParts[0] !== "students" || pathParts[2] !== "enrolledCourses") return [];
    const data = lessonDoc.data();
    const hasEvaluationData = Boolean(data.taskStudentPdfUpload || data.taskCompleted || data.feedback || data.grade !== null && data.grade !== undefined);
    if (!hasEvaluationData) return [];
    const studentId = pathParts[1];
    const courseId = pathParts[3];
    const sectionIndex = pathParts.indexOf("sections");
    const section = String(data.section || (sectionIndex >= 0 ? pathParts[sectionIndex + 1] : "General")).trim() || "General";
    return [{
      id: `${studentId}:${courseId}:${section}:${lessonDoc.id}`,
      studentId,
      courseId,
      courseTitle: data.courseTitle || courseId,
      section,
      lessonId: data.lessonId || lessonDoc.id,
      lessonTitle: data.lessonTitle || lessonDoc.id,
      taskId: data.taskId || "",
      taskStudentPdfUpload: data.taskStudentPdfUpload || "",
      taskCompleted: Boolean(data.taskCompleted),
      videoCompleted: Boolean(data.videoCompleted),
      grade: data.grade ?? null,
      feedback: data.feedback || "",
      updatedAt: data.updatedAt || null,
    }];
  });
}

export async function getCourse(courseId) {
  const ref = getFirestore().collection("courses").doc(String(courseId));
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;
  const [course] = await listCoursesByRefs([{ ref, data: snapshot.data() }]);
  return course;
}

async function listCoursesByRefs(rows) {
  return Promise.all(rows.map(async ({ ref, data }) => {
    const lessons = await readCourseLessons(ref);
    const sections = await readCourseSections(ref);
    return { id: ref.id, ...data, sections, lessons };
  }));
}

export async function deleteCourse(courseId) {
  const db = getFirestore();
  const ref = db.collection("courses").doc(String(courseId));
  const lessons = await readCourseLessons(ref);
  for (const lesson of lessons) {
    const lessonRef = await findLessonRef(ref, lesson.id);
    if (!lessonRef) continue;
    const tasks = await lessonRef.collection("tasks").get();
    for (const task of tasks.docs) await task.ref.delete();
    await lessonRef.delete();
  }
  const sections = await ref.collection("sections").get();
  for (const section of sections.docs) await section.ref.delete();
  await ref.delete();
  invalidateCoursesCache();
}
