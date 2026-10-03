export function normalizeWhatsAppPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const phone = digits.length === 10 ? `91${digits}` : digits;
  if (!/^\d{11,15}$/.test(phone)) throw new Error("Enter a valid phone number before sending.");
  return phone;
}

export function buildMessage(template, values = {}) {
  return String(template || "").replace(/{{\s*(name|amount|title|link)\s*}}/g, (_, key) => String(values[key] ?? ""));
}

export function resolvePaymentUrl(value, origin) {
  if (!value) return "";
  const url = new URL(value, origin);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Payment link is invalid.");
  return url.href;
}

export function isLocalPaymentUrl(value) {
  if (!value) return false;
  const host = new URL(value).hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export function resolveLeadTemplate(lead, leadType, templates) {
  const id = String(leadType === "training" ? lead?.programId || "" : lead?.serviceId || "");
  const byId = templates.find((template) => template.id === id && template.type === leadType);
  if (byId) return byId;
  const legacyName = String(lead?.program || lead?.service || lead?.training || "").trim().toLowerCase();
  return templates.find((template) => template.type === leadType
    && [template.title, template.key].some((value) => String(value || "").trim().toLowerCase() === legacyName)) || null;
}

export function templateSelectionPatch(leadType, template) {
  const field = leadType === "training" ? "programId" : "serviceId";
  return { [field]: template?.id || "", program: template?.title || "" };
}

export async function sendWhatsApp({ phone, message, log, openWindow = (url) => window.open(url, "_blank", "noopener,noreferrer"), logMessage }) {
  const cleanedPhone = normalizeWhatsAppPhone(phone);
  const finalMessage = String(message || "").trim();
  if (!finalMessage) throw new Error("Write a message before sending.");
  // Open the destination directly. The wa.me intermediary has been observed
  // replacing emoji in its redirect before the draft reaches WhatsApp.
  const url = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(finalMessage)}`;
  openWindow(url);
  if (logMessage) await logMessage({ ...log, phone: cleanedPhone });
  return url;
}

