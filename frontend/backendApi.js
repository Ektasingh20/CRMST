const TOKEN_KEY = "crmst-api-token";
const SESSION_KEY = "crmst-current-user";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

function safeStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    console.warn(`Failed reading localStorage key ${key}`, err);
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`Failed writing localStorage key ${key}`, err);
    return false;
  }
}

function safeStorageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn(`Failed removing localStorage key ${key}`, err);
  }
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return window.atob(padded);
}

function parseTokenPayload(token) {
  try {
    const [, payload] = String(token || "").split(".");
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return null;
  }
}

function handleUnauthorized(message = "Your session expired. Please log in again.") {
  clearToken();
  clearUserSession();
  window.dispatchEvent(
    new CustomEvent("crmst:auth-required", {
      detail: { message },
    }),
  );
}

function getToken() {
  const token = safeStorageGet(TOKEN_KEY);
  if (!token) return null;
  const payload = parseTokenPayload(token);
  if (payload?.exp && payload.exp * 1000 <= Date.now() + 5000) {
    handleUnauthorized("Your session expired. Please log in again.");
    return null;
  }
  return token;
}

function setToken(token) {
  if (token) {
    safeStorageSet(TOKEN_KEY, token);
  }
}

function clearToken() {
  safeStorageRemove(TOKEN_KEY);
}

export function getSavedUser() {
  const raw = safeStorageGet(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserSession(user) {
  if (!user) return;
  safeStorageSet(SESSION_KEY, JSON.stringify(user));
}

export function clearUserSession() {
  safeStorageRemove(SESSION_KEY);
}

function buildHeaders(useAuth = true, contentType = "application/json") {
  const headers = {};
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  if (useAuth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const { auth = true, contentType = "application/json", headers: customHeaders = {}, ...rest } = options;
  if (auth && !getToken()) {
    handleUnauthorized("Please log in to continue.");
    const authError = new Error("Authentication required");
    authError.status = 401;
    throw authError;
  }
  const response = await fetch(url, {
    headers: {
      ...buildHeaders(auth, contentType),
      ...customHeaders,
    },
    ...rest,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = body?.error || response.statusText || "API request failed";
    const err = new Error(error);
    err.status = response.status;
    if (response.status === 401) {
      handleUnauthorized(error);
    }
    throw err;
  }
  return response.json().catch(() => null);
}

export async function login(username, password) {
  const result = await request("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ username, password }),
  });
  setToken(result.token);
  saveUserSession(result.user);
  return result;
}

export async function signup(name, username, password) {
  const result = await request("/auth/signup", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ name, username, password }),
  });
  setToken(result.token);
  saveUserSession(result.user);
  return result;
}

export async function fetchUsers() {
  return request("/users");
}

export async function createUser(user) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(user),
  });
}

export async function updateUser(id, user) {
  return request(`/users/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(user),
  });
}

export async function changePassword(id, currentPassword, newPassword) {
  return request(`/users/${encodeURIComponent(id)}/change-password`, {
    method: "POST",
    body: JSON.stringify({ userId: id, currentPassword, newPassword }),
  });
}

export async function deleteUser(id) {
  return request(`/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchLeads() {
  return request("/leads");
}

export async function createLead(lead) {
  return request("/leads", {
    method: "POST",
    body: JSON.stringify(lead),
  });
}

export async function updateLead(id, lead) {
  return request(`/leads/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(lead),
  });
}

export async function deleteLead(id) {
  return request(`/leads/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchServices() {
  return request("/services");
}

export async function createService(service) {
  return request("/services", {
    method: "POST",
    body: JSON.stringify(service),
  });
}

export async function updateService(id, service) {
  return request(`/services/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(service),
  });
}

export async function deleteService(id) {
  return request(`/services/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchTrainings() {
  return request("/trainings");
}

export async function createTraining(training) {
  return request("/trainings", {
    method: "POST",
    body: JSON.stringify(training),
  });
}

export async function updateTraining(id, training) {
  return request(`/trainings/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(training),
  });
}

export async function deleteTraining(id) {
  return request(`/trainings/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchStipPrograms() {
  return request("/stip/programs");
}

export async function createStipProgram(program) {
  return request("/stip/programs", {
    method: "POST",
    body: JSON.stringify(program),
  });
}

export async function updateStipProgram(id, program) {
  return request(`/stip/programs/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(program),
  });
}

export async function deleteStipProgram(id) {
  return request(`/stip/programs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchStipApplications() {
  return request("/stip/applications");
}

export async function createStipApplication(application) {
  return request("/stip/applications", {
    method: "POST",
    body: JSON.stringify(application),
  });
}

export async function updateStipApplication(id, application) {
  return request(`/stip/applications/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(application),
  });
}

export async function deleteStipApplication(id) {
  return request(`/stip/applications/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchTasks() {
  return request("/tasks");
}

export async function createTask(task) {
  return request("/tasks", {
    method: "POST",
    body: JSON.stringify(task),
  });
}

export async function updateTask(id, task) {
  return request(`/tasks/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(task),
  });
}

export async function deleteTask(id) {
  return request(`/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchLeaves() {
  return request("/leaves");
}

export async function createLeave(leave) {
  return request("/leaves", {
    method: "POST",
    body: JSON.stringify(leave),
  });
}

export async function updateLeave(id, leave) {
  return request(`/leaves/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(leave),
  });
}

export async function deleteLeave(id) {
  return request(`/leaves/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchAttendance() {
  return request("/attendance");
}

export async function createAttendance(record) {
  return request("/attendance", {
    method: "POST",
    body: JSON.stringify(record),
  });
}

export async function updateAttendance(id, record) {
  return request(`/attendance/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(record),
  });
}

export async function deleteAttendance(id) {
  return request(`/attendance/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchEmployees() {
  return request("/employees");
}

export async function createEmployee(employee) {
  return request("/employees", {
    method: "POST",
    body: JSON.stringify(employee),
  });
}

export async function updateEmployee(id, employee) {
  return request(`/employees/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(employee),
  });
}

export async function deleteEmployee(id) {
  return request(`/employees/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = body?.error || response.statusText || "Upload failed";
    const err = new Error(error);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export async function deleteImage(publicId) {
  const response = await fetch(`${API_BASE}/upload/${encodeURIComponent(publicId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = body?.error || response.statusText || "Delete failed";
    const err = new Error(error);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function logout() {
  clearToken();
  clearUserSession();
}
