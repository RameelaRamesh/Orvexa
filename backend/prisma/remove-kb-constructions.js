/**
 * Script: remove-kb-constructions.js
 * Automatically removes "KB Constructions" workspace and its memberships
 * from the live PostgreSQL database.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('----------------------------------------------------');
  console.log('ORVEXA: Removing KB Constructions from Live Database');
  console.log('----------------------------------------------------');

  // 1. Find matching workspaces
  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { name: { contains: 'KB Construction', mode: 'insensitive' } },
        { slug: { contains: 'kb-construction', mode: 'insensitive' } },
      ],
    },
    include: {
      _count: {
        select: {
          memberships: true,
          tasks: true,
          projects: true,
        },
      },
    },
  });

  console.log(`Found ${workspaces.length} matching workspace(s) to remove:`);

  for (const ws of workspaces) {
    console.log(`- Workspace ID: ${ws.id} | Name: ${ws.name} | Slug: ${ws.slug}`);
    console.log(`  Memberships: ${ws._count.memberships}, Tasks: ${ws._count.tasks}, Projects: ${ws._count.projects}`);

    // Remove memberships
    const deletedMem = await prisma.membership.deleteMany({
      where: { workspaceId: ws.id },
    });
    console.log(`  ✔ Deleted ${deletedMem.count} membership(s)`);

    // Remove tasks
    const deletedTasks = await prisma.task.deleteMany({
      where: { workspaceId: ws.id },
    });
    console.log(`  ✔ Deleted ${deletedTasks.count} task(s)`);

    // Remove projects
    const deletedProjects = await prisma.project.deleteMany({
      where: { workspaceId: ws.id },
    });
    console.log(`  ✔ Deleted ${deletedProjects.count} project(s)`);

    // Remove roles
    await prisma.role.deleteMany({
      where: { workspaceId: ws.id },
    });

    // Remove workspace
    await prisma.workspace.delete({
      where: { id: ws.id },
    });
    console.log(`  ✔ Deleted workspace ${ws.name} (${ws.id})`);
  }

  // 2. Also purge any remaining memberships mentioning KB Construction
  const orphanMemberships = await prisma.membership.deleteMany({
    where: {
      workspace: {
        OR: [
          { name: { contains: 'KB Construction', mode: 'insensitive' } },
          { slug: { contains: 'kb-construction', mode: 'insensitive' } },
        ],
      },
    },
  });
  if (orphanMemberships.count > 0) {
    console.log(`✔ Cleaned up ${orphanMemberships.count} remaining KB Construction membership(s)`);
  }

  console.log('----------------------------------------------------');
  console.log('✔ KB Constructions cleanup completed successfully.');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error removing KB Constructions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
