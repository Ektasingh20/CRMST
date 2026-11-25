import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const validMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ""));
const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
const monthValue = (year, monthIndex) => `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
const displayMonth = (value) => {
  if (!validMonth(value)) return "Select month";
  const [year, month] = value.split("-").map(Number);
  return `${MONTHS[month - 1]}, ${year}`;
};

export default function HrMonthPicker({ value, min, max, onChange, label = "Month", id }) {
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const selectedYear = validMonth(value) ? Number(value.slice(0, 4)) : Number(currentMonth().slice(0, 4));
  const [visibleYear, setVisibleYear] = useState(selectedYear);
  const lower = validMonth(min) ? min : "1900-01";
  const upper = validMonth(max) ? max : currentMonth();
  const minYear = Number(lower.slice(0, 4));
  const maxYear = Number(upper.slice(0, 4));
  const isAvailable = (month) => month >= lower && month <= upper;
  const yearAvailable = (year) => monthValue(year, 11) >= lower && monthValue(year, 0) <= upper;

  useLayoutEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(340, window.innerWidth - 16);
      const height = 286;
      const below = window.innerHeight - rect.bottom;
      const top = below >= height || rect.top < height ? rect.bottom + 5 : rect.top - height - 5;
      setPosition({
        top: Math.max(8, Math.min(top, window.innerHeight - height - 8)),
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width,
      });
    };
    const closeOutside = (event) => {
      if (!triggerRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)) setOpen(false);
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const select = (month) => {
    if (!isAvailable(month)) return;
    onChange?.(month);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return <div className="hr-month-picker">
    <button
      ref={triggerRef}
      id={id}
      type="button"
      className="hr-month-picker-trigger"
      aria-label={`${label}: ${displayMonth(value)}`}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => {
        if (!open) setVisibleYear(selectedYear);
        setOpen((current) => !current);
      }}
    >
      <span>{displayMonth(value)}</span><CalendarDays size={16} aria-hidden="true" />
    </button>
    {open && position && createPortal(<div
      ref={popoverRef}
      className="hr-month-calendar-popover"
      role="dialog"
      aria-label={`${label} picker`}
      style={{ position: "fixed", ...position }}
    >
      <header>
        <button type="button" aria-label="Previous year" disabled={!yearAvailable(visibleYear - 1)} onClick={() => setVisibleYear((year) => year - 1)}><ChevronLeft size={18} /></button>
        <strong>{visibleYear}</strong>
        <button type="button" aria-label="Next year" disabled={!yearAvailable(visibleYear + 1)} onClick={() => setVisibleYear((year) => year + 1)}><ChevronRight size={18} /></button>
      </header>
      <div className="hr-month-calendar-grid" role="grid" aria-label={`Months in ${visibleYear}`}>
        {MONTHS.map((month, index) => {
          const option = monthValue(visibleYear, index);
          const disabled = !isAvailable(option);
          return <button
            type="button"
            role="gridcell"
            key={month}
            disabled={disabled}
            aria-selected={option === value}
            className={option === value ? "is-selected" : ""}
            onClick={() => select(option)}
          >{month.slice(0, 3)}</button>;
        })}
      </div>
      <footer><button type="button" disabled={!isAvailable(currentMonth())} onClick={() => select(currentMonth())}>Current month</button></footer>
    </div>, document.body)}
  </div>;
}
