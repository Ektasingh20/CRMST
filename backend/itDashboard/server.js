import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { deleteApp, getApp } from "firebase-admin/app";
import { connectDatabase } from "../config/db.js";
import { createApp } from "./src/app.js";
import { createStore } from "./src/store.js";

await connectDatabase();

const projectId = process.env.FIREBASE_PROJECT_ID;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
const app = createApp({
  store: createStore(getFirestore()),
  auth: getAuth(),
  bucket: getStorage().bucket(storageBucket),
});
const port = Number(process.env.IT_DASHBOARD_PORT) || 4000;
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`IT Dashboard API listening on http://localhost:${port}`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.close(async () => {
    await deleteApp(getApp());
    process.exit(0);
  }));
}