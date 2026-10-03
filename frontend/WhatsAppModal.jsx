import { useEffect, useRef, useState } from "react";
import { fetchPaymentLink, fetchWhatsAppConfig } from "./backendApi.js";
import { buildMessage, isLocalPaymentUrl, resolveLeadTemplate, resolvePaymentUrl, sendWhatsApp } from "./whatsAppMessage.js";
import { useMessageTemplates } from "./useMessageTemplates.js";
import "./whatsAppModal.css";

export default function WhatsAppModal({ lead, leadType, currentUser, onClose, onSelectTemplate, onSent }) {
  const { templates, loading, error: templatesError } = useMessageTemplates(leadType);
  const [kind, setKind] = useState("intro");
  const [templateId, setTemplateId] = useState("");
  const [paymentLink, setPaymentLink] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [messageConfig, setMessageConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState("");
  const [detailsMessage, setDetailsMessage] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [introMessage, setIntroMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef(null);
  const template = templates.find((item) => item.id === templateId);
  const selectedPaymentLink = paymentLink?.templateId === templateId ? paymentLink : null;
  const paymentOrigin = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
  const storedPaymentUrl = selectedPaymentLink ? resolvePaymentUrl(selectedPaymentLink.url, paymentOrigin) : "";
  const paymentUrl = selectedPaymentLink?.demo && isLocalPaymentUrl(storedPaymentUrl)
    ? messageConfig?.demoPaymentUrl || "" : storedPaymentUrl;
  const demoQrPreviewUrl = selectedPaymentLink?.demo ? resolvePaymentUrl(selectedPaymentLink.url, window.location.origin) : "";
  const localPaymentUrl = isLocalPaymentUrl(paymentUrl);
  const paymentAmount = selectedPaymentLink ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(selectedPaymentLink.amount) || 0) : "";
  const activeMessage = kind === "intro" ? introMessage : kind === "course" ? detailsMessage : paymentMessage;

  useEffect(() => {
    let active = true;
    fetchWhatsAppConfig().then((config) => {
      if (active) { setMessageConfig(config); setConfigError(""); }
    }).catch((failure) => {
      if (active) setConfigError(failure.message || "Could not load WhatsApp message settings.");
    }).finally(() => { if (active) setConfigLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (messageConfig?.greetingMessage) {
      setIntroMessage(buildMessage(messageConfig.greetingMessage, { name: lead.name || "there" }));
    }
  }, [messageConfig?.greetingMessage, lead.name]);

  useEffect(() => {
    setTemplateId((current) => current && templates.some((item) => item.id === current)
      ? current : resolveLeadTemplate(lead, leadType, templates)?.id || "");
  }, [lead, leadType, templates]);

  useEffect(() => {
    if (kind !== "payment" || !template?.id) { setPaymentLink(null); setPaymentError(""); return; }
    let active = true;
    setPaymentLoading(true);
    setPaymentLink(null);
    setPaymentError("");
    fetchPaymentLink(template.id).then((link) => { if (active) setPaymentLink({ ...link, templateId: template.id }); })
      .catch((failure) => { if (active) setPaymentError(failure.status === 404 ? "No payment link set for this program" : failure.message || "Could not load payment link."); })
      .finally(() => { if (active) setPaymentLoading(false); });
    return () => { active = false; };
  }, [kind, template?.id]);

  useEffect(() => {
    if (!template) { setDetailsMessage(""); return; }
    setDetailsMessage(buildMessage(template.message, {
      name: lead.name || "there", amount: template.amount ?? "", title: template.title || "", link: "",
    }));
    setCopied(false);
  }, [template, lead.name]);

  useEffect(() => {
    const paymentTemplate = selectedPaymentLink?.demo ? messageConfig?.demoPaymentMessage : messageConfig?.paymentMessage;
    if (!template || !selectedPaymentLink || !paymentTemplate || !paymentUrl) { setPaymentMessage(""); return; }
    setPaymentMessage(buildMessage(paymentTemplate, {
      name: lead.name || "there", amount: selectedPaymentLink.amount ?? template.amount ?? "",
      title: template.title || "", link: paymentUrl,
    }));
    setCopied(false);
  }, [template, selectedPaymentLink, paymentUrl, messageConfig, lead.name]);

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const chooseTemplate = async (id) => {
    setTemplateId(id);
    setError("");
    const selected = templates.find((item) => item.id === id);
    if (selected && onSelectTemplate) {
      try { await onSelectTemplate(selected); }
      catch (failure) { setError(failure.message || "Could not save the selected training or service."); }
    }
  };

  const chooseKind = (nextKind) => {
    setKind(nextKind);
    setError("");
    setCopied(false);
    bodyRef.current?.scrollTo({ top: 0 });
  };

  const send = async () => {
    if (kind !== "intro" && !template) { setError(`Select a ${leadType === "training" ? "training" : "service"} template first.`); return; }
    if (kind === "payment" && !selectedPaymentLink) { setError(paymentError || "No payment link set for this program"); return; }
    if (kind === "payment" && localPaymentUrl) { setError("This payment link uses localhost and will not open on the customer's device. Use a public CRM URL or public payment link."); return; }
    if (!activeMessage.trim()) { setError("Write a message before opening WhatsApp."); return; }
    setError("");
    setSending(true);
    try {
      await sendWhatsApp({ phone: lead.contact || lead.phone, message: activeMessage });
      await onSent?.();
      setCopied(false);
    } catch (failure) { setError(failure.message || "Could not open WhatsApp."); }
    finally { setSending(false); }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(activeMessage);
      setCopied(true);
      setError("");
    } catch { setError("Could not copy the message. Select the preview text and copy it manually."); }
  };

  return <div className="modal-surface whatsapp-modal-surface" role="dialog" aria-modal="true" aria-label="WhatsApp message">
    <div className="modal-backdrop" onClick={onClose} />
    <div className="modal-shell whatsapp-modal-shell">
      <div className="modal-head"><strong>Send WhatsApp to {lead.name || "contact"}</strong><button className="whatsapp-modal-close" type="button" onClick={onClose} aria-label="Close WhatsApp modal">×</button></div>
      <div className="modal-body whatsapp-modal-body" ref={bodyRef}>
        <div className="whatsapp-kind-tabs" role="group" aria-label="Message type">
          <button type="button" className={kind === "intro" ? "active" : ""} aria-pressed={kind === "intro"} onClick={() => chooseKind("intro")}>Greeting</button>
          <button type="button" className={kind === "course" ? "active" : ""} aria-pressed={kind === "course"} onClick={() => chooseKind("course")}>{leadType === "training" ? "Training Details" : "Service Details"}</button>
          <button type="button" className={kind === "payment" ? "active" : ""} aria-pressed={kind === "payment"} onClick={() => chooseKind("payment")}>Payment Link</button>
        </div>
        {kind !== "course" && configLoading && <p className="whatsapp-modal-note" role="status">Loading WhatsApp message settings…</p>}
        {kind !== "course" && configError && <p className="whatsapp-modal-error" role="alert">{configError}</p>}
        {kind !== "intro" && loading && <p className="whatsapp-modal-note" role="status">Loading message templates…</p>}
        {kind !== "intro" && templatesError && <p className="whatsapp-modal-error" role="alert">{templatesError}</p>}
        {kind !== "intro" && !loading && !templatesError && !templates.length && <p className="whatsapp-modal-note">No active {leadType} message templates are available.</p>}
        {kind !== "intro" && <label className="whatsapp-modal-field"><span>{leadType === "training" ? "Training" : "Service"} template</span><select value={templateId} disabled={loading || !templates.length} onChange={(event) => chooseTemplate(event.target.value)}><option value="">Select {leadType === "training" ? "Training" : "Service"}</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
        {kind !== "intro" && !loading && templates.length > 0 && !template && <p className="whatsapp-modal-note">Select a {leadType === "training" ? "Training" : "Service"} above to view its {kind === "payment" ? "demo payment link" : "details message"}.</p>}
        {kind === "course" && template?.priceText && <p className="whatsapp-modal-price">{template.priceText}</p>}
        {paymentLoading && <p className="whatsapp-modal-note" role="status">Loading payment link…</p>}
        {paymentError && <p className="whatsapp-modal-error" role="alert">{paymentError}</p>}
        {kind === "payment" && selectedPaymentLink?.demo && <p className="whatsapp-modal-note">Demo amount: {paymentAmount}. No money can be collected. <a href={demoQrPreviewUrl} target="_blank" rel="noopener noreferrer">Open local QR preview</a></p>}
        {kind === "payment" && localPaymentUrl && <p className="whatsapp-modal-error" role="alert">This demo link points to localhost, so the customer cannot open it. You can preview the QR page here, but set a public CRM URL or public payment link before sharing.</p>}
        {kind === "intro" && <label className="whatsapp-modal-field"><span>Greeting message (editable)</span><textarea rows={5} value={introMessage} onChange={(event) => { setIntroMessage(event.target.value); setCopied(false); }} /></label>}
        {kind === "course" && <label className="whatsapp-modal-field"><span>{leadType === "training" ? "Training" : "Service"} details (editable)</span><textarea rows={8} value={detailsMessage} onChange={(event) => { setDetailsMessage(event.target.value); setCopied(false); }} placeholder="Choose a template to preview the details" /></label>}
        {kind === "payment" && <label className="whatsapp-modal-field"><span>Payment message (editable)</span><textarea rows={8} value={paymentMessage} onChange={(event) => { setPaymentMessage(event.target.value); setCopied(false); }} placeholder="Choose a template to preview the payment message" /></label>}
        <p className="whatsapp-modal-note">If WhatsApp shows broken emoji, use Copy message and paste it into the chat.</p>
        <p className="whatsapp-modal-note">Sending as {currentUser?.name || currentUser?.username || "your account"} to {lead.contact || lead.phone || "no phone number"}.</p>
        {error && <p className="whatsapp-modal-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="whatsapp-modal-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="whatsapp-modal-copy" onClick={copyMessage} disabled={!activeMessage.trim()}>{copied ? "Copied!" : "Copy message"}</button>
          <button type="button" className="whatsapp-modal-send" onClick={send} disabled={sending || (kind !== "course" && (configLoading || Boolean(configError))) || (kind !== "intro" && (loading || Boolean(templatesError) || !template)) || (kind === "payment" && (paymentLoading || Boolean(paymentError) || !selectedPaymentLink || localPaymentUrl)) || !activeMessage.trim()}>
            {sending ? "Opening…" : kind === "intro" ? "Open greeting" : kind === "course" ? "Open details" : "Open payment message"}
          </button>
        </div>
      </div>
    </div>
  </div>;
}
