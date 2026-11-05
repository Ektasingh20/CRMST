import React, { useEffect, useState } from "react";
import { updateMyProfile } from "../../backendApi.js";
import { uploadImage } from "../../backendClient.js";
import { compressImageFile, createPreviewUrl, revokePreviewUrl } from "../../imageUpload.js";
import "./studentProfile.css";

function formFromUser(user = {}) {
  return {
    name: user.name || "",
    phone: user.phone || "",
    dob: user.dob || "",
    gender: user.gender || "",
    personalEmail: user.personalEmail || "",
    emergencyContact: user.emergencyContact || "",
    education: user.education || "",
    address: user.address || "",
  };
}

function formatJoined(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function initials(value) {
  return String(value || "S").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function StudentProfileEditor({ user, enrolledCount, onSaved }) {
  const [form, setForm] = useState(() => formFromUser(user));
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { setForm(formFromUser(user)); }, [user?.id, user?._id, user?.updatedAt]);
  useEffect(() => {
    if (!photoFile) { setPhotoPreview(""); return undefined; }
    const url = createPreviewUrl(photoFile);
    setPhotoPreview(url);
    return () => revokePreviewUrl(url);
  }, [photoFile]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setSuccess("");
  };

  const pickPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WEBP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB.");
      event.target.value = "";
      return;
    }
    setPhotoFile(file);
    setError("");
    setSuccess("");
    event.target.value = "";
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, String(value || "").trim()]));
    if (!payload.name) { setError("Enter your full name."); return; }
    if (!/^[6-9]\d{9}$/.test(payload.phone)) { setError("Enter a valid 10-digit mobile number."); return; }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (photoFile) {
        const compressed = await compressImageFile(photoFile);
        const uploaded = await uploadImage(compressed);
        if (!uploaded.imageUrl) throw new Error("Photo upload did not return an image. Please try again.");
        payload.imageUrl = uploaded.imageUrl;
        payload.imagePublicId = uploaded.publicId;
      }
      const updated = await updateMyProfile(payload);
      onSaved?.(updated);
      setPhotoFile(null);
      setSuccess("Profile saved successfully.");
    } catch (saveError) {
      setError(saveError?.message || "Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const batch = user?.batchNo || user?.batch || user?.batchYear;
  const accountDetails = [
    ["Student ID", user?.studentId || user?.registrationId || user?.id || user?._id || "—"],
    ["Account email", user?.email || "—"],
    ["Enrolled courses", enrolledCount],
    ...(batch ? [["Batch", batch]] : []),
    ...(formatJoined(user?.joined) ? [["Joined", formatJoined(user.joined)]] : []),
  ];
  const photo = photoPreview || user?.imageUrl || "";

  return (
    <div className="student-profile-page">
      <section className="student-profile-card">
        <div className="student-profile-heading">
          <div className="student-profile-avatar">{photo ? <img src={photo} alt="Your profile" /> : initials(form.name)}</div>
          <div>
            <h2>{form.name || "Your profile"}</h2>
            <p>Keep your contact and student details up to date.</p>
          </div>
        </div>

        <div className="student-profile-photo-row">
          <div>
            <strong>Profile photo</strong>
            <p>JPG, PNG, or WEBP · up to 5 MB</p>
          </div>
          <label className="student-profile-upload" htmlFor="student-profile-photo">{photo ? "Change photo" : "Add photo"}<input id="student-profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} /></label>
          {photoFile && <button type="button" className="student-profile-text-button" onClick={() => setPhotoFile(null)}>Discard selection</button>}
        </div>

        <form onSubmit={save}>
          <h3>Personal details</h3>
          <div className="student-profile-form-grid">
            <label>Full name <span>*</span><input name="name" autoComplete="name" required maxLength={120} value={form.name} onChange={(event) => setField("name", event.target.value)} /></label>
            <label>Mobile number <span>*</span><input name="phone" autoComplete="tel" inputMode="numeric" required pattern="[6-9][0-9]{9}" maxLength={10} value={form.phone} onChange={(event) => setField("phone", event.target.value.replace(/\D/g, "").slice(0, 10))} /></label>
            <label>Date of birth<input name="dob" type="date" value={form.dob} onChange={(event) => setField("dob", event.target.value)} /></label>
            <label>Gender<select name="gender" value={form.gender} onChange={(event) => setField("gender", event.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select></label>
            <label>Personal email<input name="personalEmail" type="email" autoComplete="email" maxLength={254} placeholder="name@example.com" value={form.personalEmail} onChange={(event) => setField("personalEmail", event.target.value)} /></label>
            <label>Emergency contact<input name="emergencyContact" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} placeholder="10-digit mobile number" value={form.emergencyContact} onChange={(event) => setField("emergencyContact", event.target.value.replace(/\D/g, "").slice(0, 10))} /></label>
            <label className="student-profile-wide">Education / qualification<input name="education" maxLength={160} value={form.education} onChange={(event) => setField("education", event.target.value)} /></label>
            <label className="student-profile-wide">Residential address<textarea name="address" rows={3} maxLength={500} value={form.address} onChange={(event) => setField("address", event.target.value)} /></label>
          </div>
          {error && <div className="student-profile-error" role="alert">{error}</div>}
          {success && <div className="student-profile-success" role="status">{success}</div>}
          <div className="student-profile-actions"><button type="submit" disabled={saving}>{saving ? "Saving profile..." : "Save changes"}</button></div>
        </form>
      </section>

      <aside className="student-profile-card student-profile-account">
        <h3>Student account</h3>
        <p>These details are maintained by your institute.</p>
        <dl>{accountDetails.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </aside>
    </div>
  );
}
