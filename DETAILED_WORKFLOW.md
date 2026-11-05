# ORVEXA SaaS — Detailed End-to-End Workflow Guide

This document describes the complete operational, administrative, and daily execution workflow of the **ORVEXA SaaS platform**, tailored specifically for your organization structure:
* **1 Owner (CEO):** Global oversight, strategic direction, and full system root authority.
* **1 HR & Admin (`vaishukannan35@gmail.com`):** People management, onboarding, attendance, leave approvals, assets, and payroll.
* **2 Managers:** Project delivery, task creation, workload distribution, reviewing deliverables, and operational quality.
* **2 Members (Full-time Engineers):** Core sprint task execution, timesheet logging, and progress updates.
* **4 Interns:** Task execution under close manager review, with restricted access to assigned work only.

---

## 1. System Architecture & Tier Hierarchy

```
                               ┌─────────────────────────────────┐
                               │           OWNER (CEO)           │
                               │   Root Access / All Visibility  │
                               └────────────────┬────────────────┘
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
        ┌─────────────────────────────┐                   ┌─────────────────────────────┐
        │         HR & ADMIN          │                   │      2 TEAM MANAGERS        │
        │ People, Leave, Attendance,  │                   │ Project Creation, Task      │
        │ Assets, Onboarding, Payroll │                   │ Assignment, Approvals, QA   │
        └─────────────────────────────┘                   └──────────────┬──────────────┘
                                                                         │
                                                ┌────────────────────────┴────────────────────────┐
                                                ▼                                                 ▼
                                 ┌─────────────────────────────┐                   ┌─────────────────────────────┐
                                 │     2 CORE MEMBERS / DEVS   │                   │          4 INTERNS          │
                                 │ Task Execution, Daily Time, │                   │ Guided Execution, Reviews,  │
                                 │ Status Updates (Assigned)   │                   │ Status Updates (Assigned)   │
                                 └─────────────────────────────┘                   └─────────────────────────────┘
```

---

## 2. Phase 1: Workspace Setup & Governance (Day 0)

Before employees begin daily work, the **Owner** and **HR/Admin** configure workspace settings:

1. **Organization Profile (`/app/settings ➔ Organization Details`):**
   * Set company legal name, official brand logo, and operational timezone (e.g., `UTC+05:30 (IST)`).
2. **Operational Schedule (`/app/onboarding` or `/app/time`):**
   * Define standard working days (e.g., Monday through Friday).
   * Set core shift hours (e.g., `09:00 AM` to `06:00 PM`) and 8 daily expected work hours.
   * Add gazetted holidays into the calendar.
3. **Module Entitlements (`/app/settings ➔ Modules & Features`):**
   * **Keep Enabled:** `projects`, `tasks`, `people`, `time`, `attendance`, `leave`, `quality`, `assets`, `payroll`.
   * **Uncheck if not needed:** `work_queue` (turn off high-throughput ticket batching if your team operates purely on sprint projects).
4. **Organizational Structure (`/app/settings ➔ Org Structure`):**
   * **Departments:** Create `Engineering`, `Operations`, `Human Resources`.
   * **Teams:** Under Engineering, create `Frontend Squad` and `Backend Services`.
   * **Designations:** Create `Team Lead`, `Software Engineer`, `Intern`, `HR Specialist`.

---

## 3. Phase 2: Tiered User Provisioning & Invitation Flow

Under **People Directory ➔ Invite Member** (`/app/people`), HR and the Owner provision each team tier:

```
┌─────────────────┬──────────┬──────────────┬───────────────┬───────────────────────────┐
│ Tier            │ Role     │ Department   │ Designation   │ Data Access Scope         │
├─────────────────┼──────────┼──────────────┼───────────────┼───────────────────────────┤
│ 1. Owner        │ OWNER    │ Executive    │ CEO           │ Entire Workspace Records  │
│ 2. HR & Admin   │ ADMIN    │ HR           │ HR Manager    │ Entire Workspace Records  │
│ 3. 2 Managers   │ MANAGER  │ Engineering  │ Team Lead     │ Assigned Team Records     │
│ 4. 2 Members    │ MEMBER   │ Engineering  │ Software Eng. │ Assigned Records Only     │
│ 5. 4 Interns    │ MEMBER   │ Engineering  │ Intern        │ Assigned Records Only     │
└─────────────────┴──────────┴──────────────┴───────────────┴───────────────────────────┘
```

### The Invitation Acceptance Lifecycle:
1. HR or Owner clicks **"Send Invitation"**.
2. An automated email is dispatched with a cryptographic invite link (`/accept-invitation?token=...`).
3. The employee opens the link, sets their account password, and verifies their details.
4. The system automatically creates their `User` and binds their `Membership` to the workspace with the pre-configured role, department, manager link (`reportsToId`), and data scope.

---

## 4. Phase 3: The End-to-End Daily Operating Workflow

```
09:00 AM ─── Clock-In & Presence Tracking
             ├── Members & Interns: Clock In on dashboard
             ├── Managers: Review team presence, check for absentees
             └── HR & Owner: High-level attendance audit

09:30 AM ─── Sprint Standup & Work Distribution
             └── Managers: Create project tasks & assign to Members/Interns

10:00 AM ─── Sprint Execution (Assignee Flow)
             ├── Members & Interns: Move cards to "IN_PROGRESS", execute code/deliverables
             └── Managers: Unblock tasks, answer technical questions

01:00 PM ─── Break & Administrative Requests
             ├── Members/Interns: Pause shift for lunch, apply for leaves/hardware
             └── HR & Managers: Review leave requests & allocate hardware assets

03:00 PM ─── Deliverable Submissions & Quality Reviews
             ├── Members/Interns: Move tasks to "REVIEW"
             ├── Managers: Inspect deliverable, fill QA scorecard, mark "DONE"
             └── Owner/Managers: Monitor SLA timers & sprint burndown

05:30 PM ─── Timesheet Logging & Manager Approval
             ├── Members/Interns: Log hours worked against tasks
             └── Managers: Click "Approve All" to lock timesheets for payroll

06:00 PM ─── Daily Wrap-Up & Clock-Out
             └── All staff click "Clock Out" to record final daily hours
```

---

### Step 1: 09:00 AM — Morning Arrival & Digital Attendance
1. **Developer / Intern:**
   * Logs into `/app/home`.
   * Clicks **"Clock In"** on the top-right header widget. The daily attendance timer activates.
   * Checks the **"My Assigned Tasks"** panel to see priority deliverables due today.
2. **Team Lead (Manager):**
   * Clocks in.
   * Opens `/app/time` (Attendance view) to verify that both team members and all 4 interns have checked in. Late arrivals or missing punches are highlighted.
3. **HR & Admin:**
   * Reviews company-wide attendance logs and notes any members marked as on approved leave.
4. **Owner (CEO):**
   * Views the executive presence overview and active project summaries on `/app/home`.

---

### Step 2: 09:30 AM — Work Planning & Task Assignment (Assigner Flow)
1. **Team Lead (Manager):**
   * Navigates to **Projects & Tasks** (`/app/projects`).
   * Opens the active project/sprint board.
   * Clicks **"Create Task"**:
     * Title: *"Implement Password Reset Email Template"*
     * Priority: `HIGH`
     * Estimate: `4 hours`
     * **Assignee:** Selects **Member 1** or **Intern 2**.
     * Due Date: Today, 05:00 PM.
2. **Member / Intern Perspective:**
   * Because their data scope is set to **`Assigned Records Only`**, they do **not** see other team members' cards or unrelated projects.
   * The newly assigned task instantly appears directly on their dashboard and personal task board.

---

### Step 3: 10:00 AM to 01:00 PM — Execution & In-Progress Tracking
1. **Member / Intern:**
   * Clicks the task card and moves status from **`TODO`** to **`IN_PROGRESS`**.
   * Begins writing code or preparing deliverables.
   * If a question arises, sends a message to the team channel in **Team Communication** (`/app/communication`).
2. **Manager:**
   * Sees the real-time board update: 2 tasks in progress by Members, 4 tasks in progress by Interns.
   * Monitors progress without having to manually message each employee.

---

### Step 4: 01:00 PM to 02:00 PM — Breaks, Approvals & Leave Requests
1. **Taking Breaks:**
   * Employees click **"Take Break"** (e.g., *Lunch Break*) under Time Tracking to pause the active work counter.
2. **Applying for Leave:**
   * An intern needs time off next Friday for university exams.
   * Navigates to `/app/time ➔ Leave`, selects `Casual Leave`, picks the date, adds a note (*"Semester Exam"*), and submits.
   * **Approval Routing:** The platform routes the request to their assigned **Manager** and **HR**.
   * The Manager receives an in-app notification and clicks **"Approve"**.
   * The employee's leave balance updates automatically, and the day is marked on the **Operations Calendar** (`/app/calendar`).
3. **Asset & Equipment Requests:**
   * A developer requests a secondary testing monitor under `/app/requests`.
   * **HR / Admin** reviews `/app/assets`, approves the request, and assigns the monitor serial number to the developer's profile.

---

### Step 5: 02:00 PM to 05:00 PM — Quality Review, SLA Tracking & Task Sign-off
1. **Submitting for Review:**
   * The Intern finishes their work, commits code, and drags the card from **`IN_PROGRESS`** to **`REVIEW`**.
2. **Manager Quality Inspection:**
   * The Manager opens the task, inspects the deliverable, and runs quality verification:
     * Code standard checked? ✅
     * Unit tests passing? ✅
     * Acceptance criteria met? ✅
   * If approved: Moves the card to **`DONE`**.
   * If changes are needed: Moves the card back to **`IN_PROGRESS`** with review notes.
3. **SLA & Escalation Engine:**
   * If any task with an urgent SLA reaches 80% of its turnaround window without completion, an amber alert flags the card for the Manager and Owner.

---

### Step 6: 05:30 PM — Timesheet Logging & Approvals
1. **Member / Intern:**
   * Navigates to `/app/time ➔ Timesheets`.
   * Records hours worked against today's tasks (e.g., 6.0 hours on Task #101, 1.5 hours on code review).
   * Submits daily timesheet for manager verification.
2. **Manager:**
   * Opens **Timesheet Approvals**.
   * Verifies that logged hours match actual output and attendance hours.
   * Clicks **"Approve All"**. Logged hours are now locked and synchronized with payroll.

---

### Step 7: 06:00 PM — End-of-Day Clock-Out & Analytics Wrap-Up
1. **Employees:**
   * Navigate to `/app/home` and click **"Clock Out"**.
   * System records total active shift time (e.g., 8 hours 35 minutes) and concludes the attendance session.
2. **HR / Admin:**
   * Verifies that all staff have clocked out and reviews daily attendance metrics.
3. **Owner (CEO):**
   * Reviews the daily burndown chart, completed deliverables, and team productivity in `/app/analytics`.

---

## 5. Phase 4: Monthly & Periodic Governance Workflows

### Monthly Payroll Generation (HR & Admin):
1. On the 28th/30th of each month, HR opens **Payroll & Compensation** (`/app/payroll`).
2. Clicks **"Run Monthly Payroll"**:
   * Automatically calculates base salaries for all 9 employees.
   * Factors in approved paid leaves vs. unapproved absences (Loss of Pay / LOP).
   * Calculates overtime hours approved by managers.
3. HR generates payslips, and employees can securely view and download their personal pay statements.

### Quarterly Org & Access Audits (Owner & HR):
* Review employee performance metrics in `/app/analytics`.
* Transition successful interns to full-time `Software Engineer` designations in `/app/people`.
* Inspect system security and audit logs to ensure compliance.
