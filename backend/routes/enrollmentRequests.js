import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  createEnrollmentRequest,
  listPendingEnrollmentRequests,
  listStudentEnrollmentRequests,
  updateEnrollmentRequestStatus,
} from "../controllers/enrollmentRequestsController.js";

const router = express.Router();
router.use(authenticate);

router.get("/student/:studentId", listStudentEnrollmentRequests);
router.get("/pending", listPendingEnrollmentRequests);
router.post("/", createEnrollmentRequest);
router.patch("/:studentId/:requestId/status", updateEnrollmentRequestStatus);

export default router;
