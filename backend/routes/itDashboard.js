import express from "express";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { connectDatabase } from "../config/db.js";
import { createApp } from "../itDashboard/src/app.js";
import { createStore } from "../itDashboard/src/store.js";

const router = express.Router();
let apiPromise;

router.use(async (req, res, next) => {
  try {
    apiPromise ||= connectDatabase().then(() => createApp({
      store: createStore(getFirestore()),
      auth: getAuth(),
      bucket: getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`),
    }, process.env, ""));
    const api = await apiPromise;
    api(req, res, next);
  } catch (error) {
    console.error("IT Dashboard Firebase initialization failed:", error.code || error.name);
    res.status(503).json({ error: "IT Dashboard Firebase connection unavailable." });
  }
});

export default router;