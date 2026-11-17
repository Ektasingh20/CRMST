import bcrypt from "bcryptjs";
import { getAuth } from "firebase-admin/auth";
import User from "../models/User.js";
import { isMongoConnected } from "../config/db.js";
import { normalizeEmployment } from "../utils/itUserRoles.js";
import { listProfileDocuments } from "./priorExperienceDocumentsController.js";
import { isValidAadhaar, isValidBankAccount, isValidBankText, isValidEmail as isValidProfileEmail, isValidIfsc, isValidIndianMobile, isValidPan, isValidPersonName, isValidProfileDob, isValidRelationship } from "../../shared/profileValidation.js";

function mongoUnavailable(res) {
  return res.status(503).json({ error: "Database is unavailable. Please try again later." });
}

function validatePhone(value) {
  return isValidIndianMobile(value);
}

function validateEmail(value) {
  return isValidProfileEmail(value);
}

async function saveWithSyncedAuthEmail(user, email, save) {
  if (!user.firebaseAuthManaged || !user.firebaseAuthUid) return save();
  const auth = getAuth();
  const authUser = await auth.getUser(user.firebaseAuthUid);
  const previousEmail = String(authUser.email || "").trim().toLowerCase();
  if (previousEmail === email) return save();
  await auth.updateUser(user.firebaseAuthUid, { email });
  try {
    return await save();
  } catch (error) {
    try { await auth.updateUser(user.firebaseAuthUid, { email: previousEmail }); }
    catch (rollbackError) { console.error("Could not restore Firebase Auth email after profile save failed:", rollbackError); }
    throw error;
  }
}

function emailUpdateError(error) {
  return error?.code === "auth/email-already-exists"
    ? { status: 409, message: "Email already exists" }
    : null;
}

function normalizeStudentFields(payload) {
  if (String(payload.role || "").trim().toLowerCase() !== "student") return payload;
  return {
    ...payload,
    role: "Student", dept: "Student", position: "Student",
    ...(payload.email !== undefined ? { personalEmail: String(payload.email || "").trim().toLowerCase() } : {}),
  };
}

function studentProfileFields(payload = {}) {
  const fields = {};
  const textFields = { name: 120, education: 160, address: 500 };
  for (const [field, limit] of Object.entries(textFields)) {
    if (payload[field] === undefined) continue;
    const value = String(payload[field] || "").trim();
    if (field === "name" && !value) throw new Error("Full name is required.");
    if (value.length > limit) throw new Error(`${field} must be ${limit} characters or fewer.`);
    fields[field] = value;
  }
  if (payload.phone !== undefined) {
    const phone = String(payload.phone || "").trim();
    if (!validatePhone(phone)) throw new Error("Mobile number must be 10 digits and start with 6, 7, 8, or 9.");
    fields.phone = phone;
  }
  if (payload.emergencyContact !== undefined) {
    const phone = String(payload.emergencyContact || "").trim();
    if (phone && !validatePhone(phone)) throw new Error("Emergency contact must be a valid 10-digit mobile number.");
    fields.emergencyContact = phone;
  }
  if (payload.dob !== undefined) {
    const dob = String(payload.dob || "").trim();
    const date = dob ? new Date(`${dob}T00:00:00Z`) : null;
    if (dob && (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dob || date > new Date())) {
      throw new Error("Enter a valid date of birth.");
    }
    fields.dob = dob;
  }
  if (payload.gender !== undefined) {
    const gender = String(payload.gender || "").trim();
    if (!["", "Male", "Female", "Other", "Prefer not to say"].includes(gender)) throw new Error("Select a valid gender option.");
    fields.gender = gender;
  }
  if (payload.imageUrl !== undefined) {
    const imageUrl = String(payload.imageUrl || "").trim();
    if (imageUrl && (!/^https:\/\//i.test(imageUrl) || imageUrl.length > 2000)) throw new Error("Profile photo URL must be secure.");
    fields.imageUrl = imageUrl;
  }
  if (payload.imagePublicId !== undefined) {
    const imagePublicId = String(payload.imagePublicId || "").trim();
    if (imagePublicId.length > 200) throw new Error("Profile photo ID is too long.");
    fields.imagePublicId = imagePublicId;
  }
  return fields;
}

function employeeProfileFields(payload = {}, current = {}) {
  const fields = {};
  const textLimits = {
    personalEmail: 254,
    maritalStatus: 30,
    education: 160,
    address: 500,
    emergencyName: 120,
    emergencyRelationship: 80,
    panNumber: 10,
    aadhaarNumber: 12,
    bankName: 120,
    accountHolder: 120,
    accountNumber: 18,
    ifscCode: 11,
    bankBranch: 120,
  };
  for (const [field, limit] of Object.entries(textLimits)) {
    if (payload[field] === undefined) continue;
    const value = String(payload[field] || "").trim();
    if (value.length > limit) throw new Error(`${field} must be ${limit} characters or fewer.`);
    fields[field] = field === "ifscCode" ? value.toUpperCase() : value;
  }
  if (payload.name !== undefined) {
    const name = String(payload.name || "").trim();
    if (!name) throw new Error("Full name is required.");
    if (name.length > 120) throw new Error("Full name must be 120 characters or fewer.");
    if (!isValidPersonName(name)) throw new Error("Full name may contain letters and standard name punctuation only.");
    fields.name = name;
  }
  if (payload.email !== undefined) {
    const email = String(payload.email || "").trim().toLowerCase();
    if (!validateEmail(email) || email.length > 254) throw new Error("Enter a valid work email address.");
    fields.email = email;
  }
  if (payload.phone !== undefined) {
    const phone = String(payload.phone || "").trim();
    if (phone && !validatePhone(phone)) throw new Error("Mobile number must be a valid 10-digit number.");
    fields.phone = phone;
  }
  if (payload.dob !== undefined) {
    const dob = String(payload.dob || "").trim();
    if (dob && !isValidProfileDob(dob)) throw new Error("Date of birth must be between 1900 and today.");
    fields.dob = dob;
  }
  if (payload.gender !== undefined) {
    const gender = String(payload.gender || "").trim();
    if (!["", "Female", "Male", "Non-binary", "Prefer not to say"].includes(gender)) throw new Error("Select a valid gender option.");
    fields.gender = gender;
  }
  if (payload.personalEmail !== undefined && fields.personalEmail && !validateEmail(fields.personalEmail)) {
    throw new Error("Enter a valid personal email address.");
  }
  if (payload.emergencyPhone !== undefined) {
    const phone = String(payload.emergencyPhone || "").trim();
    if (phone && !validatePhone(phone)) throw new Error("Emergency contact must be a valid 10-digit mobile number.");
    fields.emergencyPhone = phone;
  }
  for (const [field, label] of [["emergencyName", "Emergency contact name"], ["emergencyRelationship", "Relationship"]]) {
    const valid = field === "emergencyName" ? isValidPersonName : isValidRelationship;
    if (fields[field] && !valid(fields[field])) {
      throw new Error(`${label} may contain letters, spaces, apostrophes, periods, and hyphens only.`);
    }
  }
  if (payload.maritalStatus !== undefined && !["", "Single", "Married", "Divorced", "Widowed"].includes(fields.maritalStatus)) {
    throw new Error("Select a valid marital status.");
  }
  if (fields.panNumber !== undefined) {
    fields.panNumber = fields.panNumber.toUpperCase();
    if (fields.panNumber && !isValidPan(fields.panNumber)) throw new Error("PAN must use the format ABCDE1234F.");
  }
  if (fields.aadhaarNumber !== undefined && fields.aadhaarNumber && !isValidAadhaar(fields.aadhaarNumber)) {
    throw new Error("Enter a valid 12-digit Aadhaar number.");
  }
  if (fields.ifscCode && !isValidIfsc(fields.ifscCode)) throw new Error("IFSC code must use the format ABCD0123456.");
  if (fields.accountNumber && !isValidBankAccount(fields.accountNumber)) throw new Error("Account number must contain 6 to 18 digits.");
  if (fields.bankName && !isValidBankText(fields.bankName)) throw new Error("Enter a valid bank name.");
  if (fields.accountHolder && !isValidPersonName(fields.accountHolder)) throw new Error("Enter the account holder's legal name.");
  if (fields.bankBranch && !isValidBankText(fields.bankBranch)) throw new Error("Enter a valid bank branch name.");
  if (fields.education && !isValidBankText(fields.education)) throw new Error("Education may contain letters, numbers, and standard punctuation only.");
  if (fields.address && /[\u0000-\u001f]/.test(fields.address)) throw new Error("Address contains unsupported characters.");

  const finalValues = { ...current, ...fields };
  const present = (key) => Boolean(String(finalValues[key] || "").trim());
  const emergencyKeys = ["emergencyName", "emergencyRelationship", "emergencyPhone"];
  if (emergencyKeys.some(present) && !emergencyKeys.every(present)) throw new Error("Complete all emergency contact fields or leave all of them blank.");
  const bankKeys = ["bankName", "accountHolder", "accountNumber", "ifscCode", "bankBranch"];
  if (bankKeys.some(present) && !bankKeys.every(present)) throw new Error("Complete all bank detail fields or leave all of them blank.");
  if (payload.imageUrl !== undefined) {
    const imageUrl = String(payload.imageUrl || "").trim();
    if (imageUrl && (!/^https:\/\//i.test(imageUrl) || imageUrl.length > 2000)) throw new Error("Profile photo URL must be secure.");
    fields.imageUrl = imageUrl;
  }
  if (payload.imagePublicId !== undefined) {
    const imagePublicId = String(payload.imagePublicId || "").trim();
    if (imagePublicId.length > 200) throw new Error("Profile photo ID is too long.");
    fields.imagePublicId = imagePublicId;
  }
  return fields;
}

export async function getMyProfile(req, res) {
  if (!isMongoConnected) return mongoUnavailable(res);
  try {
    const currentUserId = String(req.user?.id || req.user?._id || "");
    const user = await User.findOne({ id: currentUserId }) || await User.findOne({ _id: currentUserId });
    if (!user) return res.status(404).json({ error: "User not found." });
    const profile = user.toObject();
    const documents = await listProfileDocuments(user);
    return res.json({
      id: profile.id || String(user._id),
      name: profile.name || "",
      username: profile.username || "",
      email: profile.email || "",
      phone: profile.phone || "",
      role: profile.role || "",
      dept: profile.dept || profile.department || "",
      dob: profile.dob || "",
      gender: profile.gender || "",
      personalEmail: profile.personalEmail || "",
      maritalStatus: profile.maritalStatus || "",
      education: profile.education || "",
      address: profile.address || "",
      emergencyName: profile.emergencyName || "",
      emergencyRelationship: profile.emergencyRelationship || "",
      emergencyPhone: profile.emergencyPhone || "",
      panNumber: profile.panNumber || "",
      aadhaarNumber: profile.aadhaarNumber || "",
      bankName: profile.bankName || "",
      accountHolder: profile.accountHolder || "",
      accountNumber: profile.accountNumber || "",
      ifscCode: profile.ifscCode || "",
      bankBranch: profile.bankBranch || "",
      imageUrl: profile.imageUrl || "",
      imagePublicId: profile.imagePublicId || "",
      documents,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unable to load account settings." });
  }
}

export async function updateMyProfile(req, res) {
  if (!isMongoConnected) return mongoUnavailable(res);
  try {
    const currentUserId = String(req.user?.id || req.user?._id || "");
    const user = await User.findOne({ id: currentUserId }) || await User.findOne({ _id: currentUserId });
    if (!user) return res.status(404).json({ error: "User not found." });
    const payload = req.body || {};
    const changes = {};
    if (String(user.role || "").trim().toLowerCase() === "student") {
      const fields = studentProfileFields(payload);
      const currentEmail = String(user.email || "").trim().toLowerCase();
      const email = payload.personalEmail === undefined ? currentEmail : String(payload.personalEmail || "").trim().toLowerCase();
      if (!validateEmail(email) || email.length > 254) throw new Error("Enter a valid personal email address.");
      if (email !== currentEmail) {
        const existingEmail = await User.findOne({ email });
        if (existingEmail && String(existingEmail._id) !== String(user._id)) {
          return res.status(409).json({ error: "Email already exists" });
        }
      }
      Object.assign(changes, fields, { email, personalEmail: email });
    } else {
      const fields = employeeProfileFields(payload, typeof user.toObject === "function" ? user.toObject() : user);
      if (fields.email && fields.email !== String(user.email || "").trim().toLowerCase()) {
        const existingEmail = await User.findOne({ email: fields.email });
        if (existingEmail && String(existingEmail._id) !== String(user._id)) {
          return res.status(409).json({ error: "Email already exists" });
        }
      }
      Object.assign(changes, fields);
      if (payload.notificationPreferences !== undefined) changes.notificationPreferences = payload.notificationPreferences;
    }
    await saveWithSyncedAuthEmail(user, String(changes.email ?? user.email ?? "").trim().toLowerCase(), async () => {
      Object.assign(user, changes, { updatedAt: new Date().toISOString() });
      await user.save();
    });
    const { password: _password, ...safeUser } = user.toObject();
    return res.json({ id: safeUser.id || String(user._id), ...safeUser });
  } catch (error) {
    const authError = emailUpdateError(error);
    return res.status(authError?.status || 400).json({ error: authError?.message || error.message || "Unable to update profile." });
  }
}

export async function createUser(req, res) {
  if (!isMongoConnected) return mongoUnavailable(res);
  try {
    const { name, email, phone, emergencyContact, maritalStatus, education, username, password, dept, position, role, joined, state, branch, branchCode, address, salary = 0, imageUrl = "", imagePublicId = "" } = req.body;

    const employment = normalizeEmployment(req.body);

    if (String(role).trim().toLowerCase() === "admin" || String(dept).trim().toLowerCase() === "admin") {
      const existingAdmin = await User.findOne({ role: { $in: ["Admin", "Administrator", "Super Admin"] } });
      if (existingAdmin) {
        return res.status(409).json({ error: "Only one Admin account is allowed." });
      }
    }

    if (!name || !email || !phone || !dept || !position || !role || !joined || !username || !password || !state || !branch || !branchCode || !address) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ error: "Contact number must be exactly 10 digits and start with 6, 7, 8, or 9" });
    }

    if (emergencyContact && !validatePhone(emergencyContact)) {
      return res.status(400).json({ error: "Emergency contact must be exactly 10 digits and start with 6, 7, 8, or 9" });
    }

    const usernameLower = String(username).trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]+$/.test(usernameLower)) {
      return res.status(400).json({ error: "Username can only contain letters, numbers, and underscores." });
    }
    const existingUsername = await User.findOne({ username: usernameLower });
    if (existingUsername) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const existingEmail = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    const isFormerEmployee = String(req.body?.exEmployee || "No").trim().toLowerCase() === "yes";
    const resignationDate = String(req.body?.resignationDate || "").trim();
    // const generatedId = `${usernameLower}-${Date.now()}`;

    const user = await User.create(normalizeStudentFields({
      // id: generatedId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      emergencyContact: String(emergencyContact || "").trim(),
      maritalStatus: maritalStatus ? String(maritalStatus).trim() : "",
      education: String(education).trim(),
      username: usernameLower,
      password: hash,
      dept: String(dept).trim(),
      position: String(position).trim(),
      ...employment,
      joined: String(joined).trim(),
      state: String(state).trim(),
      branch: String(branch).trim(),
      branchCode: String(branchCode).trim(),
      address: String(address).trim(),
      salary: Number(salary) || 0,
      imageUrl: String(imageUrl || "").trim(),
      imagePublicId: String(imagePublicId || "").trim(),
      exEmployee: isFormerEmployee ? "Yes" : "No",
      employeeStatus: isFormerEmployee ? "Inactive" : "Active",
      resignationDate,
      left: isFormerEmployee ? (resignationDate || new Date().toISOString().slice(0, 10)) : "",
      status: isFormerEmployee ? "Inactive" : "Active",
      type: isFormerEmployee ? "Former" : "Current",
      createdById: String(req.user?.id || req.user?._id || ""),
      createdByRole: String(req.user?.role || ""),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const { password: _password, ...safeUser } = user.toObject();
    return res.status(201).json({ id: user.id || String(user._id), ...safeUser });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function updateUser(req, res) {
  if (!isMongoConnected) return mongoUnavailable(res);
  const { id } = req.params;
  if (!id || String(id).trim() === "") {
    return res.status(400).json({ error: "Invalid document id" });
  }
  try {
    let payload = normalizeStudentFields({ ...req.body });
    if (!payload.id) {
      payload.id = String(id);
    }

    const existing = (await User.findOne({ id: String(id) })) || await User.findOne({ _id: String(id) });
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }
    const targetId = String(existing._id);
    Object.assign(payload, normalizeEmployment({ ...existing.toObject(), ...payload }));
    if (payload.password && !String(payload.password).startsWith("$2a$") && !String(payload.password).startsWith("$2b$")) {
      payload.password = await bcrypt.hash(payload.password, 10);
    }

    if (payload.username) {
      const usernameLower = String(payload.username).trim().toLowerCase();
      const duplicate = await User.findOne({ username: usernameLower, _id: { $ne: targetId } });
      if (duplicate) {
        return res.status(409).json({ error: "Username already exists" });
      }
      payload.username = usernameLower;
    }

    if (payload.email) {
      const emailLower = String(payload.email).trim().toLowerCase();
      const duplicate = await User.findOne({ email: emailLower, _id: { $ne: targetId } });
      if (duplicate) {
        return res.status(409).json({ error: "Email already exists" });
      }
      payload.email = emailLower;
    }

    if (String(payload.role || existing.role || "").trim().toLowerCase() === "student") {
      payload.personalEmail = String(payload.email || existing.email || "").trim().toLowerCase();
    }

    const item = await saveWithSyncedAuthEmail(
      existing,
      String(payload.email || existing.email || "").trim().toLowerCase(),
      () => User.findOneAndUpdate({ _id: targetId }, payload, { new: true, upsert: true }),
    );
    const { password: _password, ...safeUser } = item.toObject();
    return res.json({ id: item.id || String(item._id), ...safeUser });
  } catch (err) {
    const authError = emailUpdateError(err);
    return res.status(authError?.status || 400).json({ error: authError?.message || err.message });
  }
}

export async function listUsers(req, res) {
  if (!isMongoConnected) return mongoUnavailable(res);
  try {
    const items = await User.find().sort({ createdAt: -1 });
    return res.json(items.map((doc) => {
      const { password: _password, ...safeUser } = doc.toObject();
      return { id: safeUser.id || String(safeUser._id), ...safeUser };
    }));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listAssignableUsers(req, res) {
  if (!isMongoConnected) return mongoUnavailable(res);
  try {
    const items = await User.find()
      .select("id name username role dept department position status")
      .sort({ name: 1 });
    const assignable = items.filter((user) => {
      const role = String(user.role || "").trim().toLowerCase();
      const department = String(user.dept || user.department || "").trim().toLowerCase();
      const position = String(user.position || "").trim().toLowerCase();
      const status = String(user.status || "Active").trim().toLowerCase();
      return status !== "inactive" && (
        role.includes("admin") || role.startsWith("operation")
        || department.includes("admin") || department.startsWith("operation")
        || position.includes("admin") || position.startsWith("operation")
      );
    });
    return res.json(assignable.map((user) => ({
      id: user.id || String(user._id),
      _id: String(user._id),
      name: user.name || "",
      username: user.username || "",
      role: user.role || "",
      dept: user.dept || user.department || "",
      position: user.position || "",
      status: user.status || "Active",
    })));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteUser(req, res) {
  if (!isMongoConnected) return mongoUnavailable(res);
  const { id } = req.params;
  if (!id || String(id).trim() === "") {
    return res.status(400).json({ error: "Invalid document id" });
  }
  try {
    const existing = await User.findOne({ id: String(id) });
    let targetId = id;
    if (!existing) {
      const byObjectId = await User.findOne({ _id: id });
      if (!byObjectId) {
        return res.json({ success: true, id: String(id) });
      }
      targetId = String(byObjectId._id);
      await User.findOneAndDelete({ _id: targetId });
      return res.json({ success: true, id: String(byObjectId._id) });
    }

    await User.findOneAndDelete({ _id: String(existing._id) });
    return res.json({ success: true, id: String(existing._id) });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
