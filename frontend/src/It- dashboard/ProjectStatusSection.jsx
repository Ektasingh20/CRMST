import React, { useState } from 'react';
import { CircleCheck, Clock3, FileText, History, X } from 'lucide-react';
import { PROJECT_STATUSES, projectStatusSummary } from './projectStatus.js';
import './ProjectStatusSection.css';

const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const displayDate = date => date ? new Date(date.length===10?`${date}T12:00:00`:date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : 'Not recorded';
const readFiles = files => Promise.all(files.map(file=>new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve({name:file.name,type:file.type,dataUrl:reader.result});
  reader.onerror=()=>reject(new Error('Unable to read the attachment. Please try again.'));
  reader.readAsDataURL(file);
})));
export default function ProjectStatusSection({project,onUpdate}) {
  const summary=projectStatusSummary(project);
  const [editing,setEditing]=useState(false);
  const [status,setStatus]=useState(summary.status);
  const [progress,setProgress]=useState(summary.progress);
  const [remarks,setRemarks]=useState('');
  const [completionDate,setCompletionDate]=useState(today());
  const [confirmed,setConfirmed]=useState(false);
  const [files,setFiles]=useState([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const completing=status==='Completed';
  function startEditing() {
    setStatus(summary.status);setProgress(summary.progress);setRemarks('');setCompletionDate(project.completionDate||today());
    setConfirmed(false);setFiles([]);setError('');setMessage('');setEditing(true);
  }
  async function submit(e) {
    e.preventDefault();setError('');
    if(completing && (!completionDate || !remarks.trim() || !confirmed)) {setError('Enter completion date and remarks, and confirm all assigned tasks are completed.');return;}
    if(completing && completionDate>today()) {setError('Completion date cannot be in the future.');return;}
    if(!completing && (progress==='' || !Number.isFinite(Number(progress)) || Number(progress)<0 || Number(progress)>100)) {setError('Enter progress between 0 and 100.');return;}
    if(completing && (files.length>5 || files.some(file=>file.size>5*1024*1024))) {setError('Choose up to 5 final files, each no larger than 5 MB.');return;}
    setBusy(true);
    try {
      const attachments=completing?await readFiles(files):[];
      onUpdate({status,progress:completing?100:Number(progress),remarks,completionDate,allTasksCompleted:confirmed,files:attachments,id:crypto.randomUUID()});
      setEditing(false);setMessage(completing?'Project marked as completed and moved to Completed Projects.':summary.status==='Completed'?'Project reopened and moved to Active Projects.':'Project status updated.');
    } catch(err) {setError(err.message);} finally {setBusy(false);}
  }
  return <section className="panel project-status-section" aria-labelledby="project-status-title">
    <div className="project-status-heading"><div><p className="eyebrow">PROJECT TRACKING</p><h3 id="project-status-title">Project Status</h3></div>{!editing&&<button className="ghost-button" onClick={startEditing}>Update Status</button>}</div>
    {summary.status==='Completed'&&<div className="project-completed-banner"><CircleCheck size={21}/><div><strong>?? Project Completed</strong><span>Completion date: {displayDate(project.completionDate)}</span></div></div>}
    <div className="project-status-facts"><div><span>Current Status</span><strong><Clock3 size={16}/>{summary.status}</strong></div><div><span>Project Progress</span><strong>{summary.progress}%</strong><progress max="100" value={summary.progress} aria-label="Project progress"/></div><div><span>Completed Tasks</span><strong>{summary.completedTasks}/{summary.totalTasks}</strong>{!summary.totalTasks&&<small>No assigned tasks</small>}</div></div>
    {project.statusRemarks&&!editing&&<p className="project-status-remarks"><strong>{summary.status==='Completed'?'Completion remarks':'Latest remarks'}:</strong> {project.statusRemarks}</p>}
    {message&&<p className="project-status-message" role="status">{message}</p>}
    {editing&&<form className="project-status-form" onSubmit={submit}><div className="project-status-form-head"><h4>Update project status</h4><button className="icon-button" type="button" disabled={busy} aria-label="Cancel status update" onClick={()=>setEditing(false)}><X size={18}/></button></div>
      <fieldset disabled={busy}><div className="project-status-inputs"><label className="field"><span>Current Status</span><select value={status} onChange={e=>setStatus(e.target.value)}>{PROJECT_STATUSES.map(value=><option key={value}>{value}</option>)}</select></label>
      <label className="field"><span>Progress (%)</span><input type="number" min="0" max="100" step="1" required value={completing?100:progress} disabled={completing} onChange={e=>setProgress(e.target.value)}/></label>
      {completing&&<label className="field"><span>Completion date *</span><input type="date" required max={today()} value={completionDate} onChange={e=>setCompletionDate(e.target.value)}/></label>}
      <label className="field project-status-full"><span>{completing?'Completion remarks *':'Remarks'}</span><textarea rows={3} maxLength={5000} required={completing} value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder={completing?'Summarize delivery, verification and handover.':'Add a progress update or explain the status change.'}/></label>
      {completing&&<><label className="field project-status-full"><span>Upload final files / screenshots</span><input type="file" multiple onChange={e=>setFiles([...e.target.files])}/><small>Up to 5 files, 5 MB each. Existing project documents remain available.</small></label><label className="project-status-confirm project-status-full"><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>All assigned tasks completed<small>Confirming marks all {summary.totalTasks} assigned tasks as completed.</small></span></label></>}
      </div></fieldset>
      {error&&<p className="project-status-error" role="alert">{error}</p>}
      <div className="project-status-actions"><button type="button" className="ghost-button" disabled={busy} onClick={()=>setEditing(false)}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy?'Saving…':completing?'Mark Project as Completed':'Save Status'}</button></div>
    </form>}
    {!!project.finalFiles?.length&&<div className="project-final-files"><h4><FileText size={17}/> Final files & screenshots</h4><div>{project.finalFiles.map((file,index)=><a key={`${file.name}-${index}`} className="ghost-button" href={file.dataUrl} download={file.name}><FileText size={16}/>{file.name}</a>)}</div></div>}
    {!!project.statusHistory?.length&&<details className="project-status-history"><summary><History size={17}/> Status history ({project.statusHistory.length})</summary><ol>{[...project.statusHistory].reverse().map(entry=><li key={entry.id}><div><strong>{entry.from} ? {entry.status}</strong><span>{entry.progress}% · {displayDate(entry.at)} · {new Date(entry.at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span></div>{entry.remarks&&<p>{entry.remarks}</p>}{entry.completionDate&&<p>Completion date: {displayDate(entry.completionDate)}</p>}{entry.files?.map((file,index)=><a key={index} href={file.dataUrl} download={file.name}>{file.name}</a>)}</li>)}</ol></details>}
  </section>;
}
