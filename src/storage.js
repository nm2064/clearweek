import { addDays, dateNumber } from './dates.js';

export const STORAGE_KEY = 'clearweek-v1';
export const DEFAULT_CAPACITY = [60, 180, 180, 180, 180, 120, 60];

export function emptyState() {
  return { version: 1, capacities: [...DEFAULT_CAPACITY], tasks: [], isDemo: false };
}

export function exampleState(start) {
  const examples = [
    ['portfolio', 'Give the portfolio a final polish', 'Career', 1, 90, 'high'],
    ['write-up', 'Write up the project decisions', 'Portfolio', 2, 180, 'normal'],
    ['campus', 'Finish the campus app demo', 'Side project', 4, 360, 'high'],
    ['interview', 'Practice a few interview problems', 'Career', 6, 180, 'normal'],
    ['reading', 'Read and note the next chapter', 'Learning', 8, 120, 'low'],
  ];
  return {
    ...emptyState(), isDemo: true,
    tasks: examples.map(([id, title, project, offset, minutes, priority]) =>
      ({ id, title, project, due: addDays(start, offset), minutes, priority, spentMinutes: 0, done: false })),
  };
}

export function validateState(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.tasks) || value.tasks.length > 500) {
    throw new Error('Choose a ClearWeek backup with at most 500 tasks.');
  }
  if (!Array.isArray(value.capacities) || value.capacities.length !== 7 || value.capacities.some(minutes =>
    !Number.isInteger(minutes) || minutes < 0 || minutes > 720 || minutes % 15 !== 0)) {
    throw new Error('Daily time must be between 0 and 12 hours, in 15-minute steps.');
  }
  const ids = new Set();
  const tasks = value.tasks.map(task => {
    if (!task || typeof task.id !== 'string' || !/^[a-z0-9-]{1,64}$/i.test(task.id) || ids.has(task.id)) {
      throw new Error('Each task must have its own valid ID.');
    }
    ids.add(task.id);
    if (typeof task.title !== 'string' || !task.title.trim() || task.title.length > 140 ||
        typeof task.project !== 'string' || task.project.length > 64) {
      throw new Error('Give each task a name under 140 characters and a short project name.');
    }
    dateNumber(task.due);
    if (!Number.isInteger(task.minutes) || task.minutes < 15 || task.minutes > 6000 || task.minutes % 15 !== 0 ||
        !Number.isInteger(task.spentMinutes) || task.spentMinutes < 0 || task.spentMinutes > task.minutes ||
        !['high', 'normal', 'low'].includes(task.priority) || typeof task.done !== 'boolean') {
      throw new Error('Check the task time, priority, and completion values.');
    }
    return {
      id: task.id, title: task.title.trim(), project: task.project.trim(), due: task.due,
      minutes: task.minutes, spentMinutes: task.spentMinutes, priority: task.priority, done: task.done,
    };
  });
  return { version: 1, capacities: [...value.capacities], tasks, isDemo: value.isDemo === true };
}

export function readBackup(text) {
  if (typeof text !== 'string' || text.length > 1000000) throw new Error('Choose a backup smaller than 1 MB.');
  try {
    return validateState(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('That file is not valid JSON. Choose a ClearWeek backup.');
    throw error;
  }
}

export function loadState(storage, start) {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    return { state: saved === null ? exampleState(start) : readBackup(saved), warning: '' };
  } catch {
    return { state: emptyState(), warning: 'Saved data could not be read. Your previous backup has not been overwritten.' };
  }
}

export function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(validateState(state)));
    return true;
  } catch {
    return false;
  }
}
