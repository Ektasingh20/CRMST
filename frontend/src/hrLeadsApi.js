const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const TOKEN_KEY = "crmst-api-token";

async function request(path, options = {}) {
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error("Please log in to manage leads.");
  const response = await fetch(`${API_BASE}/hr/leads${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || response.statusText || "Lead request failed.");
    error.status = response.status;
    error.duplicate = body.duplicate || null;
    throw error;
  }
  return response.json().catch(() => null);
}

export const fetchHrLeads = () => request("");
export const createHrLead = (lead) => request("", { method: "POST", body: JSON.stringify(lead) });
export const updateHrLead = (id, lead) => request(`/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(lead) });
export const deleteHrLead = (id) => request(`/${encodeURIComponent(id)}`, { method: "DELETE" });

export async function uploadHrLeadResume(file) {
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error("Please log in to upload a resume.");
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_BASE}/hr/leads/resume`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || response.statusText || "Resume upload failed.");
  }
  return response.json();
}
