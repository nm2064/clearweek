import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarFile, foldLine } from '../src/calendar.js';
import { exampleState } from '../src/storage.js';

test('deadlines are all-day events with the following day as the end', () => {
  const file = calendarFile(exampleState('2026-10-02').tasks, new Date('2026-10-02T10:00:00Z'));
  assert.ok(file.includes('DTSTART;VALUE=DATE:20261003\r\nDTEND;VALUE=DATE:20261004'));
  assert.ok(file.includes('DTSTAMP:20261002T100000Z'));
  assert.equal((file.match(/BEGIN:VEVENT/g) || []).length, 5);
  assert.ok(file.endsWith('END:VCALENDAR\r\n'));
});

test('text cannot inject extra calendar fields', () => {
  const state = exampleState('2026-10-02');
  state.tasks[0].title = 'Review; notes, today\r\nBEGIN:VEVENT';
  const file = calendarFile(state.tasks);
  assert.ok(file.includes('SUMMARY:Review\\; notes\\, today\\nBEGIN:VEVENT'));
  assert.equal((file.match(/\r\nBEGIN:VEVENT\r\n/g) || []).length, 5);
});

test('long lines stay within 75 bytes without splitting characters', () => {
  const original = 'SUMMARY:' + 'Plan café 🌱 '.repeat(20);
  const folded = foldLine(original);
  for (const line of folded.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.equal(folded.replaceAll('\r\n ', ''), original);
});

test('completed tasks are left out', () => {
  const state = exampleState('2026-10-02');
  state.tasks.forEach(task => { task.done = true; });
  assert.equal(calendarFile(state.tasks).includes('BEGIN:VEVENT'), false);
});
