import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, exampleState, validateState, readBackup, loadState, saveState, STORAGE_KEY } from '../src/storage.js';

test('backups round trip without changing tasks or availability', () => {
  const state = exampleState('2026-10-02');
  assert.deepEqual(readBackup(JSON.stringify(state)), state);
});

test('invalid files, duplicate IDs, bad dates, and impossible times are rejected', () => {
  assert.throws(() => readBackup('{broken'));
  assert.throws(() => validateState({ version: 2, tasks: [], capacities: [] }));
  const state = exampleState('2026-10-02');
  state.tasks.push({ ...state.tasks[0] });
  assert.throws(() => validateState(state));
  state.tasks.pop();
  state.tasks[0].due = '2026-02-31';
  assert.throws(() => validateState(state));
  state.tasks[0].due = '2026-10-02';
  state.tasks[0].spentMinutes = state.tasks[0].minutes + 1;
  assert.throws(() => validateState(state));
});

test('extra fields are discarded and markup remains plain text', () => {
  const state = exampleState('2026-10-02');
  state.tasks[0].title = '<img src=x onerror=alert(1)>';
  state.tasks[0].unexpected = 'remove me';
  const checked = validateState(state);
  assert.equal(checked.tasks[0].title, state.tasks[0].title);
  assert.equal(Object.hasOwn(checked.tasks[0], 'unexpected'), false);
});

test('broken saved data is left in storage for recovery', () => {
  let writes = 0;
  const storage = { getItem: () => '{broken', setItem: () => writes++ };
  const result = loadState(storage, '2026-10-02');
  assert.deepEqual(result.state, emptyState());
  assert.ok(result.warning);
  assert.equal(writes, 0);
});

test('blocked storage is reported instead of claiming a save', () => {
  assert.equal(saveState({ setItem() { throw new Error('Blocked'); } }, emptyState()), false);
  const store = new Map();
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  assert.equal(saveState(storage, exampleState('2026-10-02')), true);
  assert.ok(store.has(STORAGE_KEY));
  assert.equal(loadState(storage, '2026-10-02').state.tasks.length, 5);
});

test('daily capacity and very large backups are limited', () => {
  const state = emptyState();
  state.capacities[0] = -1;
  assert.throws(() => validateState(state));
  state.capacities[0] = 721;
  assert.throws(() => validateState(state));
  assert.throws(() => readBackup(' '.repeat(1000001)));
});
