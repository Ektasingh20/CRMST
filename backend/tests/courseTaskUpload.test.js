import test, { mock } from "node:test";
import assert from "node:assert/strict";

const noop = async () => null;
let course = {
  id: "course-1",
  studentIds: ["student-1"],
  lessons: [{ id: "lesson-1", section: "CSS", tasks: [{ id: "task-1" }] }],
};
let savedArgs = null;

mock.module("../config/db.js", { namedExports: { isMongoConnected: true } });
mock.module("../config/firestoreCourseModel.js", { namedExports: {
  addCourseLesson: noop, createCourse: noop, deleteCourse: noop, deleteCourseLesson: noop,
  ensureStudentEnrollment: noop, getCourse: async () => course, getStudentCourseProgress: noop,
  gradeCourseTask: noop, listCourses: noop, listStudentCourseCatalog: noop,
  listStudentCourseSummaries: noop, listStudentTaskSubmissions: noop,
  saveStudentLessonProgress: noop,
  saveStudentTaskSubmission: async (...args) => {
    savedArgs = args;
    return { taskSubmissions: { "task-1": { submitted: true, taskStudentPdfUpload: args[5] } } };
  },
  updateCourse: noop, updateCourseLesson: noop,
} });
mock.module("../config/firestoreNotificationModel.js", { namedExports: { notifyEnrolledStudents: noop, notifyStudent: noop } });
const { uploadCourseTaskPdf } = await import("../controllers/coursesController.js");

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function request(buffer = Buffer.from("%PDF-1.4\n%%EOF")) {
  return {
    user: { id: "student-1" },
    params: { courseId: "course-1", lessonId: "lesson-1", taskId: "task-1" },
    body: { section: "CSS" },
    file: { originalname: "assignment.pdf", buffer },
  };
}

test("student PDF upload saves the ImageKit URL against the correct task", async () => {
  const priorKey = process.env.IMAGEKIT_PRIVATE_KEY;
  process.env.IMAGEKIT_PRIVATE_KEY = "test-private-key";
  savedArgs = null;
  const fetchMock = mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://upload.imagekit.io/api/v1/files/upload");
    assert.equal(options.method, "POST");
    assert.equal(options.body.get("folder"), "/student-assignments");
    return { ok: true, json: async () => ({ url: "https://ik.imagekit.io/test/assignment.pdf" }) };
  });
  try {
    const res = response();
    await uploadCourseTaskPdf(request(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.taskSubmissions["task-1"].submitted, true);
    assert.deepEqual(savedArgs.slice(0, 5), ["course-1", "lesson-1", "task-1", "student-1", "taskUrl"]);
    assert.equal(savedArgs[5], "https://ik.imagekit.io/test/assignment.pdf");
  } finally {
    fetchMock.mock.restore();
    if (priorKey === undefined) delete process.env.IMAGEKIT_PRIVATE_KEY;
    else process.env.IMAGEKIT_PRIVATE_KEY = priorKey;
  }
});

test("invalid PDF is rejected before uploading", async () => {
  const res = response();
  await uploadCourseTaskPdf(request(Buffer.from("not a pdf")), res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /valid PDF/i);
});

test("a student cannot upload to a course without enrollment", async () => {
  const priorKey = process.env.IMAGEKIT_PRIVATE_KEY;
  process.env.IMAGEKIT_PRIVATE_KEY = "test-private-key";
  course = { ...course, studentIds: ["another-student"] };
  const fetchMock = mock.method(globalThis, "fetch", async () => { throw new Error("Upload should not be called"); });
  try {
    const res = response();
    await uploadCourseTaskPdf(request(), res);
    assert.equal(res.statusCode, 403);
  } finally {
    fetchMock.mock.restore();
    course = { ...course, studentIds: ["student-1"] };
    if (priorKey === undefined) delete process.env.IMAGEKIT_PRIVATE_KEY;
    else process.env.IMAGEKIT_PRIVATE_KEY = priorKey;
  }
});
