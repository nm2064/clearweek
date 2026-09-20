import test from 'node:test';
import assert from 'node:assert/strict';
import { makePlan, remaining } from '../src/planner.js';
import { addDays, dateNumber, daysBetween, today } from '../src/dates.js';

const start = '2026-10-02';
const task = (id, due, minutes, priority = 'normal', extra = {}) => ({ id, title: id, due, minutes, priority, spentMinutes: 0, done: false, ...extra });

test('the earliest deadline gets the available time', () => {
  const plan = makePlan([task('later', '2026-10-05', 120), task('soon', start, 60)], Array(7).fill(60), start);
  assert.equal(plan.days[0].sessions[0].taskId, 'soon');
  assert.equal(plan.results.get('later').scheduled, 120);
});

test('priority breaks ties without moving a later deadline first', () => {
  const plan = makePlan([task('low', start, 60, 'low'), task('high', start, 60, 'high')], Array(7).fill(60), start);
  assert.equal(plan.results.get('high').status, 'planned');
  assert.equal(plan.results.get('low').status, 'at-risk');
});

test('work never exceeds capacity or runs past an upcoming deadline', () => {
  const tasks = [task('a', addDays(start, 1), 240), task('b', addDays(start, 5), 700)];
  const plan = makePlan(tasks, [0, 30, 90, 45, 180, 75, 0], start);
  for (const day of plan.days) {
    assert.ok(day.used <= day.capacity);
    assert.equal(day.used, day.sessions.reduce((sum, session) => sum + session.minutes, 0));
    for (const session of day.sessions) {
      assert.ok(session.minutes > 0 && session.minutes <= 90);
      assert.ok(day.date <= tasks.find(value => value.id === session.taskId).due);
    }
  }
  for (const item of tasks) {
    const result = plan.results.get(item.id);
    assert.equal(result.scheduled + result.unscheduled, remaining(item));
  }
});

test('overdue work is flagged even if it fits today', () => {
  const plan = makePlan([task('old', '2026-10-01', 30)], Array(7).fill(60), start);
  assert.equal(plan.results.get('old').status, 'overdue');
  assert.equal(plan.days[0].used, 30);
});

test('completed tasks and logged time do not get planned twice', () => {
  const plan = makePlan([task('done', start, 60, 'normal', { done: true }), task('partial', start, 60, 'normal', { spentMinutes: 45 })], Array(7).fill(60), start);
  assert.equal(plan.results.get('done').status, 'done');
  assert.equal(plan.scheduled, 15);
});

test('later work is deferred rather than incorrectly labelled at risk', () => {
  const plan = makePlan([task('later', '2026-11-01', 600)], Array(7).fill(0), start);
  assert.equal(plan.results.get('later').status, 'later');
  assert.equal(plan.atRisk.length, 0);
  assert.equal(plan.free, 0);
});

test('date arithmetic handles leap years and clock changes', () => {
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2026-03-28', 2), '2026-03-30');
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2);
  assert.throws(() => dateNumber('2026-02-30'));
  assert.throws(() => dateNumber('2026-13-01'));
  assert.equal(today(new Date(2026, 9, 2, 0, 5)), start);
});

test('reordering the input does not change the plan', () => {
  const tasks = [task('a', start, 90), task('b', start, 60), task('c', addDays(start, 3), 240)];
  assert.deepEqual(makePlan(tasks, Array(7).fill(120), start).days, makePlan(tasks.toReversed(), Array(7).fill(120), start).days);
});
