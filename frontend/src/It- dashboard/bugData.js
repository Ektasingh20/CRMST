const day = (offset) => { const d = new Date(); d.setDate(d.getDate() - offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const STATUSES = ['Open', 'In Progress', 'Resolved'];
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
export const PEOPLE = ['Unassigned', 'Ekta Singh', 'Rahul Sharma', 'Priya Mehta', 'Aman Verma'];
const cases = [
  ['Session expires while submitting a ticket','Customer Support Workspace','Critical','Open','Ekta Singh','Priya Mehta','Submit a support ticket after leaving the form open for 30 minutes.','The ticket is saved or the user can sign in without losing the draft.','The session expires and the draft is cleared.'],
  ['Priority filter resets after refresh','Customer Support Workspace','High','In Progress','Rahul Sharma','Ekta Singh','Select High priority in the ticket list, then refresh the page.','The selected filter remains applied.','All priorities are displayed after refresh.'],
  ['Empty courses display 100% completion','Learning Analytics Dashboard','High','Open','Ekta Singh','Aman Verma','Open course progress for a course with no published lessons.','An empty state appears with no progress percentage.','The progress card incorrectly shows 100%.'],
  ['Document download fails for client accounts','System Technologies Client Portal','Critical','In Progress','Priya Mehta','Rahul Sharma','Sign in as a client and download a shared project PDF.','The shared file downloads successfully.','The request returns an access denied message.'],
  ['Long ticket titles overlap the status badge','Customer Support Workspace','Medium','Open','Aman Verma','Priya Mehta','Open a ticket with a long title on a 375px wide screen.','The title wraps and the status remains readable.','The title overlaps the status badge.'],
  ['Assignment totals include archived courses','Learning Analytics Dashboard','High','Open','Unassigned','Ekta Singh','Archive a course with unfinished assignments and open the overview.','Only active course assignments are included.','Archived assignments still count towards the total.'],
  ['Monthly attendance export omits the last day','Attendance Reporting Refresh','High','Resolved','Rahul Sharma','Priya Mehta','Export attendance for a month with 31 days.','Every date in the selected month is included.','Records on the last day were omitted from the export.'],
  ['Emergency contact validation accepts letters','Employee Profile Documents','Medium','Open','Ekta Singh','Aman Verma','Enter letters in the emergency contact phone field and save.','An inline message requests a valid phone number.','The invalid phone number is saved.'],
  ['Unread message count updates late','System Technologies Client Portal','Medium','In Progress','Priya Mehta','Ekta Singh','Read a new message and return to the dashboard.','The unread badge updates immediately.','The old count remains until refresh.'],
  ['Ticket assignee menu is clipped near bottom','Customer Support Workspace','Low','Open','Aman Verma','Rahul Sharma','Open the assignee menu on the final row of the ticket list.','All people are visible and selectable.','The menu is clipped by the table container.'],
  ['Course search ignores trailing spaces','Learning Analytics Dashboard','Low','Resolved','Ekta Singh','Priya Mehta','Search for a course name with a trailing space.','Search trims whitespace and finds the course.','No matching results were returned.'],
  ['Profile upload shows no error for large files','Employee Profile Documents','Medium','Open','Unassigned','Rahul Sharma','Choose a document larger than the upload limit.','A clear size limit message appears.','The upload stops without feedback.'],
];
export function createSampleBugs() {
  return cases.map(([title,project,priority,status,assignedTo,reportedBy,steps,expected,actual],i) => ({
    id: `BUG-${String(1042-i).padStart(4,'0')}`, title, project, priority, status, assignedTo, reportedBy,
    date: day(Math.floor(i/2)), description: `${title}. This affects the ${project.toLowerCase()} workflow and needs verification before the next release.`,
    steps, expected, actual,
    attachments: i === 0 ? [{name:'session-reproduction.txt', url:`data:text/plain;charset=utf-8,${encodeURIComponent('Sample QA notes\nBrowser: Chrome, desktop\nSteps: '+steps+'\nObserved: '+actual)}`}]: [],
    comments: i < 4 ? [{id:`sample-${i}`,author:reportedBy,text:'Reproduced in the demo workspace. Please verify the fix on desktop and mobile.',at:`${day(Math.floor(i/2))}T10:30:00`}] : [],
    activity: [{text:`${reportedBy} reported this bug.`,at:`${day(Math.floor(i/2))}T09:15:00`}, ...(status !== 'Open' ? [{text:`${assignedTo} changed status to ${status}.`,at:`${day(Math.floor(i/2))}T11:00:00`}] : [])],
  }));
}
export function filterBugs(bugs, filters) {
  const query = filters.search.trim().toLowerCase();
  return bugs.filter(b => (!query || [b.id,b.title,b.project,b.assignedTo,b.reportedBy].some(v => v.toLowerCase().includes(query))) &&
    (!filters.status || b.status === filters.status) && (!filters.priority || b.priority === filters.priority) &&
    (!filters.project || b.project === filters.project) && (!filters.assignedTo || b.assignedTo === filters.assignedTo) && (!filters.date || b.date === filters.date));
}
