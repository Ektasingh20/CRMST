import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

for (const envPath of [
  path.resolve(__dirname, "..", "..", ".env"),
  path.resolve(__dirname, "..", ".env"),
]) {
  dotenv.config({ path: envPath });
}

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.MONGO_URI;

export let isMongoConnected = false;

export async function connectDatabase() {
  if (!uri) {
    throw new Error("MongoDB connection string is missing. Set MONGODB_URI (or DATABASE_URL) in the project .env file.");
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 10,
    });

    isMongoConnected = true;
    console.log("Connected to MongoDB:", mongoose.connection.name);
    return true;
  } catch (error) {
    isMongoConnected = false;
    const details = error?.message || String(error);
    const isAtlasNetworkIssue = /not whitelisted|network access|ip address|econnrefused|timeout|handshake|failed to connect|ECONNRESET/i.test(details);

    const message = isAtlasNetworkIssue
      ? "MongoDB Atlas connection rejected. Add this machine/server IP to Atlas Network Access (whitelist), then restart the backend. Do not disable database security."
      : `MongoDB connection failed: ${details}`;

    console.error(message);

    if (process.env.ALLOW_IN_MEMORY_FALLBACK === "true") {
      console.warn("In-memory fallback is explicitly enabled via ALLOW_IN_MEMORY_FALLBACK=true. It is not persistent CRM storage.");
      return false;
    }

    throw new Error(message);
  }
}

export default { connectDatabase, isMongoConnected };