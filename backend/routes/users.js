import express from "express";
import { authenticate } from "../middleware/auth.js";
import { listUsers, listAssignableUsers, createUser, updateUser, deleteUser } from "../controllers/usersController.js";
import { changePassword, requestPasswordResetEmail } from "../controllers/authController.js";
import { isAdmin, isHrUser, canAccessUserDirectory, canCreateEmployeeUsers } from "../utils/roles.js";
import User from "../models/User.js";
import { downloadPriorExperienceDocument, uploadPriorExperienceDocument } from "../controllers/priorExperienceDocumentsController.js";

import { isITDepartment, isTeamOnlyITUser } from "../../frontend/src/itUserRoles.js";

const router = express.Router();

router.use(authenticate);

router.put("/me/profile", async (req, res) => {
  try {
    const currentUserId = String(req.user?.id || req.user?._id || "");
    const user = await User.findOne({ id: currentUserId }) || await User.findOne({ _id: currentUserId });
    if (!user) return res.status(404).json({ error: "User not found." });
    const payload = req.body || {};
    if (payload.name !== undefined) user.name = String(payload.name).trim();
    if (payload.email !== undefined) user.email = String(payload.email).trim().toLowerCase();
    if (payload.phone !== undefined) user.phone = String(payload.phone).trim();
    if (payload.imageUrl !== undefined) user.imageUrl = String(payload.imageUrl).trim();
    if (payload.imagePublicId !== undefined) user.imagePublicId = String(payload.imagePublicId).trim();
    if (payload.notificationPreferences !== undefined) user.notificationPreferences = payload.notificationPreferences;
    user.updatedAt = new Date().toISOString();
    await user.save();
    const { password: _password, ...safeUser } = user.toObject();
    res.json({ id: safeUser.id || String(user._id), ...safeUser });
  } catch (error) { res.status(400).json({ error: error.message || "Unable to update profile." }); }
});

router.post("/:id/change-password", changePassword);
router.post("/:id/password-reset", requestPasswordResetEmail);
router.post("/:id/prior-experience-documents/:key", uploadPriorExperienceDocument);
router.get("/:id/prior-experience-documents/:key", downloadPriorExperienceDocument);
router.get("/assignees", listAssignableUsers);
router.get("/it-team", async (req, res) => {
  if (!isAdmin(req.user) && !isITDepartment(req.user)) return res.status(403).json({ error: "Admin or IT access required." });
  try {
    const users = await User.find();
    res.json(users.filter(req.query.teamOnly === 'true' ? isTeamOnlyITUser : isITDepartment).filter(user => !["inactive", "disabled"].includes(String(user.status || "").toLowerCase())).map(user => ({
      id: user.id || String(user._id), name: user.name || user.username, role: user.role, dept: user.dept || user.department, canAssignProjects: user.canAssignProjects === true,
    })));
  } catch { res.status(500).json({ error: "Unable to load IT team members." }); }
});
router.get("/", async (req, res) => {
  if (!canAccessUserDirectory(req.user)) return res.status(403).json({ error: "Employee directory access is not available for this account." });
  if (isAdmin(req.user) || isHrUser(req.user)) return listUsers(req, res);
  try {
    const users = await User.find().sort({ name: 1 });
    return res.json(users.map((user) => ({
      id: user.id || String(user._id),
      name: user.name || user.username || "",
      username: user.username || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "",
      dept: user.dept || user.department || "",
      position: user.position || "",
      branch: user.branch || "",
      joined: user.joined || "",
      status: user.status || "Active",
      imageUrl: user.imageUrl || "",
      canAssignProjects: user.canAssignProjects === true,
    })));
  } catch (error) { return res.status(500).json({ error: error.message || "Unable to load employee directory." }); }
});
router.post("/", (req, res) => {
  if (!canCreateEmployeeUsers(req.user)) return res.status(403).json({ error: "Only Admin or HR can create employee accounts." });
  const requestedDepartment = String(req.body?.dept || "").trim().toLowerCase();
  const requestedRole = String(req.body?.role || "").trim().toLowerCase();
  if (!isAdmin(req.user) && (requestedDepartment === "admin" || requestedRole === "admin" || requestedRole === "administrator")) {
    return res.status(403).json({ error: "HR cannot create Admin accounts." });
  }
  return createUser(req, res);
});
router.put("/:id", async (req, res) => {
  if (isAdmin(req.user)) return updateUser(req, res);
  if (!isHrUser(req.user)) return res.status(403).json({ error: "Only Admin or HR can update employee profiles." });
  try {
    const targetId = String(req.params.id || "");
    const existing = await User.findOne({ id: targetId }) || await User.findOne({ _id: targetId });
    if (!existing) return res.status(404).json({ error: "User not found." });
    if (String(existing.role || "").toLowerCase() === "admin" || String(existing.dept || "").toLowerCase() === "admin") {
      return res.status(403).json({ error: "HR cannot update Admin profiles." });
    }

    const source = req.body || {};
    if (source.priorExperience !== undefined && !["Yes", "No"].includes(String(source.priorExperience))) {
      return res.status(400).json({ error: "Prior experience must be Yes or No." });
    }
    for (const field of ["priorEmployer", "priorDesignation"]) {
      if (source[field] !== undefined && (typeof source[field] !== "string" || source[field].length > 200)) {
        return res.status(400).json({ error: `${field} must be 200 characters or fewer.` });
      }
    }
    for (const field of ["priorEmploymentFrom", "priorEmploymentTo"]) {
      if (source[field] !== undefined && source[field] !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(String(source[field]))) {
        return res.status(400).json({ error: `${field} must use YYYY-MM-DD format.` });
      }
    }
    const department = String(source.dept || existing.dept || "").trim();
    if (department.toLowerCase() === "admin") return res.status(403).json({ error: "HR cannot move an employee into the Admin department." });
    const roleMap = { crm: "CRM Executive", hr: "HR", operation: "Operation", operations: "Operation", student: "Student" };
    const role = department.toLowerCase() === "it" ? String(source.role || source.position || existing.role || "").trim() : roleMap[department.toLowerCase()] || department;
    const editableFields = [
      "name", "email", "phone", "emergencyContact", "maritalStatus", "education", "dept", "position", "joined",
      "state", "branch", "branchCode", "address", "imageUrl", "imagePublicId", "dob", "gender", "personalEmail",
      "employmentType", "employeeStatus", "manager", "workLocation", "probationPeriod", "noticePeriod", "resignationDate",
      "exEmployee", "panNumber", "aadhaarNumber", "bankName", "accountNumber", "ifscCode", "bankBranch", "accountHolder",
      "idCardEnabled",
      "salary", "leaveDaysThisMonth", "unpaidLeaveDays", "currentMonthLeaveDeduction", "oneDayBasicSalary", "grossSalary",
      "unpaidLeaveCalculation", "joiningExitDateDeduction", "netSalary", "status", "type", "left",
      "priorExperience", "priorEmployer", "priorDesignation", "priorEmploymentFrom", "priorEmploymentTo",
    ];
    const safePayload = Object.fromEntries(editableFields.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
    safePayload.dept = department;
    safePayload.role = role;
    const isFormerEmployee = String(source.exEmployee || "No").trim().toLowerCase() === "yes";
    safePayload.exEmployee = isFormerEmployee ? "Yes" : "No";
    safePayload.employeeStatus = isFormerEmployee ? "Inactive" : (source.employeeStatus || "Active");
    safePayload.status = isFormerEmployee ? "Inactive" : "Active";
    safePayload.type = isFormerEmployee ? "Former" : "Current";
    safePayload.left = isFormerEmployee
      ? String(source.resignationDate || existing.left || existing.resignationDate || new Date().toISOString().slice(0, 10)).trim()
      : "";
    req.body = safePayload;
    return await updateUser(req, res);
  } catch (error) { return res.status(400).json({ error: error.message || "Unable to update employee profile." }); }
});
router.delete("/:id", async (req, res) => {
  if (isAdmin(req.user)) return deleteUser(req, res);
  if (!isHrUser(req.user)) return res.status(403).json({ error: "Only Admin or HR can delete employee profiles." });
  try {
    const targetId = String(req.params.id || "");
    const existing = await User.findOne({ id: targetId }) || await User.findOne({ _id: targetId });
    if (!existing) return res.status(404).json({ error: "User not found." });
    if (String(existing.role || "").toLowerCase() === "admin" || String(existing.dept || "").toLowerCase() === "admin") {
      return res.status(403).json({ error: "HR cannot delete Admin profiles." });
    }
    return await deleteUser(req, res);
  } catch (error) { return res.status(400).json({ error: error.message || "Unable to delete employee profile." }); }
});
router.use((req, res, next) => isAdmin(req.user) ? next() : res.status(403).json({ error: "Admin access required." }));

export default router;
