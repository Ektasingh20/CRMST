const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const IMAGEKIT_FILES_URL = "https://api.imagekit.io/v1/files";

function privateKey() {
  const value = String(process.env.IMAGEKIT_PRIVATE_KEY || "").trim();
  if (!value) throw Object.assign(new Error("ImageKit uploads are not configured."), { status: 503 });
  return value;
}

function authorization() {
  return `Basic ${Buffer.from(`${privateKey()}:`).toString("base64")}`;
}

export async function uploadImageKitFile({ buffer, name, type, folder }) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type }), name);
  form.append("fileName", name);
  form.append("folder", folder);
  form.append("useUniqueFileName", "true");
  const response = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: authorization() },
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  const uploaded = await response.json().catch(() => null);
  if (!response.ok || !uploaded?.url || !uploaded?.fileId || !/^https:\/\//i.test(uploaded.url)) {
    throw Object.assign(new Error(uploaded?.message || "ImageKit upload failed. Please try again."), { status: 502 });
  }
  return { url: uploaded.url, fileId: uploaded.fileId };
}

export async function deleteImageKitFile(fileId) {
  const id = String(fileId || "").trim();
  if (!id) return;
  const response = await fetch(`${IMAGEKIT_FILES_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: authorization() },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error("The replaced ImageKit file could not be removed.");
  }
}
