import { z } from 'zod';
export const id = z.string().min(1).max(160).regex(/^[A-Za-z0-9_.-]+$/);
export const text = z.string().trim().min(1).max(5000);
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v); return !Number.isNaN(+d) && d.toISOString().slice(0,10) === v; }, 'Invalid calendar date');
export const taskStatus = z.enum(['Pending','In Progress','Done']);
export const projectPatch = z.union([
  z.object({ action: z.enum(['accept','reject']) }).strict(),
  z.object({ status: z.enum(['Active','Completed']).optional(), executionStatus: z.enum(['Not Started','In Progress','On Hold','Blocked','Completed']).optional(), progress: z.number().min(0).max(100).optional(), completionDate: date.optional(), remarks: text.optional() }).strict().refine(v => Object.keys(v).length > 0, 'No update supplied'),
]);
export const team = z.object({ team: z.array(z.object({ memberId: id, role: z.enum(['Lead','Developer','Tester','Designer']) }).strict()).max(50) }).strict().refine(v => new Set(v.team.map(t => t.memberId)).size === v.team.length, 'Duplicate member');
export const taskCreate = z.object({ projectId: id, memberId: id, title: text, dueDate: date.nullable().default(null) }).strict();
export const bugCreate = z.object({ title: text, projectId: id, priority: z.enum(['Critical','High','Medium','Low']), assignedTo: id, description: text, steps: z.string().max(5000).default(''), expected: z.string().max(5000).default(''), actual: z.string().max(5000).default('') }).strict();
export const bugPatch = bugCreate.omit({projectId:true}).partial().extend({status:z.enum(['Open','In Progress','Resolved']).optional()}).strict().refine(v=>Object.keys(v).length>0,'No update supplied');
export const clarificationCreate = z.object({ subject:text, question:text, projectId:id, priority:z.enum(['High','Medium','Low']), assignedTo:id }).strict();
export const clarificationPatch = clarificationCreate.omit({projectId:true}).partial().extend({status:z.enum(['Needs Clarification','Waiting for Reply','Answered','Closed']).optional()}).strict().refine(v=>Object.keys(v).length>0,'No update supplied');
export const message = z.object({text}).strict();
export const parse = (schema, value) => schema.parse(value);
export const publicRecord = row => { if (!row) return null; return Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'path' && !k.startsWith('_'))); };
