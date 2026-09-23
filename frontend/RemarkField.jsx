import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "./remarkField.css";

export default function RemarkField({
  value = "", onChange, onCommit, placeholder = "Add remark", label = "Remark",
  readOnly = false, disabled = false, className = "crm-remark-input",
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [inlineValue, setInlineValue] = useState(() => String(value || ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);
  const sourceValue = String(value || "");
  useEffect(() => { setInlineValue(sourceValue); }, [sourceValue]);

  const openModal = () => { setDraft(inlineValue); setError(""); setOpen(true); };
  useEffect(() => {
    if (!open) return undefined;
    textareaRef.current?.focus();
    const handleKeyDown = (event) => { if (event.key === "Escape" && !saving) setOpen(false); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, saving]);

  const commit = async (nextValue) => {
    if (onCommit) await onCommit(nextValue);
  };
  const saveModal = async () => {
    try {
      setSaving(true); setError(""); setInlineValue(draft); onChange?.(draft); await commit(draft); setOpen(false);
    } catch (err) { setError(err?.message || "Could not save the remark."); }
    finally { setSaving(false); }
  };

  return <>
    <input className={className} value={inlineValue} placeholder={placeholder}
      aria-label={`${label}. Double-click to open full editor.`}
      title={inlineValue || "Double-click to open full remark editor"} readOnly={readOnly} disabled={disabled}
      onChange={(event) => { setInlineValue(event.target.value); onChange?.(event.target.value); }}
      onBlur={(event) => commit(event.target.value).catch(() => {})}
      onDoubleClick={openModal} />
    {open && createPortal(
      <div className="remark-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setOpen(false); }}>
        <section className="remark-modal" role="dialog" aria-modal="true" aria-labelledby="remark-modal-title">
          <div className="remark-modal-head">
            <div><small>FULL TEXT</small><h3 id="remark-modal-title">{label}</h3></div>
            <button type="button" className="remark-modal-close" onClick={() => setOpen(false)} disabled={saving} aria-label="Close remark"><X size={19} /></button>
          </div>
          <textarea ref={textareaRef} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={placeholder} readOnly={readOnly} rows={10} />
          <div className="remark-modal-meta"><span>{draft.length} characters</span><span>Press Esc to close</span></div>
          {error && <p className="remark-modal-error" role="alert">{error}</p>}
          <div className="remark-modal-actions">
            <button type="button" className="ghost-button" onClick={() => setOpen(false)} disabled={saving}>{readOnly ? "Close" : "Cancel"}</button>
            {!readOnly && <button type="button" className="primary-button" onClick={saveModal} disabled={saving}>{saving ? "Saving..." : "Save remark"}</button>}
          </div>
        </section>
      </div>, document.body
    )}
  </>;
}
