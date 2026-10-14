import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../database/prisma.service';
import { TaskStatus, PriorityLevel, ApprovalStatus } from '@prisma/client';

describe('PHASE 7: Universal Work and Workflow Engine Acceptance Suite', () => {
  let tasksService: TasksService;
  let prisma: any;

  const mockPrisma: any = {
    task: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    project: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    membership: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    approvalRequest: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    tasksService = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);

    mockPrisma.workspace.findUnique.mockResolvedValue({
      id: 'ws_alpha',
      settings: {
        workflowRules: [],
        workflowExecutions: [],
      },
    });
  });

  // =========================================================================
  // 1. STANDALONE WORK ITEM CREATION (ZERO PROJECT / CLIENT PRESET REQUIREMENT)
  // =========================================================================
  describe('Requirement 1 & 2: Independent Work Items (No Forced Client / Project Chain)', () => {
    it('should create an independent standalone work item without client or project', async () => {
      mockPrisma.task.create.mockImplementation((args: any) => ({
        id: 'task_standalone_1',
        ...args.data,
      }));

      const task = await tasksService.create(
        'ws_alpha',
        {
          title: 'Conduct Annual Infrastructure Disaster Recovery Drill',
          description: 'Simulate failover and verify RTO/RPO objectives across standby nodes.',
          priority: PriorityLevel.HIGH,
        },
        'mem_creator_1',
      );

      expect(task.id).toBe('task_standalone_1');
      expect(task.projectId).toBeNull();
      expect(task.title).toBe('Conduct Annual Infrastructure Disaster Recovery Drill');
      expect(task.progress).toBe(0);
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: 'ws_alpha',
          projectId: null,
          status: TaskStatus.TODO,
          priority: PriorityLevel.HIGH,
        }),
        include: expect.any(Object),
      });
    });

    it('should allow linking to a project when explicitly provided and valid', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj_cloud_migration',
        workspaceId: 'ws_alpha',
        name: 'Cloud Migration',
      });

      mockPrisma.task.create.mockImplementation((args: any) => ({
        id: 'task_proj_linked_1',
        ...args.data,
      }));

      const task = await tasksService.create(
        'ws_alpha',
        {
          title: 'Migrate Redis cluster to VPC',
          projectId: 'proj_cloud_migration',
        },
      );

      expect(task.projectId).toBe('proj_cloud_migration');
    });

    it('should reject project-linked creation if project belongs to another workspace', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      await expect(
        tasksService.create('ws_alpha', {
          title: 'Unauthorized Project Task',
          projectId: 'proj_other_workspace',
        }),
      ).rejects.toThrow(new BadRequestException('Linked project not found in this workspace'));
    });
  });

  // =========================================================================
  // 2. REASSIGNMENT & STAKEHOLDER TRACKING
  // =========================================================================
  describe('Requirement 3 & 7: Reassignment, Stakeholder Tracking & Notifications', () => {
    it('should reassign work item, notify new assignee, and record in activity log', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem_new_assignee',
        workspaceId: 'ws_alpha',
        user: { firstName: 'Diana', lastName: 'Prince' },
      });

      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task_1',
        workspaceId: 'ws_alpha',
        title: 'Perform SOC2 Audit Preparation',
        assigneeMembershipId: 'mem_old_assignee',
        sla: { activityLog: [] },
      });

      mockPrisma.task.update.mockImplementation((args: any) => ({
        id: 'task_1',
        title: 'Perform SOC2 Audit Preparation',
        assigneeMembershipId: args.data.assigneeMembershipId,
        sla: args.data.sla,
      }));

      const updated = await tasksService.reassign(
        'task_1',
        'ws_alpha',
        'mem_new_assignee',
        'mem_manager_1',
        'Workload rebalancing',
      );

      expect(updated.assigneeMembershipId).toBe('mem_new_assignee');
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: 'ws_alpha',
          recipientMembershipId: 'mem_new_assignee',
          title: 'Work Item Reassigned to You',
        }),
      });
      expect(updated.activityLog).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: 'REASSIGNED',
            details: 'Reassigned to membership mem_new_assignee',
          }),
        ]),
      );
    });
  });

  // =========================================================================
  // 3. DUE-DATE UPDATES & PROGRESS METRICS
  // =========================================================================
  describe('Requirement 4 & 12: Due Date Updates & Documented Progress Meaning', () => {
    it('should update due date and record timeline audit entry', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task_1',
        workspaceId: 'ws_alpha',
        title: 'Finalize Security Whitepaper',
        dueDate: new Date('2026-10-15'),
        sla: { activityLog: [] },
      });

      const newDueDate = new Date('2026-10-25');
      mockPrisma.task.update.mockImplementation((args: any) => ({
        id: 'task_1',
        dueDate: args.data.dueDate,
        sla: args.data.sla,
      }));

      const updated = await tasksService.update(
        'task_1',
        'ws_alpha',
        { dueDate: newDueDate },
        'mem_lead_1',
      );

      expect(updated.dueDate).toEqual(newDueDate);
      expect(updated.activityLog).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: 'DUE_DATE_UPDATED' }),
        ]),
      );
    });
  });

  // =========================================================================
  // 4. REVIEW, REJECTION & REWORK LOOP
  // =========================================================================
  describe('Requirement 6: Review, Rejection & Rework Lifecycle', () => {
    it('submitForReview transitions task to IN_REVIEW and sets progress to 75%', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task_review_1',
        workspaceId: 'ws_alpha',
        title: 'Database Partitioning Architecture',
        status: TaskStatus.IN_PROGRESS,
        sla: { progress: 50, activityLog: [] },
      });

      mockPrisma.task.update.mockImplementation((args: any) => ({
        id: 'task_review_1',
        status: args.data.status,
        sla: args.data.sla,
      }));

      const inReview = await tasksService.submitForReview(
        'task_review_1',
        'ws_alpha',
        'mem_qa_lead',
        'mem_dev_1',
        'Ready for architectural sign-off',
      );

      expect(inReview.status).toBe(TaskStatus.IN_REVIEW);
      expect(inReview.progress).toBe(75);
      expect(mockPrisma.notification.create).toHaveBeenCalled(); // Notifies reviewer
    });

    it('rejectToRework increments reworkCount, resets status, and logs rejection feedback', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task_review_1',
        workspaceId: 'ws_alpha',
        title: 'Database Partitioning Architecture',
        status: TaskStatus.IN_REVIEW,
        assigneeMembershipId: 'mem_dev_1',
        sla: { progress: 75, reworkCount: 0, activityLog: [] },
      });

      mockPrisma.task.update.mockImplementation((args: any) => ({
        id: 'task_review_1',
        status: args.data.status,
        assigneeMembershipId: 'mem_dev_1',
        sla: args.data.sla,
      }));

      const reworked = await tasksService.rejectToRework(
        'task_review_1',
        'ws_alpha',
        'Missing rollback strategy for sharding metadata table',
        'mem_qa_lead',
      );

      expect(reworked.status).toBe(TaskStatus.IN_PROGRESS);
      expect(reworked.isRework).toBe(true);
      expect(reworked.reworkCount).toBe(1);
      expect(reworked.progress).toBe(35);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recipientMembershipId: 'mem_dev_1',
          title: 'Work Item Returned for Rework',
        }),
      });
    });
  });

  // =========================================================================
  // 5. COMPLETION & BLOCKING DEPENDENCIES ENFORCEMENT
  // =========================================================================
  describe('Requirement 12: Completion Blocked by Uncompleted Dependencies', () => {
    it('should throw BadRequestException if completing a task with uncompleted blocking dependencies', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task_consumer',
        workspaceId: 'ws_alpha',
        title: 'Deploy to Production',
        status: TaskStatus.IN_PROGRESS,
        sla: { dependsOnTaskIds: ['task_blocker_1'] },
      });

      // Dependency is still in progress
      mockPrisma.task.findMany.mockResolvedValue([
        { id: 'task_blocker_1', title: 'Complete Load Testing', status: TaskStatus.IN_PROGRESS },
      ]);

      await expect(
        tasksService.complete('task_consumer', 'ws_alpha'),
      ).rejects.toThrow(
        new BadRequestException(
          'Cannot complete work item: blocking dependencies must be COMPLETED first. Pending: "Complete Load Testing" (IN_PROGRESS)',
        ),
      );
    });

    it('should complete task and set progress to 100% when all dependencies are completed', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task_consumer',
        workspaceId: 'ws_alpha',
        title: 'Deploy to Production',
        status: TaskStatus.IN_PROGRESS,
        sla: { dependsOnTaskIds: ['task_blocker_1'], activityLog: [] },
      });

      // No uncompleted dependencies
      mockPrisma.task.findMany.mockResolvedValue([]);

      mockPrisma.task.update.mockImplementation((args: any) => ({
        id: 'task_consumer',
        status: args.data.status,
        sla: args.data.sla,
      }));

      const completed = await tasksService.complete('task_consumer', 'ws_alpha');
      expect(completed.status).toBe(TaskStatus.COMPLETED);
      expect(completed.progress).toBe(100);
    });
  });

  // =========================================================================
  // 6. CIRCULAR DEPENDENCY DETECTION (CYCLE PREVENTION IN DAG)
  // =========================================================================
  describe('Requirement 12: Circular Dependency Cycle Prevention', () => {
    it('wouldCreateCycle should return true for direct self-dependency (A -> A)', async () => {
      const isCycle = await tasksService.wouldCreateCycle('ws_alpha', 'task_a', 'task_a');
      expect(isCycle).toBe(true);
    });

    it('wouldCreateCycle should return true for 2-node circular dependency (A -> B -> A)', async () => {
      // Task B already depends on Task A
      mockPrisma.task.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === 'task_b') {
          return Promise.resolve({ id: 'task_b', sla: { dependsOnTaskIds: ['task_a'] } });
        }
        return Promise.resolve(null);
      });

      // Checking if Task A can depend on Task B
      const isCycle = await tasksService.wouldCreateCycle('ws_alpha', 'task_a', 'task_b');
      expect(isCycle).toBe(true);
    });

    it('wouldCreateCycle should return true for transitive cycle (A -> B -> C -> A)', async () => {
      // Task B depends on Task C, Task C depends on Task A
      mockPrisma.task.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === 'task_b') {
          return Promise.resolve({ id: 'task_b', sla: { dependsOnTaskIds: ['task_c'] } });
        }
        if (where.id === 'task_c') {
          return Promise.resolve({ id: 'task_c', sla: { dependsOnTaskIds: ['task_a'] } });
        }
        return Promise.resolve(null);
      });

      const isCycle = await tasksService.wouldCreateCycle('ws_alpha', 'task_a', 'task_b');
      expect(isCycle).toBe(true);
    });

    it('setDependencies should reject invalid cyclic dependency with BadRequestException', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task_a',
        workspaceId: 'ws_alpha',
        sla: { dependsOnTaskIds: [] },
      });
      mockPrisma.task.count.mockResolvedValue(1);

      // Task B points to Task A
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task_b',
        sla: { dependsOnTaskIds: ['task_a'] },
      });

      await expect(
        tasksService.setDependencies('task_a', 'ws_alpha', ['task_b']),
      ).rejects.toThrow(
        new BadRequestException(
          'Circular dependency detected: Task cannot depend on "task_b" as it creates an invalid cycle.',
        ),
      );
    });
  });

  // =========================================================================
  // 7. DURABLE WORKFLOW AUTOMATION & EXECUTION WITH RETRIES
  // =========================================================================
  describe('Requirement 8 & 9: Safe Workflow Rules, Idempotency & Retries', () => {
    it('evaluateWorkflows should safely evaluate rules and execute configured actions', async () => {
      const rule = {
        id: 'wf_notify_on_urgent',
        name: 'Urgent Work Escalation Alert',
        trigger: 'ON_STATUS_CHANGE',
        conditions: [
          { field: 'priority', operator: 'EQUALS', value: 'URGENT' },
        ],
        actions: [
          { type: 'SEND_NOTIFICATION', payload: { title: 'Urgent Task Alert' } },
        ],
        isActive: true,
      };

      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws_alpha',
        settings: {
          workflowRules: [rule],
          workflowExecutions: [],
        },
      });

      const urgentTask = {
        id: 'task_critical_1',
        title: 'Fix High Severity Bug',
        status: TaskStatus.IN_PROGRESS,
        priority: PriorityLevel.URGENT,
        assigneeMembershipId: 'mem_oncall',
      };

      await tasksService.evaluateWorkflows('ws_alpha', 'ON_STATUS_CHANGE', urgentTask);

      // Verifies notification was dispatched
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: 'ws_alpha',
          recipientMembershipId: 'mem_oncall',
          title: 'Urgent Task Alert',
        }),
      });

      // Verifies execution log recorded in workspace settings
      expect(mockPrisma.workspace.update).toHaveBeenCalledWith({
        where: { id: 'ws_alpha' },
        data: {
          settings: expect.objectContaining({
            workflowExecutions: expect.arrayContaining([
              expect.objectContaining({
                workflowRuleId: 'wf_notify_on_urgent',
                status: 'SUCCESS',
                executedActions: ['SEND_NOTIFICATION:mem_oncall'],
              }),
            ]),
          }),
        },
      });
    });

    it('retryWorkflowExecution should re-evaluate a failed execution record', async () => {
      const failedExecution = {
        id: 'exec_failed_1',
        idempotencyKey: 'key_1',
        workflowRuleId: 'wf_rule_1',
        workflowRuleName: 'Auto Escalate Task',
        targetTaskId: 'task_1',
        targetTaskTitle: 'Pending Review',
        status: 'FAILED',
        retryCount: 0,
        maxRetries: 3,
        executedActions: [],
        error: 'Network timeout',
      };

      const rule = {
        id: 'wf_rule_1',
        name: 'Auto Escalate Task',
        trigger: 'MANUAL',
        conditions: [],
        actions: [{ type: 'ESCALATE', payload: {} }],
        isActive: true,
      };

      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws_alpha',
        settings: {
          workflowRules: [rule],
          workflowExecutions: [failedExecution],
        },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task_1',
        title: 'Pending Review',
        priority: PriorityLevel.MEDIUM,
      });

      const retried = await tasksService.retryWorkflowExecution('ws_alpha', 'exec_failed_1');

      expect(retried.status).toBe('SUCCESS');
      expect(retried.retryCount).toBe(1);
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task_1' },
        data: { priority: PriorityLevel.URGENT },
      });
    });
  });
});
