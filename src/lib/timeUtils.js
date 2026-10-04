/**
 * Parses a time string into minutes since midnight.
 * @param {string} timeStr - "HH:MM" or "HH:MM:SS"
 * @returns {number} Minutes since midnight
 */
export const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':');
  return parseInt(h, 10) * 60 + parseInt(m, 10);
};

/**
 * Formats a time string into a human readable format (e.g., "9:30 AM").
 * @param {string} timeStr - "HH:MM" or "HH:MM:SS"
 * @returns {string} Formatted time string
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const d = new Date();
  d.setHours(parseInt(h, 10), parseInt(m, 10));
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

/**
 * Formats the duration between two time strings.
 * @param {string} startTime - "HH:MM" or "HH:MM:SS"
 * @param {string} endTime - "HH:MM" or "HH:MM:SS"
 * @returns {string} Duration (e.g., "1h 30m")
 */
export const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '';
  const diffMins = parseTime(endTime) - parseTime(startTime);
  if (diffMins <= 0) return '0m';
  const hrs = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
};

/**
 * Returns today's date in ISO format (YYYY-MM-DD) for the local timezone.
 * @returns {string}
 */
export const todayISO = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const dLocal = new Date(d.getTime() - (offset * 60 * 1000));
  return dLocal.toISOString().split('T')[0];
};

/**
 * Checks if two time intervals overlap.
 * @returns {boolean}
 */
export const isOverlapping = (start1, end1, start2, end2) => {
  return parseTime(start1) < parseTime(end2) && parseTime(start2) < parseTime(end1);
};

/**
 * Converts a Date object to minutes since midnight.
 * @param {Date} date
 * @returns {number}
 */
export const toMinutes = (date) => {
  return date.getHours() * 60 + date.getMinutes();
};

/**
 * Gets the current status of a room.
 */
export const getStatus = (startMins, endMins, currentMins) => {
  if (currentMins >= startMins && currentMins < endMins) return 'occupied';
  if (startMins > currentMins && startMins - currentMins <= 15) return 'free-soon';
  return 'free';
};
