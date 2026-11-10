import {
  getDeadlineEndTimestamp,
  isTaskDeadlinePassed,
  isTaskOverdue,
} from './task-overdue.util';

describe('task-overdue.util', () => {
  it('treats today date-only deadline (UTC midnight) as active throughout the entire local day', () => {
    const todayLocal = new Date();
    const yyyy = todayLocal.getFullYear();
    const mm = String(todayLocal.getMonth() + 1).padStart(2, '0');
    const dd = String(todayLocal.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const storedUtcMidnight = new Date(`${dateStr}T00:00:00.000Z`);

    const justAfterMidnightToday = new Date(yyyy, todayLocal.getMonth(), todayLocal.getDate(), 0, 0, 1, 0);
    const middayToday = new Date(yyyy, todayLocal.getMonth(), todayLocal.getDate(), 14, 30, 0, 0);
    const endOfToday = new Date(yyyy, todayLocal.getMonth(), todayLocal.getDate(), 23, 59, 59, 999);
    const startOfTomorrow = new Date(yyyy, todayLocal.getMonth(), todayLocal.getDate() + 1, 0, 0, 0, 0);

    expect(getDeadlineEndTimestamp(dateStr)).toBe(endOfToday.getTime());
    expect(getDeadlineEndTimestamp(storedUtcMidnight)).toBe(endOfToday.getTime());

    expect(isTaskDeadlinePassed(dateStr, justAfterMidnightToday)).toBe(false);
    expect(isTaskDeadlinePassed(storedUtcMidnight, middayToday)).toBe(false);
    expect(isTaskDeadlinePassed(storedUtcMidnight, endOfToday)).toBe(false);
    expect(isTaskDeadlinePassed(storedUtcMidnight, startOfTomorrow)).toBe(true);

    expect(isTaskOverdue({ status: 'TODO', dueDate: storedUtcMidnight }, middayToday)).toBe(false);
    expect(isTaskOverdue({ status: 'TODO', dueDate: storedUtcMidnight }, endOfToday)).toBe(false);
    expect(isTaskOverdue({ status: 'IN_PROGRESS', dueDate: storedUtcMidnight }, startOfTomorrow)).toBe(true);
  });

  it('never marks submitted (IN_REVIEW), COMPLETED, or CANCELLED tasks as overdue even after deadline day passes', () => {
    const pastDeadline = new Date(Date.now() - 3 * 24 * 3600 * 1000);

    expect(isTaskOverdue({ status: 'IN_REVIEW', dueDate: pastDeadline })).toBe(false);
    expect(isTaskOverdue({ status: 'COMPLETED', dueDate: pastDeadline })).toBe(false);
    expect(isTaskOverdue({ status: 'CANCELLED', dueDate: pastDeadline })).toBe(false);
    expect(isTaskOverdue({ status: 'TODO', dueDate: pastDeadline })).toBe(true);
    expect(isTaskOverdue({ status: 'IN_PROGRESS', dueDate: pastDeadline })).toBe(true);
  });

  it('returns false when dueDate is absent or invalid', () => {
    expect(isTaskOverdue({ status: 'TODO', dueDate: null })).toBe(false);
    expect(isTaskOverdue({ status: 'IN_PROGRESS', dueDate: undefined })).toBe(false);
    expect(isTaskOverdue({ status: 'TODO', dueDate: 'invalid-date' })).toBe(false);
  });
});
