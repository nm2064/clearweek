const DAY = 86400000;

export function dateNumber(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Use a date in year-month-day form.');
  }
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1000 || year > 9999) throw new Error('Choose a four-digit year.');
  const result = Date.UTC(year, month - 1, day);
  if (new Date(result).toISOString().slice(0, 10) !== value) throw new Error('Choose a real date.');
  return result;
}

export function addDays(value, count) {
  return new Date(dateNumber(value) + count * DAY).toISOString().slice(0, 10);
}

export function daysBetween(first, second) {
  return (dateNumber(second) - dateNumber(first)) / DAY;
}

export function weekday(value) {
  return new Date(dateNumber(value)).getUTCDay();
}

export function today(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function displayDate(value, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(dateNumber(value));
}

export function duration(minutes) {
  if (minutes === 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours}h` : '', rest ? `${rest}m` : ''].filter(Boolean).join(' ');
}
