export const NON_OVERDUE_TASK_STATUSES = [
  'COMPLETED',
  'CANCELLED',
  'IN_REVIEW',
  'DONE',
] as const;

/**
 * Resolves the effective deadline timestamp (end of the deadline calendar day: 23:59:59.999).
 * - Date-only / UTC-midnight values (e.g. "2026-11-10" -> 2026-11-10T00:00:00.000Z)
 *   use the UTC calendar date (YYYY-MM-DD) so timezone offsets do not shift the selected date.
 * - Non-midnight timestamps use their local calendar date's end of day (23:59:59.999).
 */
export function getDeadlineEndTimestamp(
  dueDate: Date | string | null | undefined,
): number | null {
  if (!dueDate) return null;

  if (typeof dueDate === 'string') {
    const trimmed = dueDate.trim();
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]) - 1;
      const day = Number(dateOnlyMatch[3]);
      return new Date(year, month, day, 23, 59, 59, 999).getTime();
    }
  }

  const d = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (isNaN(d.getTime())) return null;

  const isUtcMidnight =
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0;

  if (isUtcMidnight) {
    return new Date(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      23,
      59,
      59,
      999,
    ).getTime();
  }

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();
}

/**
 * Checks whether a task's deadline has completely passed.
 * Rule: If a deadline is set to "today" (matching current calendar date in local time or UTC),
 * it is active throughout the entire day and is NOT overdue.
 * It only becomes overdue once the deadline day has passed (i.e. starting tomorrow).
 */
export function isTaskDeadlinePassed(
  dueDate: Date | string | null | undefined,
  now: Date | number = Date.now(),
): boolean {
  const deadlineEnd = getDeadlineEndTimestamp(dueDate);
  if (deadlineEnd === null) return false;
  const nowMs = now instanceof Date ? now.getTime() : typeof now === 'number' ? now : Date.now();
  return nowMs > deadlineEnd;
}

export function isTaskOverdue(
  task: { status?: string | null; dueDate?: Date | string | null } | null | undefined,
  now: Date | number = Date.now(),
): boolean {
  if (!task || !task.dueDate) return false;
  const statusUpper = (task.status || '').toUpperCase();
  if (
    statusUpper === 'COMPLETED' ||
    statusUpper === 'DONE' ||
    statusUpper === 'CANCELLED' ||
    statusUpper === 'IN_REVIEW'
  ) {
    return false;
  }
  return isTaskDeadlinePassed(task.dueDate, now);
}
