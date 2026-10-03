import { workloadColor, workloadLabel } from './workload.js';
﻿import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Users } from 'lucide-react';
import './team.css';
export function Avatar({ member }) { member = { name: 'Unavailable member', ...member }; return <span className="tm-avatar" title={member.name} aria-label={member.name}>{member.name.split(' ').map(word => word[0]).join('')}</span>; }
export function Person({ member }) { member = { name: 'Unavailable member', role: '', ...member }; return <div className="tm-person"><Avatar member={member}/><div><strong>{member.name}</strong><small>{member.role}</small></div></div>; }
export function Pill({ value }) { return <span className={`tm-pill tm-${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>; }
export function Progress({ value, label }) { return <div className={`tm-progress ${label.includes('workload') ? `tm-workload-${workloadColor(value)}` : ''}`}><div><progress max="100" value={Math.min(100, value)} aria-valuetext={`${workloadLabel(value)}%`} aria-label={label}/><span>{workloadLabel(value)}%</span></div></div>; }
export function Select({ label, value, onChange, options, all = 'All' }) { return <label className="tm-field"><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}><option value="">{all}</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>; }
export function SearchField({ value, onChange, placeholder = 'Search by name...' }) { return <label className="tm-search"><Search size={17}/><span className="tm-sr">{placeholder}</span><input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder}/></label>; }
export function Empty({ onReset, message = 'No results match your filters.' }) { return <div className="tm-empty"><Users size={30}/><h3>{message}</h3><p>Try a different search or clear the filters.</p>{onReset && <button className="tm-view" onClick={onReset}>Clear filters</button>}</div>; }
export function Page({ title, description, children }) { return <div className="tm-page"><header className="tm-heading"><p className="eyebrow">TEAM MANAGEMENT</p><h2>{title}</h2><p>{description}</p><small>Mock workspace · 29 Sept 2026</small></header>{children}</div>; }
export function TableCard({ title, count, filters, children }) { return <section className="panel tm-card"><header className="tm-card-heading"><h3>{title} <span>{count}</span></h3></header><div className="tm-filters">{filters}</div>{children}</section>; }
export function Drawer({ title, subtitle, onClose, children }) {
  const ref = useRef(null); const titleId = useId();
  useEffect(() => { const previous = document.activeElement; const dialog = ref.current; dialog.showModal(); return () => { dialog.close(); if (previous?.isConnected) previous.focus(); }; }, []);
  return createPortal(<dialog ref={ref} className="tm-drawer" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}><header className="tm-drawer-head"><div><p className="eyebrow">TEAM MANAGEMENT</p><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button autoFocus type="button" className="tm-close" aria-label="Close panel" onClick={onClose}><X size={20}/></button></header><div className="tm-drawer-body">{children}</div></dialog>, document.body);
}
export function Toast({ message, onClose }) {
  useEffect(() => { if (!message) return; const timer = setTimeout(onClose, 4500); return () => clearTimeout(timer); }, [message, onClose]);
  return message ? <div className="tm-toast" role="status">{message}<button type="button" aria-label="Dismiss notification" onClick={onClose}><X size={17}/></button></div> : null;
}
