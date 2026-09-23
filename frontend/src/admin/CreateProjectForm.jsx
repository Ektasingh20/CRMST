import { useState } from "react";
import { CirclePlus } from "lucide-react";

const emptyForm = {
  projectName: "", client: "", service: "", owner: "", assignedEmployeeName: "",
  priority: "Medium", startDate: "", expectedDelivery: "", description: "",
  requiredFeatures: "", pagesModules: "", technologyRequirements: "",
  designRequirements: "", structure: "", specialInstructions: "",
};

export default function CreateProjectForm({ users = [], projects, onCreate }) {
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const itEmployees = users.filter((user) => [user.dept, user.department, user.role].some((value) => String(value || "").trim().toLowerCase() === "it"));

  const change = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setCreated(null);
  };

  const submit = (event) => {
    event.preventDefault();
    const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
    if (![values.projectName, values.client, values.owner, values.assignedEmployeeName, values.description].every(Boolean)) {
      setError("Please complete all required fields.");
      return;
    }
    if (values.expectedDelivery < values.startDate) {
      setError("Expected delivery must be on or after the start date.");
      return;
    }
    const project = { ...values, id: `local-project-${Date.now()}`, status: "New" };
    onCreate(project);
    setCreated(project);
    setForm({ ...emptyForm });
    setError("");
  };

  const input = (name, label, options = {}) => (
    <label className="field">
      <span>{label}{options.required ? " *" : ""}</span>
      <input name={name} value={form[name]} onChange={change} {...options} />
    </label>
  );
  const textarea = (name, label, required = false) => (
    <label className="field span-full">
      <span>{label}{required ? " *" : ""}</span>
      <textarea name={name} value={form[name]} onChange={change} rows={3} required={required} />
    </label>
  );

  return (
    <section className="panel">
      <div className="panel-heading"><h2>Create Project</h2><span>Frontend preview</span></div>
      <p style={{ padding: "0 24px", color: "var(--text-soft)" }}>Projects created here stay in this session and reset when you refresh.</p>
      <form className="form-grid" onSubmit={submit}>
        <p className="form-section-title">Project Information</p>
        {input("projectName", "Project Name", { required: true, placeholder: "e.g. Customer Support Workspace" })}
        {input("client", "Client / Company", { required: true, placeholder: "Enter client name" })}
        {input("service", "Service", { placeholder: "e.g. Website Development" })}
        {input("owner", "Project Owner", { required: true, placeholder: "Enter owner or team name" })}
        {input("assignedEmployeeName", "Assign IT Employee", { required: true, list: "project-it-employees", placeholder: "Select or enter employee name" })}
        <datalist id="project-it-employees">{itEmployees.map((user, index) => <option key={user.id || user._id || index} value={user.name || user.username}>{user.email}</option>)}</datalist>
        <label className="field"><span>Priority</span><select name="priority" value={form.priority} onChange={change}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label>
        {input("startDate", "Start Date", { type: "date", required: true })}
        {input("expectedDelivery", "Expected Delivery", { type: "date", required: true, min: form.startDate || undefined })}
        <p className="form-section-title">Scope and Requirements</p>
        {textarea("description", "Project Description", true)}
        {textarea("requiredFeatures", "Required Features")}
        {textarea("pagesModules", "Pages / Modules")}
        {textarea("technologyRequirements", "Technology Requirements")}
        {textarea("designRequirements", "Design Requirements")}
        {textarea("structure", "Project Structure / Milestones")}
        {textarea("specialInstructions", "Special Instructions")}
        {error && <p className="span-full" role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
        {created && <p className="span-full" role="status"><strong>{created.projectName}</strong> created locally with status New, assigned to {created.assignedEmployeeName}.</p>}
        <div className="form-actions span-full">
          <button type="button" className="ghost-button" onClick={() => { setForm({ ...emptyForm }); setError(""); setCreated(null); }}>Reset</button>
          <button type="submit" className="primary-button"><CirclePlus size={16} /> Create Project</button>
        </div>
      </form>
      {projects.length > 0 && <div style={{ padding: "0 24px 24px" }}><h3>Created in this session</h3><div className="table-wrap"><table className="table"><thead><tr><th>Project</th><th>Client</th><th>Assigned To</th><th>Delivery</th><th>Status</th></tr></thead><tbody>{projects.map((project) => <tr key={project.id}><td>{project.projectName}</td><td>{project.client}</td><td>{project.assignedEmployeeName}</td><td>{project.expectedDelivery}</td><td>{project.status}</td></tr>)}</tbody></table></div></div>}
    </section>
  );
}
