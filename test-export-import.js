import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, 'script.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

// Create mock browser DOM environment for executing script.js
const mockElement = () => ({
    addEventListener: () => {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    setAttribute: () => {},
    removeAttribute: () => {},
    dataset: {},
    style: {},
    appendChild: () => {},
    replaceChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
});

const sandbox = {
    document: {
        getElementById: () => mockElement(),
        querySelectorAll: () => [],
        addEventListener: () => {},
        createElement: () => mockElement(),
        body: mockElement()
    },
    window: {
        setInterval: () => {}
    },
    localStorage: {
        getItem: () => null,
        setItem: () => {}
    },
    Chart: {
        defaults: {}
    },
    Date,
    JSON,
    Math,
    String,
    Array,
    Boolean,
    Number,
    Blob: class {},
    URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
    FileReader: class {}
};

vm.createContext(sandbox);
vm.runInContext(scriptCode, sandbox);

// Extract the functions under test directly from script.js execution context
const {
    exportTasksToJSON,
    exportTasksToCSV,
    parseCSV,
    validateTaskRecord,
    parseAndValidateCSV,
    parseAndValidateJSON,
    mergeTasks
} = sandbox;

test('script.js exports all backup functions into context', () => {
    assert.equal(typeof exportTasksToJSON, 'function');
    assert.equal(typeof exportTasksToCSV, 'function');
    assert.equal(typeof parseCSV, 'function');
    assert.equal(typeof validateTaskRecord, 'function');
    assert.equal(typeof parseAndValidateCSV, 'function');
    assert.equal(typeof parseAndValidateJSON, 'function');
    assert.equal(typeof mergeTasks, 'function');
});

test('exportTasksToJSON serializes tasks properly', () => {
    const sampleTasks = [
        { text: 'Buy groceries', dueDate: '2026-10-25', priority: 'high', completed: false, completedAt: null },
        { text: 'Read book', dueDate: '', priority: 'low', completed: true, completedAt: '2026-10-22T08:00:00.000Z' }
    ];
    const jsonString = exportTasksToJSON(sampleTasks);
    const parsed = JSON.parse(jsonString);
    assert.deepEqual(parsed, sampleTasks);
});

test('exportTasksToCSV handles commas, quotes, newlines, and nulls', () => {
    const sampleTasks = [
        { text: 'Meeting, with "Client"', dueDate: '2026-10-25', priority: 'high', completed: false, completedAt: null },
        { text: 'Line 1\nLine 2', dueDate: '', priority: 'medium', completed: true, completedAt: '2026-10-22T10:00:00.000Z' }
    ];
    const csvString = exportTasksToCSV(sampleTasks);
    const lines = csvString.split('\r\n');
    assert.equal(lines[0], 'text,dueDate,priority,completed,completedAt');
    assert.equal(lines[1], '"Meeting, with ""Client""","2026-10-25","high",false,""');
    assert.equal(lines[2], '"Line 1\nLine 2","","medium",true,"2026-10-22T10:00:00.000Z"');
});

test('parseCSV correctly parses fields with quotes, commas, and newlines', () => {
    const csv = 'text,dueDate,priority,completed,completedAt\r\n"Task, with comma","2026-10-30","high",false,""\r\n"Multiline\nText","2026-10-31","low",true,"2026-10-22T12:00:00.000Z"';
    const rows = parseCSV(csv);
    assert.equal(rows.length, 3);
    assert.deepEqual([...rows[0]], ['text', 'dueDate', 'priority', 'completed', 'completedAt']);
    assert.deepEqual([...rows[1]], ['Task, with comma', '2026-10-30', 'high', 'false', '']);
    assert.deepEqual([...rows[2]], ['Multiline\nText', '2026-10-31', 'low', 'true', '2026-10-22T12:00:00.000Z']);
});

test('parseAndValidateCSV parses valid CSV and maps types', () => {
    const csv = 'text,dueDate,priority,completed,completedAt\r\n"Task A","2026-10-30","high",false,""\r\n"Task B","2026-10-31","low",true,"2026-10-22T12:00:00.000Z"';
    const result = parseAndValidateCSV(csv);
    assert.equal(result.success, true);
    assert.equal(result.tasks.length, 2);
    assert.equal(result.tasks[0].text, 'Task A');
    assert.equal(result.tasks[0].priority, 'high');
    assert.equal(result.tasks[0].completed, false);
    assert.equal(result.tasks[0].completedAt, null);
    assert.equal(result.tasks[1].completed, true);
    assert.equal(result.tasks[1].completedAt, '2026-10-22T12:00:00.000Z');
});

test('parseAndValidateCSV rejects CSV missing required text header', () => {
    const csv = 'dueDate,priority,completed\r\n"2026-10-30","high",false';
    const result = parseAndValidateCSV(csv);
    assert.equal(result.success, false);
    assert.match(result.error, /missing the required 'text' column/i);
});

test('parseAndValidateCSV rejects invalid priority in rows', () => {
    const csv = 'text,dueDate,priority,completed,completedAt\r\n"Task A","2026-10-30","ultra-urgent",false,""';
    const result = parseAndValidateCSV(csv);
    assert.equal(result.success, false);
    assert.match(result.error, /invalid priority/i);
});

test('parseAndValidateCSV rejects empty CSV', () => {
    const result = parseAndValidateCSV('   ');
    assert.equal(result.success, false);
    assert.match(result.error, /empty/i);
});

test('parseAndValidateCSV rejects batch if any row has invalid completed field', () => {
    const csv = 'text,dueDate,priority,completed,completedAt\r\n"Task 1","2026-10-25","high",true,""\r\n"Task 2","2026-10-26","medium","maybe",""';
    const result = parseAndValidateCSV(csv);
    assert.equal(result.success, false);
    assert.match(result.error, /Task #2 has an invalid 'completed' status/i);
});

test('parseAndValidateJSON accepts valid task array', () => {
    const json = JSON.stringify([
        { text: 'Finish PR', dueDate: '2026-10-23', priority: 'high', completed: false, completedAt: null }
    ]);
    const result = parseAndValidateJSON(json);
    assert.equal(result.success, true);
    assert.equal(result.tasks.length, 1);
    assert.equal(result.tasks[0].text, 'Finish PR');
});

test('parseAndValidateJSON accepts wrapped object with tasks array', () => {
    const json = JSON.stringify({
        tasks: [{ text: 'Nested Task', dueDate: '', priority: 'medium', completed: true, completedAt: null }]
    });
    const result = parseAndValidateJSON(json);
    assert.equal(result.success, true);
    assert.equal(result.tasks.length, 1);
});

test('parseAndValidateJSON rejects malformed JSON', () => {
    const json = '{ invalid json ';
    const result = parseAndValidateJSON(json);
    assert.equal(result.success, false);
    assert.match(result.error, /invalid json syntax/i);
});

test('parseAndValidateJSON rejects non-array payload', () => {
    const json = JSON.stringify({ singleTask: 'none' });
    const result = parseAndValidateJSON(json);
    assert.equal(result.success, false);
    assert.match(result.error, /top-level array/i);
});

test('parseAndValidateJSON rejects empty JSON', () => {
    const result = parseAndValidateJSON('');
    assert.equal(result.success, false);
    assert.match(result.error, /empty/i);
});

test('parseAndValidateJSON rejects batch if any task in array is invalid', () => {
    const json = JSON.stringify([
        { text: 'Valid task 1', dueDate: '2026-10-25', priority: 'high', completed: false, completedAt: null },
        { text: '', dueDate: '2026-10-26', priority: 'medium', completed: false, completedAt: null },
        { text: 'Valid task 3', dueDate: '2026-10-27', priority: 'low', completed: true, completedAt: null }
    ]);
    const result = parseAndValidateJSON(json);
    assert.equal(result.success, false);
    assert.match(result.error, /Task #2 is missing a required non-empty 'text' field/i);
});

test('validateTaskRecord catches missing or empty text', () => {
    const task = { text: '   ', dueDate: '', priority: 'low', completed: false, completedAt: null };
    const res = validateTaskRecord(task, 0);
    assert.equal(res.valid, false);
    assert.match(res.error, /missing a required non-empty 'text' field/i);
});

test('validateTaskRecord catches invalid completedAt date', () => {
    const task = { text: 'Valid task', dueDate: '', priority: 'low', completed: true, completedAt: 'invalid-date' };
    const res = validateTaskRecord(task, 0);
    assert.equal(res.valid, false);
    assert.match(res.error, /invalid 'completedAt' timestamp/i);
});

test('mergeTasks correctly merges without duplicating exact tasks', () => {
    const existing = [
        { text: 'Task 1', dueDate: '2026-10-25', priority: 'high', completed: false, completedAt: null },
        { text: 'Task 2', dueDate: '', priority: 'low', completed: true, completedAt: null }
    ];
    const incoming = [
        { text: 'Task 1', dueDate: '2026-10-25', priority: 'high', completed: false, completedAt: null }, // duplicate
        { text: 'Task 3', dueDate: '2026-10-28', priority: 'medium', completed: false, completedAt: null } // new
    ];
    const { merged, addedCount, skippedCount } = mergeTasks(existing, incoming);
    assert.equal(addedCount, 1);
    assert.equal(skippedCount, 1);
    assert.equal(merged.length, 3);
    assert.equal(merged[2].text, 'Task 3');
});
