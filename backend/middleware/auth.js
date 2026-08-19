import jwt from "jsonwebtoken";
import User from "../models/User.js";

const secret = process.env.JWT_SECRET || "crmst-secret";

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.uid).select("-password");
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    req.user = user.toObject();
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}