import { findHrLeadDuplicate, findInterviewerBooking, listHrLeads, removeHrLead, saveHrLead } from "../config/firestoreHrLeadModel.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const HR_LEAD_PROGRAMS = [
  "Front-End Development", "Front-End with React.js", "Back-End with Node.js", "Back-End with PHP",
  "Back-End with Python", "Full-Stack with Node.js", "Full-Stack with PHP", "Full-Stack with Python",
];
const STATUSES = ["New", "Contacted", "Counselling done", "Interview scheduled", "Interview completed", "Selected", "Enrolled", "Rejected"];
const SOURCES = ["Instagram", "Facebook", "Google", "College visit", "Friend/Alumni", "WhatsApp", "Walk-in", "Other"];
const SKILL_LEVELS = ["Beginner", "Intermediate"];
const INTERVIEW_MODES = ["On-site Ajmer", "Phone", "Google Meet"];
const INTERVIEW_STATUSES = ["Scheduled", "Completed", "No-show", "Cancelled"];
const INTERVIEW_RESULTS = ["Pass", "Fail", "On hold"];
const normalized = (value) => String(value || "").trim().toLowerCase();
function verifiedResume(body, user) {
  if (!body?.resume?.receipt) return null;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) throw new Error("Resume uploads are not configured.");
  const receipt = jwt.verify(body.resume.receipt, privateKey, { algorithms: ["HS256"], audience: "hr-lead-resume" });
  const owner = String(user.id || user._id || user.username || "");
  if (receipt.owner !== owner || !receipt.resume?.url) throw new Error("Invalid resume upload receipt.");
  const { receipt: _receipt, ...resume } = body.resume;
  return resume;
}

function validate(body = {}) {
  const lead = {
    program: String(body.program || "").trim(), name: String(body.name || "").trim(),
    mobile: String(body.mobile || "").trim(), email: String(body.email || "").trim(), city: String(body.city || "").trim(),
    qualification: String(body.qualification || "").trim(), college: String(body.college || "").trim(),
    passingYear: String(body.passingYear || "").trim(), skillLevel: String(body.skillLevel || "").trim(),
    source: String(body.source || "").trim(), status: String(body.status || "New").trim(),
    followUpDate: String(body.followUpDate || "").trim(), notes: String(body.notes || "").trim(),
    interview_date: String(body.interview_date || "").trim(),
    interview_mode: String(body.interview_mode || "").trim(), interviewer_id: String(body.interviewer_id || "").trim(),
    interviewer: String(body.interviewer || "").trim(),
    interview_status: String(body.interview_status || "").trim(),
    interview_result: String(body.interview_result || "").trim(), interview_feedback: String(body.interview_feedback || "").trim(),
  };
  if (!HR_LEAD_PROGRAMS.includes(lead.program)) return { error: "Choose a valid program." };
  if (!lead.name) return { error: "Full name is required." };
  if (!/^\d{10}$/.test(lead.mobile)) return { error: "Mobile must be exactly 10 digits." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return { error: "Enter a valid email address." };
  if (lead.skillLevel && !SKILL_LEVELS.includes(lead.skillLevel)) return { error: "Choose a valid skill level." };
  if (lead.source && !SOURCES.includes(lead.source)) return { error: "Choose a valid source." };
  if (!STATUSES.includes(lead.status)) return { error: "Choose a valid status." };
  if (lead.passingYear && !/^\d{4}$/.test(lead.passingYear)) return { error: "Passing year must be a four-digit year." };
  if (lead.interview_mode && !INTERVIEW_MODES.includes(lead.interview_mode)) return { error: "Choose a valid interview mode." };
  if (lead.interview_status && !INTERVIEW_STATUSES.includes(lead.interview_status)) return { error: "Choose a valid interview status." };
  if (lead.interview_result && !INTERVIEW_RESULTS.includes(lead.interview_result)) return { error: "Choose a valid interview result." };
  if (lead.interview_date && !/^\d{4}-\d{2}-\d{2}$/.test(lead.interview_date)) return { error: "Enter a valid interview date." };
  const hasAnySchedule = Boolean(lead.interview_date || lead.interviewer_id);
  if (hasAnySchedule && !(lead.interview_date && lead.interviewer_id)) return { error: "Interview date and interviewer are both required to schedule." };
  if (lead.interview_status === "Scheduled" && !hasAnySchedule) return { error: "Add an interview date and interviewer before scheduling." };
  return { lead };
}

async function interviewerDetails(lead) {
  if (!lead.interviewer_id) return { id: "", name: "" };
  const user = await User.findOne({ id: lead.interviewer_id }) || await User.findOne({ _id: lead.interviewer_id });
  if (!user) return null;
  const data = user.toObject();
  if (["inactive", "disabled", "former", "ex"].includes(String(data.status || "active").toLowerCase())
    || String(data.exEmployee || "").toLowerCase() === "yes"
    || String(data.role || "").toLowerCase() === "student") return null;
  return { id: String(data.id || data._id), name: String(data.name || data.username || "Staff") };
}

async function prepareInterview(lead, req, existing, res) {
  if (lead.interviewer_id) {
    if (existing && String(existing.interviewer_id || "") === lead.interviewer_id) {
      lead.interviewer = existing.interviewer || lead.interviewer;
    } else {
      const interviewer = await interviewerDetails(lead);
      if (!interviewer) { res.status(400).json({ error: "Choose an active HR or staff interviewer." }); return null; }
      lead.interviewer_id = interviewer.id;
      lead.interviewer = interviewer.name;
    }
  } else {
    lead.interviewer = "";
  }
  const hasSchedule = Boolean(lead.interview_date && lead.interviewer_id);
  const bookingChanged = !existing
    || existing.interview_date !== lead.interview_date
    || String(existing.interviewer_id || "") !== lead.interviewer_id
    || existing.interview_status !== "Scheduled";
  if (hasSchedule && bookingChanged && (!lead.interview_status || lead.interview_status === "Scheduled")) {
    const conflict = await findInterviewerBooking(lead.interviewer_id, lead.interview_date, existing?.id || "");
    if (conflict) {
      res.status(409).json({ error: `${lead.interviewer} already has an interview booked on this date for ${conflict.name}.`, conflict });
      return null;
    }
    if (!lead.interview_status) lead.interview_status = "Scheduled";
  }
  const interviewCompletedNow = lead.interview_status === "Completed"
    && (!existing || existing.interview_status !== "Completed");
  if (interviewCompletedNow) lead.status = "Interview completed";
  else if (hasSchedule && lead.interview_status === "Scheduled" && bookingChanged) lead.status = "Interview scheduled";
  return lead;
}

export async function getHrLeads(_req, res) {
  res.json(await listHrLeads());
}

export async function createHrLead(req, res) {
  const { lead, error } = validate(req.body);
  if (error) return res.status(400).json({ error });
  const duplicate = await findHrLeadDuplicate(lead.mobile, lead.email);
  if (duplicate) return res.status(409).json({ error: "A lead with this mobile number or email already exists.", duplicate });
  const now = new Date().toISOString();
  let resume;
  try { resume = verifiedResume(req.body, req.user); } catch (error) { return res.status(400).json({ error: error.message }); }
  const interview = await prepareInterview(lead, req, null, res);
  if (!interview) return;
  const saved = await saveHrLead("", {
    ...interview, recordType: "lead", mobileNormalized: normalized(lead.mobile), emailNormalized: normalized(lead.email),
    ...(resume ? { resume } : {}),
    createdAt: now, updatedAt: now, createdBy: String(req.user.id || req.user._id || req.user.username || ""),
  });
  res.status(201).json(saved);
}

export async function updateHrLead(req, res) {
  const { lead, error } = validate(req.body);
  if (error) return res.status(400).json({ error });
  const duplicate = await findHrLeadDuplicate(lead.mobile, lead.email, String(req.params.id));
  if (duplicate) return res.status(409).json({ error: "A lead with this mobile number or email already exists.", duplicate });
  const current = (await listHrLeads()).find((item) => item.id === String(req.params.id));
  if (!current) return res.status(404).json({ error: "Lead not found." });
  const interview = await prepareInterview(lead, req, current, res);
  if (!interview) return;
  let resume;
  try { resume = verifiedResume(req.body, req.user); } catch (error) { return res.status(400).json({ error: error.message }); }
  const saved = await saveHrLead(String(req.params.id), {
    ...interview, recordType: "lead", mobileNormalized: normalized(lead.mobile), emailNormalized: normalized(lead.email), updatedAt: new Date().toISOString(),
    ...(resume ? { resume } : {}),
  });
  if (!saved) return res.status(404).json({ error: "Lead not found." });
  res.json(saved);
}

export async function deleteHrLead(req, res) {
  const removed = await removeHrLead(String(req.params.id));
  if (!removed) return res.status(404).json({ error: "Lead not found." });
  res.json({ success: true });
}

export async function uploadHrLeadResume(req, res) {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "Choose a resume file to upload." });
  if (!/^application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/.test(file.mimetype)) {
    return res.status(400).json({ error: "Resume must be a PDF, DOC, or DOCX file." });
  }
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) return res.status(503).json({ error: "Resume uploads are not configured. Add IMAGEKIT_PRIVATE_KEY." });
  try {
    const form = new FormData();
    form.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
    form.append("fileName", file.originalname);
    form.append("folder", "/hr-lead-resumes");
    form.append("useUniqueFileName", "true");
    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` }, body: form,
      signal: AbortSignal.timeout(60000),
    });
    const uploaded = await response.json();
    if (!response.ok || !uploaded.url || !uploaded.fileId) return res.status(502).json({ error: "Resume upload failed. Please try again." });
    const resume = { name: file.originalname, type: file.mimetype, size: file.size, url: uploaded.url, fileId: uploaded.fileId };
    return res.json({ ...resume, receipt: jwt.sign({ owner: String(req.user.id || req.user._id || req.user.username || ""), resume }, privateKey, { audience: "hr-lead-resume", expiresIn: "24h" }) });
  } catch {
    return res.status(502).json({ error: "Resume upload failed. Please try again." });
  }
}
