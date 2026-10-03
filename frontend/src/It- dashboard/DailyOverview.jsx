import React, { useEffect, useRef, useState } from 'react';
import { FolderKanban, CircleCheck, ClipboardList, Clock3, Bug, MessageCircleQuestion, ArrowUpRight, AlertCircle, History, X } from 'lucide-react';
import { useSupportRecords } from './supportStore.js';
import { dailyOverview } from './dailyOverview.js';
import './DailyOverview.css';

const dateLabel = date => date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No deadline';
const timeLabel = at => new Date(at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
// Repair legacy display separators without changing stored records or shared data helpers.
const displayText = text => String(text || '').replace(/\s*(?:\u00ef\u00bf\u00bd|\ufffd|\u00c2\u00b7)\s*/g, ' · ');
function Header({ title, count, onView }) {
  return <div className="daily-panel-head"><h3>{title}</h3>{onView && <button className="daily-link" onClick={onView}>View all ({count}) <ArrowUpRight size={14} /></button>}</div>;
}

export default function DailyOverview({ projects = [], person, identity = {}, onNavigate, onProject, loading = false }) {
  const [bugs] = useSupportRecords('bugs', person);
  const [clarifications] = useSupportRecords('clarifications', person);
  const [now, setNow] = useState(() => new Date());
  const attentionDialog = useRef(null);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  const data = dailyOverview(projects, bugs, clarifications, now);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const attentionTaskIds = new Set(data.attention.map(item => item.id));
  const myWork = data.pending.filter(task => !attentionTaskIds.has(`task-${task.key}`));
  const critical = data.openBugs.filter(bug => bug.priority === 'Critical').length;
  const criticalIds = new Set(data.openBugs.filter(bug => bug.priority === 'Critical').map(bug => bug.id));
  const cards = [
    ['Active Projects', data.active.length, 'active-projects', FolderKanban],
    ['Completed', data.completed.length, 'completed-projects', CircleCheck],
    ['Pending Tasks', data.pending.length, 'my-work', ClipboardList],
    ['Overdue', data.overdue.length, 'my-work', Clock3],
    ['Open Bugs', data.openBugs.length, 'open-bugs', Bug],
    ['Clarifications', data.unanswered.length, 'clarification', MessageCircleQuestion],
  ];
  const go = entry => { attentionDialog.current?.close(); entry.project ? onProject(entry.project) : onNavigate(entry.page); };
  const attentionRow = item => {
    const danger = criticalIds.has(item.id) || (item.deadline && item.deadline < today);
    return <button key={item.id} className="daily-attention-row" onClick={() => go(item)}>
      <AlertCircle size={17} className={danger ? 'daily-danger-text' : ''} />
      <span className="daily-item-copy"><strong>{displayText(item.title)}</strong><small>{displayText(item.detail)}{item.deadline ? ` · ${dateLabel(item.deadline)}` : ''}</small></span><ArrowUpRight size={14} />
    </button>;
  };
  return <div className="daily-overview" aria-busy={loading}>
    <header className="daily-welcome"><h2>Welcome, {person} <span>· {identity.designation || 'IT Employee'}</span></h2><span>{identity.branch || 'Branch not set'} · {identity.department || 'IT'} · {dateLabel(now)}</span></header>
    {loading ? <p className="daily-empty" role="status">Loading dashboard…</p> : <>
      <div className="daily-stats">{cards.map(([label, count, page, Icon]) => <button key={label} className={`panel daily-stat ${label === 'Overdue' ? 'daily-stat-alert' : ''}`} onClick={() => onNavigate(page)}>
        <div><Icon size={17} /><ArrowUpRight size={13} /></div><strong>{count}</strong><span>{label}</span>
        {label === 'Open Bugs' && <small className={critical ? 'daily-danger-text' : ''}>{critical} critical</small>}
      </button>)}</div>
      <div className="daily-columns">
        <section className="panel"><Header title="My Work" count={myWork.length} onView={() => onNavigate('my-work')} /><div className="daily-list">
          {myWork.slice(0, 3).map(task => <button key={task.key} className="daily-work-row" onClick={() => onNavigate('my-work')}><span className="daily-item-icon"><ClipboardList size={17} /></span><span className="daily-item-copy"><strong>{displayText(task.title || task.name)}</strong><small>{task.project.name || task.project.projectName} · {dateLabel(task.deadline)}</small></span><span className="daily-chip">{task.status || 'Pending'}</span></button>)}
          {!myWork.length && <p className="daily-empty">{data.overdue.length ? 'Overdue tasks are in Needs Attention.' : "No pending tasks. You're all caught up."}</p>}
        </div></section>
        <section className="panel"><Header title="Needs Attention" count={data.attention.length} onView={() => attentionDialog.current?.showModal()} /><div className="daily-list">{data.attention.slice(0, 3).map(attentionRow)}{!data.attention.length && <p className="daily-empty">No urgent issues or upcoming deadlines.</p>}</div></section>
      </div>
      <div className="daily-columns">
        <section className="panel"><Header title="Projects" count={data.projectRows.length} onView={() => onNavigate('active-projects')} /><div className="daily-project-table"><table><thead><tr>{['Project', 'Progress', 'Tasks', 'Deadline'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>
          {data.projectRows.slice(0, 3).map(row => <tr key={row.project.id} onClick={() => onProject(row.project)}><td><button className="daily-project-name" onClick={event => { event.stopPropagation(); onProject(row.project); }}>{row.project.name || row.project.projectName}</button></td><td><div className="daily-progress"><progress value={row.progress} max="100" aria-label={`${row.project.name || row.project.projectName} progress`} /><span>{row.progress}%</span></div></td><td>{row.completedTasks}/{row.totalTasks}</td><td className={row.deadline && row.deadline < today ? 'daily-danger-text' : ''}>{dateLabel(row.deadline)}</td></tr>)}
        </tbody></table>{!data.projectRows.length && <p className="daily-empty">No active projects.</p>}</div></section>
        <section className="panel"><Header title="Recent Activity" /><ol className="daily-timeline">{data.activity.slice(0, 4).map(entry => <li key={entry.id}><span className="daily-timeline-dot"><History size={13} /></span><button onClick={() => go(entry)}><strong>{displayText(entry.text)}</strong><span>{displayText(entry.detail)}</span><time dateTime={entry.at}>{timeLabel(entry.at)}</time></button></li>)}</ol>{!data.activity.length && <p className="daily-empty">Project and support updates will appear here.</p>}</section>
      </div>
    </>}
    <dialog className="daily-attention-dialog" ref={attentionDialog} aria-labelledby="daily-attention-title" onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="daily-panel-head"><h3 id="daily-attention-title">Needs Attention ({data.attention.length})</h3><button className="daily-close" onClick={() => attentionDialog.current.close()} aria-label="Close needs attention"><X size={18} /></button></div>
      <div className="daily-list">{data.attention.map(attentionRow)}{!data.attention.length && <p className="daily-empty">No urgent issues or upcoming deadlines.</p>}</div>
    </dialog>
  </div>;
}
