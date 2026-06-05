/**
 * Timesheet Utility Service
 * Helper functions for timesheet calculations
 */

/**
 * Calculate Monday of the week for any date
 * Matches frontend's startOfWeek(new Date(), { weekStartsOn: 1 })
 */
export function getWeekStartMonday(date) {
  const localDateStr = date.toLocaleDateString('en-CA');
  const [year, month, day] = localDateStr.split('-').map(Number);
  
  const localDate = new Date(year, month - 1, day);
  const dayOfWeek = localDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(localDate);
  weekStart.setDate(weekStart.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekStartYear = weekStart.getFullYear();
  const weekStartMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
  const weekStartDay = String(weekStart.getDate()).padStart(2, '0');
  return `${weekStartYear}-${weekStartMonth}-${weekStartDay}`;
}

/**
 * Get week end (Sunday) from week start
 */
export function getWeekEnd(weekStartStr) {
  const weekStart = new Date(weekStartStr);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  const year = weekEnd.getFullYear();
  const month = String(weekEnd.getMonth() + 1).padStart(2, '0');
  const day = String(weekEnd.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get day of week column name
 */
export function getDayColumn(dayOfWeek) {
  const dayColumnMap = {
    0: 'sun_hours',   // Sunday
    1: 'mon_hours',   // Monday
    2: 'tue_hours',   // Tuesday
    3: 'wed_hours',   // Wednesday
    4: 'thu_hours',   // Thursday
    5: 'fri_hours',   // Friday
    6: 'sat_hours',   // Saturday
  };
  return dayColumnMap[dayOfWeek] || 'mon_hours';
}

/**
 * Calculate total hours from clock in/out
 */
export function calculateTotalHours(clockInTime, clockOutTime, pausedDuration = 0) {
  const totalMs = clockOutTime.getTime() - clockInTime.getTime();
  const pausedMs = pausedDuration * 60 * 60 * 1000;
  const actualWorkMs = totalMs - pausedMs;
  let totalHours = actualWorkMs / (1000 * 60 * 60);
  
  // Ensure minimum of 0.01 hours if there's any time difference
  if (totalMs > 0 && totalHours < 0.01) {
    totalHours = 0.01;
  }
  
  return Math.round(totalHours * 100) / 100;
}

/**
 * Convert value to number
 */
export function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? 0 : num;
}

