import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import User from "../models/User.js";
import { isMongoConnected } from "../config/db.js";

const secret = process.env.JWT_SECRET || "crmst-secret";

export async function login(req, res) {
  if (!isMongoConnected) {
    return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  }
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const user = await User.findOne({ username: normalizedUsername });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const storedPassword = String(user.password || "");
    const isHashed = storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$");
    let match = false;
    const email = String(user.email || "").trim().toLowerCase();
    if (user.firebaseAuthManaged) {
      const apiKey = process.env.FIREBASE_WEB_API_KEY;
      if (!apiKey) return res.status(503).json({ error: "Firebase web API key is not configured for password sign-in." });
      try {
        const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: String(password), returnSecureToken: true }),
        });
        match = authResponse.ok;
      } catch (error) {
        console.error("Firebase password verification failed:", error);
        return res.status(503).json({ error: "Firebase Authentication is unavailable. Please try again." });
      }
    } else {
      match = isHashed ? await bcrypt.compare(password, storedPassword) : storedPassword === String(password);
    }

    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.firebaseAuthManaged) {
      const storedMatches = isHashed ? await bcrypt.compare(password, storedPassword) : storedPassword === String(password);
      if (!storedMatches) {
        user.password = await bcrypt.hash(String(password), 10);
        await user.save();
      }
    }

    // Link legacy Firestore accounts to Firebase Authentication after a successful
    // password sign-in so Firebase can deliver its native reset email.
    if (!user.firebaseAuthManaged && process.env.FIREBASE_WEB_API_KEY && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const auth = getAuth();
      let authUser;
      try { authUser = await auth.getUserByEmail(email); }
      catch (error) { if (error.code !== "auth/user-not-found") throw error; }
      let canLink = false;
      if (authUser) {
        const apiKey = process.env.FIREBASE_WEB_API_KEY;
        const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: String(password), returnSecureToken: true }),
        });
        canLink = authResponse.ok;
      } else {
        authUser = await auth.createUser({ email, password: String(password), displayName: user.name || user.username });
        canLink = true;
      }
      if (canLink) {
        user.firebaseAuthManaged = true;
        user.firebaseAuthUid = authUser.uid;
        await user.save();
      }
    }

    const token = jwt.sign({ uid: String(user._id), username: user.username, role: user.role, dept: user.dept }, secret, { expiresIn: "12h" });
    return res.json({
      token,
      user: { id: String(user._id), username: user.username, name: user.name, email: user.email, phone: user.phone, emergencyContact: user.emergencyContact, maritalStatus: user.maritalStatus, education: user.education, role: user.role, dept: user.dept, position: user.position, joined: user.joined, state: user.state, branch: user.branch, branchCode: user.branchCode, address: user.address, imageUrl: user.imageUrl || "", imagePublicId: user.imagePublicId || "" },
    });
  } catch (err) {
    console.error("Login error:", err);
    const quotaExceeded = err?.code === 8 || String(err?.code || "").toUpperCase() === "RESOURCE_EXHAUSTED" || /resource exhausted|quota exceeded/i.test(String(err?.message || ""));
    return res.status(quotaExceeded ? 429 : 500).json({
      error: quotaExceeded
        ? "Firebase Firestore quota is exhausted. Please wait for the quota reset or increase the Firebase database quota, then try again."
        : (err.message || "Login failed"),
    });
  }
}

export async function changePassword(req, res) {
  if (!isMongoConnected) {
    return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  }
  try {
    const { userId, currentPassword, newPassword } = req.body;
    const authenticatedUserId = String(req.user?.id || req.user?._id || "");
    if (String(userId || "") !== authenticatedUserId) {
      return res.status(403).json({ error: "You can only change your own password." });
    }
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    const user = await User.findOne({ id: String(userId) }) || await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const storedPassword = String(user.password || "");
    const isHashed = storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$");
    const currentMatch = isHashed ? await bcrypt.compare(currentPassword, storedPassword) : storedPassword === String(currentPassword);

    if (!currentMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    if (String(currentPassword) === String(newPassword)) {
      return res.status(400).json({ error: "New password must be different from current password" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    if (user.firebaseAuthManaged && user.firebaseAuthUid) {
      await getAuth().updateUser(user.firebaseAuthUid, { password: String(newPassword) });
    }
    user.password = hash;
    await user.save();

    return res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ error: err.message || "Failed to change password" });
  }
}

export async function requestPasswordResetEmail(req, res) {
  if (!isMongoConnected) return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  try {
    const userId = String(req.params.id || "");
    const authenticatedUserId = String(req.user?.id || req.user?._id || "");
    if (!userId || userId !== authenticatedUserId) return res.status(403).json({ error: "You can only reset your own password." });
    const user = await User.findOne({ id: userId }) || await User.findOne({ _id: userId });
    if (!user) return res.status(404).json({ error: "User not found." });
    const email = String(user.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Add a valid email address to your profile before requesting a reset link." });
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Firebase web API key is not configured. Add FIREBASE_WEB_API_KEY to backend/.env." });
    const handlerUrl = process.env.FIREBASE_PASSWORD_RESET_HANDLER_URL || "http://localhost:5174/password-reset";
    let continueUrl;
    try { continueUrl = new URL(handlerUrl); }
    catch { return res.status(503).json({ error: "FIREBASE_PASSWORD_RESET_HANDLER_URL must be a valid absolute URL." }); }
    const auth = getAuth();
    let authUser;
    let createdAuthUser = false;
    try { authUser = await auth.getUserByEmail(email); }
    catch (error) { if (error.code !== "auth/user-not-found") throw error; }
    if (!authUser) {
      authUser = await auth.createUser({
        email,
        password: randomBytes(32).toString("base64url"),
        displayName: user.name || user.username || "User",
      });
      createdAuthUser = true;
    }
    const resetToken = randomBytes(32).toString("base64url");
    user.passwordResetAuthUid = authUser.uid;
    user.passwordResetTokenHash = createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetExpiresAt = Date.now() + 10 * 60 * 1000;
    user.passwordResetUsedAt = 0;
    await user.save();
    continueUrl.searchParams.set("ticket", resetToken);
    const emailResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "PASSWORD_RESET", email, continueUrl: continueUrl.toString() }),
    });
    if (!emailResponse.ok) {
      user.passwordResetTokenHash = "";
      user.passwordResetExpiresAt = 0;
      user.passwordResetAuthUid = "";
      await user.save();
      if (createdAuthUser) await auth.deleteUser(authUser.uid).catch(() => {});
      const responseBody = await emailResponse.json().catch(() => null);
      const reason = responseBody?.error?.message;
      const message = reason === "OPERATION_NOT_ALLOWED"
        ? "Enable Email/Password sign-in in Firebase Authentication."
        : reason === "INVALID_API_KEY"
          ? "FIREBASE_WEB_API_KEY is invalid for this Firebase project."
          : reason === "INVALID_CONTINUE_URI" || reason === "UNAUTHORIZED_DOMAIN"
            ? "Add the password reset handler domain to Firebase Authentication's authorized domains."
            : "Firebase could not send the reset email. Check Firebase Authentication settings and try again.";
      return res.status(503).json({ error: message });
    }
    user.firebaseAuthManaged = true;
    user.firebaseAuthUid = authUser.uid;
    await user.save();
    return res.json({ email });
  } catch (error) {
    console.error("Password reset link creation failed:", error);
    return res.status(500).json({ error: error.message || "Could not create the password reset link." });
  }
}

export async function confirmPasswordReset(req, res) {
  if (!isMongoConnected) return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  try {
    const resetToken = String(req.body?.resetToken || "");
    const oobCode = String(req.body?.oobCode || "");
    const newPassword = String(req.body?.newPassword || "");
    if (!resetToken || resetToken.length > 200 || !oobCode || newPassword.length < 6) {
      return res.status(400).json({ error: "This reset link is invalid, or the new password is shorter than 6 characters." });
    }
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Firebase web API key is not configured." });
    const tokenHash = createHash("sha256").update(resetToken).digest("hex");
    const user = await User.findOne({ passwordResetTokenHash: tokenHash });
    if (!user || Number(user.passwordResetUsedAt || 0) || Number(user.passwordResetExpiresAt || 0) <= Date.now()) {
      return res.status(400).json({ error: "This reset link expired or was already used. Request a new link from Settings." });
    }
    const uid = String(user.passwordResetAuthUid || user.firebaseAuthUid || "");
    if (!uid) return res.status(400).json({ error: "This reset link is invalid. Request a new one from Settings." });

    const verifyResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oobCode }),
    });
    const verifiedAction = await verifyResponse.json().catch(() => null);
    if (!verifyResponse.ok || String(verifiedAction?.email || "").trim().toLowerCase() !== String(user.email || "").trim().toLowerCase()) {
      return res.status(400).json({ error: "The Firebase reset link is invalid, expired, or belongs to another account." });
    }
    const authUser = await getAuth().getUserByEmail(user.email);
    if (authUser.uid !== uid) return res.status(400).json({ error: "The reset link no longer matches this account." });

    const userRef = user._ref;
    const usedAt = Date.now();
    await getFirestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(userRef);
      const current = snapshot.data() || {};
      if (current.passwordResetTokenHash !== tokenHash
        || Number(current.passwordResetUsedAt || 0)
        || Number(current.passwordResetExpiresAt || 0) <= Date.now()) {
        throw new Error("This reset link expired or was already used. Request a new link from Settings.");
      }
      transaction.update(userRef, {
        passwordResetTokenHash: "",
        passwordResetExpiresAt: 0,
        passwordResetUsedAt: usedAt,
      });
    });

    const resetResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oobCode, newPassword }),
    });
    if (!resetResponse.ok) throw new Error("Firebase rejected this reset code. Request a new password reset link.");
    user.password = await bcrypt.hash(newPassword, 10);
    user.firebaseAuthManaged = true;
    user.firebaseAuthUid = uid;
    user.passwordResetTokenHash = "";
    user.passwordResetExpiresAt = 0;
    user.passwordResetUsedAt = usedAt;
    delete user.passwordResetAuthUid;
    await user.save();
    return res.json({ success: true, message: "Password updated. You can now sign in with your new password." });
  } catch (error) {
    console.error("Password reset confirmation failed:", error);
    return res.status(400).json({ error: error.message || "This reset link is invalid or expired." });
  }
}

export async function signup(req, res) {
  return res.status(403).json({ error: "Accounts are created by an Admin." });
}
