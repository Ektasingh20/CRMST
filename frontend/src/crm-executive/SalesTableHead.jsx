import React from "react";
import { BadgeCheck, Building2, CalendarDays, CheckCircle2, Clock3, FileText, Hash, ListChecks, MapPin, MessageSquareText, Phone, UserCircle, Users, Wallet } from "lucide-react";

function iconFor(label) {
  const text = String(label).toLowerCase();
  if (/^(sr\.?\s*(no\.?|number)|s\.?\s*no\.?)/.test(text)) return Hash;
  if (/date|applied|due|from|^to$|day/.test(text)) return CalendarDays;
  if (/time|call at/.test(text)) return Clock3;
  if (/contact|whatsapp|call \/|phone/.test(text)) return Phone;
  if (/remark|reason|description/.test(text)) return MessageSquareText;
  if (/status|approval|completed|pending|follow-up|not worked/.test(text)) return CheckCircle2;
  if (/action|enquiry|form/.test(text)) return ListChecks;
  if (/employee|assignee|assigned|name|lead/.test(text)) return Users;
  if (/company/.test(text)) return Building2;
  if (/city/.test(text)) return MapPin;
  if (/priority|interest|program|training|service|type|task/.test(text)) return BadgeCheck;
  if (/value|total|completion|worked|days/.test(text)) return Wallet;
  return FileText;
}

function headerText(children) {
  return React.Children.toArray(children).map((child) => typeof child === "string" || typeof child === "number" ? String(child) : "").join("").trim();
}

export default function SalesTableHead({ children }) {
  return <thead>{React.Children.map(children, (row) => {
    if (!React.isValidElement(row) || row.type !== "tr") return row;
    return React.cloneElement(row, {}, React.Children.map(row.props.children, (cell) => {
      if (!React.isValidElement(cell) || cell.type !== "th") return cell;
      if (React.isValidElement(cell.props.children) && cell.props.children.props?.className === "attendance-report-heading") return cell;
      const Icon = iconFor(headerText(cell.props.children));
      return React.cloneElement(cell, {}, <span className="sales-table-heading"><Icon size={14} aria-hidden="true" />{cell.props.children}</span>);
    }));
  })}</thead>;
}
