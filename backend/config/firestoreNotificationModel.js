import { FieldValue, getFirestore } from "firebase-admin/firestore";

function notificationsRef(studentId) {
  return getFirestore().collection("students").doc(String(studentId)).collection("notifications");
}

function serializeNotification(snapshot) {
  const data = snapshot.data();
  const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null;
  return { id: snapshot.id, ...data, createdAt };
}

export async function listNotifications(studentId) {
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
  await ref.set({ read: true }, { merge: true });
  const snapshot = await ref.get();
  return snapshot.exists ? serializeNotification(snapshot) : null;
}

export async function markAllNotificationsRead(studentId) {
  const snapshot = await notificationsRef(studentId).where("read", "==", false).get();
  if (snapshot.empty) return 0;
  const batch = getFirestore().batch();
  snapshot.docs.forEach((notification) => batch.update(notification.ref, { read: true }));
  await batch.commit();
  return snapshot.size;
}

export async function notifyStudent(studentId, { type, message, courseId = null, assignmentId = "" }) {
  const stableId = type === "assignment_evaluated" && courseId && assignmentId
    ? `assignment-${String(courseId)}-${String(assignmentId)}`.replace(/[^a-zA-Z0-9_-]/g, "-")
    : null;
  const ref = stableId ? notificationsRef(studentId).doc(stableId) : notificationsRef(studentId).doc();
  await ref.set({ type, message, courseId, assignmentId, read: false, createdAt: FieldValue.serverTimestamp() }, { merge: true });
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