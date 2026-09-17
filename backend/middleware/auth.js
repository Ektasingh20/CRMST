import jwt from "jsonwebtoken";
import User from "../models/User.js";

const secret = process.env.JWT_SECRET || "crmst-secret";
const AUTH_CACHE_TTL_MS = 30 * 1000;
const authCache = new Map();

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, secret);
    const cacheKey = String(decoded.uid || "");
    const cached = authCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      req.user = cached.user;
      return next();
    }

    let user = (await User.findById(decoded.uid, decoded.dept).select("-password"))[0];
    if (!user) {
      user = (await User.findById(decoded.uid).select("-password"))[0];
    }
    if (!user && decoded.username) {
      user = await User.findOne({ username: String(decoded.username).trim().toLowerCase() });
    }
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    req.user = user.toObject();
    authCache.set(cacheKey, { user: req.user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
