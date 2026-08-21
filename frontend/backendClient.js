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
  uploadImage,
  deleteImage,
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

  for (const item of items) {
    const saved = await saveCollectionItem({
      item,
      update,
      create,
      label,
    });

    if (saved) {
      savedItems.push(saved);
    }
  }

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
    return [];
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

  uploadImage,
  deleteImage,
};