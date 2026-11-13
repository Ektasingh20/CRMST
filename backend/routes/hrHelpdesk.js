import express from "express";
import { randomUUID } from "node:crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { authenticate } from "../middleware/auth.js";
import { isAdmin, isHrUser } from "../utils/roles.js";
import User from "../models/User.js";
import { isITDepartment } from "../../frontend/src/itUserRoles.js";
import { ReadCache } from "../itDashboard/src/cache.js";

// Polling still checks access and the conversation version on every request.
// Unchanged histories need not reread hundreds of message documents.
const messageCache = new ReadCache(60000, 250);
const conversationCache = new ReadCache(3000, 250);

const router = express.Router();
const collection = () => getFirestore().collection("hrHelpdeskConversations");
const userId = (user) => String(user?.id || user?._id || "");
const userName = (user) => String(user?.name || user?.username || "Employee").trim();
const department = (user) => String(user?.dept || user?.department || "").trim();
const isCrmUser = (user) => /crm executive|crm_executive/i.test(String(user?.role || "")) || department(user).toLowerCase() === "crm";
const canUseHelpdesk = (user) => isAdmin(user) || isHrUser(user) || isITDepartment(user) || isCrmUser(user);
const isHelpdeskStaff = (user) => isAdmin(user) || isHrUser(user);

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

async function accessibleConversation(req, res) {
  const id = String(req.params.id || "");
  if (!/^[a-f0-9-]{36}$/i.test(id)) {
    res.status(400).json({ error: "Invalid helpdesk conversation ID." });
    return null;
  }
  const snapshot = await collection().doc(id).get();
  if (!snapshot.exists) {
    res.status(404).json({ error: "Helpdesk conversation not found." });
    return null;
  }
  const conversation = safeConversation(snapshot);
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
  return { ref: snapshot.ref, conversation };
}

router.use(authenticate);
router.use((req, res, next) => requireHelpdeskUser(req, res) ? next() : undefined);

router.get("/conversations", async (req, res) => {
  try {
    const items = await conversationCache.get(`${isHelpdeskStaff(req.user) ? "staff" : "employee"}:${userId(req.user)}`, async () => {
    const snapshots = isHelpdeskStaff(req.user)
      ? [await collection().orderBy("updatedAt", "desc").limit(200).get()]
      : await Promise.all([
        collection().where("participantIds", "array-contains", userId(req.user)).get(),
        collection().where("createdById", "==", userId(req.user)).get(),
      ]);
    const unique = new Map(snapshots.flatMap((snapshot) => snapshot.docs.map((doc) => [doc.id, safeConversation(doc)])));
    const items = [...unique.values()].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    return items;
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
    const conversationRef = collection().doc(id);
    const messageRef = conversationRef.collection("messages").doc(randomUUID());
    const conversation = {
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
      transaction.create(conversationRef, conversation);
      transaction.create(messageRef, message);
    });
    conversationCache.clear();
    return res.status(201).json({ id, ...conversation, messages: [message] });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to start a helpdesk conversation." });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const access = await accessibleConversation(req, res);
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
    conversationCache.clear();
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
    messageCache.clear();
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unable to delete this chat." });
  }
});

export default router;
