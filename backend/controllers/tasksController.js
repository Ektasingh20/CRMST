import { isMongoConnected } from "../config/db.js";
import { notifyStudent } from "../config/firestoreNotificationModel.js";
import Task from "../models/Task.js";
import { updateItem } from "./genericController.js";

function hasGrade(payload) {
  return payload.grade !== undefined || payload.score !== undefined || payload.marks !== undefined || payload.evaluationStatus !== undefined;
}

export async function updateTask(req, res) {
  if (!isMongoConnected) return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  const existing = await Task.findOne({ id: String(req.params.id) });
  const response = await new Promise((resolve) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => { resolve(body); return originalJson(body); };
    updateItem(req, res, Task).catch((err) => resolve({ error: err.message }));
  });

  if (response?.error || !hasGrade(req.body) || !req.body.studentId) return;
  const previousGrade = existing?.grade ?? existing?.score ?? existing?.marks;
  const currentGrade = req.body.grade ?? req.body.score ?? req.body.marks;
  if (String(previousGrade ?? "") === String(currentGrade ?? "") && !req.body.evaluationStatus) return;

  try {
    await notifyStudent(req.body.studentId, {
      type: "assignment_evaluated",
      message: `Your assignment "${req.body.assignmentTitle || req.body.title || existing?.title || "Assignment"}" was evaluated.`,
      courseId: req.body.courseId || null,
    });
  } catch (err) {
    console.error("Failed assignment evaluation notification", err);
  }
}