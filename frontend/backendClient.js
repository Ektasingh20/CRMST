import {
  login as apiLogin,
  signup as apiSignup,
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  fetchLeads,
  createLead,
  updateLead,
  deleteLead,
  fetchServices,
  createService,
  updateService,
  deleteService,
  fetchTrainings,
  createTraining,
  updateTraining,
  deleteTraining,
  fetchCourses,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createCourse as createCourseApi,
  deleteCourse as deleteCourseApi,
  updateCourse as updateCourseApi,
  addCourseLesson as addCourseLessonApi,
  deleteCourseLesson as deleteCourseLessonApi,
  updateCourseLesson as updateCourseLessonApi,
  gradeCourseAssignment as gradeCourseAssignmentApi,
  fetchStudentTaskSubmissions,
  submitCourseTask as submitCourseTaskApi,
  saveCourseLessonProgress as saveCourseLessonProgressApi,
  fetchCourseUploadAuth,
  fetchStipPrograms,
  createStipProgram,
  updateStipProgram,
  deleteStipProgram,
  fetchStipApplications,
  createStipApplication,
  updateStipApplication,
  deleteStipApplication,
  fetchTasks,
  createTask,
  updateTask,
  gradeTask as gradeTaskApi,
  deleteTask,
  fetchLeaves,
  createLeave,
  updateLeave,
  deleteLeave,
  fetchAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getSavedUser,
  saveUserSession,
  clearUserSession,
  isAuthenticated,
  logout as apiLogout,
} from "./backendApi";

function isMongoObjectId(value) {
  return (
    typeof value === "string" &&
    /^[a-fA-F0-9]{24}$/.test(value)
  );
}

function getEntityId(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  if (isMongoObjectId(item._id)) {
    return item._id;
  }

  if (isMongoObjectId(item.id)) {
    return item.id;
  }

  return null;
}

function prepareCreatePayload(item) {
  if (!item || typeof item !== "object") {
    return {};
  }

  const {
    _id,
    __v,
    ...payload
  } = item;

  return payload;
}

function normalizeEntity(item) {
  if (!item || typeof item !== "object") {
    return item;
  }

  const mongoId = isMongoObjectId(item._id)
    ? item._id
    : isMongoObjectId(item.id)
      ? item.id
      : null;

  if (!mongoId) {
    return item;
  }

  return {
    ...item,
    _id: mongoId,
    id: item.id || mongoId,
  };
}

const COURSES_CACHE_KEY = "crmst-courses-cache";
const COURSES_CACHE_TTL_MS = 5 * 60 * 1000;

function readCoursesCache() {
  try {
    const raw = window.localStorage.getItem(COURSES_CACHE_KEY);
    if (!raw) return { items: [], fetchedAt: 0 };
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed?.items) ? parsed.items : [],
      fetchedAt: Number(parsed?.fetchedAt || 0),
    };
  } catch {
    return { items: [], fetchedAt: 0 };
  }
}

function writeCoursesCache(items) {
  try {
    window.localStorage.setItem(COURSES_CACHE_KEY, JSON.stringify({ items, fetchedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function invalidateCoursesCache() {
  try {
    window.localStorage.removeItem(COURSES_CACHE_KEY);
  } catch {}
}

function normalizeCollection(result) {
  if (!Array.isArray(result)) {
    return [];
  }

  return result.map(normalizeEntity);
}

async function saveCollectionItem({
  item,
  update,
  create,
  label,
}) {
  if (!item || typeof item !== "object") {
    return null;
  }

  try {
    const mongoId = getEntityId(item);

    if (mongoId) {
      const saved = await update(mongoId, item);
      return normalizeEntity(saved);
    }

    const payload = prepareCreatePayload(item);
    const created = await create(payload);

    return normalizeEntity(created);
  } catch (err) {
    console.warn(`Failed saving ${label}`, err);
    return null;
  }
}

async function saveCollection({
  items,
  update,
  create,
  label,
}) {
  if (!Array.isArray(items)) {
    return [];
  }

  if (!isAuthenticated()) {
    return [];
  }

  const savedItems = [];
  const savedSnapshots = saveCollection.snapshots || (saveCollection.snapshots = new Map());
  const labelSnapshots = savedSnapshots.get(label) || new Map();

  for (const item of items) {
    const entityId = getEntityId(item);
    const signature = JSON.stringify(prepareCreatePayload(item));
    if (entityId && labelSnapshots.get(entityId) === signature) {
      savedItems.push(normalizeEntity(item));
      continue;
    }
    const saved = await saveCollectionItem({
      item,
      update,
      create,
      label,
    });

    if (saved) {
      savedItems.push(saved);
      labelSnapshots.set(getEntityId(saved) || entityId || signature, JSON.stringify(prepareCreatePayload(saved)));
    }
  }

  savedSnapshots.set(label, labelSnapshots);
  return savedItems;
}

export async function authLogin(username, password) {
  const result = await apiLogin(username, password);

  if (!result?.user) {
    throw new Error("Login failed: user data was not returned.");
  }

  const user = normalizeEntity(result.user);
  saveUserSession(user);

  return user;
}

export async function authSignup(name, username, password) {
  const result = await apiSignup(name, username, password);

  if (!result?.user) {
    throw new Error("Signup failed: user data was not returned.");
  }

  const user = normalizeEntity(result.user);
  saveUserSession(user);

  return user;
}

export async function loadUsers() {
  try {
    const result = await fetchUsers();
    return normalizeCollection(result);
  } catch (err) {
    console.warn("Failed loading users", err);
    return [];
  }
}

export async function saveUsersToBackend(users) {
  return saveCollection({
    items: users,
    update: updateUser,
    create: createUser,
    label: "user",
  });
}

export async function loadLeads() {
  try {
    const result = await fetchLeads();
    return normalizeCollection(result);
  } catch (err) {
    console.warn("Failed loading leads", err);
    return null;
  }
}

export async function saveLeadsToBackend(leads) {
  return saveCollection({
    items: leads,
    update: updateLead,
    create: createLead,
    label: "lead",
  });
}

export async function loadServices() {
  try {
    const result = await fetchServices();
    return normalizeCollection(result);
  } catch (err) {
    console.warn("Failed loading services", err);
    return [];
  }
}

export async function saveServicesToBackend(services) {
  return saveCollection({
    items: services,
    update: updateService,
    create: createService,
    label: "service",
  });
}

export async function loadTrainings() {
  try {
    const result = await fetchTrainings();
    return normalizeCollection(result);
  } catch (err) {
    console.warn("Failed loading trainings", err);
    return [];
  }
}

export async function loadCourses(force = false) {
  try {
    const cached = readCoursesCache();
    if (!force && Array.isArray(cached.items) && cached.items.length && Date.now() - cached.fetchedAt < COURSES_CACHE_TTL_MS) {
      return normalizeCollection(cached.items);
    }

    const result = normalizeCollection(await fetchCourses());
    writeCoursesCache(result);
    return result;
  } catch (err) {
    console.warn("Failed loading courses", err);
    return [];
  }
}

export async function loadNotifications(studentId) {
  return fetchNotifications(studentId);
}

export async function readNotification(studentId, notificationId) {
  return markNotificationRead(studentId, notificationId);
}

export async function readAllNotifications(studentId) {
  return markAllNotificationsRead(studentId);
}

export async function gradeTask(id, grade) {
  return gradeTaskApi(id, grade);
}

const TASK_SUBMISSIONS_CACHE_KEY = "crmst-task-submissions-v1";
const TASK_SUBMISSIONS_CACHE_TTL_MS = 5 * 60 * 1000;

export async function loadTaskSubmissions(force = false) {
  if (!force) {
    try {
      const cached = JSON.parse(window.localStorage.getItem(TASK_SUBMISSIONS_CACHE_KEY) || "null");
      if (Array.isArray(cached?.items) && cached.items.length > 0 && Date.now() - Number(cached.fetchedAt || 0) < TASK_SUBMISSIONS_CACHE_TTL_MS) return cached.items;
      if (Array.isArray(cached?.items) && cached.items.length === 0) window.localStorage.removeItem(TASK_SUBMISSIONS_CACHE_KEY);
    } catch {}
  }
  const items = await fetchStudentTaskSubmissions();
  if (Array.isArray(items) && items.length > 0) {
    try { window.localStorage.setItem(TASK_SUBMISSIONS_CACHE_KEY, JSON.stringify({ items, fetchedAt: Date.now() })); } catch {}
  }
  return items;
}

export async function gradeStudentTask(courseId, lessonId, taskId, payload) {
  const result = await gradeCourseAssignmentApi(courseId, lessonId, taskId, payload);
  try { window.localStorage.removeItem(TASK_SUBMISSIONS_CACHE_KEY); } catch {}
  return result;
}

export async function createCourse(course) {
  const created = normalizeEntity(await createCourseApi(course));
  invalidateCoursesCache();
  return created;
}

export async function deleteCourse(id) {
  const result = await deleteCourseApi(id);
  invalidateCoursesCache();
  return result;
}

export async function updateCourse(id, course) {
  const updated = normalizeEntity(await updateCourseApi(id, course));
  invalidateCoursesCache();
  return updated;
}

export async function addCourseLesson(id, lesson) {
  const updated = normalizeEntity(await addCourseLessonApi(id, lesson));
  invalidateCoursesCache();
  return updated;
}

export async function deleteCourseLesson(courseId, lessonId) {
  const updated = normalizeEntity(await deleteCourseLessonApi(courseId, lessonId));
  invalidateCoursesCache();
  return updated;
}

export async function updateCourseLesson(courseId, lessonId, lesson) {
  const updated = normalizeEntity(await updateCourseLessonApi(courseId, lessonId, lesson));
  invalidateCoursesCache();
  return updated;
}

export async function gradeCourseAssignment(courseId, lessonId, taskId, grade) {
  return gradeCourseAssignmentApi(courseId, lessonId, taskId, grade);
}

export async function uploadStudentCourseResource(file, courseId, lessonId, taskId, kind, studentId, section) {
  const auth = await fetchCourseUploadAuth();
  const form = new FormData();
  form.append("file", file);
  form.append("fileName", file.name);
  form.append("publicKey", auth.publicKey);
  form.append("signature", auth.signature);
  form.append("expire", String(auth.expire));
  form.append("token", auth.token);
  form.append("useUniqueFileName", "true");
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body: form });
  if (!response.ok) throw new Error("Student PDF upload failed.");
  const uploaded = await response.json();
  return submitCourseTaskApi(courseId, lessonId, taskId, { studentId, kind, section, url: uploaded.url });
}

export async function saveStudentLessonProgress(courseId, lessonId, progress, studentId, section) {
  const patch = typeof progress === "boolean" ? { videoCompleted: progress } : progress || {};
  return saveCourseLessonProgressApi(courseId, lessonId, { studentId, ...patch, section });
}

export async function uploadCourseAsset(file) {
  const auth = await fetchCourseUploadAuth();
  const form = new FormData();
  form.append("file", file);
  form.append("fileName", file.name);
  form.append("publicKey", auth.publicKey);
  form.append("signature", auth.signature);
  form.append("expire", String(auth.expire));
  form.append("token", auth.token);
  form.append("useUniqueFileName", "true");
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body: form });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || "ImageKit upload failed");
  return response.json();
}

export async function uploadImage(file) {
  if (!(file instanceof File)) {
    throw new Error("Please choose an image file");
  }

  const auth = await fetchCourseUploadAuth();
  const form = new FormData();
  form.append("file", file);
  form.append("fileName", file.name);
  form.append("publicKey", auth.publicKey);
  form.append("signature", auth.signature);
  form.append("expire", String(auth.expire));
  form.append("token", auth.token);
  form.append("useUniqueFileName", "true");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || "Image upload failed");
  }

  const uploaded = await response.json();
  return {
    imageUrl: uploaded.url || uploaded.filePath || "",
    publicId: uploaded.fileId || uploaded.publicId || uploaded.id || "",
  };
}

export async function deleteImage(publicId) {
  if (!publicId) {
    return null;
  }

  return null;
}

export async function saveTrainingsToBackend(trainings) {
  return saveCollection({
    items: trainings,
    update: updateTraining,
    create: createTraining,
    label: "training",
  });
}

export async function loadStipPrograms() {
  try {
    const result = await fetchStipPrograms();
    return normalizeCollection(result);
  } catch (err) {
    console.warn("Failed loading stip programs", err);
    return [];
  }
}

export async function saveStipProgramsToBackend(programs) {
  return saveCollection({
    items: programs,
    update: updateStipProgram,
    create: createStipProgram,
    label: "stip program",
  });
}

export async function loadStipApplications() {
  try {
    const result = await fetchStipApplications();
    return normalizeCollection(result);
  } catch (err) {
    console.warn("Failed loading stip applications", err);
    return [];
  }
}

export async function saveStipApplicationsToBackend(applications) {
  return saveCollection({
    items: applications,
    update: updateStipApplication,
    create: createStipApplication,
    label: "stip application",
  });
}

export async function loadTasks() {
  try {
    const result = await fetchTasks();
    return normalizeCollection(result);
  } catch (err) {
    console.warn("Failed loading tasks", err);
    return [];
  }
}

export async function saveTasksToBackend(tasks) {
  return saveCollection({
    items: tasks,
    update: updateTask,
    create: createTask,
    label: "task",
  });
}

export async function loadLeaves() {
  try {
    const result = await fetchLeaves();
    return normalizeCollection(result);
  } catch (err) {
    console.warn("Failed loading leaves", err);
    return [];
  }
}

export async function saveLeavesToBackend(leaves) {
  return saveCollection({
    items: leaves,
    update: updateLeave,
    create: createLeave,
    label: "leave",
  });
}

export async function loadAttendance() {
  try {
    const result = await fetchAttendance();
    return normalizeCollection(result);
  } catch (err) {
    console.warn("Failed loading attendance", err);
    return [];
  }
}

export async function saveAttendanceToBackend(records) {
  return saveCollection({
    items: records,
    update: updateAttendance,
    create: createAttendance,
    label: "attendance record",
  });
}

export async function loadEmployees() {
  try {
    const result = await fetchEmployees();
    return normalizeCollection(result);
  } catch (err) {
    console.warn("Failed loading employees", err);
    return [];
  }
}

export async function saveEmployeesToBackend(employees) {
  return saveCollection({
    items: employees,
    update: updateEmployee,
    create: createEmployee,
    label: "employee",
  });
}

export function getCurrentUser() {
  if (!isAuthenticated()) {
    return null;
  }

  const user = getSavedUser();

  return user ? normalizeEntity(user) : null;
}

export function logoutUser() {
  try {
    apiLogout();
  } finally {
    clearUserSession();
  }
}

export {
  createUser,
  updateUser,
  deleteUser,
  changePassword,

  createLead,
  updateLead,
  deleteLead,

  createService,
  updateService,
  deleteService,

  createTraining,
  updateTraining,
  deleteTraining,

  createStipProgram,
  updateStipProgram,
  deleteStipProgram,

  createStipApplication,
  updateStipApplication,
  deleteStipApplication,

  createTask,
  updateTask,
  deleteTask,

  createLeave,
  updateLeave,
  deleteLeave,

  createAttendance,
  updateAttendance,
  deleteAttendance,

  createEmployee,
  updateEmployee,
  deleteEmployee,
};
