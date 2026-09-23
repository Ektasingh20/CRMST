import { isMongoConnected } from "../config/db.js";
import Lead from "../models/Lead.js";
import User from "../models/User.js";
import { listCollection, deleteItem } from "../controllers/genericController.js";
import { canCreateLeads } from "../utils/roles.js";
import { LEAD_INTERESTS } from "../config/leadCatalog.js";
import { notifyUser } from "../services/appNotifications.js";

function mongoUnavailable(res) {
  return res.status(503).json({ error: "Database is unavailable. Please try again later." });
}

function validatePhone(value) {
  return /^[6-9]\d{9}$/.test(String(value || "").trim());
}

function validateEmail(value) {
  if (!value || String(value).trim() === "") return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function isCrmExecutive(user) {
  return ["crm executive", "crm_executive"].includes(String(user?.role || "").trim().toLowerCase());
}

function canOwnCreatedLead(user) {
  const role = String(user?.role || "").trim().toLowerCase();
  const department = String(user?.dept || user?.department || "").trim().toLowerCase();
  const position = String(user?.position || "").trim().toLowerCase();
  return role.includes("admin") || role.startsWith("operation")
    || department.includes("admin") || department.startsWith("operation")
    || position.includes("admin") || position.startsWith("operation");
}

function userLeadIds(user) {
  return [user?.id, user?._id, user?.username, user?.name].filter(Boolean).map(String);
}

export async function listLeads(req, res) {
  if (String(req.query?.fresh || "") === "1" && typeof Lead._invalidateCache === "function") {
    Lead._invalidateCache();
  }
  if (!isMongoConnected) return mongoUnavailable(res);
  try {
    const filter = isCrmExecutive(req.user)
      ? { assignedTo: { $in: userLeadIds(req.user) } }
      : {};
    const items = await Lead.find(filter).sort({ updatedAt: -1 });
    return res.json(items.map((doc) => ({ id: doc.id || String(doc._id), ...doc.toObject() })));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createLead(req, res) {
  if (!isMongoConnected) return mongoUnavailable(res);
  if (!canCreateLeads(req.user)) return res.status(403).json({ error: "Only Admin, Operations, and CRM Executive users can create leads." });
  try {
    const payload = { ...req.body };

    if (isCrmExecutive(req.user)) {
      // CRM work ends at lead creation; ownership must pass to Admin or Operations.
      payload.enteredBy = String(req.user.id || req.user._id || req.user.username || "");
      payload.enteredByName = String(req.user.name || req.user.username || "");
    } else {
      payload.enteredBy = String(payload.enteredBy || req.user.id || req.user._id || req.user.username || "");
      payload.enteredByName = String(payload.enteredByName || req.user.name || req.user.username || "");
    }

    if (!payload.name || String(payload.name).trim() === "") {
      return res.status(400).json({ error: "Full name is required." });
    }
    if (!validatePhone(payload.phone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
    }
    const existingLead = await Lead.findOne({ phone: String(payload.phone).trim() });
    if (existingLead) {
      return res.status(409).json({
        error: `Lead already created for this phone number${existingLead.name ? ` (${existingLead.name})` : ""}.`,
        duplicateLeadId: existingLead.id || String(existingLead._id),
      });
    }
    if (!validateEmail(payload.email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (payload.alternatePhone && !validatePhone(payload.alternatePhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
    }
    if (payload.assignedTo) {
      const assignee = await User.findOne({ $or: [{ id: String(payload.assignedTo) }, { _id: String(payload.assignedTo) }] });
      const status = String(assignee?.status || "Active").trim().toLowerCase();
      if (!assignee || status !== "active" || !canOwnCreatedLead(assignee)) {
        return res.status(400).json({ error: "Leads can only be assigned to active Admin or Operations users." });
      }
      payload.assignedToName = assignee.name || assignee.username || "";
    }

    const typeKey = String(payload.type || "").trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(LEAD_INTERESTS, typeKey)) {
      return res.status(400).json({ error: "Lead type must be Training, Service, or Internship." });
    }
    if (!payload.interest || String(payload.interest).trim() === "") {
      return res.status(400).json({ error: "Lead interest is required." });
    }
    if (!LEAD_INTERESTS[typeKey].includes(String(payload.interest).trim())) {
      return res.status(400).json({ error: "The selected interest does not belong to this lead type." });
    }

    const allowedStatuses = ["pending", "follow-up", "interested", "converted", "lost", "not_interested", "Pending", "Follow-up", "Interested", "Converted", "Lost", "Not Interested"];
    if (payload.status && !allowedStatuses.includes(payload.status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    if (!payload.id) {
      payload.id = `${payload.name || "lead"}-${Date.now()}`;
    }

    payload.createdAt = new Date().toISOString();
    if (payload.assignedTo) {
      payload.assignedDate = new Date().toISOString().slice(0, 10);
    }
    if (!payload.status) {
      payload.status = "Pending";
    }

    const item = await Lead.create(payload);
    if (item.assignedTo) await notifyUser(item.assignedTo, { type: "lead_assigned", message: `A lead was assigned to you: ${item.name}.` });
    return res.status(201).json({ id: item.id || String(item._id), ...item.toObject() });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function updateLead(req, res) {
  if (!isMongoConnected) return mongoUnavailable(res);
  if (!canCreateLeads(req.user)) return res.status(403).json({ error: "You do not have permission to update leads." });
  const { id } = req.params;
  if (!id || String(id).trim() === "") {
    return res.status(400).json({ error: "Invalid document id" });
  }
  try {
    const payload = { ...req.body };
    const existing = await Lead.findOne({ id: String(id) });
    if (!existing) return res.status(404).json({ error: "Lead not found. Refresh the list and try again." });

    if (payload.phone && !validatePhone(payload.phone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
    }
    if (payload.email && !validateEmail(payload.email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (payload.alternatePhone && !validatePhone(payload.alternatePhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
    }
    if (payload.assignedTo) {
      const assignee = await User.findOne({ $or: [{ id: String(payload.assignedTo) }, { _id: String(payload.assignedTo) }] });
      const status = String(assignee?.status || "Active").trim().toLowerCase();
      const assignmentChanged = String(payload.assignedTo) !== String(existing.assignedTo || "");
      if ((!assignee || status !== "active" || !canOwnCreatedLead(assignee)) && assignmentChanged) {
        return res.status(400).json({ error: "Leads can only be assigned to active Admin or Operations users." });
      }
      if (assignee && canOwnCreatedLead(assignee)) {
        payload.assignedDate = payload.assignedDate || new Date().toISOString().slice(0, 10);
        payload.assignedToName = payload.assignedToName || assignee.name || assignee.username || "";
      }
    }

    const allowedStatuses = ["pending", "follow-up", "interested", "converted", "lost", "not_interested", "Pending", "Follow-up", "Interested", "Converted", "Lost", "Not Interested"];
    if (payload.status && !allowedStatuses.includes(payload.status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    if (!payload.id) {
      payload.id = String(id);
    }

    if (isCrmExecutive(req.user) && (!existing || !userLeadIds(req.user).includes(String(existing.assignedTo)))) {
      return res.status(403).json({ error: "You can only update leads assigned to you." });
    }
    if (isCrmExecutive(req.user)) {
      delete payload.assignedTo;
      delete payload.assignedDate;
    }
    let targetId = id;
    if (existing) {
      targetId = String(existing._id);
    }

    const item = await Lead.findOneAndUpdate(
      { _id: targetId },
      payload,
      { new: true, upsert: false }
    );
    if (payload.assignedTo && String(payload.assignedTo) !== String(existing.assignedTo || "")) await notifyUser(payload.assignedTo, { type: "lead_assigned", message: `A lead was assigned to you: ${item.name}.` });
    return res.json({ id: item.id || String(item._id), ...item.toObject() });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function deleteLead(req, res) {
  if (!canCreateLeads(req.user)) return res.status(403).json({ error: "You do not have permission to delete leads." });
  if (isCrmExecutive(req.user)) {
    if (!isMongoConnected) return mongoUnavailable(res);
    const lead = await Lead.findOne({ id: String(req.params.id) });
    if (!lead || !userLeadIds(req.user).includes(String(lead.assignedTo))) {
      return res.status(403).json({ error: "You can only delete leads assigned to you." });
    }
  }
  return deleteItem(req, res, Lead);
}
