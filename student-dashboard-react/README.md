# Student Dashboard (React)

A standalone React prototype of the Student Dashboard, styled to match the existing CRM Admin Dashboard theme (dark sidebar, cream background, maroon accent).

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (defaults to http://localhost:5174).

## Build for production

```bash
npm run build
npm run preview
```

## Project structure

```
student-dashboard-react/
├── index.html              # Vite entry HTML
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx             # React root / mounts <StudentDashboard />
│   ├── index.css            # Minimal global reset
│   └── StudentDashboard.jsx # The entire dashboard (sidebar, header, all pages, modal)
└── README.md
```

## What's inside

- Sidebar navigation (Dashboard, All Courses, My Courses, Videos, Notes, Assignments,
  My Progress, Notifications, Profile, Logout) that switches the visible page.
- Dashboard: welcome banner, 4 summary cards, Continue Learning card, All Courses
  preview, Recent Assignments table, Recent Learning Activity feed.
- All Courses page with a live search filter.
- My Courses page showing only enrolled courses.
- Videos / Notes pages showing locked vs. unlocked state per course.
- Assignments page with status badges (Pending / Submitted / Evaluated).
- My Progress page with per-course progress bars.
- Notifications dropdown (header) + full Notifications page, with unread counts and
  "mark all read".
- Course detail modal on any course card click.
- Responsive layout — sidebar collapses into a mobile menu under ~860px.

All data is static dummy data defined at the top of `StudentDashboard.jsx` — no backend,
API, or database calls.
