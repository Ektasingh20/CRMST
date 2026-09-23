import express from "express";
import { authenticate } from "../middleware/auth.js";
import Lead from "../models/Lead.js";
import User from "../models/User.js";
import { isMongoConnected } from "../config/db.js";

import { buildAutoMapping, detectDuplicateCandidates, normalizeImportPayload } from "../utils/callingImport.js";
import { deleteCallRecord, importCallRecords, listCallRecords, normalizeListType, updateCallRecord } from "../config/firestoreCallListModel.js";
import { notifyUser } from "../services/appNotifications.js";

const router = express.Router();
router.use(authenticate);

// Send mutations to connected dashboards without extra Firestore reads.
const callSubscribers = new Set();
function publishCallChange(record, deleted = false) {
  for (const subscriber of callSubscribers) {
    if (subscriber.admin
      || subscriber.userId === String(record.assignedTo)
      || subscriber.userId === String(record.callLeadAssignedTo || "")) {
      subscriber.res.write('data: ' + JSON.stringify({ record, deleted }) + '\n\n');
    }
  }
}
router.get("/list-data/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const subscriber = { res, admin: isAdmin(req.user), userId: String(req.user.id || req.user._id || "") };
  callSubscribers.add(subscriber);
  res.write('data: {"ready":true}\n\n');
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25000);
  req.on("close", () => { clearInterval(heartbeat); callSubscribers.delete(subscriber); });
});

router.get("/list-data", async (req, res) => {
  try {
    const assignedTo = isAdmin(req.user) ? String(req.query.assignedTo || "") : String(req.user.id || req.user._id || "");
    const records = await listCallRecords(req.query.type || "", assignedTo);
    res.json(records);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

router.post("/list-data/import", async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin access required." });
  try {
    if (!req.body.assignedTo) return res.status(400).json({ error: "Please select an employee." });
    const assignee = await User.findOne({ $or: [{ id: String(req.body.assignedTo) }, { _id: String(req.body.assignedTo) }] });
    const assigneeRole = String(assignee?.role || "").trim().toLowerCase();
    const assigneeStatus = String(assignee?.status || "Active").trim().toLowerCase();
    const assigneeDepartment = String(assignee?.dept || assignee?.department || "").trim().toLowerCase();
    const assigneePosition = String(assignee?.position || "").trim().toLowerCase();
    if (!assignee || assigneeStatus !== "active" || !(assigneeRole === "admin" || assigneeRole.includes("crm") || assigneeDepartment.includes("crm") || assigneePosition.includes("crm"))) {
      return res.status(400).json({ error: "Call lists can only be assigned to active Admin or CRM Executive users." });
    }
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const created = await importCallRecords({ ...req.body, rows, uploadedBy: req.user.id || req.user._id });
    created.forEach((record) => publishCallChange(record));
    if (created.length) await notifyUser(req.body.assignedTo, { type: "call_list_uploaded", message: `${created.length} new ${String(req.body.listType || "call").toLowerCase()} contact${created.length === 1 ? " was" : "s were"} assigned to you.` });
    res.status(201).json({
      created: created.length,
      duplicates: created.duplicates || [],
      rows: created,
    });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

router.put("/list-data/:type/:id", async (req, res) => {
  try {
    const type = normalizeListType(req.params.type);
    const actorId = String(req.user.id || req.user._id || "");
    const admin = isAdmin(req.user);
    const assignedTo = admin ? String(req.body.lookupAssignedTo || req.body.assignedTo || "") : actorId;
    const patch = { ...(req.body || {}) };
    delete patch.lookupAssignedTo;
    if (patch.callLeadAssignedTo) {
      const leadAssignee = await User.findOne({ $or: [{ id: String(patch.callLeadAssignedTo) }, { _id: String(patch.callLeadAssignedTo) }] });
      const role = String(leadAssignee?.role || "").trim().toLowerCase();
      const department = String(leadAssignee?.dept || leadAssignee?.department || "").trim().toLowerCase();
      const position = String(leadAssignee?.position || "").trim().toLowerCase();
      const status = String(leadAssignee?.status || "Active").trim().toLowerCase();
      const canReceiveLead = role.includes("admin") || role.startsWith("operation")
        || department.includes("admin") || department.startsWith("operation")
        || position.includes("admin") || position.startsWith("operation");
      if (!leadAssignee || status === "inactive" || !canReceiveLead) {
        return res.status(400).json({ error: "Call leads can only be assigned to active Admin or Operations users." });
      }
    }
    if (!admin) {
      delete patch.assignedTo;
      delete patch.assignedToName;
    } else if (patch.assignedTo) {
      const assignee = await User.findOne({ $or: [{ id: String(patch.assignedTo) }, { _id: String(patch.assignedTo) }] });
      const role = String(assignee?.role || "").trim().toLowerCase();
      const status = String(assignee?.status || "Active").trim().toLowerCase();
      const department = String(assignee?.dept || assignee?.department || "").trim().toLowerCase();
      const position = String(assignee?.position || "").trim().toLowerCase();
      if (!assignee || status !== "active" || !(role === "admin" || role.includes("crm") || department.includes("crm") || position.includes("crm"))) {
        return res.status(400).json({ error: "Call lists can only be assigned to active Admin or CRM Executive users." });
      }
      patch.assignedToName = assignee.name || assignee.username || "";
    }
    const saved = await updateCallRecord(type, req.params.id, patch, assignedTo, admin ? "" : actorId);
    if (admin && patch.assignedTo && String(patch.assignedTo) !== String(assignedTo || "")) await notifyUser(patch.assignedTo, { type: "call_list_assigned", message: `A ${type} call-list contact was assigned to you.` });
    publishCallChange(saved);
    res.json(saved);
  } catch (error) { res.status(error.status || (error.message === "Call record not found." ? 404 : 400)).json({ error: error.message }); }
});

router.delete("/list-data/:type/:id", async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin access required." });
  try {
    const actorId = String(req.user.id || req.user._id || "");
    const owner = isAdmin(req.user) ? String(req.query.assignedTo || "") : actorId;
    const record = await deleteCallRecord(req.params.type, req.params.id, owner, isAdmin(req.user) ? "" : actorId);
    if (record) publishCallChange(record, true);
    res.json({ success: true });
  } catch (error) { res.status(error.status || 400).json({ error: error.message }); }
});

function isAdmin(user) {
  return String(user?.role || "").trim().toLowerCase() === "admin";
}

function isCrmExecutive(user) {
  return ["crm executive", "crm_executive"].includes(String(user?.role || "").trim().toLowerCase());
}

function normalizeId(value) {
  return String(value ?? "").trim();
}

function userLeadIds(user) {
  return [user?.id, user?._id].filter(Boolean).map(String);
}

router.get("/summary", async (req, res) => {
  if (!isMongoConnected) return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  try {
    const [total, active, inactive, assigned, unassigned, completed, pending, interested, notInterested, followUps, converted] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ active: true }),
      Lead.countDocuments({ active: false }),
      Lead.countDocuments({ assignedTo: { $ne: "" } }),
      Lead.countDocuments({ assignedTo: { $in: ["", null, undefined] } }),
      Lead.countDocuments({ callStatus: { $in: ["Completed", "completed"] } }),
      Lead.countDocuments({ callStatus: { $in: ["Pending", "pending", "Calling", "calling", "Not Answered", "Busy", "Wrong Number", "Call Back", "Follow-up Required"] } }),
      Lead.countDocuments({ interestStatus: { $in: ["Interested", "interested"] } }),
      Lead.countDocuments({ interestStatus: { $in: ["Not Interested", "not interested", "Lost", "lost"] } }),
      Lead.countDocuments({ followUpDate: { $exists: true, $ne: "" } }),
      Lead.countDocuments({ interestStatus: { $in: ["Converted", "converted", "Joined", "joined"] } }),
    ]);

    res.json({ total, active, inactive, assigned, unassigned, completed, pending, interested, notInterested, followUps, converted });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to fetch calling summary." });
  }
});

router.get("/executives", async (req, res) => {
  if (!isMongoConnected) return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin access required." });
  try {
    const records = await Lead.find().select("assignedTo callStatus interestStatus status interest active");
    const byUser = new Map();
    records.forEach((record) => {
      const key = String(record.assignedTo || "Unassigned");
      const entry = byUser.get(key) || { assigned: 0, completed: 0, pending: 0, interested: 0, notInterested: 0, converted: 0 };
      entry.assigned += 1;
      if (record.callStatus && /completed/i.test(record.callStatus)) entry.completed += 1;
      if (record.callStatus && /pending|calling|not answered|busy|wrong number|call back|follow-up required/i.test(record.callStatus)) entry.pending += 1;
      if (record.interestStatus && /interested/i.test(record.interestStatus)) entry.interested += 1;
      if (record.interestStatus && /not interested|lost/i.test(record.interestStatus)) entry.notInterested += 1;
      if (record.interestStatus && /converted|joined/i.test(record.interestStatus)) entry.converted += 1;
      byUser.set(key, entry);
    });

    res.json(Array.from(byUser.entries()).map(([assignedTo, stats]) => ({ assignedTo, ...stats })));
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to fetch executive performance." });
  }
});

router.get("/records", async (req, res) => {
  if (!isMongoConnected) return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  try {
    const query = {};
    const { page = 1, limit = 25, search = "", status = "", interest = "", program = "", course = "", followUp = "", active = "", assignedTo = "" } = req.query;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (status) query.callStatus = status;
    if (interest) query.interestStatus = interest;
    if (program) query.programInterest = program;
    if (course) query.courseInterest = course;
    if (followUp === "true") query.followUpDate = { $ne: "" };
    if (followUp === "false") query.followUpDate = { $in: [null, "", undefined] };
    if (active === "true") query.active = true;
    if (active === "false") query.active = false;
    if (assignedTo) query.assignedTo = assignedTo;

    if (isCrmExecutive(req.user) && !isAdmin(req.user)) {
      query.assignedTo = { $in: userLeadIds(req.user) };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Lead.find(query).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)),
      Lead.countDocuments(query),
    ]);

    res.json({ items: items.map((item) => ({ id: item.id || String(item._id), ...item.toObject() })), total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to fetch calling records." });
  }
});

router.post("/preview", async (req, res) => {
  if (!isMongoConnected) return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin access required." });
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const mapping = req.body?.mapping || {};
    const prepared = normalizeImportPayload(rows, mapping);
    const duplicateCheck = detectDuplicateCandidates(prepared);

    res.json({ rows: prepared, preview: prepared.slice(0, 25), duplicateCheck });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to preview calling data." });
  }
});

router.post("/import", async (req, res) => {
  if (!isMongoConnected) return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin access required." });
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const mapping = req.body?.mapping || {};
    const prepared = normalizeImportPayload(rows, mapping);
    const created = [];

    for (const row of prepared) {
      const candidate = { ...row };
      candidate.id = `${(candidate.name || "candidate").replace(/\s+/g, "-").toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      candidate.status = candidate.callStatus || "Pending";
      candidate.assignedTo = normalizeId(candidate.assignedTo || "");
      candidate.active = candidate.active !== false;
      candidate.snoozed = Boolean(candidate.snoozed);
      candidate.createdAt = candidate.date || new Date().toISOString().slice(0, 10);
      candidate.notes = candidate.remark || "";
      candidate.interest = candidate.programInterest || candidate.courseInterest || candidate.programType || "Training";

      const existing = await Lead.findOne({ phone: candidate.phone });
      if (!existing) {
        created.push(await Lead.create(candidate));
      }
    }

    res.status(201).json({ created: created.length, recordCount: prepared.length, rows: created.map((item) => ({ id: item.id || String(item._id), ...item.toObject() })) });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to import calling data." });
  }
});

router.post("/assign", async (req, res) => {
  if (!isMongoConnected) return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin access required." });
  try {
    const { ids = [], assignedTo = "" } = req.body || {};
    if (!assignedTo) return res.status(400).json({ error: "An executive is required for assignment." });
    const result = await Lead.updateMany({ id: { $in: ids.map(String) } }, { $set: { assignedTo: String(assignedTo), assignedDate: new Date().toISOString().slice(0, 10), active: true } });
    res.json({ success: true, matched: result.matchedCount, modified: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to assign calling records." });
  }
});

router.put("/:id", async (req, res) => {
  if (!isMongoConnected) return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  try {
    const { id } = req.params;
    const existing = await Lead.findOne({ id: String(id) }) || await Lead.findOne({ _id: id });
    if (!existing) return res.status(404).json({ error: "Calling record not found." });
    if (isCrmExecutive(req.user) && !isAdmin(req.user) && !(String(existing.assignedTo || "") === String(req.user.id || req.user._id))) {
      return res.status(403).json({ error: "You can only update records assigned to you." });
    }

    const payload = { ...req.body };
    payload.updatedAt = new Date();
    if (payload.callStatus) payload.status = payload.callStatus;
    if (payload.remark) payload.notes = payload.remark;
    if (payload.followUpDate) payload.followUpDate = payload.followUpDate;
    const item = await Lead.findOneAndUpdate({ _id: existing._id }, { $set: payload }, { new: true });
    res.json({ id: item.id || String(item._id), ...item.toObject() });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to update calling record." });
  }
});

router.post("/:id/snooze", async (req, res) => {
  if (!isMongoConnected) return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  try {
    const { id } = req.params;
    const existing = await Lead.findOne({ id: String(id) }) || await Lead.findOne({ _id: id });
    if (!existing) return res.status(404).json({ error: "Calling record not found." });
    if (isCrmExecutive(req.user) && !isAdmin(req.user) && !(String(existing.assignedTo || "") === String(req.user.id || req.user._id))) {
      return res.status(403).json({ error: "You can only manage records assigned to you." });
    }
    const item = await Lead.findOneAndUpdate({ _id: existing._id }, { $set: { snoozed: true, active: false } }, { new: true });
    res.json({ success: true, item: { id: item.id || String(item._id), ...item.toObject() } });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to snooze calling record." });
  }
});

router.post("/:id/resume", async (req, res) => {
  if (!isMongoConnected) return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  try {
    const { id } = req.params;
    const existing = await Lead.findOne({ id: String(id) }) || await Lead.findOne({ _id: id });
    if (!existing) return res.status(404).json({ error: "Calling record not found." });
    if (isCrmExecutive(req.user) && !isAdmin(req.user) && !(String(existing.assignedTo || "") === String(req.user.id || req.user._id))) {
      return res.status(403).json({ error: "You can only manage records assigned to you." });
    }
    const item = await Lead.findOneAndUpdate({ _id: existing._id }, { $set: { snoozed: false, active: true } }, { new: true });
    res.json({ success: true, item: { id: item.id || String(item._id), ...item.toObject() } });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to resume calling record." });
  }
});

router.get("/field-mapping", (_req, res) => {
  res.json({
    supportedFields: ["name", "phone", "courseInterest", "programInterest", "source"],
    suggestion: buildAutoMapping({
      "Student Name": "Rahul Sharma",
      "Mobile Number": "9876543210",
      "Email Address": "rahul@gmail.com",
      "Course Interest": "Web Development",
      "Program Interest": "Internship",
      "Source": "Website",
    }),
  });
});

export default router;
