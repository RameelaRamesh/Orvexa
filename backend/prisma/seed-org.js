const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding organization data according to specifications...');

  // 1. Seed Permissions
  const permissions = [
    { code: 'people:view', name: 'View Employee Directory & Profiles', module: 'People' },
    { code: 'people:create', name: 'Add & Onboard Employees', module: 'People' },
    { code: 'people:edit', name: 'Edit Employee Records & Assignments', module: 'People' },
    { code: 'people:delete', name: 'Deactivate & Offboard Employees', module: 'People' },
    { code: 'people:export', name: 'Export Employee Records', module: 'People' },
    { code: 'people:manage', name: 'Full People Administration', module: 'People' },

    { code: 'projects:view', name: 'View Work Projects', module: 'Projects' },
    { code: 'projects:create', name: 'Create Projects & Milestones', module: 'Projects' },
    { code: 'projects:edit', name: 'Edit Project Settings', module: 'Projects' },
    { code: 'projects:delete', name: 'Archive & Delete Projects', module: 'Projects' },
    { code: 'projects:manage', name: 'Full Project Administration', module: 'Projects' },

    { code: 'tasks:view', name: 'View Tasks & Taskboards', module: 'Tasks' },
    { code: 'tasks:create', name: 'Create Tasks', module: 'Tasks' },
    { code: 'tasks:edit', name: 'Update Task Progress & Details', module: 'Tasks' },
    { code: 'tasks:delete', name: 'Delete Tasks', module: 'Tasks' },
    { code: 'tasks:assign', name: 'Assign Tasks to Team Members', module: 'Tasks' },
    { code: 'tasks:export', name: 'Export Tasks & Backlogs', module: 'Tasks' },
    { code: 'tasks:manage', name: 'Full Task Administration', module: 'Tasks' },

    { code: 'work_items:view', name: 'View Operations Queues', module: 'WorkQueue' },
    { code: 'work_items:process', name: 'Process Operational Queue Items', module: 'WorkQueue' },
    { code: 'work_items:assign', name: 'Assign & Reorder Work Items', module: 'WorkQueue' },
    { code: 'work_items:export', name: 'Export Queue Data', module: 'WorkQueue' },
    { code: 'work_items:manage', name: 'Full Operations Queue Administration', module: 'WorkQueue' },

    { code: 'time:view', name: 'View Timesheets & Time Logs', module: 'Time' },
    { code: 'time:log', name: 'Log Work Hours & Timer', module: 'Time' },
    { code: 'time:edit', name: 'Edit Logged Timesheets', module: 'Time' },
    { code: 'time:approve', name: 'Approve Team Timesheets', module: 'Time' },
    { code: 'time:export', name: 'Export Timesheet Logs', module: 'Time' },
    { code: 'time:manage', name: 'Full Time & Shift Administration', module: 'Time' },

    { code: 'attendance:view', name: 'View Attendance Records', module: 'Attendance' },
    { code: 'attendance:clock', name: 'Clock In & Clock Out', module: 'Attendance' },
    { code: 'attendance:edit', name: 'Adjust Attendance Records', module: 'Attendance' },
    { code: 'attendance:export', name: 'Export Attendance Reports', module: 'Attendance' },
    { code: 'attendance:manage', name: 'Full Attendance Administration', module: 'Attendance' },

    { code: 'leave:view', name: 'View Leave Balances & Team Calendar', module: 'Leave' },
    { code: 'leave:apply', name: 'Apply for Leave & PTO', module: 'Leave' },
    { code: 'leave:approve', name: 'Approve or Reject Leave Requests', module: 'Leave' },
    { code: 'leave:manage', name: 'Full Leave Policy Administration', module: 'Leave' },

    { code: 'approvals:view', name: 'View Pending Approvals', module: 'Approvals' },
    { code: 'approvals:approve', name: 'Approve or Reject Operational Items', module: 'Approvals' },
    { code: 'approvals:manage', name: 'Configure Approval Chains', module: 'Approvals' },

    { code: 'quality:view', name: 'View Quality Audit Scorecards', module: 'Quality' },
    { code: 'quality:audit', name: 'Perform Quality Audits', module: 'Quality' },
    { code: 'quality:review', name: 'Conduct QA Reviews', module: 'Quality' },
    { code: 'quality:manage', name: 'Configure Quality Scorecards & Thresholds', module: 'Quality' },

    { code: 'sla:view', name: 'View SLA Metrics & Breaches', module: 'SLA' },
    { code: 'sla:manage', name: 'Configure SLA Deadlines & Escalation Rules', module: 'SLA' },

    { code: 'reports:view', name: 'View Operational Reports & Dashboards', module: 'Reports' },
    { code: 'reports:export', name: 'Export Analytic Reports', module: 'Reports' },

    { code: 'org:manage', name: 'Manage Organization Profile', module: 'Organization' },
    { code: 'invitations:manage', name: 'Invite & Manage Team Members', module: 'Invitations' },
    { code: 'roles:manage', name: 'Configure Custom Roles & Permissions', module: 'Roles' },
    { code: 'departments:manage', name: 'Manage Departments & Teams', module: 'Departments' },
    { code: 'settings:manage', name: 'Manage Workspace Settings', module: 'Settings' },
    { code: 'billing:manage', name: 'Manage Subscriptions & Billing', module: 'Billing' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, module: p.module },
      create: p,
    });
  }
  console.log('✔ System permissions upserted');

  // 2. Seed System Roles
  const allPerms = await prisma.permission.findMany();
  const permMap = new Map(allPerms.map((p) => [p.code, p.id]));

  const platformRoles = [
    { name: 'OWNER', description: 'Workspace Owner with full root authority', isSystemRole: true },
    { name: 'ADMIN', description: 'Organization administration and operational authority', isSystemRole: true },
    { name: 'MANAGER', description: 'Team and operations management', isSystemRole: true },
    { name: 'MEMBER', description: 'Individual contributor', isSystemRole: true },
  ];

  const roleMap = new Map();
  for (const r of platformRoles) {
    let existing = await prisma.role.findFirst({
      where: { name: r.name, isSystemRole: true },
    });
    if (!existing) {
      existing = await prisma.role.create({
        data: r,
      });
    }
    roleMap.set(r.name, existing);
  }

  // Assign permissions to roles
  const ownerPermCodes = allPerms.map((p) => p.code);
  const adminPermCodes = allPerms.map((p) => p.code).filter((c) => c !== 'billing:manage');
  const managerPermCodes = [
    'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:assign', 'tasks:export',
    'projects:view', 'projects:create', 'projects:edit',
    'leave:view', 'leave:apply', 'leave:approve',
    'people:view', 'reports:view', 'approvals:view', 'approvals:approve',
  ];
  const memberPermCodes = [
    'tasks:view', 'tasks:create', 'tasks:edit',
    'projects:view',
    'leave:view', 'leave:apply',
    'people:view',
  ];

  const roleCodesMap = {
    OWNER: ownerPermCodes,
    ADMIN: adminPermCodes,
    MANAGER: managerPermCodes,
    MEMBER: memberPermCodes,
  };

  for (const [roleName, codes] of Object.entries(roleCodesMap)) {
    const roleObj = roleMap.get(roleName);
    for (const code of codes) {
      const permId = permMap.get(code);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: roleObj.id, permissionId: permId } },
          update: {},
          create: { roleId: roleObj.id, permissionId: permId },
        });
      }
    }
  }
  console.log('✔ System roles & role permissions configured');

  // 3. Create or Fetch Workspace
  const workspaceSlug = 'orvexa-hq';
  let workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'ORVEXA Enterprise',
        slug: workspaceSlug,
        businessType: 'OPERATIONS',
        settings: {
          timezone: 'Asia/Kolkata',
          enabledModules: ['people', 'projects', 'tasks', 'leave'],
        },
      },
    });
  }
  console.log('✔ Workspace ready:', workspace.name, `(${workspace.id})`);

  // 4. Seed Leave Policies
  const leavePolicies = [
    { leaveType: 'ANNUAL', name: 'Annual Paid Leave', annualAllocation: 18, paid: true },
    { leaveType: 'SICK', name: 'Sick Leave', annualAllocation: 10, paid: true },
    { leaveType: 'CASUAL', name: 'Casual Leave', annualAllocation: 8, paid: true },
    { leaveType: 'UNPAID', name: 'Unpaid Leave', annualAllocation: 30, paid: false },
  ];
  for (const lp of leavePolicies) {
    await prisma.leavePolicy.upsert({
      where: { workspaceId_leaveType: { workspaceId: workspace.id, leaveType: lp.leaveType } },
      update: lp,
      create: { ...lp, workspaceId: workspace.id },
    });
  }
  console.log('✔ Leave policies created');

  // 5. Seed Departments
  const deptDefs = [
    { name: 'Executive', code: 'EXEC', description: 'Executive Leadership & Operations' },
    { name: 'Engineering', code: 'TECH', description: 'Software Development & Technical Operations' },
    { name: 'Marketing', code: 'MKTG', description: 'Growth, Marketing & Creative Operations' },
    { name: 'Human Resources', code: 'HR', description: 'People, Culture & Administration' },
  ];
  const deptMap = new Map();
  for (const d of deptDefs) {
    let dept = await prisma.department.findFirst({
      where: { workspaceId: workspace.id, name: d.name },
    });
    if (!dept) {
      dept = await prisma.department.create({
        data: { ...d, workspaceId: workspace.id },
      });
    }
    deptMap.set(d.name, dept);
  }
  console.log('✔ Departments created (Executive, Engineering, Marketing, Human Resources)');

  // 6. Seed Designations (The titles you manually type)
  const designationDefs = [
    { title: 'Founder & Owner', level: 5, description: 'Organization Owner & Ultimate Authority' },
    { title: 'Operations Head', level: 4, description: 'Head of Operations & Strategic Execution' },
    { title: 'HR Manager', level: 3, description: 'Human Resources Management' },
    { title: 'Tech Team Leader', level: 3, description: 'Technical Team Lead & Architecture' },
    { title: 'Marketing Team Leader', level: 3, description: 'Marketing Team Lead & Strategy' },
    { title: 'Junior Developer', level: 2, description: 'Core Application Engineering' },
    { title: 'Tech Intern', level: 1, description: 'Technical Intern in Tech Team' },
    { title: 'Marketing Intern', level: 1, description: 'Marketing & Outbound Operations Intern' },
  ];
  const desigMap = new Map();
  for (const dg of designationDefs) {
    let desig = await prisma.designation.findFirst({
      where: { workspaceId: workspace.id, title: dg.title },
    });
    if (!desig) {
      desig = await prisma.designation.create({
        data: { ...dg, workspaceId: workspace.id },
      });
    }
    desigMap.set(dg.title, desig);
  }
  console.log('✔ Custom Designations created');

  // 7. Seed Teams (Initially without leads, updated after members created)
  const teamDefs = [
    { name: 'Tech Team', departmentId: deptMap.get('Engineering').id, description: 'Engineering, Development & Interns' },
    { name: 'Marketing Team', departmentId: deptMap.get('Marketing').id, description: 'Growth, Marketing Campaigns & Interns' },
  ];
  const teamMap = new Map();
  for (const t of teamDefs) {
    let team = await prisma.team.findFirst({
      where: { workspaceId: workspace.id, name: t.name },
    });
    if (!team) {
      team = await prisma.team.create({
        data: { ...t, workspaceId: workspace.id },
      });
    }
    teamMap.set(t.name, team);
  }
  console.log('✔ Teams created (Tech Team, Marketing Team)');

  // 8. Hash Password ('password')
  const passwordHash = await bcrypt.hash('password', 10);

  // Helper to upsert user and membership
  async function setupUserAndMembership({
    email,
    firstName,
    lastName,
    systemRole,
    designationTitle,
    departmentName,
    teamName = null,
    dataScope = 'ASSIGNED',
    reportsToMembershipId = null,
  }) {
    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {
        passwordHash,
        firstName,
        lastName,
        status: 'ACTIVE',
        isEmailVerified: true,
        mustChangePassword: false,
      },
      create: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        status: 'ACTIVE',
        isEmailVerified: true,
        mustChangePassword: false,
        tokenVersion: 1,
      },
    });

    const role = roleMap.get(systemRole);
    const designation = desigMap.get(designationTitle);
    const department = deptMap.get(departmentName);
    const team = teamName ? teamMap.get(teamName) : null;

    let membership = await prisma.membership.findFirst({
      where: { userId: user.id, workspaceId: workspace.id },
    });

    if (!membership) {
      membership = await prisma.membership.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          roleId: role.id,
          accessRole: systemRole,
          designationId: designation?.id || null,
          departmentId: department?.id || null,
          teamId: team?.id || null,
          reportsToId: reportsToMembershipId,
          dataScope,
          status: 'ACTIVE',
        },
      });
    } else {
      membership = await prisma.membership.update({
        where: { id: membership.id },
        data: {
          roleId: role.id,
          accessRole: systemRole,
          designationId: designation?.id || null,
          departmentId: department?.id || null,
          teamId: team?.id || null,
          reportsToId: reportsToMembershipId,
          dataScope,
          status: 'ACTIVE',
        },
      });
    }

    return { user, membership };
  }

  // A. Create Owner
  const owner = await setupUserAndMembership({
    email: 'owner@orvexa.local',
    firstName: 'Victor',
    lastName: 'Vance (Owner)',
    systemRole: 'OWNER',
    designationTitle: 'Founder & Owner',
    departmentName: 'Executive',
    dataScope: 'GLOBAL',
  });
  console.log('✔ Owner created: owner@orvexa.local');

  // B. Create Operations Head (Reports to Owner)
  const head = await setupUserAndMembership({
    email: 'head@orvexa.local',
    firstName: 'Elena',
    lastName: 'Rostova (Operations Head)',
    systemRole: 'ADMIN',
    designationTitle: 'Operations Head',
    departmentName: 'Executive',
    dataScope: 'GLOBAL',
    reportsToMembershipId: owner.membership.id,
  });
  console.log('✔ Operations Head created: head@orvexa.local');

  // C. Create HR (Reports to Operations Head)
  const hr = await setupUserAndMembership({
    email: 'hr@orvexa.local',
    firstName: 'Hannah',
    lastName: 'Reed (HR)',
    systemRole: 'ADMIN',
    designationTitle: 'HR Manager',
    departmentName: 'Human Resources',
    dataScope: 'GLOBAL',
    reportsToMembershipId: head.membership.id,
  });
  console.log('✔ HR created: hr@orvexa.local');

  // D. Create Tech Team Lead (Reports to Operations Head)
  const techLead = await setupUserAndMembership({
    email: 'techlead@orvexa.local',
    firstName: 'Marcus',
    lastName: 'Vance (Tech TL)',
    systemRole: 'MANAGER',
    designationTitle: 'Tech Team Leader',
    departmentName: 'Engineering',
    teamName: 'Tech Team',
    dataScope: 'TEAM',
    reportsToMembershipId: head.membership.id,
  });
  console.log('✔ Tech Team Lead created: techlead@orvexa.local');

  // E. Create Marketing Team Lead (Reports to Operations Head)
  const marketingLead = await setupUserAndMembership({
    email: 'marketinglead@orvexa.local',
    firstName: 'Sophia',
    lastName: 'Chen (Marketing TL)',
    systemRole: 'MANAGER',
    designationTitle: 'Marketing Team Leader',
    departmentName: 'Marketing',
    teamName: 'Marketing Team',
    dataScope: 'TEAM',
    reportsToMembershipId: head.membership.id,
  });
  console.log('✔ Marketing Team Lead created: marketinglead@orvexa.local');

  // Update Team Leads on the Team models
  await prisma.team.update({
    where: { id: teamMap.get('Tech Team').id },
    data: { leadMembershipId: techLead.membership.id },
  });
  await prisma.team.update({
    where: { id: teamMap.get('Marketing Team').id },
    data: { leadMembershipId: marketingLead.membership.id },
  });

  // F. Create 2 Junior Developers (Report to Tech TL)
  const dev1 = await setupUserAndMembership({
    email: 'alex.dev@orvexa.local',
    firstName: 'Alex',
    lastName: 'Mercer (Junior Dev)',
    systemRole: 'MEMBER',
    designationTitle: 'Junior Developer',
    departmentName: 'Engineering',
    teamName: 'Tech Team',
    dataScope: 'ASSIGNED',
    reportsToMembershipId: techLead.membership.id,
  });
  const dev2 = await setupUserAndMembership({
    email: 'jordan.dev@orvexa.local',
    firstName: 'Jordan',
    lastName: 'Blake (Junior Dev)',
    systemRole: 'MEMBER',
    designationTitle: 'Junior Developer',
    departmentName: 'Engineering',
    teamName: 'Tech Team',
    dataScope: 'ASSIGNED',
    reportsToMembershipId: techLead.membership.id,
  });
  console.log('✔ 2 Junior Developers created (alex.dev@orvexa.local, jordan.dev@orvexa.local)');

  // G. Create 2 Tech Interns (Report to Tech TL)
  const techIntern1 = await setupUserAndMembership({
    email: 'sam.intern@orvexa.local',
    firstName: 'Sam',
    lastName: 'Altman (Tech Intern)',
    systemRole: 'MEMBER',
    designationTitle: 'Tech Intern',
    departmentName: 'Engineering',
    teamName: 'Tech Team',
    dataScope: 'ASSIGNED',
    reportsToMembershipId: techLead.membership.id,
  });
  const techIntern2 = await setupUserAndMembership({
    email: 'chris.intern@orvexa.local',
    firstName: 'Chris',
    lastName: 'Evans (Tech Intern)',
    systemRole: 'MEMBER',
    designationTitle: 'Tech Intern',
    departmentName: 'Engineering',
    teamName: 'Tech Team',
    dataScope: 'ASSIGNED',
    reportsToMembershipId: techLead.membership.id,
  });
  console.log('✔ 2 Tech Interns created (sam.intern@orvexa.local, chris.intern@orvexa.local)');

  // H. Create 2 Marketing Interns (Report to Marketing TL)
  const mktgIntern1 = await setupUserAndMembership({
    email: 'taylor.intern@orvexa.local',
    firstName: 'Taylor',
    lastName: 'Swift (Marketing Intern)',
    systemRole: 'MEMBER',
    designationTitle: 'Marketing Intern',
    departmentName: 'Marketing',
    teamName: 'Marketing Team',
    dataScope: 'ASSIGNED',
    reportsToMembershipId: marketingLead.membership.id,
  });
  const mktgIntern2 = await setupUserAndMembership({
    email: 'morgan.intern@orvexa.local',
    firstName: 'Morgan',
    lastName: 'Freeman (Marketing Intern)',
    systemRole: 'MEMBER',
    designationTitle: 'Marketing Intern',
    departmentName: 'Marketing',
    teamName: 'Marketing Team',
    dataScope: 'ASSIGNED',
    reportsToMembershipId: marketingLead.membership.id,
  });
  console.log('✔ 2 Marketing Interns created (taylor.intern@orvexa.local, morgan.intern@orvexa.local)');

  // 9. Create Projects & Daily Tasks to demonstrate workflow
  let techProject = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, key: 'TECH-APP' },
  });
  if (!techProject) {
    techProject = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'Core SaaS Application',
        key: 'TECH-APP',
        description: 'Frontend & Backend development for ORVEXA Platform',
        status: 'ACTIVE',
        priority: 'HIGH',
      },
    });
  }

  let mktgProject = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, key: 'MKTG-Q4' },
  });
  if (!mktgProject) {
    mktgProject = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'Growth & Outreach Operations',
        key: 'MKTG-Q4',
        description: 'Marketing outreach, creatives, and lead generation',
        status: 'ACTIVE',
        priority: 'MEDIUM',
      },
    });
  }

  // Create Daily Tasks assigned by TLs
  const sampleTasks = [
    {
      title: 'Implement User Role Permissions Middleware',
      description: 'Add granular permission checks to backend API routes',
      assigneeId: dev1.membership.id,
      projectId: techProject.id,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    },
    {
      title: 'Audit and Test Database Indexing for Tasks',
      description: 'Optimize task query execution speeds across workspaces',
      assigneeId: dev2.membership.id,
      projectId: techProject.id,
      status: 'IN_REVIEW', // Ready for TL review!
      priority: 'MEDIUM',
    },
    {
      title: 'Fix Sidebar Navigation Active Link Highlighting',
      description: 'Ensure active menu item highlights properly in dark/light mode',
      assigneeId: techIntern1.membership.id,
      projectId: techProject.id,
      status: 'TODO',
      priority: 'LOW',
    },
    {
      title: 'Write Unit Tests for Leave Calculation Service',
      description: 'Verify annual leave balance deductions on approved status',
      assigneeId: techIntern2.membership.id,
      projectId: techProject.id,
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
    },
    {
      title: 'Draft Product Launch Announcement Newsletter',
      description: 'Write engaging copy highlighting dual work engine capabilities',
      assigneeId: mktgIntern1.membership.id,
      projectId: mktgProject.id,
      status: 'IN_REVIEW', // Ready for Marketing TL review!
      priority: 'HIGH',
    },
    {
      title: 'Design Social Media Banner Assets for Feature Showcase',
      description: 'Create 1200x630 banners adhering to Manrope typography style',
      assigneeId: mktgIntern2.membership.id,
      projectId: mktgProject.id,
      status: 'TODO',
      priority: 'MEDIUM',
    },
  ];

  for (const st of sampleTasks) {
    const existingTask = await prisma.task.findFirst({
      where: { workspaceId: workspace.id, title: st.title },
    });
    if (!existingTask) {
      await prisma.task.create({
        data: {
          workspaceId: workspace.id,
          title: st.title,
          description: st.description,
          projectId: st.projectId,
          assigneeMembershipId: st.assigneeId,
          status: st.status,
          priority: st.priority,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
        },
      });
    }
  }
  console.log('✔ Daily tasks assigned by Team Leads created');

  // 10. Sample Pending Leave Request for Operations Head to Review
  const existingLeave = await prisma.leaveRequest.findFirst({
    where: { workspaceId: workspace.id, membershipId: dev1.membership.id },
  });
  if (!existingLeave) {
    await prisma.leaveRequest.create({
      data: {
        workspaceId: workspace.id,
        membershipId: dev1.membership.id,
        leaveType: 'CASUAL',
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        totalDays: 2,
        reason: 'Family event and personal matters',
        status: 'PENDING',
      },
    });
    console.log('✔ Sample pending leave request created for Alex Dev (waiting for Operations Head approval)');
  }

  console.log('\n======================================================');
  console.log('ALL ACCOUNTS & HIERARCHY SEEDED SUCCESSFULLY!');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
