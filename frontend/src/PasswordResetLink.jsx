import { useState } from "react";
import { sendPasswordResetLink } from "../backendApi.js";

export default function PasswordResetLink({ userId, email }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const send = async () => {
    if (!userId) {
      setError(true);
      setMessage("Sign in to request a password reset link.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      setError(true);
      setMessage("Add a valid email address to your account before requesting a reset link.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await sendPasswordResetLink(userId);
      setError(false);
      setMessage(`Firebase sent a reset link to ${result.email}. It expires in 10 minutes and works once. Check your inbox and spam folder.`);
    } catch (sendError) {
      setError(true);
      setMessage(sendError instanceof Error ? sendError.message : "Could not send the password reset link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="password-reset-link">
      <p>Firebase will email a secure link to update your password. It expires in 10 minutes and works once.</p>
      <button type="button" onClick={send} disabled={busy}>{busy ? "Sending link..." : "Send password reset link"}</button>
      {message && <small className={`password-reset-status ${error ? "error" : "success"}`} role="status">{message}</small>}
    </div>
  );
}
