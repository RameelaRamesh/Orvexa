const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const ms = await prisma.membership.findMany({
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      role: { select: { name: true } },
      designation: { select: { title: true } },
      department: { select: { name: true } },
      team: { select: { name: true } },
      reportsTo: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\nVerified ${ms.length} seeded active members:`);
  console.log('------------------------------------------------------------------------------------------------------------------------');
  for (const m of ms) {
    const email = m.user.email.padEnd(28, ' ');
    const role = m.accessRole.padEnd(8, ' ');
    const desig = (m.designation?.title || '').padEnd(24, ' ');
    const dept = (m.department?.name || '').padEnd(16, ' ');
    const team = (m.team?.name || '-').padEnd(16, ' ');
    const reportsTo = m.reportsTo ? `${m.reportsTo.user.firstName} ${m.reportsTo.user.lastName}` : 'None';
    console.log(`${email} | ${role} | ${desig} | ${dept} | ${team} | Reports to: ${reportsTo}`);
  }
  console.log('------------------------------------------------------------------------------------------------------------------------\n');

  const tasks = await prisma.task.findMany({
    include: {
      assignee: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });
  console.log(`Verified ${tasks.length} sample daily tasks:`);
  for (const t of tasks) {
    console.log(`- [${t.status.padEnd(11, ' ')}] "${t.title}" -> Assigned to: ${t.assignee?.user.firstName} ${t.assignee?.user.lastName}`);
  }

  const leaves = await prisma.leaveRequest.findMany({
    include: {
      membership: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });
  console.log(`\nVerified ${leaves.length} pending leave requests:`);
  for (const l of leaves) {
    console.log(`- [${l.status}] ${l.membership.user.firstName} ${l.membership.user.lastName}: ${l.totalDays} day(s) (${l.leaveType}) - Reason: "${l.reason}"`);
  }
}

check().finally(() => prisma.$disconnect());
