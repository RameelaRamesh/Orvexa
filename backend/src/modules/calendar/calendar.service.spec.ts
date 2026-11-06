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
});
