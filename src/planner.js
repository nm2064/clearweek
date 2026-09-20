import { addDays, dateNumber, weekday } from './dates.js';

const ranks = { high: 0, normal: 1, low: 2 };

export function remaining(task) {
  return task.done ? 0 : Math.max(0, task.minutes - task.spentMinutes);
}

export function makePlan(tasks, capacities, start) {
  dateNumber(start);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return { date, capacity: capacities[weekday(date)], used: 0, sessions: [] };
  });
  const active = tasks.filter(task => remaining(task) > 0).slice().sort((a, b) =>
    a.due.localeCompare(b.due) || ranks[a.priority] - ranks[b.priority] || a.id.localeCompare(b.id));
  const results = new Map();

  for (const task of active) {
    let left = remaining(task);
    const deadline = task.due < start ? start : task.due;
    for (const day of days) {
      if (day.date > deadline || left === 0) break;
      while (day.used < day.capacity && left > 0) {
        const minutes = Math.min(90, day.capacity - day.used, left);
        day.sessions.push({ taskId: task.id, minutes });
        day.used += minutes;
        left -= minutes;
      }
    }
    const status = task.due < start ? 'overdue' : left === 0 ? 'planned' : task.due <= days.at(-1).date ? 'at-risk' : 'later';
    results.set(task.id, { status, scheduled: remaining(task) - left, unscheduled: left });
  }
  for (const task of tasks) {
    if (!results.has(task.id)) results.set(task.id, { status: 'done', scheduled: 0, unscheduled: 0 });
  }
  const capacity = days.reduce((total, day) => total + day.capacity, 0);
  const scheduled = days.reduce((total, day) => total + day.used, 0);
  const atRisk = active.filter(task => ['overdue', 'at-risk'].includes(results.get(task.id).status));
  return { days, results, capacity, scheduled, free: capacity - scheduled, atRisk, active };
}
