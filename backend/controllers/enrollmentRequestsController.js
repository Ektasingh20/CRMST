import { getFirestore } from "firebase-admin/firestore";
import { isAdmin } from "../utils/roles.js";

const VALID_STATUSES = new Set(["pending", "contacted", "approved", "rejected", "completed"]);
const REQUEST_CACHE_TTL_MS = 15 * 1000;
const studentRequestCache = new Map();
let adminRequestCache = { value: null, expiresAt: 0 };

function invalidateRequestCaches(studentId) {
  if (studentId) studentRequestCache.delete(String(studentId));
  adminRequestCache = { value: null, expiresAt: 0 };
}

function normalizeStatus(value) {
  const normalized = String(value || "pending").trim().toLowerCase();
  if (normalized === "done") return "completed";
  return VALID_STATUSES.has(normalized) ? normalized : "pending";
}

function serializeRequest(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    studentId: String(data.studentId || ""),
    courseId: String(data.courseId || ""),
    courseName: String(data.courseName || data.title || ""),
    studentName: String(data.studentName || ""),
    studentPhone: String(data.studentPhone || ""),
    remark: String(data.remark || ""),
    status: normalizeStatus(data.status),
    requestedAt: data.requestedAt || new Date().toISOString(),
  };
}

export async function listStudentEnrollmentRequests(req, res) {
  const authUserId = String(req.user?.id || req.user?._id || "");
  const studentId = String(req.params.studentId || authUserId || "").trim();

  if (!studentId) {
    return res.status(400).json({ error: "Student id is required." });
  }

  if (String(req.user?.id || req.user?._id || "") !== studentId && !isAdmin(req.user)) {
    return res.status(403).json({ error: "You can only view your own enrollment requests." });
  }

  try {
    const cached = studentRequestCache.get(studentId);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.value);
    }

    const snapshot = await getFirestore()
      .collection("students")
      .doc(studentId)
      .collection("enrollmentRequests")
      .get();

    const requests = snapshot.docs
      .map(serializeRequest)
      .sort((left, right) => new Date(right.requestedAt || 0).getTime() - new Date(left.requestedAt || 0).getTime());

    studentRequestCache.set(studentId, { value: requests, expiresAt: Date.now() + REQUEST_CACHE_TTL_MS });
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Could not load enrollment requests." });
  }
}

export async function createEnrollmentRequest(req, res) {
  const authUserId = String(req.user?.id || req.user?._id || "");
  const studentId = String(req.body.studentId || authUserId || "").trim();
  const courseId = String(req.body.courseId || "").trim();
  const courseName = String(req.body.courseName || "").trim();

  if (!studentId || !courseId || !courseName) {
    return res.status(400).json({ error: "Student, course, and course name are required." });
  }

  if (String(req.user?.id || req.user?._id || "") !== studentId && !isAdmin(req.user)) {
    return res.status(403).json({ error: "You can only request enrollment for your own student account." });
  }

  try {
    const ref = getFirestore().collection("students").doc(studentId).collection("enrollmentRequests");
    const existingRequest = await ref
      .where("courseId", "==", courseId)
      .limit(1)
      .get();

    if (!existingRequest.empty) {
      const existing = serializeRequest(existingRequest.docs[0]);
      return res.status(409).json({ error: "An enrollment request already exists for this course.", request: existing });
    }

    const docRef = ref.doc();
    const requestedAt = new Date().toISOString();
    const payload = {
      studentId,
      courseId,
      courseName,
      studentName: String(req.user?.name || req.body.studentName || ""),
      studentPhone: String(req.user?.phone || req.body.studentPhone || ""),
      remark: String(req.body.remark || "").trim(),
      status: "pending",
      requestedAt,
      createdAt: requestedAt,
    };

    await docRef.set(payload);
    invalidateRequestCaches(studentId);
    return res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Could not create enrollment request." });
  }
}

export async function listPendingEnrollmentRequests(req, res) {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: "Only admins can view enrollment requests." });
  }

  try {
    const forceRefresh = String(req.query?.force || "") === "1";
    if (!forceRefresh && adminRequestCache.value && adminRequestCache.expiresAt > Date.now()) {
      return res.json(adminRequestCache.value);
    }

    let requests;
    try {
      const snapshot = await getFirestore().collectionGroup("enrollmentRequests").get();
      requests = snapshot.docs
        .map(serializeRequest)
        .sort((left, right) => new Date(right.requestedAt || 0).getTime() - new Date(left.requestedAt || 0).getTime());
    } catch (collectionGroupError) {
      const studentRefs = await getFirestore().collection("students").listDocuments();
      const requestSnapshots = await Promise.all(studentRefs.map((studentRef) => (
        studentRef.collection("enrollmentRequests").get()
      )));
      requests = requestSnapshots
        .flatMap((snapshot) => snapshot.docs.map(serializeRequest))
        .sort((left, right) => new Date(right.requestedAt || 0).getTime() - new Date(left.requestedAt || 0).getTime());
      console.warn("Collection-group request query unavailable; used fallback scan", collectionGroupError.message || collectionGroupError);
    }

    adminRequestCache = { value: requests, expiresAt: Date.now() + REQUEST_CACHE_TTL_MS };
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Could not load pending enrollment requests." });
  }
}

export async function updateEnrollmentRequestStatus(req, res) {
  const studentId = String(req.params.studentId || "").trim();
  const requestId = String(req.params.requestId || "").trim();
  const status = normalizeStatus(req.body?.status || req.params.status);

  if (!studentId || !requestId) {
    return res.status(400).json({ error: "Student id and request id are required." });
  }

  if (!VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: "Status must be pending, contacted, approved, rejected, or completed." });
  }

  if (String(req.user?.id || req.user?._id || "") !== studentId && !isAdmin(req.user)) {
    return res.status(403).json({ error: "You do not have permission to update this request." });
  }

  try {
    const ref = getFirestore().collection("students").doc(studentId).collection("enrollmentRequests").doc(requestId);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return res.status(404).json({ error: "Enrollment request not found." });
    }

    const remark = req.body?.remark === undefined ? String(snapshot.data()?.remark || "") : String(req.body.remark || "").trim();
    const payload = { ...snapshot.data(), status, remark, updatedAt: new Date().toISOString() };
    await ref.set(payload, { merge: true });
    invalidateRequestCaches(studentId);
    return res.json({ id: ref.id, ...payload });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Could not update the enrollment request." });
  }
}
