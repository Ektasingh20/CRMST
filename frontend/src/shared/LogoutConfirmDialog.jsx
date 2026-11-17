import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LogOut } from "lucide-react";
import "./logoutConfirmDialog.css";

export default function LogoutConfirmDialog({ open, onCancel, onConfirm }) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      } else if (event.key === "Tab") {
        const buttons = dialogRef.current?.querySelectorAll("button:not(:disabled)");
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && document.contains(previousFocus)) previousFocus.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="logout-confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        ref={dialogRef}
        className="logout-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        aria-describedby="logout-confirm-description"
      >
        <div className="logout-confirm-heading">
          <span className="logout-confirm-icon" aria-hidden="true"><LogOut size={21} /></span>
          <div>
            <h2 id="logout-confirm-title">Log out?</h2>
            <p id="logout-confirm-description">Are you sure you want to log out of your account?</p>
          </div>
        </div>
        <div className="logout-confirm-actions">
          <button ref={cancelButtonRef} type="button" className="logout-confirm-cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="logout-confirm-submit" onClick={onConfirm}>
            <LogOut size={16} aria-hidden="true" /> Log out
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
