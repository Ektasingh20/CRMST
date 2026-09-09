import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "express-async-errors";
import serverless from "serverless-http";
import { connectDatabase } from "./config/db.js";
import { seedDefaultAdmin } from "./utils/seedAdmin.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import leadsRoutes from "./routes/leads.js";
import callingRoutes from "./routes/calling.js";
import servicesRoutes from "./routes/services.js";
import trainingsRoutes from "./routes/trainings.js";
import coursesRoutes from "./routes/courses.js";
import notificationsRoutes from "./routes/notifications.js";
import stipRoutes from "./routes/stip.js";
import tasksRoutes from "./routes/tasks.js";
import leavesRoutes from "./routes/leaves.js";
import attendanceRoutes from "./routes/attendance.js";
import employeesRoutes from "./routes/employees.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = Number(process.env.PORT) || 4005;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "5mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/calling", callingRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/trainings", trainingsRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/stip", stipRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/leaves", leavesRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/employees", employeesRoutes);

app.get("/", (req, res) => {
  res.json({ message: "CRM backend is running" });
});

const handler = serverless(app);

async function startServer() {
  let attempts = 0;
  const maxAttempts = 5;

  function tryListen(p) {
    const server = app.listen(p, () => {
      console.log(`CRM backend listening on http://localhost:${p}`);
    });
    server.on("error", (err) => {
      if (err && err.code === "EADDRINUSE" && attempts < maxAttempts) {
        attempts += 1;
        const nextPort = p + 1;
        console.warn(`Port ${p} in use, retrying on ${nextPort} (attempt ${attempts})`);
        setTimeout(() => tryListen(nextPort), 200);
      } else {
        console.error("Failed to start server:", err);
        process.exit(1);
      }
    });
  }

  tryListen(port);

  connectDatabase()
    .then(() => seedDefaultAdmin())
    .catch((error) => {
      console.warn("Firebase initialization failed. API is running in degraded mode.");
      console.warn(error.message || "Unknown database startup error.");
    });
}

if (!process.env.VERCEL) {
  startServer();
}

export default handler;
