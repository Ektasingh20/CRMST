import express from "express";
import { randomUUID } from "node:crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { authenticate } from "../middleware/auth.js";
import { isAdmin, isHrUser } from "../utils/roles.js";
import User from "../models/User.js";
import { isITDepartment } from "../../frontend/src/itUserRoles.js";
import { ReadCache } from "../itDashboard/src/cache.js";
import { notifyUser } from "../services/appNotifications.js";
import {
  helpdeskEmployeeRef,
  helpdeskThreadGroup,
  helpdeskThreadRef,
  helpdeskThreads,
} from "../services/hrHelpdeskPaths.js";

// Helpdesk clients use slow, visibility-aware polling. These mutation-aware
// caches coalesce warm-instance reads and keep unchanged inboxes/threads from
// repeatedly billing the same Firestore documents.
const messageCache = new ReadCache(5 * 60_000, 250);
const conversationCache = new ReadCache(60_000, 250);
const conversationAccessCache = new ReadCache(30_000, 500);
let staffIndexRetryAt = 0;

const router = express.Router();
const userId = (user) => String(user?.id || user?._id || "");
const userName = (user) => String(user?.name || user?.username || "Employee").trim();
const department = (user) => String(user?.dept || user?.department || "").trim();
const isCrmUser = (user) => /crm executive|crm_executive/i.test(String(user?.role || "")) || department(user).toLowerCase() === "crm";
const canUseHelpdesk = (user) => isAdmin(user) || isHrUser(user) || isITDepartment(user) || isCrmUser(user);
const isHelpdeskStaff = (user) => isAdmin(user) || isHrUser(user);

async function notifyEmployeeOfHelpdeskMessage(employeeId, conversationId, subject) {
  try {
    await notifyUser(employeeId, {
      type: "hr_helpdesk_message",
      source: "hr_helpdesk",
      conversationId,
      message: `HR sent you a message in “${subject}”.`,
    });
  } catch (error) {
    console.warn("Unable to notify employee about an HR helpdesk message.", error.message || error);
  }
}

function requireHelpdeskUser(req, res) {
  if (!canUseHelpdesk(req.user)) {
    res.status(403).json({ error: "HR Helpdesk is available to HR, IT, and CRM employees." });
    return false;
  }
  return true;
}

function safeConversation(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

async function accessibleConversation(req, res, { cache = false } = {}) {
  const id = String(req.params.id || "");
  if (!/^[a-f0-9-]{36}$/i.test(id)) {
    res.status(400).json({ error: "Invalid helpdesk conversation ID." });
    return null;
  }
  const ownerId = String(req.query?.employeeId || req.body?.employeeId || "").trim();
  if (ownerId && !/^[A-Za-z0-9_-]{1,160}$/.test(ownerId)) {
    res.status(400).json({ error: "Invalid helpdesk employee ID." });
    return null;
  }
  let ref = ownerId ? helpdeskThreadRef(ownerId, id) : null;
  let conversation = null;
  let snapshot = null;
  if (ref) {
    if (cache) {
      const cached = await conversationAccessCache.get(ref.path, async () => {
        const current = await ref.get();
        return current.exists ? { exists: true, data: current.data() } : { exists: false, data: null };
      });
      if (cached.exists) conversation = { id, ...cached.data };
    } else {
      snapshot = await ref.get();
      if (snapshot.exists) conversation = safeConversation(snapshot);
    }
  }
  if (!ownerId) {
    // Older open tabs only send the conversation ID. Keep them working after migration.
    let matches;
    try {
      matches = await helpdeskThreadGroup().where("conversationId", "==", id).limit(1).get();
    } catch (error) {
      if (error?.code !== 9 && error?.code !== "failed-precondition") throw error;
      matches = await helpdeskThreadGroup().limit(200).get();
    }
    snapshot = matches.docs.find((doc) => doc.id === id) || null;
    if (snapshot?.exists) {
      ref = snapshot.ref;
      conversation = safeConversation(snapshot);
    }
  }
  if (!conversation || !ref) {
    res.status(404).json({ error: "Helpdesk conversation not found." });
    return null;
  }
  const hiddenFor = Array.isArray(conversation.hiddenFor) ? conversation.hiddenFor.map(String) : [];
  if (hiddenFor.includes(userId(req.user))) {
    res.status(404).json({ error: "Helpdesk conversation not found." });
    return null;
  }
  const participants = Array.isArray(conversation.participantIds) ? conversation.participantIds.map(String) : [];
  if (!isHelpdeskStaff(req.user) && conversation.createdById !== userId(req.user) && !participants.includes(userId(req.user))) {
    res.status(403).json({ error: "You can only access your own helpdesk conversations." });
    return null;
  }
  return { ref, conversation };
}

router.use(authenticate);
router.use((req, res, next) => requireHelpdeskUser(req, res) ? next() : undefined);

router.get("/conversations", async (req, res) => {
  try {
    const items = await conversationCache.get(`${isHelpdeskStaff(req.user) ? "staff" : "employee"}:${userId(req.user)}`, async () => {
      let newSnapshot;
      if (isHelpdeskStaff(req.user)) {
        if (Date.now() >= staffIndexRetryAt) {
          try {
            newSnapshot = await helpdeskThreadGroup().orderBy("updatedAt", "desc").limit(200).get();
            staffIndexRetryAt = 0;
          } catch (error) {
            if (error?.code !== 9 && error?.code !== "failed-precondition") throw error;
            staffIndexRetryAt = Date.now() + 5 * 60_000;
          }
        }
        if (!newSnapshot) {
          newSnapshot = await helpdeskThreadGroup().limit(200).get();
        }
      } else {
        newSnapshot = await helpdeskThreads(userId(req.user)).orderBy("updatedAt", "desc").limit(200).get();
      }
      return newSnapshot.docs.map(safeConversation)
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
        .slice(0, 200);
    });
    return res.json(items.filter((item) => !(Array.isArray(item.hiddenFor) && item.hiddenFor.map(String).includes(userId(req.user)))));
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unable to load helpdesk conversations." });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const subject = String(req.body?.subject || "").trim();
    const text = String(req.body?.message || "").trim();
    if (!subject || subject.length > 160) return res.status(400).json({ error: "Subject is required and must be 160 characters or fewer." });
    if (!text || text.length > 5000) return res.status(400).json({ error: "Message is required and must be 5,000 characters or fewer." });
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const senderId = userId(req.user);
    const senderName = userName(req.user);
    const senderRole = isHelpdeskStaff(req.user) ? "HR" : (department(req.user) || String(req.user.role || "Employee"));
    let employee = req.user;
    if (isHelpdeskStaff(req.user)) {
      const recipientId = String(req.body?.employeeId || "").trim();
      if (!recipientId) return res.status(400).json({ error: "Choose an employee for this conversation." });
      employee = await User.findOne({ id: recipientId }) || await User.findOne({ _id: recipientId });
      if (!employee) return res.status(404).json({ error: "Employee not found." });
      if (isAdmin(employee) || isHrUser(employee) || (!isITDepartment(employee) && !isCrmUser(employee))) {
        return res.status(400).json({ error: "Choose a CRM or IT employee." });
      }
    } else if (req.body?.employeeId) {
      return res.status(403).json({ error: "Only HR can start a conversation with another employee." });
    }
    const employeeId = userId(employee);
    const employeeName = userName(employee);
    const conversationRef = helpdeskThreadRef(employeeId, id);
    const employeeRef = helpdeskEmployeeRef(employeeId);
    const messageRef = conversationRef.collection("messages").doc(randomUUID());
    const conversation = {
      conversationId: id,
      subject,
      createdById: senderId,
      participantIds: [...new Set([employeeId, ...(isHelpdeskStaff(req.user) ? [senderId] : [])])],
      employeeId,
      employeeName,
      department: department(employee),
      senderRole,
      createdAt,
      updatedAt: createdAt,
      lastMessage: text,
      lastMessageAt: createdAt,
      lastSenderId: senderId,
      lastSenderName: senderName,
    };
    const message = { conversationId: id, senderId, senderName, senderRole, text, createdAt };
    await getFirestore().runTransaction(async (transaction) => {
      transaction.set(employeeRef, { employeeId, employeeName, department: department(employee), updatedAt: createdAt }, { merge: true });
      transaction.create(conversationRef, conversation);
      transaction.create(messageRef, message);
    });
    if (isHelpdeskStaff(req.user)) await notifyEmployeeOfHelpdeskMessage(employeeId, id, subject);
    conversationCache.clear();
    conversationAccessCache.clear();
    return res.status(201).json({ id, ...conversation, messages: [message] });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to start a helpdesk conversation." });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const access = await accessibleConversation(req, res, { cache: true });
    if (!access) return;
    const version = access.conversation.lastMessageAt || access.conversation.updatedAt || "";
    const messages = await messageCache.get(`${access.ref.path}:${version}`, async () => {
      const snapshot = await access.ref.collection("messages").orderBy("createdAt", "asc").limit(500).get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    });
    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unable to load conversation messages." });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text || text.length > 5000) return res.status(400).json({ error: "Message is required and must be 5,000 characters or fewer." });
    const access = await accessibleConversation(req, res);
    if (!access) return;
    const db = getFirestore();
    const messageRef = access.ref.collection("messages").doc(randomUUID());
    const createdAt = new Date().toISOString();
    const senderId = userId(req.user);
    const senderName = userName(req.user);
    const senderRole = isHelpdeskStaff(req.user) ? "HR" : (department(req.user) || String(req.user.role || "Employee"));
    const message = { conversationId: access.conversation.id, senderId, senderName, senderRole, text, createdAt };
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(access.ref);
      if (!current.exists) throw Object.assign(new Error("Helpdesk conversation not found."), { status: 404 });
      transaction.create(messageRef, message);
      transaction.update(access.ref, {
        updatedAt: createdAt,
        lastMessage: text,
        lastMessageAt: createdAt,
        lastSenderId: senderId,
        lastSenderName: senderName,
      });
    });
    if (isHelpdeskStaff(req.user)) {
      await notifyEmployeeOfHelpdeskMessage(access.conversation.employeeId, access.conversation.id, access.conversation.subject);
    }
    conversationCache.clear();
    conversationAccessCache.clear();
    messageCache.clear();
    return res.status(201).json({ id: messageRef.id, ...message });
  } catch (error) {
    return res.status(Number(error.status) || 400).json({ error: error.message || "Unable to send helpdesk message." });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  try {
    const access = await accessibleConversation(req, res);
    if (!access) return;
    await access.ref.update({ hiddenFor: FieldValue.arrayUnion(userId(req.user)) });
    conversationCache.clear();
    conversationAccessCache.clear();
    messageCache.clear();
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unable to delete this chat." });
  }
});

export default router;
