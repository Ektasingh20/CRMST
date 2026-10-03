import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "node:fs";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

export let isMongoConnected = false;

export async function connectDatabase() {
  if (!getApps().length) {
    const emulatorHosts = [
      process.env.FIRESTORE_EMULATOR_HOST,
      process.env.FIREBASE_AUTH_EMULATOR_HOST,
      process.env.FIREBASE_STORAGE_EMULATOR_HOST,
    ];
    const usingEmulators = emulatorHosts.every(Boolean);
    if (emulatorHosts.some(Boolean) && !usingEmulators) {
      throw new Error("Firestore, Auth, and Storage emulator hosts must be configured together.");
    }
    if (usingEmulators && emulatorHosts.some((host) => !/^(127\.0\.0\.1|localhost):\d+$/.test(host))) {
      throw new Error("Firebase emulators must use loopback hosts.");
    }
    const encodedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    const serviceAccountPath = path.resolve(__dirname, "..", "serviceAccount.json");
    const serviceAccount = !usingEmulators && fs.existsSync(serviceAccountPath)
      ? JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"))
      : null;
    const credential = usingEmulators
      ? null
      : encodedServiceAccount
      ? cert(JSON.parse(Buffer.from(encodedServiceAccount, "base64").toString("utf8")))
      : serviceAccount
        ? cert(serviceAccount)
        : applicationDefault();
    initializeApp({
      ...(credential ? { credential } : {}),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount?.project_id || undefined,
    });
  }
  await getFirestore().listCollections();
  isMongoConnected = true;
  console.log("Connected to Firebase Cloud Firestore");
  return true;
}

export default { connectDatabase, isMongoConnected };
