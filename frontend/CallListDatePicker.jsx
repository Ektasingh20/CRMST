import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const toISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const parseISO = (value) => {
  const [year, month, day] = String(value || "").split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date();
};
const displayDate = (value) => value
  ? parseISO(value).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
  : "dd-mm-yyyy";

export default function CallListDatePicker({ label, value, min, max, onChange, hideLabel = false }) {
  const triggerRef = useRef(null);
  const calendarRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = value ? parseISO(value) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  useLayoutEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 280;
      const height = 326;
      const top = window.innerHeight - rect.bottom >= height || rect.top >= height
        ? rect.bottom + 5
        : rect.top - height - 5;
      setPosition({
        top: Math.max(4, Math.min(top, window.innerHeight - height - 4)),
        left: Math.max(4, Math.min(rect.left, window.innerWidth - width - 4)),
      });
    };
    const closeOnOutsideClick = (event) => {
      if (!triggerRef.current?.contains(event.target) && !calendarRef.current?.contains(event.target)) setOpen(false);
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toISO(new Date());
  const disabled = (date) => Boolean((min && toISO(date) < min) || (max && toISO(date) > max));
  const selectDate = (date) => { onChange(toISO(date)); setOpen(false); };

  return <div className="table-date-filter call-list-date-picker">
    {!hideLabel && <span>{label}</span>}
    <button ref={triggerRef} type="button" className="call-list-date-trigger" aria-label={`${label} date: ${value ? displayDate(value) : "not selected"}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => {
      if (!open) {
        const date = value ? parseISO(value) : new Date();
        setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      }
      setOpen((current) => !current);
    }}><span>{displayDate(value)}</span><CalendarDays size={16} aria-hidden="true" /></button>
    {open && position && createPortal(<div ref={calendarRef} className="call-list-calendar-popover" role="dialog" aria-label={`${label} date picker`} style={{ position: "fixed", top: position.top, left: position.left }}>
      <div className="call-list-calendar-header"><button type="button" aria-label="Previous month" onClick={() => setVisibleMonth(new Date(year, month - 1, 1))}><ChevronLeft size={17} /></button><strong>{visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</strong><button type="button" aria-label="Next month" onClick={() => setVisibleMonth(new Date(year, month + 1, 1))}><ChevronRight size={17} /></button></div>
      <div className="call-list-calendar-grid" role="grid" aria-label={visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}>
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => <span className="call-list-calendar-weekday" role="columnheader" key={day}>{day}</span>)}
        {Array.from({ length: leadingDays }, (_, index) => <span className="call-list-calendar-empty" role="gridcell" key={`empty-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const date = new Date(year, month, index + 1);
          const iso = toISO(date);
          return <button type="button" role="gridcell" key={iso} aria-label={date.toLocaleDateString("en-US", { dateStyle: "full" })} aria-selected={value === iso} className={`call-list-calendar-day${value === iso ? " selected" : ""}${iso === today ? " today" : ""}`} disabled={disabled(date)} onClick={() => selectDate(date)}>{index + 1}</button>;
        })}
      </div>
      <div className="call-list-calendar-footer"><button type="button" onClick={() => { onChange(""); setOpen(false); }}>Clear</button><button type="button" disabled={disabled(new Date())} onClick={() => selectDate(new Date())}>Today</button></div>
    </div>, document.body)}
  </div>;
}
