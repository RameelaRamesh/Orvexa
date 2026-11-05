/**
 * Script: update-owner.js
 * Updates the Owner account email from operations@vattara.com to vattaraofficial@gmail.com
 * and sets the password to vattara@123.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const oldEmail = 'operations@vattara.com';
  const newEmail = 'vattaraofficial@gmail.com';
  const newPassword = 'vattara@123';

  console.log('----------------------------------------------------');
  console.log('ORVEXA: Updating Owner Portal Credentials');
  console.log('----------------------------------------------------');
  console.log(`Target Email:    ${newEmail}`);
  console.log(`Target Password: ${newPassword}`);
  console.log('Hashing password with bcrypt (10 rounds)...');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  console.log('Generated bcrypt hash successfully.');

  // 1. Check if user with new email already exists
  let targetUser = await prisma.user.findFirst({
    where: { email: { equals: newEmail, mode: 'insensitive' } },
  });

  if (targetUser) {
    console.log(`User with ${newEmail} already exists (ID: ${targetUser.id}). Updating password and status...`);
    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash,
        status: 'ACTIVE',
        isEmailVerified: true,
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
    });
    console.log('✔ Successfully updated credentials for existing user.');
    console.log(`Email:    ${updated.email}`);
    console.log(`Status:   ${updated.status}`);
    return;
  }

  // 2. Look for the user by the old email (operations@vattara.com)
  let existingUser = await prisma.user.findFirst({
    where: { email: { equals: oldEmail, mode: 'insensitive' } },
  });

  // 3. Fallback: Search for any user with the OWNER role in workspace memberships
  if (!existingUser) {
    console.log(`No user found with ${oldEmail}. Checking for OWNER role...`);
    const ownerMembership = await prisma.membership.findFirst({
      where: { accessRole: 'OWNER' },
      include: { user: true },
    });
    if (ownerMembership?.user) {
      existingUser = ownerMembership.user;
      console.log(`Found Workspace Owner: ${existingUser.email} (ID: ${existingUser.id})`);
    }
  }

  // 4. Fallback: Search for default seeded owner 'owner@orvexa.local'
  if (!existingUser) {
    existingUser = await prisma.user.findFirst({
      where: { email: 'owner@orvexa.local' },
    });
  }

  if (!existingUser) {
    console.error('❌ Could not find any existing Owner account to update.');
    console.log('Creating a new OWNER user account directly...');

    const created = await prisma.user.create({
      data: {
        email: newEmail.toLowerCase(),
        passwordHash,
        firstName: 'John',
        lastName: 'Daniel (Owner)',
        status: 'ACTIVE',
        isEmailVerified: true,
        mustChangePassword: false,
      },
    });

    console.log(`✔ Created new Owner user with ID: ${created.id}`);
    return;
  }

  // Update existing user with the new email and password
  const updatedUser = await prisma.user.update({
    where: { id: existingUser.id },
    data: {
      email: newEmail.toLowerCase(),
      passwordHash,
      status: 'ACTIVE',
      isEmailVerified: true,
      mustChangePassword: false,
      tokenVersion: { increment: 1 },
    },
  });

  console.log('----------------------------------------------------');
  console.log('✔ OWNER ACCOUNT UPDATED SUCCESSFULLY!');
  console.log('----------------------------------------------------');
  console.log(`User ID:      ${updatedUser.id}`);
  console.log(`Previous:     ${existingUser.email}`);
  console.log(`New Email:    ${updatedUser.email}`);
  console.log(`New Password: ${newPassword}`);
  console.log(`Status:       ${updatedUser.status}`);
  console.log('All workspace ownership, permissions, and history preserved.');
  console.log('----------------------------------------------------');
}

main()
  .catch((err) => {
    console.error('Error updating owner account:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
