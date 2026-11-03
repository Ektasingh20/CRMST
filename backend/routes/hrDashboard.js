import express from "express";
import { getFirestore } from "firebase-admin/firestore";
import { authenticate } from "../middleware/auth.js";
import User from "../models/User.js";
import { isAdmin, isHrUser } from "../utils/roles.js";

const router = express.Router();
router.use(authenticate, (req, res, next) => {
  if (!isAdmin(req.user) && !isHrUser(req.user)) return res.status(403).json({ error: "HR access required." });
  next();
});

let cached;
let cachedAt = 0;
let pending;
const todayInIndia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const active = (user) => !["inactive", "disabled", "ex", "former"].includes(String(user.status || "active").toLowerCase())
  && String(user.exEmployee || "").toLowerCase() !== "yes";

router.get("/", async (_req, res) => {
  try {
    if (cached && Date.now() - cachedAt < 60_000) return res.json(cached);
    if (!pending) pending = (async () => {
      const db = getFirestore();
      const [users, attendance, leaves] = await Promise.all([
        User.find(),
        db.collection("attendance").where("date", "==", todayInIndia()).get(),
        db.collectionGroup("leaves").where("status", "==", "Pending").limit(100).get(),
      ]);
      const employees = users.map((user) => user.toObject()).filter(active);
      const byStatus = { Present: 0, Absent: 0, Leave: 0 };
      attendance.docs.forEach((doc) => { const status = doc.get("status"); if (status in byStatus) byStatus[status] += 1; });
      const departments = employees.reduce((counts, employee) => {
        const name = employee.dept || employee.department || "Other";
        counts[name] = (counts[name] || 0) + 1;
        return counts;
      }, {});
      return {
        date: todayInIndia(), employeeCount: employees.length, attendance: byStatus,
        markedCount: attendance.size, pendingLeaveCount: leaves.size,
        pendingLeaves: leaves.docs.slice(0, 5).map((doc) => ({ id: doc.get("id") || doc.id, employeeName: doc.get("employeeName") || "Employee", type: doc.get("type") || "Leave", from: doc.get("from") || "", to: doc.get("to") || "" })),
        departments,
      };
    })().finally(() => { pending = null; });
    cached = await pending;
    cachedAt = Date.now();
    res.json(cached);
  } catch (error) {
    res.status(500).json({ error: "Unable to load HR dashboard." });
  }
});

export default router;
