// Sample records used only by the frontend IT demo workspace.
const dateFromToday = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const demoProjects = [
  {
    id: "demo-project-4", name: "Customer Support Workspace", client: "System Technologies", priority: "High", due: dateFromToday(7), owner: "Operations Team", status: "Active",
    description: "Build a shared workspace for support tickets, follow-ups, and escalation tracking.",
    requiredFeatures: "Ticket assignment, priority filters, activity timeline, and notifications", pagesModules: "Ticket list, ticket details, team overview",
    tasks: [
      { id: "demo-task-1", title: "Build ticket priority filters", description: "Add priority and assignee filters to the ticket list.", dueDate: dateFromToday(2), status: "Pending" },
      { id: "demo-task-2", title: "Complete mobile layout review", description: "Check ticket details and action buttons on smaller screens.", dueDate: dateFromToday(-3), status: "Overdue" },
      { id: "demo-task-3", title: "Add ticket activity timeline", description: "Display status changes and assignment history.", dueDate: dateFromToday(4), status: "In Progress" },
      { id: "demo-task-4", title: "Create support navigation", description: "Add ticket list and team overview navigation.", dueDate: dateFromToday(-5), status: "Completed" },
    ],
    bugs: [
      { title: "Priority filter resets on refresh", description: "The selected priority is cleared after reloading the ticket list.", status: "Open" },
      { title: "Ticket title overlaps on mobile", description: "Long titles overlap the status badge on narrow screens.", status: "Open" },
    ],
    clarifications: [{ title: "Confirm escalation permissions", description: "Waiting for Operations to confirm which roles can escalate tickets.", status: "Needs clarification" }],
  },
  {
    id: "demo-project-5", name: "Learning Analytics Dashboard", client: "Learning Program", priority: "Medium", due: dateFromToday(12), owner: "Education Team", status: "Active",
    description: "Show course progress, assignment completion, and student engagement summaries.",
    requiredFeatures: "Course filters, progress cards, assignment summaries", pagesModules: "Overview, course progress, assignments",
    tasks: [
      { id: "demo-task-5", title: "Add course progress cards", description: "Show completed lessons and remaining assignments for each course.", dueDate: dateFromToday(3), status: "Pending" },
      { id: "demo-task-6", title: "Verify assignment totals", description: "Compare overview totals with individual course summaries.", dueDate: dateFromToday(-1), status: "Overdue" },
    ],
    bugs: [{ title: "Empty courses show incorrect progress", description: "A course without lessons displays 100% instead of an empty state.", status: "Open" }],
    clarifications: [{ title: "Confirm weekly reporting period", description: "Waiting for Education to confirm whether reports start on Monday or Sunday.", status: "Needs clarification" }],
  },
  {
    id: "demo-project-6", name: "Attendance Reporting Refresh", client: "Internal Platform", priority: "Medium", due: dateFromToday(-7), owner: "HR Team", status: "Completed",
    description: "Delivered monthly attendance filters and a refreshed report layout.", requiredFeatures: "Monthly filters, status badges, attendance summaries", pagesModules: "Attendance reports",
  },
  {
    id: "demo-project-7", name: "Employee Profile Documents", client: "Internal Platform", priority: "Low", due: dateFromToday(-14), owner: "HR Team", status: "Completed",
    description: "Delivered employee profile, emergency contact, and document information cards.", requiredFeatures: "Profile details, emergency contacts, document status", pagesModules: "Account settings",
  },
].map((project) => ({
  assignedEmployeeId: "60", projectName: project.name, service: "Web Application Development",
  startDate: dateFromToday(-30), technologyRequirements: "React, responsive CSS",
  designRequirements: "Accessible forms and mobile-friendly layouts",
  structure: "Requirements > Design > Development > QA > Release",
  specialInstructions: "Review acceptance criteria with the project owner.",
  ...project,
}));
