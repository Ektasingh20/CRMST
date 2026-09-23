import { FieldValue, getFirestore } from "firebase-admin/firestore";

const NOTIFICATION_CACHE_TTL_MS = 2 * 60 * 1000;
const notificationCache = new Map();
const notificationRequests = new Map();

function notificationsRef(studentId) {
  return getFirestore().collection("students").doc(String(studentId)).collection("notifications");
}

function serializeNotification(snapshot) {
  const data = snapshot.data();
  const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null;
  return { id: snapshot.id, ...data, createdAt };
}

export async function listNotifications(studentId) {
  const key = String(studentId);
  const cached = notificationCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < NOTIFICATION_CACHE_TTL_MS) {
    return cached.items.map((item) => ({ ...item }));
  }
  if (notificationRequests.has(key)) return notificationRequests.get(key);
  const request = loadNotifications(key).then((items) => {
    notificationCache.set(key, { items, fetchedAt: Date.now() });
    return items.map((item) => ({ ...item }));
  }).finally(() => notificationRequests.delete(key));
  notificationRequests.set(key, request);
  return request;
}

async function loadNotifications(studentId) {
  try {
    const snapshot = await notificationsRef(studentId).orderBy("createdAt", "desc").limit(100).get();
    return deduplicateNotifications(snapshot.docs.map(serializeNotification));
  } catch (error) {
    try {
      const snapshot = await notificationsRef(studentId).limit(100).get();
      return deduplicateNotifications(snapshot.docs.map(serializeNotification).sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()));
    } catch (fallbackError) {
      console.warn("Could not load student notifications", fallbackError.message || error.message);
      return [];
    }
  }
}

function deduplicateNotifications(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.type === "assignment_evaluated"
      ? `${item.type}:${item.courseId || ""}:${item.assignmentId || ""}:${item.message || ""}`
      : item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function markNotificationRead(studentId, notificationId) {
  const ref = notificationsRef(studentId).doc(String(notificationId));
  await ref.update({ read: true });
  const key = String(studentId);
  const cached = notificationCache.get(key);
  const existing = cached?.items.find((item) => item.id === String(notificationId));
  if (cached) cached.items = cached.items.map((item) => item.id === String(notificationId) ? { ...item, read: true } : item);
  return { ...(existing || {}), id: String(notificationId), read: true };
}

export async function markAllNotificationsRead(studentId) {
  const snapshot = await notificationsRef(studentId).where("read", "==", false).get();
  if (snapshot.empty) return 0;
  const batch = getFirestore().batch();
  snapshot.docs.forEach((notification) => batch.update(notification.ref, { read: true }));
  await batch.commit();
  const cached = notificationCache.get(String(studentId));
  if (cached) cached.items = cached.items.map((item) => ({ ...item, read: true }));
  return snapshot.size;
}

export async function notifyStudent(studentId, { type, message, courseId = null, assignmentId = "" }) {
  const stableId = type === "assignment_evaluated" && courseId && assignmentId
    ? `assignment-${String(courseId)}-${String(assignmentId)}`.replace(/[^a-zA-Z0-9_-]/g, "-")
    : null;
  const ref = stableId ? notificationsRef(studentId).doc(stableId) : notificationsRef(studentId).doc();
  await ref.set({ type, message, courseId, assignmentId, read: false, createdAt: FieldValue.serverTimestamp() }, { merge: true });
  notificationCache.delete(String(studentId));
  return ref.id;
}

export async function notifyEnrolledStudents(studentIds, payload) {
  const ids = [...new Set((Array.isArray(studentIds) ? studentIds : []).map(String).filter(Boolean))];
  const results = await Promise.allSettled(ids.map((studentId) => notifyStudent(studentId, payload)));
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length) {
    console.error("Failed writing course notifications", failed.map((result) => result.reason?.message || result.reason));
  }
  return results.length - failed.length;
}
