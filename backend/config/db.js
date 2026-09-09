import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

export let isMongoConnected = false;

export async function connectDatabase() {
  if (!getApps().length) {
    const encodedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    const credential = encodedServiceAccount
      ? cert(JSON.parse(Buffer.from(encodedServiceAccount, "base64").toString("utf8")))
      : applicationDefault();
    initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID || undefined });
  }
  await getFirestore().listCollections();
  isMongoConnected = true;
  console.log("Connected to Firebase Cloud Firestore");
  return true;
}

export default { connectDatabase, isMongoConnected };
