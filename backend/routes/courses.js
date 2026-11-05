import express from "express";
import multer from "multer";
import { shareCertificate } from "../controllers/certificateController.js";
import { authenticate } from "../middleware/auth.js";
import { getCourseById, getCourses, getStudentTaskSubmissions, gradeCourseAssignment, imageKitAuth, postCourse, postCourseLesson, putCourse, putCourseLesson, removeCourse, removeCourseLesson, saveCourseLessonProgress, submitCourseTask, uploadCourseTaskPdf } from "../controllers/coursesController.js";

const router = express.Router();
const taskPdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }).single("file");
const receiveTaskPdf = (req, res, next) => taskPdfUpload(req, res, (error) => {
  if (error) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "PDF files must be 10 MB or smaller." : "Could not read the PDF file." });
  next();
});
router.use(authenticate);
router.get("/", getCourses);
router.get("/task-submissions", getStudentTaskSubmissions);
router.get("/upload-auth", imageKitAuth);
router.post("/:courseId/certificate", shareCertificate);
router.get("/:id", getCourseById);
router.post("/", postCourse);
router.put("/:id", putCourse);
router.post("/:id/lessons", postCourseLesson);
router.put("/:id/lessons/:lessonId", putCourseLesson);
router.delete("/:id/lessons/:lessonId", removeCourseLesson);
router.post("/:courseId/lessons/:lessonId/tasks/:taskId/grade", gradeCourseAssignment);
router.post("/:courseId/lessons/:lessonId/tasks/:taskId/submission", submitCourseTask);
router.post("/:courseId/lessons/:lessonId/tasks/:taskId/upload", receiveTaskPdf, uploadCourseTaskPdf);
router.post("/:courseId/lessons/:lessonId/progress", saveCourseLessonProgress);
router.delete("/:id", removeCourse);
export default router;
