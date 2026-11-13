import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchHrLeads } from "../hrLeadsApi.js";
import "./hrPeopleModules.css";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const shiftDate = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const activeEmployees = (employees) => employees.filter((employee) => employee.status === "active");
const employeeName = (employees, id) => employees.find((employee) => String(employee.id) === String(id))?.name || "Former employee";
const nextId = (items) => items.reduce((maximum, item) => Math.max(maximum, Number(item.id) || 0), 0) + 1;
const appraisalSeed = (employees) => activeEmployees(employees).slice(0, 2).map((employee, index) => ({
  id: index + 1, employeeId: employee.id, date: shiftDate(7 + index * 5), note: "Quarterly performance conversation",
}));

function ModuleHeader({ icon: Icon, eyebrow, title, description }) {
  return (
    <header className="hr-module-header">
      <span className="hr-module-icon"><Icon size={19} /></span>
      <div><p>{eyebrow}</p><h2>{title}</h2><span>{description}</span></div>
    </header>
  );
}

function Panel({ title, children, action }) {
  return <section className="hr-card hr-module-panel">
    <div className="hr-module-panel-heading"><h3>{title}</h3>{action}</div>
    {children}
  </section>;
}

function Field({ label, children }) {
  return <label className="hr-module-field"><span>{label}</span>{children}</label>;
}

function HRCalendar({ c: { db, upd } }) {
  const employees = activeEmployees(db.emps);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [eventType, setEventType] = useState("All events");
  const [employeeId, setEmployeeId] = useState(String(employees[0]?.id || ""));
  const [appraisalDate, setAppraisalDate] = useState(shiftDate(7));
  const [appraisalNote, setAppraisalNote] = useState("");
  const [interviewLeads, setInterviewLeads] = useState([]);
  useEffect(() => { let active = true; fetchHrLeads().then((items) => { if (active) setInterviewLeads(items); }).catch((error) => console.warn("Unable to load interview calendar events.", error.message || error)); return () => { active = false; }; }, []);
  const appraisals = db.hrAppraisals || appraisalSeed(db.emps);
  const events = useMemo(() => {
    const list = [];
    employees.forEach((employee, index) => {
      const birthMonth = (Number(employee.id) - 1) % 12;
      const birthDay = ((Number(employee.id) * 3) % 27) + 1;
      const birthday = `${month.getFullYear()}-${String(birthMonth + 1).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;
      const [, joinedMonth = "1", joinedDay = "1"] = (employee.joined || today()).split("-");
      const probationMonth = ((Number(joinedMonth) - 1 + 3) % 12) + 1;
      const anniversary = `${month.getFullYear()}-${joinedMonth.padStart(2, "0")}-${joinedDay.padStart(2, "0")}`;
      const probation = `${month.getFullYear()}-${String(probationMonth).padStart(2, "0")}-${joinedDay.padStart(2, "0")}`;
      list.push({ id: `birthday-${employee.id}`, date: birthday, type: "Birthday", title: `${employee.name}’s birthday` });
      list.push({ id: `anniversary-${employee.id}`, date: anniversary, type: "Work anniversary", title: `${employee.name}’s work anniversary` });
      if (index % 3 === 0) list.push({ id: `probation-${employee.id}`, date: probation, type: "Probation", title: `${employee.name} · probation review` });
    });
    appraisals.forEach((appraisal) => list.push({
      id: `appraisal-${appraisal.id}`, date: appraisal.date,
      type: "Appraisal", title: `${employeeName(db.emps, appraisal.employeeId)} · appraisal`, note: appraisal.note,
    }));
    interviewLeads.filter((lead) => lead.interview_date && lead.interview_status === "Scheduled").forEach((lead) => list.push({
      id: `interview-${lead.id}`, date: lead.interview_date,
      type: "Interview", title: `${lead.name} · Interview`,
      note: [lead.interviewer, lead.interview_mode].filter(Boolean).join(" · "),
    }));
    return list.filter((event) => event.date && event.date.slice(0, 7) === `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`)
      .filter((event) => eventType === "All events" || event.type === eventType)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [employees, month, appraisals, eventType, db.emps, interviewLeads]);
  const counts = ["Birthday", "Work anniversary", "Probation", "Appraisal", "Interview"].map((type) => [type, events.filter((event) => event.type === type).length]);
  const addAppraisal = (event) => {
    event.preventDefault();
    if (!employeeId || !appraisalDate) return;
    upd((data) => {
      const list = data.hrAppraisals || appraisalSeed(data.emps);
      return { hrAppraisals: [...list, { id: nextId(list), employeeId: Number(employeeId), date: appraisalDate, note: appraisalNote.trim() || "Performance appraisal" }] };
    }, "Appraisal added to HR calendar");
    setAppraisalNote("");
  };
  const moveMonth = (amount) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  return <div className="hr-new-module">
    <ModuleHeader icon={CalendarDays} eyebrow="KEY PEOPLE DATES" title="HR Calendar" description="Keep important employee milestones and review schedules on everyone’s radar." />
    <div className="hr-module-metrics">{counts.map(([label, value]) => <div className="hr-card hr-module-metric" key={label}>
      <span><CalendarDays size={17} /></span><div><small>This month · {label}</small><strong>{value}</strong></div>
    </div>)}</div>
    <Panel title={month.toLocaleDateString("en-US", { month: "long", year: "numeric" })} action={<div className="hr-module-month-nav">
      <button aria-label="Previous month" type="button" onClick={() => moveMonth(-1)}><ChevronLeft size={17} /></button>
      <button aria-label="Next month" type="button" onClick={() => moveMonth(1)}><ChevronRight size={17} /></button>
    </div>}>
      <div className="hr-module-toolbar"><p className="hr-module-muted">{events.length} event{events.length === 1 ? "" : "s"} scheduled</p>
        <Field label="Show"><select value={eventType} onChange={(event) => setEventType(event.target.value)}>{["All events", "Birthday", "Work anniversary", "Probation", "Appraisal", "Interview"].map((type) => <option key={type}>{type}</option>)}</select></Field>
      </div>
      {events.length ? <div className="hr-module-event-list">{events.map((event) => <article className="hr-module-event" key={event.id}>
        <time dateTime={event.date}><strong>{new Date(`${event.date}T00:00:00`).getDate()}</strong><span>{new Date(`${event.date}T00:00:00`).toLocaleDateString("en-US", { month: "short" })}</span></time>
        <div><strong>{event.title}</strong><span>{event.type}{event.note ? ` · ${event.note}` : ""}</span></div><span className="hr-module-tag">{event.type}</span>
      </article>)}</div> : <p className="hr-module-empty">No matching events this month.</p>}
    </Panel>
    <Panel title="Schedule an appraisal">
      <form className="hr-module-form" onSubmit={addAppraisal}>
        <Field label="Employee"><select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></Field>
        <Field label="Date"><input type="date" value={appraisalDate} onChange={(event) => setAppraisalDate(event.target.value)} required /></Field>
        <Field label="Note"><input value={appraisalNote} onChange={(event) => setAppraisalNote(event.target.value)} placeholder="e.g. Annual performance review" /></Field>
        <button className="hr-module-button" type="submit">Add to calendar</button>
      </form>
    </Panel>
    <p className="hr-module-disclaimer">Birthdays and probation dates are illustrative demo dates until employee profile data is available.</p>
  </div>;
}

export default function HrPeopleModules({ page, c }) {
  if (page === "HR Calendar") return <HRCalendar c={c} />;
  return null;
}
