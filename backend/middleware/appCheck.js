import { getAppCheck } from "firebase-admin/app-check";

export async function verifyAppCheckIfConfigured(req, res, next) {
  const token = String(req.headers["x-firebase-appcheck"] || "").trim();
  const required = String(process.env.REQUIRE_FIREBASE_APP_CHECK || "").toLowerCase() === "true";
  if (!token) {
    if (required) return res.status(401).json({ error: "Firebase App Check token is required." });
    return next();
  }
  try {
    req.appCheck = await getAppCheck().verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid Firebase App Check token." });
  }
}
