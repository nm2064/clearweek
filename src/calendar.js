import { addDays, dateNumber } from './dates.js';

function escapeText(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('\r\n', '\n').replaceAll('\r', '\n')
    .replaceAll('\n', '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,');
}

export function foldLine(value) {
  let line = '';
  const lines = [];
  const encoder = new TextEncoder();
  for (const character of value) {
    if (encoder.encode(line + character).length > 75) {
      lines.push(line);
      line = ' ';
    }
    line += character;
  }
  lines.push(line);
  return lines.join('\r\n');
}

export function calendarFile(tasks, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ClearWeek//Deadline planner//EN', 'CALSCALE:GREGORIAN'];
  for (const task of tasks.filter(value => !value.done && value.minutes > value.spentMinutes)) {
    dateNumber(task.due);
    lines.push('BEGIN:VEVENT', `UID:${task.id}@clearweek`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${task.due.replaceAll('-', '')}`,
      `DTEND;VALUE=DATE:${addDays(task.due, 1).replaceAll('-', '')}`,
      `SUMMARY:${escapeText(task.title)}`, `DESCRIPTION:${escapeText(task.project ? `Project: ${task.project}` : 'Task deadline from ClearWeek')}`,
      'TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
