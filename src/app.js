import { today, addDays, daysBetween, displayDate, duration, weekday } from './dates.js';
import { makePlan, remaining } from './planner.js';
import { loadState, saveState, readBackup, emptyState, validateState } from './storage.js';
import { calendarFile } from './calendar.js';

const $ = selector => document.querySelector(selector);
let storage;
try { storage = window.localStorage; } catch { storage = { getItem() { throw new Error(); }, setItem() { throw new Error(); } }; }
const loaded = loadState(storage, today());
let state = loaded.state;
let selectedDay = today();
let undoState = null;
let currentPlan;
let lastDay = today();

function element(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== false && value !== null) node.setAttribute(name, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child !== null && child !== undefined) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function toast(message, undo = false) {
  $('#toast-message').textContent = message;
  $('#undo-button').hidden = !undo;
  $('#toast').hidden = false;
}

function update(next, message) {
  const checked = validateState(next);
  undoState = structuredClone(state);
  state = checked;
  const saved = saveState(storage, state);
  $('#storage-warning').hidden = saved;
  $('#storage-warning').textContent = saved ? '' : 'This browser could not save your changes. Save a backup before closing the page.';
  $('#save-label').textContent = saved ? 'Saved in this browser' : 'Changes are not saved';
  render();
  toast(message, true);
}

function dueLabel(due) {
  const days = daysBetween(today(), due);
  return days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : days < 0 ? `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue` : `Due ${displayDate(due)}`;
}

const statusLabels = { planned: 'Fits this week', 'at-risk': 'Needs more time', overdue: 'Overdue', later: 'Plan later', done: 'Done' };

function render() {
  const start = today();
  currentPlan = makePlan(state.tasks, state.capacities, start);
  if (!currentPlan.days.some(day => day.date === selectedDay)) selectedDay = start;
  $('#today-label').textContent = displayDate(start, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase() + ' · YOUR NEXT SEVEN DAYS';
  $('#nav-count').textContent = currentPlan.active.length;
  $('#planned-time').textContent = duration(currentPlan.scheduled);
  $('#free-time').textContent = duration(currentPlan.free);
  $('#risk-count').replaceChildren(String(currentPlan.atRisk.length) + ' ', element('span', { class: 'stat-unit' }, currentPlan.atRisk.length === 1 ? 'task' : 'tasks'));
  $('#planned-detail').textContent = `${currentPlan.active.length} open task${currentPlan.active.length === 1 ? '' : 's'} · ${duration(currentPlan.capacity)} available`;
  $('#risk-detail').textContent = currentPlan.atRisk.length ? 'A little more time or a smaller task' : 'Your deadlines are looking good';
  $('#demo-note').hidden = !state.isDemo;
  $('#task-count').textContent = ` ${state.tasks.length}`;
  renderFocus();
  renderWeek();
  renderAgenda();
  renderRisk();
  renderTasks();
}

function renderFocus() {
  const day = currentPlan.days.find(value => value.sessions.length);
  if (!day) {
    $('#focus-content').replaceChildren(element('h2', {}, currentPlan.active.length ? 'A little time goes a long way.' : 'A clearer week starts here.'),
      element('p', { class: 'focus-reason' }, currentPlan.active.length ? 'Set some available time to make a plan for your tasks.' : 'Add something you want to finish. We’ll help you find a place for it.'),
      element('button', { class: 'button primary', 'data-action': currentPlan.active.length ? 'availability' : 'add' }, currentPlan.active.length ? 'Set your time' : 'Add your first task'));
    return;
  }
  const task = state.tasks.find(value => value.id === day.sessions[0].taskId);
  $('#focus-content').replaceChildren(
    element('h2', {}, task.title),
    element('div', { class: 'focus-meta' }, element('span', { class: 'small-badge' }, task.project || 'Personal'), element('span', { class: 'small-badge' }, dueLabel(task.due))),
    element('p', { class: 'focus-reason' }, `${duration(remaining(task))} left. ${day.date === today() ? 'A good place to start today.' : `Your next space is ${displayDate(day.date)}.`} Earlier deadlines come first; priority breaks a tie.`),
    element('div', { class: 'focus-actions' },
      element('button', { class: 'button primary', 'data-action': 'log', 'data-id': task.id }, 'Log some progress', element('span', { 'aria-hidden': 'true' }, '↗')),
      element('button', { class: 'text-button', 'data-action': 'complete', 'data-id': task.id }, 'Mark complete')),
  );
}

function renderWeek() {
  $('#week-range').textContent = `${displayDate(today(), { day: 'numeric', month: 'short' })} – ${displayDate(addDays(today(), 6), { day: 'numeric', month: 'short' })}`;
  const largest = Math.max(60, ...currentPlan.days.map(day => day.capacity));
  $('#week-days').replaceChildren(...currentPlan.days.map(day => {
    const meter = element('span', { class: 'day-meter', style: `height:${Math.max(12, day.capacity / largest * 86)}px` },
      element('span', { class: 'day-fill', style: `height:${day.capacity ? day.used / day.capacity * 100 : 0}%` }));
    const meterSpace = element('span', { style: 'height:86px;display:flex;flex-direction:column;justify-content:flex-end' }, meter);
    return element('button', { class: `day${day.date === selectedDay ? ' selected' : ''}`, 'data-action': 'day', 'data-date': day.date,
      'aria-pressed': day.date === selectedDay ? 'true' : 'false', 'aria-label': `${displayDate(day.date)}, ${duration(day.used)} planned of ${duration(day.capacity)} available` },
    element('span', { class: 'day-name' }, displayDate(day.date, { weekday: 'short' })),
    element('span', { class: 'day-number' }, displayDate(day.date, { day: 'numeric' })), meterSpace,
    element('span', { class: 'day-hours' }, `${day.used / 60}h / ${day.capacity / 60}h`));
  }));
}

function renderAgenda() {
  const day = currentPlan.days.find(value => value.date === selectedDay);
  $('#agenda-title').textContent = selectedDay === today() ? "Today's plan" : `${displayDate(selectedDay, { weekday: 'long' })}'s plan`;
  $('#agenda-time').textContent = `${duration(day.used)} planned`;
  const sessions = new Map();
  for (const session of day.sessions) sessions.set(session.taskId, (sessions.get(session.taskId) || 0) + session.minutes);
  if (!sessions.size) {
    $('#agenda-list').replaceChildren(element('p', { class: 'empty-message' }, day.capacity ? 'Nothing reserved for this day. Enjoy the space, or add a task.' : 'A day with no planned work. Leave it open or set some time.'));
    return;
  }
  $('#agenda-list').replaceChildren(...[...sessions].map(([id, minutes]) => {
    const task = state.tasks.find(value => value.id === id);
    return element('div', { class: 'agenda-item' },
      element('div', { class: 'agenda-item-left' }, element('span', { class: 'agenda-mark', 'aria-hidden': 'true' }),
        element('div', {}, element('strong', {}, task.title), element('p', {}, `${task.project || 'Personal'} · ${dueLabel(task.due)}`))),
      element('div', { class: 'agenda-item-right' }, element('span', { class: 'agenda-minutes' }, duration(minutes)),
        element('button', { class: 'text-button', 'data-action': 'log', 'data-id': id }, 'Log time ↗')));
  }));
}

function renderRisk() {
  $('#risk-note').hidden = currentPlan.atRisk.length === 0;
  if (!currentPlan.atRisk.length) return;
  const task = currentPlan.atRisk[0];
  const result = currentPlan.results.get(task.id);
  const text = result.status === 'overdue' ? `${task.title} is overdue, with ${duration(remaining(task))} left.` : `${task.title} needs ${duration(result.unscheduled)} more before ${displayDate(task.due)}.`;
  $('#risk-note').replaceChildren(element('p', {}, element('strong', {}, 'A little adjustment needed. '), text),
    element('button', { class: 'text-button', 'data-action': 'review' }, 'Review tasks ↗'));
}

function renderTasks() {
  const query = $('#search').value.trim().toLowerCase();
  const filter = $('#task-filter').value;
  const tasks = state.tasks.filter(task => {
    const status = currentPlan.results.get(task.id).status;
    return `${task.title} ${task.project}`.toLowerCase().includes(query) &&
      (filter === 'all' || filter === 'done' && status === 'done' || filter === 'open' && status !== 'done' || filter === 'attention' && ['overdue', 'at-risk'].includes(status));
  }).slice().sort((a, b) => a.due.localeCompare(b.due));
  if (!tasks.length) {
    $('#task-list').replaceChildren(element('tr', {}, element('td', { colspan: '5', class: 'empty-message' }, query ? 'No matching tasks. Try another name or project.' : filter === 'done' ? 'Your completed tasks will appear here.' : filter === 'attention' ? 'No tasks need attention. You have room for these deadlines.' : 'No tasks here yet. Add one to start planning.')));
    return;
  }
  $('#task-list').replaceChildren(...tasks.map(task => {
    const status = currentPlan.results.get(task.id).status;
    const checkbox = element('input', { type: 'checkbox', 'data-complete-id': task.id, 'aria-label': `${status === 'done' ? 'Reopen' : 'Complete'} ${task.title}` });
    checkbox.checked = status === 'done';
    return element('tr', {},
      element('td', {}, element('div', { class: 'task-name' }, checkbox,
        element('div', {}, element('strong', { class: status === 'done' ? 'done-name' : '' }, task.title), element('small', {}, `${task.project || 'Personal'}${task.priority === 'high' ? ' · High priority' : ''}`)))),
      element('td', { class: 'deadline' }, displayDate(task.due)),
      element('td', {}, duration(remaining(task))),
      element('td', {}, element('span', { class: `status-pill ${status}` }, statusLabels[status])),
      element('td', {}, element('div', { class: 'task-controls' },
        element('button', { class: 'icon-button', 'data-action': 'edit', 'data-id': task.id, 'aria-label': `Edit ${task.title}`, title: 'Edit task' }, '✎'),
        element('button', { class: 'icon-button', 'data-action': 'delete', 'data-id': task.id, 'aria-label': `Delete ${task.title}`, title: 'Delete task' }, '×'))));
  }));
}

function openTask(id = '') {
  const task = state.tasks.find(value => value.id === id);
  $('#task-form').reset();
  $('#task-id').value = id;
  $('#task-dialog-title').textContent = task ? 'Edit your task' : 'Add a task';
  $('#task-title').value = task?.title || '';
  $('#task-project').value = task?.project || '';
  $('#task-due').value = task?.due || addDays(today(), 3);
  $('#task-hours').value = task ? task.minutes / 60 : 1;
  $('#task-priority').value = task?.priority || 'normal';
  $('#task-spent').textContent = task?.spentMinutes ? `${duration(task.spentMinutes)} already logged. Keep the estimate at least this long.` : 'A rough estimate is enough. You can change it later.';
  $('#task-error').textContent = '';
  $('#task-dialog').showModal();
}

function openAvailability() {
  const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  $('#capacity-fields').replaceChildren(...Array.from({ length: 7 }, (_, index) => {
    const day = (weekday(today()) + index) % 7;
    return element('div', { class: 'capacity-row' }, element('label', { for: `capacity-${day}` }, labels[day]),
      element('div', { class: 'capacity-input' }, element('input', { id: `capacity-${day}`, type: 'number', value: state.capacities[day] / 60, min: '0', max: '12', step: '0.25', required: true }), 'hours'));
  }));
  $('#availability-error').textContent = '';
  $('#availability-dialog').showModal();
}

function openLog(id) {
  const task = state.tasks.find(value => value.id === id);
  if (!task || remaining(task) === 0) return;
  $('#log-task-id').value = id;
  $('#log-task-name').textContent = task.title;
  $('#log-minutes').value = Math.min(30, remaining(task));
  $('#log-minutes').max = remaining(task);
  $('#log-remaining').textContent = `${duration(remaining(task))} left in your estimate. Logging all of it completes the task.`;
  $('#log-error').textContent = '';
  $('#log-dialog').showModal();
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = element('a', { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('.export-menu').open = false;
}

$('#task-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    if (!$('#task-id').value && state.tasks.length >= 500) throw new Error('Keep at most 500 tasks. Finish or remove a few first.');
    const old = state.tasks.find(task => task.id === $('#task-id').value);
    const task = {
      id: old?.id || crypto.randomUUID(), title: $('#task-title').value.trim(), project: $('#task-project').value.trim(),
      due: $('#task-due').value, minutes: Math.round(Number($('#task-hours').value) * 60),
      spentMinutes: old?.spentMinutes || 0, priority: $('#task-priority').value, done: old?.done || false,
    };
    const next = structuredClone(state);
    next.isDemo = false;
    next.tasks = old ? next.tasks.map(value => value.id === task.id ? task : value) : [...next.tasks, task];
    update(next, old ? 'Task updated. Your week has been adjusted.' : 'Task added. We found room where we could.');
    $('#task-dialog').close();
  } catch (error) { $('#task-error').textContent = error.message; }
});

$('#availability-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const next = structuredClone(state);
    next.capacities = next.capacities.map((_, day) => Math.round(Number($(`#capacity-${day}`).value) * 60));
    update(next, 'Your available time is updated. The plan has been adjusted.');
    $('#availability-dialog').close();
  } catch (error) { $('#availability-error').textContent = error.message; }
});

$('#log-form').addEventListener('submit', event => {
  event.preventDefault();
  const id = $('#log-task-id').value;
  const task = state.tasks.find(value => value.id === id);
  const minutes = Number($('#log-minutes').value);
  if (!task || !Number.isInteger(minutes) || minutes <= 0 || minutes > remaining(task)) {
    $('#log-error').textContent = 'Enter a whole number of minutes within the time left.';
    return;
  }
  const next = structuredClone(state);
  const updated = next.tasks.find(value => value.id === id);
  updated.spentMinutes += minutes;
  updated.done = updated.spentMinutes === updated.minutes;
  update(next, updated.done ? 'Nice work. That task is complete.' : `${duration(minutes)} logged. A step forward.`);
  $('#log-dialog').close();
});

$('#restore-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    update(readBackup($('#backup-text').value), 'Backup restored. Your previous plan is available with Undo.');
    $('#restore-dialog').close();
  } catch (error) { $('#restore-error').textContent = error.message; }
});

$('#backup-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 1000000) { $('#restore-error').textContent = 'Choose a backup smaller than 1 MB.'; return; }
  try { $('#backup-text').value = await file.text(); $('#restore-error').textContent = ''; }
  catch { $('#restore-error').textContent = 'That file could not be read. Try pasting its contents.'; }
});

document.addEventListener('click', event => {
  const close = event.target.closest('[data-close]');
  if (close) { $(`#${close.dataset.close}`).close(); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'add') openTask();
  if (action === 'edit') openTask(id);
  if (action === 'log') openLog(id);
  if (action === 'availability') openAvailability();
  if (action === 'day') { selectedDay = button.dataset.date; render(); }
  if (action === 'review') { $('#task-filter').value = 'attention'; renderTasks(); $('#tasks').scrollIntoView({ behavior: 'smooth' }); }
  if (action === 'complete') completeTask(id, true);
  if (action === 'delete') {
    const next = structuredClone(state);
    next.tasks = next.tasks.filter(task => task.id !== id);
    update(next, 'Task removed. You can bring it back with Undo.');
  }
});

function completeTask(id, done) {
  const next = structuredClone(state);
  const task = next.tasks.find(value => value.id === id);
  if (!task) return;
  task.done = done;
  if (!done && task.spentMinutes === task.minutes) task.spentMinutes = 0;
  update(next, done ? 'Task complete. Enjoy a little more space.' : 'Task reopened and added back to your plan.');
}

document.addEventListener('change', event => {
  if (event.target.dataset.completeId) completeTask(event.target.dataset.completeId, event.target.checked);
});
$('#add-task').addEventListener('click', () => openTask());
$('#availability-open').addEventListener('click', openAvailability);
$('#search').addEventListener('input', renderTasks);
$('#task-filter').addEventListener('change', renderTasks);
$('#start-empty').addEventListener('click', () => update(emptyState(), 'A clean week, ready for your own tasks.'));
$('#export-backup').addEventListener('click', () => download(`clearweek-${today()}.json`, JSON.stringify(state, null, 2), 'application/json'));
$('#export-calendar').addEventListener('click', () => { download('clearweek-deadlines.ics', calendarFile(state.tasks), 'text/calendar'); toast('Deadline file saved. Import it into your calendar.'); });
$('#restore-open').addEventListener('click', () => {
  $('.export-menu').open = false;
  $('#restore-form').reset();
  $('#restore-error').textContent = '';
  $('#restore-dialog').showModal();
});
$('#undo-button').addEventListener('click', () => {
  if (!undoState) return;
  state = undoState;
  undoState = null;
  const saved = saveState(storage, state);
  $('#storage-warning').hidden = saved;
  $('#storage-warning').textContent = saved ? '' : 'This browser could not save the restored plan. Save a backup before closing.';
  $('#save-label').textContent = saved ? 'Saved in this browser' : 'Changes are not saved';
  render();
  toast('Your previous plan is back.');
});
$('#toast-close').addEventListener('click', () => { $('#toast').hidden = true; });
document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-link').forEach(value => value.classList.toggle('active', value === link));
}));

if (loaded.warning) { $('#storage-warning').textContent = loaded.warning; $('#storage-warning').hidden = false; $('#save-label').textContent = 'Saved data needs attention'; }
render();
setInterval(() => { if (today() !== lastDay) { lastDay = today(); selectedDay = lastDay; render(); } }, 60000);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    if ($('#storage-warning').hidden) $('#save-label').textContent = 'Offline ready · saved locally';
  }).catch(() => { /* The planner still works without offline caching. */ });
}
