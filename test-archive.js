import assert from 'node:assert/strict';
import test from 'node:test';
import {
  archiveTask,
  unarchiveTask,
  isArchived,
  isOverdue,
  isValidTask,
  filterTasks,
  getLiveTasks
} from './src/utils/taskUtils.js';
import { parseAndValidateJSON } from './src/utils/exportImportUtils.js';

const TODAY = '2026-06-15';
const mk = (id, extra = {}) => ({
  id,
  text: `task ${id}`,
  dueDate: '',
  priority: 'medium',
  completed: false,
  completedAt: null,
  ...extra
});
const ids = (tasks) => tasks.map(t => t.id).join('');

test('archiving marks a copy and leaves the original alone', () => {
  const task = mk('a');
  const archived = archiveTask(task, new Date('2026-06-15T10:00:00Z'));
  assert.equal(isArchived(archived), true);
  assert.equal(archived.archivedAt, '2026-06-15T10:00:00.000Z');
  assert.equal(isArchived(task), false);
  assert.equal(archived.text, task.text);
});

test('restoring drops the archive marks and keeps the completed state', () => {
  const done = archiveTask(mk('a', { completed: true, completedAt: '2026-06-01T00:00:00.000Z' }));
  const back = unarchiveTask(done);
  assert.equal('archived' in back, false);
  assert.equal('archivedAt' in back, false);
  assert.equal(back.completed, true);
  assert.equal(back.completedAt, '2026-06-01T00:00:00.000Z');
});

test('archived tasks leave the active, done, overdue and all lists', () => {
  const tasks = [
    mk('a'),
    archiveTask(mk('b')),
    mk('c', { completed: true }),
    archiveTask(mk('d', { completed: true })),
    mk('e', { dueDate: '2026-06-01' }),
    archiveTask(mk('f', { dueDate: '2026-06-01' }))
  ];
  assert.equal(ids(filterTasks(tasks, 'active', '', TODAY)), 'ae');
  assert.equal(ids(filterTasks(tasks, 'done', '', TODAY)), 'c');
  assert.equal(ids(filterTasks(tasks, 'overdue-task', '', TODAY)), 'e');
  assert.equal(ids(filterTasks(tasks, 'all', '', TODAY)), 'ace');
});

test('the archived view shows only archived tasks, whatever their state', () => {
  const tasks = [mk('a'), archiveTask(mk('b')), archiveTask(mk('c', { completed: true }))];
  assert.equal(ids(filterTasks(tasks, 'archived')), 'bc');
});

test('archived tasks are still found by search in the archived view', () => {
  const tasks = [
    mk('1', { text: 'Buy milk' }),
    archiveTask(mk('2', { text: 'Buy stamps' })),
    archiveTask(mk('3', { text: 'Pay rent' }))
  ];
  assert.equal(ids(filterTasks(tasks, 'archived', 'buy')), '2');
  assert.equal(ids(filterTasks(tasks, 'archived', 'RENT')), '3');
  // and they stay out of the normal lists, even when the search matches
  assert.equal(ids(filterTasks(tasks, 'active', 'buy', TODAY)), '1');
});

test('an archived task is never overdue, and restoring it makes it overdue again', () => {
  const late = mk('a', { dueDate: '2026-06-01' });
  assert.equal(isOverdue(late, TODAY), true);
  const archived = archiveTask(late);
  assert.equal(isOverdue(archived, TODAY), false);
  assert.equal(isOverdue(unarchiveTask(archived), TODAY), true);
});

test('live tasks leave out the archived ones, so they do not count as active', () => {
  const tasks = [mk('a'), archiveTask(mk('b')), mk('c', { completed: true })];
  const live = getLiveTasks(tasks);
  assert.equal(live.length, 2);
  assert.equal(live.filter(t => !t.completed).length, 1);
});

test('archived tasks stay valid for storage, and bad archive fields do not', () => {
  assert.equal(isValidTask(archiveTask(mk('a'))), true);
  assert.equal(isValidTask(mk('a')), true);
  assert.equal(isValidTask(mk('a', { archived: 'yes' })), false);
  assert.equal(isValidTask(mk('a', { archived: true, archivedAt: 5 })), false);
});

test('archived tasks survive a save and reload through JSON', () => {
  const tasks = [mk('a'), archiveTask(mk('b'))];
  const reloaded = JSON.parse(JSON.stringify(tasks));
  assert.equal(ids(filterTasks(reloaded, 'archived')), 'b');
  assert.ok(reloaded.every(isValidTask));
});

test('a JSON backup keeps archived tasks archived', () => {
  const backup = JSON.stringify([
    { text: 'kept', dueDate: '', priority: 'low', completed: false, completedAt: null },
    { text: 'shelved', dueDate: '', priority: 'low', completed: false, completedAt: null, archived: true, archivedAt: '2026-06-10T00:00:00.000Z' }
  ]);
  const result = parseAndValidateJSON(backup);
  assert.equal(result.success, true);
  assert.equal(isArchived(result.tasks[0]), false);
  assert.equal(isArchived(result.tasks[1]), true);
  assert.equal(result.tasks[1].archivedAt, '2026-06-10T00:00:00.000Z');
});
