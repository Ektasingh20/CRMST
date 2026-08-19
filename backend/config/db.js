import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({
  path: path.join(__dirname, "..", "..", ".env"),
});

const uri = process.env.MONGODB_URI;

export let isMongoConnected = false;

export async function connectDatabase() {
  try {
    if (!uri) {
      throw new Error("MONGODB_URI is not defined in .env");
    }

    await mongoose.connect(uri);

    isMongoConnected = true;

    console.log("Connected to MongoDB:", mongoose.connection.name);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    console.warn(
      "Starting without MongoDB. Data will be stored in memory only."
    );

    isMongoConnected = false;
  }
}

export default { connectDatabase, isMongoConnected };