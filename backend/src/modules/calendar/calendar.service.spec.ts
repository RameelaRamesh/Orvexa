import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../../database/prisma.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalendarService, PrismaService],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate official Tamil Nadu public holidays for 2026', () => {
    const holidays = service.getTamilNaduPublicHolidays(2026);
    expect(holidays.length).toBeGreaterThanOrEqual(15);
    const pongal = holidays.find((h) => h.name.includes('Pongal'));
    expect(pongal).toBeDefined();
    expect(pongal?.date).toBe('2026-01-14');

    const republicDay = holidays.find((h) => h.name.includes('Republic Day'));
    expect(republicDay).toBeDefined();
    expect(republicDay?.date).toBe('2026-01-26');

    const diwali = holidays.find((h) => h.name.includes('Deepavali') || h.name.includes('Diwali'));
    expect(diwali).toBeDefined();
  });

  it('should retrieve events with permission scoping for Owner', async () => {
    await service.createEvent('ws_default_1', 'mem_owner', 'OWNER', {
      title: 'Owner Strategy Meeting',
      type: 'MEETING' as any,
      startDate: '2026-11-10T10:00:00.000Z',
      endDate: '2026-11-10T11:00:00.000Z',
      audience: 'ALL' as any,
    });

    const res = await service.getEvents('ws_default_1', 'mem_owner', 'OWNER', {
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-11-30T23:59:59.999Z',
    });

    expect(res).toBeDefined();
    expect(res.events).toBeDefined();
    expect(res.events.length).toBeGreaterThan(0);

    // Meetings, tasks, holidays should all be present
    expect(res.events.some((e) => e.layer === 'MEETINGS' || e.type === 'MEETING')).toBe(true);
    expect(res.events.some((e) => e.layer === 'HOLIDAYS')).toBe(true);
  });

  it('should allow scheduling a new meeting and notify participants', async () => {
    const newMeeting = await service.createEvent('ws_default_1', 'mem_owner', 'OWNER', {
      title: 'Quarterly Board Review',
      type: 'MEETING' as any,
      description: 'Discuss Q4 objectives and milestones',
      startDate: '2026-11-28T10:00:00.000Z',
      endDate: '2026-11-28T11:00:00.000Z',
      locationUrl: 'https://meet.google.com/test-board',
      audience: 'INDIVIDUALS' as any,
      participantIds: ['mem_alex'],
    });

    expect(newMeeting).toBeDefined();
    expect(newMeeting.title).toBe('Quarterly Board Review');
    expect(newMeeting.participants?.some((p) => p.membershipId === 'mem_alex')).toBe(true);
  });

  it('should record RSVP responses accurately', async () => {
    // Schedule a test meeting
    const meeting = await service.createEvent('ws_default_1', 'mem_owner', 'OWNER', {
      title: 'Sync with Alex',
      type: 'MEETING' as any,
      startDate: '2026-11-29T14:00:00.000Z',
      endDate: '2026-11-29T14:30:00.000Z',
      audience: 'INDIVIDUALS' as any,
      participantIds: ['mem_alex'],
    });

    // Alex accepts
    const rsvpResult = await service.respondRsvp('ws_default_1', 'mem_alex', 'MEMBER', meeting.id, {
      status: 'ACCEPTED' as any,
    });

    expect(rsvpResult.status).toBe('ACCEPTED');
    expect(rsvpResult.participant.status).toBe('ACCEPTED');
  });

  it('should return colleagues tasks and meetings for Manager when SELECT_PEOPLE has empty memberIds', async () => {
    await prisma.task.create({
      data: {
        id: 'task_cal_alex_1',
        workspaceId: 'ws_default_1',
        projectId: 'proj_ops',
        title: 'Alex Assigned Deliverable',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assigneeMembershipId: 'mem_alex',
        dueDate: new Date('2026-11-12T10:00:00.000Z'),
      } as any,
    });

    await prisma.task.create({
      data: {
        id: 'task_cal_taylor_1',
        workspaceId: 'ws_default_1',
        projectId: 'proj_ops',
        title: 'Taylor Marketing Deliverable',
        status: 'TODO',
        priority: 'MEDIUM',
        assigneeMembershipId: 'mem_taylor',
        dueDate: new Date('2026-11-14T10:00:00.000Z'),
      } as any,
    });

    await service.createEvent('ws_default_1', 'mem_owner', 'OWNER', {
      title: 'Alex 1:1 Review',
      type: 'MEETING' as any,
      startDate: '2026-11-12T14:00:00.000Z',
      endDate: '2026-11-12T14:30:00.000Z',
      audience: 'INDIVIDUALS' as any,
      participantIds: ['mem_alex'],
    });

    const res = await service.getEvents('ws_default_1', 'mem_techlead', 'MANAGER', {
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-11-30T23:59:59.999Z',
      scope: 'SELECT_PEOPLE',
      memberIds: [],
    });

    const eventIds = res.events.map((e) => e.id);
    expect(eventIds).toContain('task-task_cal_alex_1');
    expect(eventIds).toContain('task-task_cal_taylor_1');
    expect(res.events.some((e) => e.title === 'Alex 1:1 Review')).toBe(true);
  });

  it('should filter SELECT_PEOPLE by specific memberIds including multi-assignee sla tasks', async () => {
    await prisma.task.create({
      data: {
        id: 'task_cal_multi_1',
        workspaceId: 'ws_default_1',
        projectId: 'proj_ops',
        title: 'Multi-Assignee Integration Task',
        status: 'TODO',
        priority: 'HIGH',
        assigneeMembershipId: 'mem_owner',
        dueDate: new Date('2026-11-15T10:00:00.000Z'),
        sla: { assigneeMembershipIds: ['mem_owner', 'mem_alex'] },
      } as any,
    });

    await prisma.task.create({
      data: {
        id: 'task_cal_jordan_only',
        workspaceId: 'ws_default_1',
        projectId: 'proj_ops',
        title: 'Jordan Exclusive Task',
        status: 'TODO',
        priority: 'LOW',
        assigneeMembershipId: 'mem_jordan',
        dueDate: new Date('2026-11-16T10:00:00.000Z'),
      } as any,
    });

    const res = await service.getEvents('ws_default_1', 'mem_techlead', 'MANAGER', {
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-11-30T23:59:59.999Z',
      scope: 'SELECT_PEOPLE',
      memberIds: ['mem_alex'],
    });

    const taskEventIds = res.events.filter((e) => e.layer === 'TASKS').map((e) => e.id);
    expect(taskEventIds).toContain('task-task_cal_multi_1');
    expect(taskEventIds).not.toContain('task-task_cal_jordan_only');
  });

  it('should recognize custom Team Lead role names for workspace calendar visibility', async () => {
    const customRole = await (prisma as any).role.create({
      data: {
        id: 'role_custom_tl',
        workspaceId: 'ws_default_1',
        name: 'Team Lead',
        isSystemRole: false,
      },
    });

    const customLeadMem = await prisma.membership.create({
      data: {
        id: 'mem_custom_tl',
        userId: 'u_techlead',
        workspaceId: 'ws_default_1',
        roleId: customRole.id,
        accessRole: 'MEMBER',
        status: 'ACTIVE',
      } as any,
    });

    await prisma.task.create({
      data: {
        id: 'task_cal_team_lead_vis',
        workspaceId: 'ws_default_1',
        projectId: 'proj_ops',
        title: 'Colleague Task Visible To Custom Team Lead',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        assigneeMembershipId: 'mem_jordan',
        dueDate: new Date('2026-11-18T10:00:00.000Z'),
      } as any,
    });

    const res = await service.getEvents('ws_default_1', customLeadMem.id, 'MEMBER', {
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-11-30T23:59:59.999Z',
      scope: 'SELECT_PEOPLE',
      memberIds: [],
    });

    expect(res.events.some((e) => e.id === 'task-task_cal_team_lead_vis')).toBe(true);
  });
});
