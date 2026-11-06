/**
 * Script: remove-test-projects.js
 * Automatically removes test projects (JUJIJI / ABC, LK0IHB / gf4f4tr)
 * from the live PostgreSQL database.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('----------------------------------------------------');
  console.log('ORVEXA: Removing Test Projects from Live Database');
  console.log('----------------------------------------------------');

  const testKeys = ['JUJIJI', 'LK0IHB'];
  const testNames = ['ABC', 'gf4f4tr'];

  // 1. Find all matching test projects
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { key: { in: testKeys, mode: 'insensitive' } },
        { name: { in: testNames, mode: 'insensitive' } },
      ],
    },
    include: {
      _count: { select: { tasks: true } },
    },
  });

  console.log(`Found ${projects.length} matching test project(s) to remove.`);

  for (const p of projects) {
    console.log(`- Project ID: ${p.id} | Key: ${p.key} | Name: ${p.name} | Tasks: ${p._count.tasks}`);

    // If any tasks belong to this project, detach them so they aren't lost
    if (p._count.tasks > 0) {
      const detached = await prisma.task.updateMany({
        where: { projectId: p.id },
        data: { projectId: null },
      });
      console.log(`  ✔ Detached ${detached.count} task(s) from project`);
    }

    // Delete the project
    await prisma.project.delete({
      where: { id: p.id },
    });
    console.log(`  ✔ Deleted project ${p.key} (${p.name})`);
  }

  console.log('----------------------------------------------------');
  console.log('✔ Cleanup completed successfully.');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error removing test projects:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
