import { useState } from "react";
import { CirclePlus, FileUp, Upload, X } from "lucide-react";

const emptyForm = {
  projectName: "", client: "", service: "", assignedEmployeeName: "",
  priority: "Medium", startDate: "", expectedDelivery: "", description: "",
  requiredFeatures: "", pagesModules: "", technologyRequirements: "",
  designRequirements: "", clientBudget: "", referenceWebsites: "", specialInstructions: "",
};

function createProjectId() {
  return `PRJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
    reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function CreateProjectForm({ users = [], projects = [], onCreate, serviceOptions = [] }) {
  const [form, setForm] = useState({ ...emptyForm });
  const [documents, setDocuments] = useState([]);
  const [scopeFiles, setScopeFiles] = useState({});
  const [scopeEditor, setScopeEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const itEmployees = users.filter((user) => [user.dept, user.department, user.role].some((value) => String(value || "").trim().toLowerCase() === "it"));
  const assignableEmployees = itEmployees.length > 0 ? itEmployees : [
    { id: "demo-it-0", name: "Ekta Singh", email: "ekta.singh@example.com" },
    { id: "demo-it-1", name: "Aarav Sharma", email: "aarav.sharma@example.com" },
    { id: "demo-it-2", name: "Priya Mehta", email: "priya.mehta@example.com" },
  ];

  const change = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setCreated(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
    const requiredScope = ["description", "requiredFeatures", "pagesModules", "technologyRequirements", "designRequirements", "referenceWebsites", "specialInstructions"];
    if (![values.projectName, values.client, values.assignedEmployeeName, values.startDate, values.expectedDelivery].every(Boolean)
      || requiredScope.some((key) => !values[key] && !scopeFiles[key]?.length)) {
      setError("Complete the project information and add text or an attachment to each required section.");
      return;
    }
    if (documents.length === 0 && !Object.values(scopeFiles).some((files) => files.length)) {
      setError("Please attach at least one document, either to a requirement or to Documents / Files.");
      return;
    }
    if (values.expectedDelivery < values.startDate) {
      setError("Expected delivery must be on or after the start date.");
      return;
    }
    setSaving(true);
    let storedDocuments;
    let storedScopeFiles;
    try {
      storedDocuments = await Promise.all(documents.map(readFileAsDataUrl));
      storedScopeFiles = Object.fromEntries(await Promise.all(Object.entries(scopeFiles).map(async ([name, files]) => [name, await Promise.all(files.map(readFileAsDataUrl))])));
    } catch {
      setSaving(false);
      setError("One of the selected files could not be read.");
      return;
    }
    const project = {
      ...values,
      scopeFiles: storedScopeFiles,
      documents: storedDocuments,
      projectId: createProjectId(),
      id: `local-project-${Date.now()}`,
      status: "New",
    };
    try {
      await onCreate(project);
    } catch {
      setSaving(false);
      setError("Project could not be saved. Your entries and files are still here; please try again.");
      return;
    }
    setSaving(false);
    setCreated(project);
    setForm({ ...emptyForm });
    setDocuments([]);
    setScopeFiles({});
    setError("");
  };

  const input = (name, label, options = {}) => (
    <label className="field">
      <span>{label}{options.required ? " *" : ""}</span>
      <input name={name} value={form[name]} onChange={change} {...options} />
    </label>
  );
  const scopeField = (name, label, required = false) => (
    <div className={`scope-field ${["description", "specialInstructions"].includes(name) ? "span-full" : ""}`}>
      <div className="scope-field-heading">
        <label htmlFor={`project-${name}`}>{label}{required ? " *" : ""}</label>
      </div>
      <div className="scope-input-wrap">
        <textarea
          id={`project-${name}`}
          name={name}
          value={form[name]}
          onChange={change}
          onDoubleClick={() => setScopeEditor({ name, label })}
          rows={2}
          required={required && !scopeFiles[name]?.length}
          placeholder={`Add ${label.toLowerCase()}...`}
        />
        <label className="scope-upload-button" aria-label={`Upload PDF or file for ${label}`} title={`Upload PDF or file for ${label}`}>
          <Upload size={17} />
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            onChange={(event) => { const selected = Array.from(event.target.files || []); setScopeFiles((current) => ({ ...current, [name]: addFiles(current[name] || [], selected) })); event.target.value = ""; }}
          />
        </label>
      </div>
      {fileList(scopeFiles[name] || [], (index) => setScopeFiles((current) => ({ ...current, [name]: current[name].filter((_, i) => i !== index) })))}
    </div>
  );

  const addFiles = (existing, incoming) => [...existing, ...Array.from(incoming || [])];
  const fileList = (files, remove) => files.length > 0 && <ul className="project-selected-files">{files.map((file, index) => <li key={`${file.name}-${index}`}><FileUp size={16} /><span>{file.name}<small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" className="icon-button" aria-label={`Remove ${file.name}`} onClick={() => remove(index)}><X size={15} /></button></li>)}</ul>;

  const closeScopeEditor = () => setScopeEditor(null);

  return (
    <section className="panel project-create-panel">
      <div className="panel-heading"><div><p className="eyebrow">PROJECT WORKSPACE</p><h2>Create Project</h2></div><span>Frontend preview</span></div>
      <p style={{ padding: "0 24px", color: "var(--text-soft)" }}>Projects created here stay in this session and reset when you refresh.</p>
      <form className="form-grid" onSubmit={submit}>
        <p className="form-section-title">Project Information</p>
        {input("projectName", "Project Name", { required: true, placeholder: "e.g. Customer Support Workspace" })}
        {input("client", "Client / Company", { required: true, placeholder: "Enter client name" })}
        <label className="field">
          <span>Service</span>
          <select name="service" value={form.service} onChange={change}>
            <option value="">Select service</option>
            {serviceOptions.map((service) => <option key={service}>{service}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Assigned To *</span>
          <select name="assignedEmployeeName" value={form.assignedEmployeeName} onChange={change} required>
            <option value="">Select IT employee</option>
            {assignableEmployees.map((user, index) => <option key={user.id || user._id || index} value={user.name || user.username}>{user.name || user.username}</option>)}
          </select>
        </label>
        <label className="field"><span>Priority</span><select name="priority" value={form.priority} onChange={change}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label>
        {input("startDate", "Start Date", { type: "date", required: true })}
        {input("expectedDelivery", "Expected Delivery", { type: "date", required: true, min: form.startDate || undefined })}
        <p className="form-section-title">Scope and Requirements</p>
        <p className="span-full" style={{ color: "var(--text-soft)", margin: 0 }}>Add text, attach a PDF, or use both for each requirement.</p>
        {scopeField("description", "Project Description", true)}
        {scopeField("requiredFeatures", "Required Features", true)}
        {scopeField("pagesModules", "Number of Pages / Modules", true)}
        {scopeField("technologyRequirements", "Technology Requirements", true)}
        {scopeField("designRequirements", "Design Requirements", true)}
        {scopeField("clientBudget", "Client Budget (if applicable)")}
        {scopeField("referenceWebsites", "Reference Websites", true)}
        <div className="field project-documents-field span-full">
          <span>Additional documents / files</span>
          <label className="project-file-picker">
            <FileUp size={16} />
            <span>{documents.length ? `${documents.length} file${documents.length === 1 ? "" : "s"} selected` : "Upload PDF / File"}</span>
            <Upload size={16} className="project-file-picker-icon" />
            <input type="file" multiple onChange={(event) => { const selected = Array.from(event.target.files || []); setDocuments((current) => addFiles(current, selected)); event.target.value = ""; setError(""); setCreated(null); }} />
          </label>
          <small>Select all six PDFs together, or add files one at a time. Every attachment will appear in the IT project workspace.</small>
          {fileList(documents, (index) => setDocuments((current) => current.filter((_, i) => i !== index)))}
        </div>
        {scopeField("specialInstructions", "Special Instructions", true)}
        {error && <p className="span-full" role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
        {created && <p className="span-full" role="status"><strong>{created.projectName}</strong> ({created.projectId}) created locally with status New, assigned to {created.assignedEmployeeName}.</p>}
        <div className="form-actions span-full">
          <button type="button" className="ghost-button" onClick={() => { setForm({ ...emptyForm }); setDocuments([]); setScopeFiles({}); setScopeEditor(null); setError(""); setCreated(null); }}>Reset</button>
          <button type="submit" disabled={saving} className="primary-button"><CirclePlus size={16} /> {saving ? "Creating project..." : "Create Project"}</button>
        </div>
      </form>
      {projects.length > 0 && <div style={{ padding: "0 24px 24px" }}><h3>Created in this session</h3><div className="table-wrap"><table className="table"><thead><tr><th>Project ID</th><th>Project</th><th>Client</th><th>Assigned To</th><th>Delivery</th><th>Status</th></tr></thead><tbody>{projects.map((project) => <tr key={project.id}><td>{project.projectId || project.id}</td><td>{project.projectName}</td><td>{project.client}</td><td>{project.assignedEmployeeName}</td><td>{project.expectedDelivery}</td><td>{project.status}</td></tr>)}</tbody></table></div></div>}
      {scopeEditor && (
        <div className="modal-surface" role="dialog" aria-modal="true" aria-labelledby="scope-editor-title" onMouseDown={closeScopeEditor}>
          <div className="modal-shell project-scope-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="project-scope-modal-header">
              <div><p className="eyebrow">PROJECT REQUIREMENT</p><h2 id="scope-editor-title">{scopeEditor.label}</h2></div>
              <button type="button" className="icon-button" aria-label="Close editor" onClick={closeScopeEditor}><X size={18} /></button>
            </div>
            <textarea
              autoFocus
              value={form[scopeEditor.name]}
              onChange={(event) => change({ target: { name: scopeEditor.name, value: event.target.value } })}
              placeholder={`Write ${scopeEditor.label.toLowerCase()} here...`}
            />
            <div className="form-actions">
              <button type="button" className="primary-button" onClick={closeScopeEditor}>Done</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
