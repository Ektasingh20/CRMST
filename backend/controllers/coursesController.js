import crypto from "crypto";
import { isMongoConnected } from "../config/db.js";
import { addCourseLesson, createCourse, deleteCourse, deleteCourseLesson, getCourse, getStudentCourseProgress, gradeCourseTask, listCourses, listStudentTaskSubmissions, saveStudentLessonProgress, saveStudentTaskSubmission, updateCourse, updateCourseLesson } from "../config/firestoreCourseModel.js";
import { notifyEnrolledStudents, notifyStudent } from "../config/firestoreNotificationModel.js";
import { isAdmin } from "../utils/roles.js";

function unavailable(res) {
  return res.status(503).json({ error: "Database is unavailable. Please try again later." });
}

function normalizeStudentIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((studentId) => String(studentId).trim()).filter(Boolean))];
}

function progressKey(item) {
  return `${item.courseId}:${String(item.section || "General").trim().toLowerCase()}:${item.lessonId}`;
}

function requireAdmin(req, res) {
  if (!isAdmin(req.user)) {
    res.status(403).json({ error: "Only an Admin can manage courses." });
    return false;
  }
  return true;
}

export async function getCourses(req, res) {
  if (!isMongoConnected) return unavailable(res);
  try {
    const courses = await listCourses();
    if (String(req.user?.role || "").toLowerCase() !== "student") return res.json(courses);
    const progress = await getStudentCourseProgress(req.user.id || req.user._id);
    const byLesson = new Map(progress.map((item) => [progressKey(item), item]));
    return res.json(courses.map((course) => ({
      ...course,
      lessons: course.lessons.map((lesson) => ({
        ...lesson,
        studentProgress: byLesson.get(`${course.id}:${String(lesson.section || "General").trim().toLowerCase()}:${lesson.id}`) || null,
      })),
    })));
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

export async function getStudentTaskSubmissions(req, res) {
  if (!isMongoConnected) return unavailable(res);
  if (!requireAdmin(req, res)) return;
  try { return res.json(await listStudentTaskSubmissions()); } catch (err) { return res.status(500).json({ error: err.message }); }
}

export async function postCourse(req, res) {
  if (!isMongoConnected) return unavailable(res);
  if (!requireAdmin(req, res)) return;
  try {
    const { title, duration, fees, mode, tools, syllabus, thumbnail, studentIds = [], lessons = [] } = req.body;
    if (!title || !duration || !fees || !mode || !tools || !syllabus) {
      return res.status(400).json({ error: "Title, duration, fees, mode, tools, and syllabus are required." });
    }
    if (!Array.isArray(lessons) || lessons.length === 0) {
      return res.status(400).json({ error: "Add at least one lesson." });
    }
    const course = await createCourse({ title: String(title).trim(), duration: String(duration).trim(), fees: String(fees).trim(), mode: String(mode).trim(), tools: String(tools).trim(), syllabus: String(syllabus).trim(), thumbnail: thumbnail || "", studentIds: normalizeStudentIds(studentIds), lessons });
    if (course.studentIds?.length && lessons.length) {
      await notifyEnrolledStudents(course.studentIds, {
        type: "course_assigned",
        message: `You have been assigned to the new course ${course.title}.`,
        courseId: course.id,
      });
    }
    return res.status(201).json(course);
  } catch (err) { return res.status(400).json({ error: err.message }); }
}

export async function getCourseById(req, res) {
  if (!isMongoConnected) return unavailable(res);
  try {
    const course = await getCourse(req.params.id);
    return course ? res.json(course) : res.status(404).json({ error: "Course not found." });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

export async function putCourse(req, res) {
  if (!isMongoConnected) return unavailable(res);
  if (!requireAdmin(req, res)) return;
  try {
    const { title, duration, fees, mode, tools, syllabus, thumbnail, status, studentIds = [] } = req.body;
    if (!title || !duration || !fees || !mode || !tools || !syllabus) return res.status(400).json({ error: "Title, duration, fees, mode, tools, and syllabus are required." });
    const previousCourse = await getCourse(req.params.id);
    if (!previousCourse) return res.status(404).json({ error: "Course not found." });
    const nextStudentIds = normalizeStudentIds(studentIds);
    const previousStudentIds = new Set(normalizeStudentIds(previousCourse.studentIds));
    const newlyAssignedStudentIds = nextStudentIds.filter((studentId) => !previousStudentIds.has(studentId));
    const course = await updateCourse(req.params.id, { title, duration, fees, mode, tools, syllabus, thumbnail: thumbnail || "", status: status || "active", studentIds: nextStudentIds });
    if (newlyAssignedStudentIds.length) {
      await notifyEnrolledStudents(newlyAssignedStudentIds, {
        type: "course_assigned",
        message: `You have been assigned to the course ${course.title}.`,
        courseId: course.id,
      });
    }
    return res.json(course);
  } catch (err) { return res.status(400).json({ error: err.message }); }
}

export async function postCourseLesson(req, res) {
  if (!isMongoConnected) return unavailable(res);
  if (!requireAdmin(req, res)) return;
  try {
    const { section, title, videoUrl, notesUrl = "", durationSec, tasks = [] } = req.body;
    if (!section || !title || !videoUrl || !notesUrl || Number(durationSec) <= 0 || !Array.isArray(tasks) || tasks.length === 0) return res.status(400).json({ error: "Section, lesson title, video, notes PDF, duration, and task PDF are required." });
    const course = await addCourseLesson(req.params.id, { section: String(section).trim(), title, videoUrl, notesUrl: String(notesUrl || "").trim(), durationSec: Number(durationSec), tasks });
    let notificationsSent = 0;
    if (course?.studentIds?.length) {
      notificationsSent = await notifyEnrolledStudents(course.studentIds, {
        type: "lesson_added",
        message: `New lesson added to ${course.title}.`,
        courseId: course.id,
      });
    }
    return course ? res.json({ ...course, notificationsSent }) : res.status(404).json({ error: "Course not found." });
  } catch (err) { return res.status(400).json({ error: err.message }); }
}

export async function removeCourseLesson(req, res) {
  if (!isMongoConnected) return unavailable(res);
  if (!requireAdmin(req, res)) return;
  try {
    const course = await deleteCourseLesson(req.params.id, req.params.lessonId);
    return course ? res.json(course) : res.status(404).json({ error: "Lesson not found." });
  } catch (err) { return res.status(400).json({ error: err.message }); }
}

export async function putCourseLesson(req, res) {
  if (!isMongoConnected) return unavailable(res);
  if (!requireAdmin(req, res)) return;
  try {
    const { section, title, videoUrl, notesUrl = "", durationSec, tasks = [] } = req.body;
    if (!section || !title || !videoUrl || !notesUrl || Number(durationSec) <= 0 || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: "Section, lesson title, video, notes PDF, duration, and task PDF are required." });
    }
    const course = await updateCourseLesson(req.params.id, req.params.lessonId, {
      section: String(section).trim(),
      title: String(title).trim(),
      videoUrl: String(videoUrl).trim(),
      notesUrl: String(notesUrl).trim(),
      durationSec: Number(durationSec),
      tasks,
    });
    return course ? res.json(course) : res.status(404).json({ error: "Lesson not found." });
  } catch (err) { return res.status(400).json({ error: err.message }); }
}

export async function gradeCourseAssignment(req, res) {
  if (!isMongoConnected) return unavailable(res);
  if (!requireAdmin(req, res)) return;
  const { studentId, grade, feedback = "" } = req.body;
  if (!studentId || String(grade ?? "").trim() === "") return res.status(400).json({ error: "Student and grade are required." });
  if (Number(grade) < 0 || Number(grade) > 100 || Number.isNaN(Number(grade))) return res.status(400).json({ error: "Grade must be between 0 and 100." });
  try {
    const task = await gradeCourseTask(req.params.courseId, req.params.lessonId, req.params.taskId, studentId, grade, feedback);
    if (!task) return res.status(404).json({ error: "Assignment not found." });
    await notifyStudent(studentId, {
      type: "assignment_evaluated",
      message: `Your assignment "${req.body.assignmentTitle || task.title || "Assignment"}" was evaluated. Grade: ${grade}/100.${feedback ? ` Feedback: ${feedback}` : ""}`,
      courseId: req.params.courseId,
      assignmentId: `${req.params.lessonId}:${req.params.taskId}`,
    });
    return res.json(task);
  } catch (err) { return res.status(400).json({ error: err.message }); }
}

export async function submitCourseTask(req, res) {
  if (!isMongoConnected) return unavailable(res);
  const studentId = String(req.body.studentId || "");
  if (String(req.user?.id || req.user?._id) !== studentId) return res.status(403).json({ error: "You can only submit your own work." });
  const field = req.body.kind === "notes" ? "notesUrl" : "taskUrl";
  if (!req.body.url) return res.status(400).json({ error: "Submission URL is required." });
  try {
    const task = await saveStudentTaskSubmission(req.params.courseId, req.params.lessonId, req.params.taskId, studentId, field, req.body.url, req.body.section || "");
    return task ? res.json(task) : res.status(404).json({ error: "Assignment not found." });
  } catch (err) { return res.status(400).json({ error: err.message }); }
}

export async function saveCourseLessonProgress(req, res) {
  if (!isMongoConnected) return unavailable(res);
  const studentId = String(req.body.studentId || "");
  if (String(req.user?.id || req.user?._id) !== studentId) return res.status(403).json({ error: "You can only update your own progress." });
  try {
    const progress = await saveStudentLessonProgress(req.params.courseId, req.params.lessonId, studentId, req.body.videoCompleted === true, req.body.section || "");
    return progress ? res.json(progress) : res.status(404).json({ error: "Lesson not found." });
  } catch (err) { return res.status(400).json({ error: err.message }); }
}

export async function removeCourse(req, res) {
  if (!isMongoConnected) return unavailable(res);
  if (!requireAdmin(req, res)) return;
  try { await deleteCourse(req.params.id); return res.json({ success: true, id: req.params.id }); } catch (err) { return res.status(400).json({ error: err.message }); }
}

export function imageKitAuth(req, res) {
  if (!req.user) return res.status(401).json({ error: "Authentication required." });
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!privateKey || !publicKey || !urlEndpoint) {
    return res.status(503).json({ error: "ImageKit is not configured. Add IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY, and IMAGEKIT_URL_ENDPOINT." });
  }
  const expire = Math.floor(Date.now() / 1000) + 600;
  const token = crypto.randomBytes(16).toString("hex");
  const signature = crypto.createHmac("sha1", privateKey).update(token + expire).digest("hex");
  return res.json({ token, expire, signature, publicKey, urlEndpoint });
}
