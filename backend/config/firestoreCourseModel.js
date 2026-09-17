import { FieldValue, getFirestore } from "firebase-admin/firestore";

function formatDurationTime(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
}

function durationToSeconds(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  const match = String(value || "").trim().match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;
  const [, hours, minutes, seconds] = match;
  if (Number(minutes) > 59 || Number(seconds) > 59) return null;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

// Older course documents use durationSec. Read it for compatibility, but keep
// durationTime as the single stored/displayed field from now on.
function normalizeLessonDuration(lessonData = {}) {
  const fromTime = durationToSeconds(lessonData.durationTime);
  const fromSeconds = durationToSeconds(lessonData.durationSec);
  const totalSeconds = fromTime ?? fromSeconds ?? 0;
  const { durationSec: _legacyDurationSec, ...data } = lessonData;
  return {
    ...data,
    durationTime: formatDurationTime(totalSeconds),
  };
}

// Course responses include sections, lessons, and tasks. Cache them briefly
// to avoid repeating that read tree; every API mutation clears this cache.
const COURSES_CACHE_TTL_MS = 60 * 1000;
const coursesCache = new Map();
const coursesCachePromises = new Map();
const initializedEnrollments = new Set();
const TASK_SUBMISSIONS_CACHE_TTL_MS = 5 * 60 * 1000;
let taskSubmissionsCache = null;
let taskSubmissionsCacheAt = 0;
let taskSubmissionsCachePromise = null;

function invalidateCoursesCache() {
  coursesCache.clear();
  coursesCachePromises.clear();
  taskSubmissionsCache = null;
  taskSubmissionsCacheAt = 0;
  taskSubmissionsCachePromise = null;
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

function buildTaskSubmissions(tasks = [], current = {}, taskId = "", url = "", field = "") {
  const submissions = { ...(current.taskSubmissions || {}) };
  tasks.forEach((task) => {
    const id = String(task.id);
    submissions[id] = {
      ...(submissions[id] || {}),
      taskId: id,
      submitted: Boolean(submissions[id]?.submitted),
      taskStudentPdfUpload: submissions[id]?.taskStudentPdfUpload || "",
      grade: submissions[id]?.grade ?? "",
      feedback: submissions[id]?.feedback || "",
    };
  });
  if (current.grade !== undefined || current.feedback) {
      const submittedTask = current.taskId
        || tasks.find((task) => submissions[String(task.id)]?.submitted)?.id
        || Object.keys(submissions).find((id) => submissions[id]?.submitted === true)
        || tasks[0]?.id;
      const id = String(submittedTask || "");
      if (!id) return submissions;
      submissions[id] = {
        ...(submissions[id] || {}),
        taskId: id,
        grade: current.grade ?? "",
        feedback: current.feedback || "",
      };
    }
  if (taskId) {
    const id = String(taskId);
    submissions[id] = {
      ...(submissions[id] || {}),
      taskId: id,
      submitted: field === "taskUrl" ? true : Boolean(submissions[id]?.submitted),
      taskStudentPdfUpload: field === "taskUrl" ? String(url) : String(submissions[id]?.taskStudentPdfUpload || ""),
      updatedAt: new Date().toISOString(),
    };
  }
  return submissions;
}

function normalizeTaskGrade(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return value;
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
    return normalizeLessonDuration({ ...lesson, section: sectionNames.get(rawSection.toLowerCase()) || rawSection });
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
    ...normalizeLessonDuration(lesson),
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

export async function listCourses(studentId = "", includeDetails = true) {
  const cacheKey = `${String(studentId || "")}:${includeDetails ? "details" : "summary"}`;
  const cached = coursesCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < COURSES_CACHE_TTL_MS) {
    return cached.items;
  }

  if (!coursesCachePromises.has(cacheKey)) {
    const courseQuery = getFirestore().collection("courses");
    const promise = courseQuery.get().then((snapshot) => Promise.all(snapshot.docs.map(async (courseDoc) => {
      const data = courseDoc.data();
      const isAssigned = !studentId || (Array.isArray(data.studentIds) && data.studentIds.map(String).includes(String(studentId)));
      if (!includeDetails || (studentId && !isAssigned)) {
        return { id: courseDoc.id, ...data, sections: [], lessons: [] };
      }
      const lessons = await readCourseLessons(courseDoc.ref);
      const sections = await readCourseSections(courseDoc.ref);
      return { id: courseDoc.id, ...data, sections, lessons };
    }))).then((items) => {
      coursesCache.set(cacheKey, { items, fetchedAt: Date.now() });
      return items;
    }).finally(() => coursesCachePromises.delete(cacheKey));
    coursesCachePromises.set(cacheKey, promise);
  }
  return coursesCachePromises.get(cacheKey);
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
    await lessonRef.set({ ...normalizeLessonDuration(lessonData), id: lessonId, order: lesson.order || order });

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
  const { lessons, ...courseData } = data;
  await ref.set({ ...courseData, id: String(courseId), updatedAt: new Date().toISOString() }, { merge: true });
  if (Array.isArray(lessons)) {
    const existingSections = await ref.collection("sections").get();
    for (const section of existingSections.docs) {
      const existingLessons = await section.ref.collection("lessons").get();
      for (const lesson of existingLessons.docs) {
        const existingTasks = await lesson.ref.collection("tasks").get();
        for (const task of existingTasks.docs) await task.ref.delete();
        await lesson.ref.delete();
      }
      await section.ref.delete();
    }
    const sectionOrders = new Map();
    for (const [lessonIndex, lesson] of lessons.entries()) {
      const lessonSection = String(lesson.section || "General").trim() || "General";
      const section = sectionRef(ref, lessonSection);
      await section.set({ name: lessonSection, updatedAt: new Date().toISOString() }, { merge: true });
      const order = (sectionOrders.get(lessonSection) || 0) + 1;
      sectionOrders.set(lessonSection, order);
      const lessonId = String(lesson.id || `lesson-${Date.now()}-${lessonIndex + 1}`);
      const lessonRef = section.collection("lessons").doc(lessonId);
      const { tasks = [], ...lessonData } = lesson;
      await lessonRef.set({ ...normalizeLessonDuration(lessonData), id: lessonId, order: lesson.order || order });
      for (const [taskIndex, task] of tasks.entries()) {
        const taskId = String(task.id || `task-${taskIndex + 1}`);
        await lessonRef.collection("tasks").doc(taskId).set({ ...task, id: taskId, order: task.order || taskIndex + 1 });
      }
    }
    await ref.set({ totalLessons: lessons.length }, { merge: true });
  }
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
  await lessonRef.set({ ...normalizeLessonDuration(lessonData), id: lessonId, order });
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
  await lessonRef.set({ ...normalizeLessonDuration(lessonData), id: String(lessonId), order, durationSec: FieldValue.delete() }, { merge: true });
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
  const progressSnapshot = await progressRef.get();
  const progress = progressSnapshot.exists ? progressSnapshot.data() : {};
  const taskSubmissions = {
    ...(progress.taskSubmissions || {}),
    [String(taskId)]: {
      ...(progress.taskSubmissions?.[String(taskId)] || {}),
      taskId: String(taskId),
      grade: String(grade).trim(),
      feedback: String(feedback || "").trim(),
      updatedAt: new Date().toISOString(),
    },
  };
  await progressRef.set({
    taskSubmissions,
    updatedAt: new Date().toISOString(),
    grade: FieldValue.delete(),
    feedback: FieldValue.delete(),
  }, { merge: true });
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
  const tasks = await readTasks(lessonRef);
  const taskSubmissions = buildTaskSubmissions(tasks, current, taskId, url, field);
  const allTasksCompleted = tasks.length === 0 || tasks.every((task) => taskSubmissions[String(task.id)]?.submitted === true);
  const next = {
    studentId: String(studentId),
    courseId: String(courseId),
    courseTitle: courseSnapshot.data().title || "",
    lessonId: String(lessonId),
    lessonTitle: lessonSnapshot.data().title || "",
    section: sectionName,
    videoCompleted: Boolean(current.videoCompleted),
    notesCompleted: Boolean(current.notesCompleted || !lessonSnapshot.data().notesUrl),
    taskSubmissions,
    updatedAt: new Date().toISOString(),
  };
  next.completed = Boolean(next.videoCompleted && next.notesCompleted && allTasksCompleted);
  await enrolledCourseRef.set({
    studentId: String(studentId),
    courseId: String(courseId),
    courseTitle: courseSnapshot.data().title || "",
    updatedAt: next.updatedAt,
  }, { merge: true });
  await sectionProgressRef.set({ name: sectionName, updatedAt: next.updatedAt }, { merge: true });
  await progressRef.set({ ...next, taskId: FieldValue.delete(), taskStudentPdfUpload: FieldValue.delete(), taskCompleted: FieldValue.delete(), grade: FieldValue.delete(), feedback: FieldValue.delete() }, { merge: true });
  await updateEnrollmentSummary(enrolledCourseRef, courseRef, studentId, courseId);
  invalidateCoursesCache();
  return { id: progressRef.id, ...next };
}

async function updateEnrollmentSummary(enrolledCourseRef, courseRef, studentId, courseId) {
  const courseLessons = await readCourseLessons(courseRef);
  const sections = await enrolledCourseRef.collection("sections").get();
  const progressDocs = [];
  for (const section of sections.docs) {
    const lessons = await section.ref.collection("lessons").get();
    lessons.docs.forEach((lesson) => progressDocs.push({ ...lesson.data(), section: lesson.data().section || section.data().name || section.id }));
  }
  const completedLessons = progressDocs.filter((lesson) => lesson.completed === true).length;
  const getLessonProgress = (lesson) => {
    const taskCount = Array.isArray(lesson.tasks) ? lesson.tasks.length : 0;
    const taskDone = Object.values(lesson.taskSubmissions || {}).filter((task) => task?.submitted === true).length;
    const total = 1 + (lesson.notesUrl ? 1 : 0) + taskCount;
    const done = (lesson.videoCompleted ? 1 : 0) + (lesson.notesUrl ? (lesson.notesCompleted ? 1 : 0) : 0) + taskDone;
    return { total, done };
  };
  const courseProgress = courseLessons.reduce((result, lesson) => {
    const saved = progressDocs.find((item) => String(item.lessonId) === String(lesson.id) && String(item.section || "General").toLowerCase() === String(lesson.section || "General").toLowerCase());
    const current = getLessonProgress({ ...lesson, ...(saved || {}) });
    return { total: result.total + current.total, done: result.done + current.done };
  }, { total: 0, done: 0 });
  const progress = courseProgress.total ? Math.round((courseProgress.done / courseProgress.total) * 100) : 0;
  const courseSectionNames = [...new Set(courseLessons.map((lesson) => String(lesson.section || "General").trim() || "General"))];
  for (const sectionName of courseSectionNames) {
    const sectionLessons = courseLessons.filter((lesson) => String(lesson.section || "General").trim().toLowerCase() === sectionName.toLowerCase());
    const sectionProgress = sectionLessons.reduce((result, lesson) => {
      const saved = progressDocs.find((item) => String(item.lessonId) === String(lesson.id) && String(item.section || "General").toLowerCase() === sectionName.toLowerCase());
      const current = getLessonProgress({ ...lesson, ...(saved || {}) });
      return { total: result.total + current.total, done: result.done + current.done };
    }, { total: 0, done: 0 });
    const sectionCompleted = progressDocs.filter((lesson) => String(lesson.section || "General").trim().toLowerCase() === sectionName.toLowerCase() && lesson.completed === true).length;
    await enrolledCourseRef.collection("sections").doc(sectionDocumentId(sectionName)).set({
      name: sectionName,
      totalLessons: sectionLessons.length,
      completedLessons: sectionCompleted,
      progress: sectionProgress.total ? Math.round((sectionProgress.done / sectionProgress.total) * 100) : 0,
      completed: sectionLessons.length > 0 && sectionCompleted >= sectionLessons.length,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }
  await enrolledCourseRef.set({
    studentId: String(studentId),
    courseId: String(courseId),
    totalLessons: courseLessons.length,
    completedLessons,
    totalProgressUnits: courseProgress.total,
    completedProgressUnits: courseProgress.done,
    progress,
    completed: progress >= 100,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return { progress, completed: progress >= 100, completedLessons, totalLessons: courseLessons.length };
}

export async function saveStudentLessonProgress(courseId, lessonId, studentId, progressPatch = {}, requestedSectionName = "") {
  const db = getFirestore();
  const courseRef = db.collection("courses").doc(String(courseId));
  const lessonRef = await findLessonRef(courseRef, lessonId, requestedSectionName);
  if (!lessonRef) return null;
  const [courseSnapshot, lessonSnapshot] = await Promise.all([courseRef.get(), lessonRef.get()]);
  if (!courseSnapshot.exists || !lessonRef || !lessonSnapshot.exists) return null;
  const { enrolledCourseRef, sectionProgressRef, progressRef, sectionName } = await getStudentProgressRefs(studentId, courseId, lessonRef);
  const existing = await progressRef.get();
  const current = existing.exists ? existing.data() : {};
  const tasks = await readTasks(lessonRef);
  const taskSubmissions = buildTaskSubmissions(tasks, current);
  const allTasksCompleted = tasks.length === 0 || tasks.every((task) => taskSubmissions[String(task.id)]?.submitted === true);
  const next = {
    studentId: String(studentId),
    courseId: String(courseId),
    courseTitle: courseSnapshot.data().title || "",
    lessonId: String(lessonId),
    lessonTitle: lessonSnapshot.data().title || "",
    section: sectionName,
    videoCompleted: typeof progressPatch.videoCompleted === "boolean" ? progressPatch.videoCompleted : Boolean(current.videoCompleted),
    notesCompleted: typeof progressPatch.notesCompleted === "boolean"
      ? progressPatch.notesCompleted
      : Boolean(current.notesCompleted || !lessonSnapshot.data().notesUrl),
    taskStudentPdfUpload: current.taskStudentPdfUpload || "",
    taskSubmissions,
    updatedAt: new Date().toISOString(),
  };
  next.completed = Boolean(next.videoCompleted && next.notesCompleted && allTasksCompleted);
  await enrolledCourseRef.set({
    studentId: String(studentId),
    courseId: String(courseId),
    courseTitle: courseSnapshot.data().title || "",
    updatedAt: next.updatedAt,
  }, { merge: true });
  await sectionProgressRef.set({ name: sectionName, updatedAt: next.updatedAt }, { merge: true });
  await progressRef.set({ ...next, taskId: FieldValue.delete(), taskStudentPdfUpload: FieldValue.delete(), taskCompleted: FieldValue.delete(), grade: FieldValue.delete(), feedback: FieldValue.delete() }, { merge: true });
  const summary = await updateEnrollmentSummary(enrolledCourseRef, courseRef, studentId, courseId);
  return { id: progressRef.id, ...next, courseProgress: summary.progress, courseCompleted: summary.completed };
}

export async function ensureStudentEnrollment(studentId, course) {
  if (!studentId || !course?.id) return;
  const totalLessons = Array.isArray(course.lessons) ? course.lessons.length : Number(course.totalLessons || 0);
  const enrollmentKey = JSON.stringify([studentId, course.id, course.title || "", course.syllabus || "", course.duration || "", course.fees || course.price || "", course.mode || "", course.tools || "", course.thumbnail || "", totalLessons]);
  if (initializedEnrollments.has(enrollmentKey)) return;
  const ref = getFirestore().collection("students").doc(String(studentId))
    .collection("enrolledCourses").doc(String(course.id));
  await ref.set({
    studentId: String(studentId),
    courseId: String(course.id),
    courseTitle: course.title || "",
    syllabus: course.syllabus || "",
    duration: course.duration || "",
    fees: course.fees || course.price || "",
    mode: course.mode || "",
    tools: course.tools || "",
    thumbnail: course.thumbnail || "",
    totalLessons,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  initializedEnrollments.add(enrollmentKey);
}

export async function getStudentCourseProgress(studentId, courses = [], onlyCourseId = "") {
  const enrolledCoursesRef = getFirestore().collection("students").doc(String(studentId)).collection("enrolledCourses");
  const coursesSnapshot = onlyCourseId
    ? await enrolledCoursesRef.doc(String(onlyCourseId)).get()
    : await enrolledCoursesRef.get();
  const courseDocs = onlyCourseId
    ? (coursesSnapshot.exists ? [coursesSnapshot] : [])
    : coursesSnapshot.docs;
  const assignedCourseIds = new Set(
    courses
      .filter((course) => Array.isArray(course.studentIds) && course.studentIds.map(String).includes(String(studentId)))
      .map((course) => String(course.id)),
  );
  const progress = [];
  for (const courseDoc of courseDocs) {
    if (assignedCourseIds.size && !assignedCourseIds.has(String(courseDoc.id))) continue;
    const courseRef = getFirestore().collection("courses").doc(String(courseDoc.id));
    const loadedCourse = courses.find((course) => String(course.id) === String(courseDoc.id));
    const courseLessons = Array.isArray(loadedCourse?.lessons) ? loadedCourse.lessons : await readCourseLessons(courseRef);
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
      const hasTasks = Array.isArray(lessonMatch?.tasks) && lessonMatch.tasks.length > 0;
      const notesCompleted = typeof data.notesCompleted === "boolean" ? data.notesCompleted : !lessonMatch?.notesUrl;
      const legacyTaskSubmissions = buildTaskSubmissions(lessonMatch?.tasks || [], {
        ...data,
        taskSubmissions: data.taskId && data.taskStudentPdfUpload
          ? {
              ...(data.taskSubmissions || {}),
              [String(data.taskId)]: {
                ...(data.taskSubmissions?.[String(data.taskId)] || {}),
                taskId: String(data.taskId),
                taskStudentPdfUpload: String(data.taskStudentPdfUpload),
                submitted: true,
              },
            }
          : data.taskSubmissions,
      });
      const taskCompleted = !hasTasks || (lessonMatch?.tasks || []).every((task) => legacyTaskSubmissions[String(task.id)]?.submitted === true);
      const next = {
        ...previous,
        ...data,
        id: doc.id || data.id,
        section,
        notesCompleted,
        taskCompleted,
        taskSubmissions: legacyTaskSubmissions,
        completed: typeof data.completed === "boolean"
          ? data.completed
          : Boolean(data.videoCompleted && notesCompleted && taskCompleted),
      };
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
  if (taskSubmissionsCache && Date.now() - taskSubmissionsCacheAt < TASK_SUBMISSIONS_CACHE_TTL_MS) return taskSubmissionsCache;
  if (!taskSubmissionsCachePromise) {
    taskSubmissionsCachePromise = getFirestore().collectionGroup("lessons").get().then((snapshot) => {
      const rows = [];
      for (const lessonDoc of snapshot.docs) {
    const pathParts = lessonDoc.ref.path.split("/");
    if (pathParts[0] !== "students" || pathParts[2] !== "enrolledCourses") continue;
    const data = lessonDoc.data();
    const normalizedSubmissions = buildTaskSubmissions([], data);
    const taskEntries = Object.values(normalizedSubmissions);
    const hasEvaluationData = Boolean(taskEntries.length || data.feedback || data.grade !== null && data.grade !== undefined);
    if (!hasEvaluationData) continue;
    const studentId = pathParts[1];
    const courseId = pathParts[3];
    const sectionIndex = pathParts.indexOf("sections");
    const section = String(data.section || (sectionIndex >= 0 ? pathParts[sectionIndex + 1] : "General")).trim() || "General";
      (taskEntries.length ? taskEntries : [{ taskId: "", submitted: false }]).forEach((task) => rows.push({
      id: `${studentId}:${courseId}:${section}:${lessonDoc.id}:${task.taskId || "task"}`,
      studentId,
      courseId,
      courseTitle: data.courseTitle || courseId,
      section,
      lessonId: data.lessonId || lessonDoc.id,
      lessonTitle: data.lessonTitle || lessonDoc.id,
      taskId: task.taskId || "",
      taskStudentPdfUpload: task.taskStudentPdfUpload || "",
      taskCompleted: Boolean(task.submitted),
      videoCompleted: Boolean(data.videoCompleted),
      grade: normalizeTaskGrade(task.grade ?? data.grade),
      feedback: task.feedback || data.feedback || "",
      updatedAt: task.updatedAt || data.updatedAt || null,
      }));
      }
      taskSubmissionsCache = rows;
      taskSubmissionsCacheAt = Date.now();
      return rows;
    }).finally(() => { taskSubmissionsCachePromise = null; });
  }
  return taskSubmissionsCachePromise;
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
