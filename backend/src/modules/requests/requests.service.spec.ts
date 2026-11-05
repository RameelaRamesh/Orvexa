import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CommunicationService } from '../communication/communication.service';
import { PrismaService } from '../../database/prisma.service';

describe('PHASE 8: Communication, Groups, Tickets and Internal Requests Acceptance Suite', () => {
  let requestsService: RequestsService;
  let commService: CommunicationService;

  // In-memory mock workspace storage to test complete persistence and multi-tenancy
  let workspaceStorage: Record<string, any> = {};

  const workspaceIdA = 'ws_org_alpha_01';
  const workspaceIdB = 'ws_org_beta_02';

  const memberAliceId = 'mem_alice_01'; // Requester / Employee
  const memberBobId = 'mem_bob_02';     // Facilities / Operations Team
  const memberCharlieId = 'mem_charlie_03'; // IT Team
  const memberDaveId = 'mem_dave_04';   // Unrelated team member
  const facilitiesTeamId = 'team_facilities_01';

  const mockPrisma: any = {
    workspace: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        const ws = workspaceStorage[where.id];
        return ws ? { id: where.id, settings: ws.settings } : null;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        if (!workspaceStorage[where.id]) {
          workspaceStorage[where.id] = { id: where.id, settings: {} };
        }
        workspaceStorage[where.id].settings = {
          ...workspaceStorage[where.id].settings,
          ...data.settings,
        };
        return workspaceStorage[where.id];
      }),
    },
    membership: {
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        if (where.id === memberAliceId) {
          return {
            id: memberAliceId,
            workspaceId: where.workspaceId || workspaceIdA,
            departmentId: 'dept_ops',
            teamId: 'team_general',
            status: 'ACTIVE',
            user: { id: 'u_alice', firstName: 'Alice', lastName: 'Admin', email: 'alice@alpha.org', avatarUrl: null },
          };
        }
        if (where.id === memberBobId) {
          return {
            id: memberBobId,
            workspaceId: where.workspaceId || workspaceIdA,
            departmentId: 'dept_facilities',
            teamId: facilitiesTeamId,
            status: 'ACTIVE',
            user: { id: 'u_bob', firstName: 'Bob', lastName: 'Facilities', email: 'bob@alpha.org', avatarUrl: null },
          };
        }
        if (where.id === memberCharlieId) {
          return {
            id: memberCharlieId,
            workspaceId: where.workspaceId || workspaceIdA,
            departmentId: 'dept_it',
            teamId: 'team_it',
            status: 'ACTIVE',
            user: { id: 'u_charlie', firstName: 'Charlie', lastName: 'IT', email: 'charlie@alpha.org', avatarUrl: null },
          };
        }
        if (where.id === memberDaveId) {
          return {
            id: memberDaveId,
            workspaceId: where.workspaceId || workspaceIdA,
            departmentId: 'dept_marketing',
            teamId: 'team_marketing',
            status: 'ACTIVE',
            user: { id: 'u_dave', firstName: 'Dave', lastName: 'External', email: 'dave@alpha.org', avatarUrl: null },
          };
        }
        return null;
      }),
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        if (where.id === memberAliceId) {
          return {
            id: memberAliceId,
            workspaceId: workspaceIdA,
            user: { firstName: 'Alice', lastName: 'Admin', email: 'alice@alpha.org', avatarUrl: null },
          };
        }
        if (where.id === memberBobId) {
          return {
            id: memberBobId,
            workspaceId: workspaceIdA,
            user: { firstName: 'Bob', lastName: 'Facilities', email: 'bob@alpha.org', avatarUrl: null },
          };
        }
        if (where.id === memberCharlieId) {
          return {
            id: memberCharlieId,
            workspaceId: workspaceIdA,
            user: { firstName: 'Charlie', lastName: 'IT', email: 'charlie@alpha.org', avatarUrl: null },
          };
        }
        return null;
      }),
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        const results: any[] = [];
        if (where.teamId === facilitiesTeamId) {
          results.push({
            id: memberBobId,
            workspaceId: workspaceIdA,
            user: { firstName: 'Bob', lastName: 'Facilities', email: 'bob@alpha.org' },
          });
        }
        if (where.id?.in) {
          for (const id of where.id.in) {
            if (id === memberAliceId) {
              results.push({ id: memberAliceId, user: { firstName: 'Alice', lastName: 'Admin', email: 'alice@alpha.org' } });
            } else if (id === memberBobId) {
              results.push({ id: memberBobId, user: { firstName: 'Bob', lastName: 'Facilities', email: 'bob@alpha.org' } });
            } else if (id === memberCharlieId) {
              results.push({ id: memberCharlieId, user: { firstName: 'Charlie', lastName: 'IT', email: 'charlie@alpha.org' } });
            }
          }
        }
        return results;
      }),
      count: jest.fn().mockImplementation(async ({ where }) => {
        return where.id?.in?.length || 0;
      }),
    },
    team: {
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        if (where.id === facilitiesTeamId) {
          return { id: facilitiesTeamId, name: 'Facilities & Workplace Team', workspaceId: workspaceIdA };
        }
        return null;
      }),
    },
    notification: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        return { id: `notif_${Date.now()}`, ...data, createdAt: new Date() };
      }),
    },
  };

  beforeEach(async () => {
    // Reset in-memory database
    workspaceStorage = {
      [workspaceIdA]: {
        id: workspaceIdA,
        settings: {
          requestCategories: [
            {
              id: 'cat_facilities_01',
              name: 'Facilities & Supplies',
              description: 'Office supplies, hygiene replenishment, and pantry goods',
              defaultPriority: 'MEDIUM',
              defaultResponsibleTeamId: facilitiesTeamId,
              isActive: true,
            },
          ],
          inventory: [
            {
              id: 'inv_tissue_01',
              name: 'Tissue Boxes',
              category: 'Pantry & Hygiene',
              currentStock: 50,
              unit: 'boxes',
              reorderThreshold: 10,
              updatedAt: new Date(),
            },
            {
              id: 'inv_snacks_02',
              name: 'Snacks & Beverages',
              category: 'Pantry & Hygiene',
              currentStock: 80,
              unit: 'packs',
              reorderThreshold: 20,
              updatedAt: new Date(),
            },
          ],
          serviceRequests: [],
          conversations: [],
          messages: [],
          notificationDeliveryLogs: [],
        },
      },
      [workspaceIdB]: {
        id: workspaceIdB,
        settings: {
          requestCategories: [],
          inventory: [],
          serviceRequests: [],
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        CommunicationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    requestsService = module.get<RequestsService>(RequestsService);
    commService = module.get<CommunicationService>(CommunicationService);
  });

  // ===========================================================================
  // SECTION 1: COMMUNICATION & GROUP LIFECYCLE
  // ===========================================================================
  describe('1. Communication & Group Lifecycle with Access Revocation', () => {
    it('creates a 1:1 direct conversation between two members and reuses existing on repeat call', async () => {
      const conv1 = await commService.createDirectConversation(workspaceIdA, memberAliceId, memberBobId);
      expect(conv1.type).toBe('DIRECT');
      expect(conv1.participantMembershipIds).toContain(memberAliceId);
      expect(conv1.participantMembershipIds).toContain(memberBobId);

      // Re-attempting creation should idempotently return the existing conversation
      const conv2 = await commService.createDirectConversation(workspaceIdA, memberBobId, memberAliceId);
      expect(conv2.id).toBe(conv1.id);
    });

    it('rejects creating a direct conversation with oneself', async () => {
      await expect(
        commService.createDirectConversation(workspaceIdA, memberAliceId, memberAliceId),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a group conversation, adds members, and allows participants to exchange messages', async () => {
      const group = await commService.createGroupConversation(
        workspaceIdA,
        memberAliceId,
        'Facilities Operations Squad',
        [memberBobId],
      );

      expect(group.type).toBe('GROUP');
      expect(group.name).toBe('Facilities Operations Squad');
      expect(group.participantMembershipIds).toEqual([memberAliceId, memberBobId]);

      // Add Charlie to the group
      const updatedGroup = await commService.addParticipants(
        workspaceIdA,
        group.id,
        memberAliceId,
        [memberCharlieId],
      );
      expect(updatedGroup.participantMembershipIds).toContain(memberCharlieId);

      // Alice sends a message with @mention and attachment
      const message = await commService.sendMessage(
        workspaceIdA,
        group.id,
        memberAliceId,
        'Hello @Bob, can you check the pantry supply levels?',
        [{ id: 'att_1', name: 'pantry_audit.pdf', url: 'https://vattara.com/audit.pdf' }],
      );

      expect(message.content).toContain('@Bob');
      expect(message.mentions).toContain('Bob');
      expect(message.attachments?.length).toBe(1);

      // Verify Bob can read messages and mark as read
      const bobMessages = await commService.getMessages(workspaceIdA, group.id, memberBobId);
      expect(bobMessages.length).toBe(1);
      expect(bobMessages[0].content).toBe(message.content);

      const readResult = await commService.markAsRead(workspaceIdA, group.id, message.id, memberBobId);
      expect(readResult.message.readByMembershipIds).toContain(memberBobId);
    });

    it('enforces immediate access revocation when a participant is removed from a group', async () => {
      // 1. Create group with Alice, Bob, and Charlie
      const group = await commService.createGroupConversation(
        workspaceIdA,
        memberAliceId,
        'Confidential Project Squad',
        [memberBobId, memberCharlieId],
      );

      // 2. Charlie is currently an active participant and can view messages
      await commService.sendMessage(
        workspaceIdA,
        group.id,
        memberAliceId,
        'Initial secret project roadmap',
      );
      const charlieMessages = await commService.getMessages(workspaceIdA, group.id, memberCharlieId);
      expect(charlieMessages.length).toBe(1);

      // 3. Alice (group creator) removes Charlie
      const removeResult = await commService.removeParticipant(
        workspaceIdA,
        group.id,
        memberAliceId,
        memberCharlieId,
      );
      expect(removeResult.conversation.participantMembershipIds).not.toContain(memberCharlieId);

      // 4. Verify Charlie is IMMEDIATELY forbidden from reading messages
      await expect(
        commService.getMessages(workspaceIdA, group.id, memberCharlieId),
      ).rejects.toThrow(ForbiddenException);

      // 5. Verify Charlie is IMMEDIATELY forbidden from posting new messages
      await expect(
        commService.sendMessage(
          workspaceIdA,
          group.id,
          memberCharlieId,
          'Unauthorized attempt to reply',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('strictly prevents unauthorized third parties from viewing private direct messages', async () => {
      const dm = await commService.createDirectConversation(workspaceIdA, memberAliceId, memberBobId);
      await commService.sendMessage(workspaceIdA, dm.id, memberAliceId, 'Private discussion between Alice and Bob');

      // Member Dave (not a participant) attempts to read
      await expect(
        commService.getMessages(workspaceIdA, dm.id, memberDaveId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ===========================================================================
  // SECTION 2: UNIVERSAL REQUESTS, QUEUES & REPLENISHMENT SCENARIO
  // ===========================================================================
  describe('2. Universal Request Lifecycle & Tissue/Snacks Replenishment Scenario', () => {
    it('creates organization-configured categories without industry presets', async () => {
      const customCategory = await requestsService.createCategory(workspaceIdA, {
        name: 'IT Equipment & Hardware',
        description: 'Laptops, monitors, display cables and docking stations',
        defaultPriority: 'HIGH',
      });

      expect(customCategory.name).toBe('IT Equipment & Hardware');
      expect(customCategory.defaultPriority).toBe('HIGH');

      const allCategories = await requestsService.listCategories(workspaceIdA);
      expect(allCategories.some((c) => c.name === 'IT Equipment & Hardware')).toBe(true);
    });

    it('executes full tissue and snacks replenishment scenario with inventory deduction', async () => {
      // Step 1: Initial inventory check
      const initialInventory = await requestsService.getInventory(workspaceIdA);
      const initialTissue = initialInventory.find((i) => i.name === 'Tissue Boxes');
      const initialSnacks = initialInventory.find((i) => i.name === 'Snacks & Beverages');

      expect(initialTissue?.currentStock).toBe(50);
      expect(initialSnacks?.currentStock).toBe(80);

      // Step 2: Administrator Alice submits a tissue and snacks replenishment request
      const request = await requestsService.createRequest(workspaceIdA, memberAliceId, {
        categoryId: 'cat_facilities_01',
        title: 'Breakroom and Conference Room Replenishment',
        description: 'Urgent restocking: 5 boxes of tissues and 10 snack packs required for upcoming summit.',
        priority: 'HIGH',
        replenishmentItems: [
          { name: 'Tissue Boxes', requestedQuantity: 5 },
          { name: 'Snacks & Beverages', requestedQuantity: 10 },
        ],
      });

      // Verify automatic sequential ticket numbering and auto-routing to Facilities queue
      expect(request.ticketNumber).toMatch(/^REQ-\d+$/);
      expect(request.responsibleTeamId).toBe(facilitiesTeamId);
      expect(request.responsibleTeamName).toBe('Facilities & Workplace Team');
      expect(request.status).toBe('SUBMITTED');
      expect(request.replenishmentItems?.length).toBe(2);

      // Step 3: Bob from Facilities acknowledges the request and takes ownership
      const acknowledged = await requestsService.acknowledgeRequest(
        workspaceIdA,
        request.id,
        memberBobId,
        'Acknowledged. Heading to the stock room now.',
      );

      expect(acknowledged.status).toBe('IN_PROGRESS');
      expect(acknowledged.ownerMembershipId).toBe(memberBobId);
      expect(acknowledged.ownerName).toContain('Bob');
      expect(acknowledged.activityLog.some((a) => a.action === 'ACKNOWLEDGED')).toBe(true);

      // Step 4: Bob fulfills the request -> updates stock levels in inventory and resolves request
      const fulfilled = await requestsService.fulfillRequest(
        workspaceIdA,
        request.id,
        memberBobId,
        'Delivered 5 tissue boxes to 3rd floor conference rooms and 10 snack packs to pantry.',
      );

      expect(fulfilled.status).toBe('RESOLVED');
      expect(fulfilled.isFulfilled).toBe(true);

      // Step 5: Verify stock levels in inventory were accurately deducted
      const updatedInventory = await requestsService.getInventory(workspaceIdA);
      const updatedTissue = updatedInventory.find((i) => i.name === 'Tissue Boxes');
      const updatedSnacks = updatedInventory.find((i) => i.name === 'Snacks & Beverages');

      expect(updatedTissue?.currentStock).toBe(45); // 50 - 5 = 45
      expect(updatedSnacks?.currentStock).toBe(70); // 80 - 10 = 70

      // Step 6: Alice confirms and closes the request
      const closed = await requestsService.closeRequest(
        workspaceIdA,
        request.id,
        memberAliceId,
        'Pantry fully restocked. Everything in order. Thank you!',
      );

      expect(closed.status).toBe('CLOSED');
      expect(closed.activityLog.some((a) => a.action === 'CLOSED')).toBe(true);
    });

    it('supports escalation and comments timeline', async () => {
      const request = await requestsService.createRequest(workspaceIdA, memberAliceId, {
        categoryId: 'cat_facilities_01',
        title: 'AC temperature control malfunctioning',
        description: 'Server room ambient temp rising',
        priority: 'MEDIUM',
      });

      // Escalate
      const escalated = await requestsService.escalateRequest(
        workspaceIdA,
        request.id,
        memberAliceId,
        'Critical server rack overheating risk',
      );

      expect(escalated.priority).toBe('URGENT');
      expect(escalated.isEscalated).toBe(true);
      expect(escalated.escalationReason).toContain('server rack overheating');

      // Add Comment
      const comment = await requestsService.addComment(
        workspaceIdA,
        request.id,
        memberBobId,
        'Bob Facilities',
        'Portable cooling units deployed.',
      );

      expect(comment.text).toBe('Portable cooling units deployed.');

      const refreshed = await requestsService.getRequestById(workspaceIdA, request.id);
      expect(refreshed.comments.length).toBe(1);
      expect(refreshed.comments[0].text).toContain('Portable cooling');
    });

    it('enforces idempotent notification delivery retry without duplicate inventory deductions or state progression', async () => {
      // 1. Create a request with 2 tissue boxes
      const request = await requestsService.createRequest(workspaceIdA, memberAliceId, {
        categoryId: 'cat_facilities_01',
        title: 'Tissue restock',
        description: 'Small restock',
        inventoryItem: 'Tissue Boxes',
        requestedQuantity: 2,
      });

      // 2. Fulfill request (deducts 2 from 45 -> 43)
      await requestsService.fulfillRequest(workspaceIdA, request.id, memberBobId);
      const invAfterFulfill = await requestsService.getInventory(workspaceIdA);
      const tissueAfterFulfill = invAfterFulfill.find((i) => i.name === 'Tissue Boxes')?.currentStock;

      // 3. Simulate a failed notification log in workspace settings
      const settings = workspaceStorage[workspaceIdA].settings;
      const failedLogId = 'failed_notif_999';
      settings.notificationDeliveryLogs = [
        {
          id: failedLogId,
          idempotencyKey: `fulfilled_${request.id}`,
          recipientMembershipId: memberAliceId,
          title: 'Request Fulfilled',
          message: 'Tissue restocked',
          status: 'FAILED',
          error: 'Connection timeout',
          retryCount: 0,
          createdAt: new Date(),
        },
      ];

      // 4. Retry notification delivery
      const retryResult = await requestsService.retryNotificationDelivery(workspaceIdA, failedLogId);
      expect(retryResult.status).toBe('DELIVERED');
      expect(retryResult.retryCount).toBe(1);

      // 5. CRITICAL VERIFICATION: Inventory stock MUST NOT have been deducted a second time
      const invAfterRetry = await requestsService.getInventory(workspaceIdA);
      const tissueAfterRetry = invAfterRetry.find((i) => i.name === 'Tissue Boxes')?.currentStock;
      expect(tissueAfterRetry).toBe(tissueAfterFulfill);

      // 6. Request status remains RESOLVED without illegal jumps
      const verifiedReq = await requestsService.getRequestById(workspaceIdA, request.id);
      expect(verifiedReq.status).toBe('RESOLVED');
    });

    it('strictly isolates request tickets across different workspaces (multi-tenancy)', async () => {
      const requestA = await requestsService.createRequest(workspaceIdA, memberAliceId, {
        categoryId: 'cat_facilities_01',
        title: 'Alpha Private Ticket',
        description: 'Alpha confidential internal matter',
      });

      // Attempting to query or retrieve Request A using Workspace B credentials throws NotFoundException
      await expect(
        requestsService.getRequestById(workspaceIdB, requestA.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
