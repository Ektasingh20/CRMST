import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { confirmPasswordReset } from "../backendApi.js";

export default function PasswordResetPage() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "";
  const continueUrl = params.get("continueUrl") || "";
  let continueParams = new URLSearchParams();
  try { continueParams = new URL(continueUrl).searchParams; } catch { /* Continue URL may not be included by every Firebase handler. */ }
  const resetToken = params.get("ticket") || continueParams.get("ticket") || "";
  const oobCode = params.get("oobCode") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(() => mode === "resetPassword" && resetToken && oobCode
    ? ""
    : "This reset link is incomplete. Set the Firebase password reset action URL to this page, then request a new link.");
  const [success, setSuccess] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (mode !== "resetPassword" || !resetToken || !oobCode) return setMessage("This reset link is incomplete. Set the Firebase password reset action URL to this page, then request a new link.");
    if (password.length < 6) return setMessage("Use a password with at least 6 characters.");
    if (password !== confirm) return setMessage("The passwords do not match.");
    setBusy(true);
    try {
      const result = await confirmPasswordReset(resetToken, oobCode, password);
      setSuccess(true);
      setMessage(result?.message || "Password updated. You can now sign in with your new password.");
      setPassword("");
      setConfirm("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This reset link expired or was already used.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="password-reset-page">
      <section className="password-reset-card">
        <div className="password-reset-lock" aria-hidden="true"><LockKeyhole size={24} /></div>
        <p className="password-reset-eyebrow">Account security</p>
        <h1>Reset your password</h1>
        <p className="password-reset-intro">This link expires 10 minutes after it was requested and can be used once.</p>
        {!success && <form onSubmit={submit}>
          <label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required /></label>
          <label>Confirm new password<input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength={6} required /></label>
          <button type="submit" disabled={busy || mode !== "resetPassword" || !resetToken || !oobCode}>{busy ? "Updating..." : "Update password"}</button>
        </form>}
        {message && <p className={`password-reset-page-message ${success ? "success" : "error"}`} role="status">{message}</p>}
        {success && <a href="/">Return to sign in</a>}
      </section>
    </main>
  );
}
