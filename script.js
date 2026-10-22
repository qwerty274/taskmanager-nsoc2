// Select main DOM elements
const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const dateInput = document.getElementById('todo-date');
const priorityInput = document.getElementById('todo-priority');

const filters = document.getElementById('filters');
const filterButtons = document.querySelectorAll('#filters button');
const historyButton = document.getElementById('history-toggle');
const chartsSection = document.getElementById('charts');

const priorityChartCanvas = document.getElementById('priority-chart');
const weeklyChartCanvas = document.getElementById('weekly-chart');
const previousMonthButton = document.getElementById('previous-month');
const nextMonthButton = document.getElementById('next-month');

// Stats and progress bar elements
const statTotal = document.getElementById('stat-total');
const statActive = document.getElementById('stat-active');
const statCompleted = document.getElementById('stat-completed');
const statOverdue = document.getElementById('stat-overdue');
const progressPercent = document.getElementById('progress-percent');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressBarWrapper = document.getElementById('progress-bar-wrapper');
const statCards = document.querySelectorAll('.stat-card');

// Task Search and Sort elements
const searchInput = document.getElementById('task-search');
const searchClearButton = document.getElementById('search-clear');
const sortSelect = document.getElementById('task-sort');

// Backup and Restore elements
const backupToggle = document.getElementById('backup-toggle');
const backupModal = document.getElementById('backup-modal');
const backupModalClose = document.getElementById('backup-modal-close');
const exportCountBadge = document.getElementById('export-count-badge');
const exportJsonBtn = document.getElementById('export-json-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const importFileInput = document.getElementById('import-file-input');
const fileDropArea = document.getElementById('file-drop-area');
const dropTextMain = document.getElementById('drop-text-main');
const dropTextSub = document.getElementById('drop-text-sub');
const confirmImportBtn = document.getElementById('confirm-import-btn');
const backupStatus = document.getElementById('backup-status');

let stagedImportTasks = null;

// Application State
let tasks = loadTasks();
let priorityChart = null;
let weeklyChart = null;
let chartMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let historyMode = false;
let currentFilter = 'active';
let searchQuery = '';
let currentSort = 'default';
let lastRenderDate = getTodayDate();

const priorityWeights = { high: 3, medium: 2, low: 1 };
// light-dark mode
const themeToggle = document.getElementById('theme-toggle');
function applyTheme(isLight) {
    document.body.classList.toggle('light-mode', isLight);
    themeToggle.textContent = isLight ? 'Dark mode' : 'Light mode';

    themeToggle.setAttribute(
        'aria-label',
        isLight ? 'Switch to dark mode' : 'Switch to light mode'
    );
    themeToggle.setAttribute('aria-pressed', String(isLight));
    localStorage.setItem('theme', isLight ? 'light' : 'dark');

    // Chart styling for readability
    Chart.defaults.color = isLight ? '#1d1d1f' : '#f5f5f7';
    Chart.defaults.borderColor = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)';

    // Refresh charts if history is open
    if (historyMode) {
        drawPriorityChart();
        drawWeeklyChart();
    }
}
applyTheme(localStorage.getItem('theme') === 'light');
// Switch theme - button is clicked.
themeToggle.addEventListener('click', function () {
    const isLight = !document.body.classList.contains('light-mode');
    applyTheme(isLight);
});

/**
 * Loads valid tasks from browser localStorage.
 */
function loadTasks() {
    try {
        const storedTasks = JSON.parse(localStorage.getItem('tasks'));
        if (!Array.isArray(storedTasks)) return [];
        return storedTasks.filter(isValidTask);
    } catch (error) {
        return [];
    }
}

/**
 * Checks whether a stored record has the required task fields and types.
 */
function isValidTask(task) {
    if (!task || typeof task !== 'object' || Array.isArray(task)) return false;

    const hasValidCompletedAt = task.completedAt === null ||
        (typeof task.completedAt === 'string' && !Number.isNaN(Date.parse(task.completedAt)));

    return typeof task.text === 'string' &&
        task.text.trim() !== '' &&
        typeof task.dueDate === 'string' &&
        ['low', 'medium', 'high'].includes(task.priority) &&
        typeof task.completed === 'boolean' &&
        hasValidCompletedAt;
}

/**
 * Persists current task list to browser localStorage.
 */
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

/**
 * Returns today's date formatted as YYYY-MM-DD.
 */
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Checks if an active task is overdue using local calendar-day boundaries.
 * Tasks due today or without a due date are not overdue.
 */
function isOverdue(task) {
    return Boolean(task.dueDate && task.dueDate < getTodayDate() && !task.completed);
}

/**
 * Updates UI active status for filter buttons and stat cards.
 */
function updateActiveFilterUI(selectedFilter) {
    filterButtons.forEach(btn => {
        if (btn.dataset.filter === selectedFilter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    statCards.forEach(card => {
        if (card.dataset.statFilter === selectedFilter) {
            card.classList.add('active-filter');
        } else {
            card.classList.remove('active-filter');
        }
    });
}

/**
 * Calculates and updates productivity statistics and the completion progress bar.
 */
function updateDashboardStats() {
    if (!statTotal || !statActive || !statCompleted || !statOverdue) return;

    const total = tasks.length;
    const active = tasks.filter(task => !task.completed).length;
    const completed = tasks.filter(task => task.completed).length;
    const overdue = tasks.filter(task => isOverdue(task)).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    statTotal.textContent = total;
    statActive.textContent = active;
    statCompleted.textContent = completed;
    statOverdue.textContent = overdue;

    if (progressPercent) {
        progressPercent.textContent = `${percent}%`;
    }
    if (progressBarFill) {
        progressBarFill.style.width = `${percent}%`;
    }
    if (progressBarWrapper) {
        progressBarWrapper.setAttribute('aria-valuenow', String(percent));
    }
}

/**
 * Sorts an array of tasks based on the given sort criteria without mutating the original array.
 */
function sortTasks(taskList, sortOption = currentSort) {
    const listCopy = [...taskList];
    if (sortOption === 'default') {
        return listCopy;
    }

    return listCopy.sort((a, b) => {
        if (sortOption === 'dueDate-asc') {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
        }
        if (sortOption === 'dueDate-desc') {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return b.dueDate.localeCompare(a.dueDate);
        }
        if (sortOption === 'priority-desc') {
            const weightA = priorityWeights[a.priority] || 0;
            const weightB = priorityWeights[b.priority] || 0;
            return weightB - weightA;
        }
        if (sortOption === 'priority-asc') {
            const weightA = priorityWeights[a.priority] || 0;
            const weightB = priorityWeights[b.priority] || 0;
            return weightA - weightB;
        }
        if (sortOption === 'alphabetical-asc') {
            return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
        }
        if (sortOption === 'alphabetical-desc') {
            return b.text.localeCompare(a.text, undefined, { sensitivity: 'base' });
        }
        return 0;
    });
}

/**
 * Renders task list based on active mode and filter.
 */
function showTasks(filter = historyMode ? currentFilter : 'active') {
    lastRenderDate = getTodayDate();
    currentFilter = filter;
    updateActiveFilterUI(filter);
    list.innerHTML = '';

    const visibleTasks = tasks.filter(function(task) {
        if (filter === 'active') return !task.completed;
        if (filter === 'overdue-task') return isOverdue(task);
        if (filter === 'done') return task.completed;
        return true;
    }).filter(function(task) {
        if (!searchQuery) return true;
        return task.text.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (visibleTasks.length === 0) {
        const emptyState = document.createElement('li');
        emptyState.className = 'empty-state';
        let emptyMsg = 'No tasks found. Add a task above to get started!';
        if (searchQuery) {
            emptyMsg = `🔍 No tasks found matching "${searchQuery}".`;
        } else if (filter === 'active') {
            emptyMsg = tasks.length === 0
                ? 'No active tasks. Add a task above to get started!'
                : '🎉 All caught up! All tasks are completed.';
        } else if (filter === 'done') {
            emptyMsg = 'No completed tasks yet. Finish a task to see it here!';
        } else if (filter === 'overdue-task') {
            emptyMsg = '✨ Excellent! No overdue tasks.';
        }
        emptyState.textContent = emptyMsg;
        list.appendChild(emptyState);
    }

    const sortedVisibleTasks = sortTasks(visibleTasks, currentSort);

    const tasksToRender = filter === 'all'
        ? groupTasksByMonth(sortedVisibleTasks)
        : [{ monthLabel: '', tasks: sortedVisibleTasks }];

    tasksToRender.forEach(function(group) {
        if (group.monthLabel) {
            const monthHeading = document.createElement('li');
            monthHeading.className = 'month-heading';
            monthHeading.textContent = `${group.monthLabel} (${group.tasks.length})`;
            list.appendChild(monthHeading);
        }

        group.tasks.forEach(function(task) {
            const listItem = document.createElement('li');
            const taskText = document.createElement('span');
            const priorityDot = document.createElement('span');
            const taskDetails = document.createElement('span');
            const actionContainer = document.createElement('div');
            actionContainer.className = 'action-buttons';

            listItem.classList.toggle('is-complete', task.completed);

            priorityDot.className = `status-dot priority-${String(task.priority || 'medium').toLowerCase()}`;
            priorityDot.setAttribute('aria-label', `${task.priority || 'Medium'} priority`);
            priorityDot.title = `${task.priority || 'Medium'} priority`;

            taskDetails.className = 'task-details';
            taskText.className = 'task-title';
            taskText.textContent = `${task.text} | Due: ${task.dueDate || 'No date'}`;

            if (isOverdue(task)) {
                const overdueBadge = document.createElement('span');
                overdueBadge.className = 'overdue-badge';
                overdueBadge.textContent = 'Overdue';
                taskDetails.appendChild(overdueBadge);
            }

            taskText.title = 'Double-click to edit this task';

            // Double click inline edit capability
            taskText.addEventListener('dblclick', function() {
                const editInput = document.createElement('input');
                editInput.type = 'text';
                editInput.value = task.text;
                editInput.className = 'edit-input';

                taskDetails.replaceChild(editInput, taskText);
                editInput.focus();
                editInput.select();

                function saveEdit() {
                    const newText = editInput.value.trim();
                    if (newText !== '') {
                        task.text = newText;
                        saveTasks();
                    }
                    showTasks(filter);
                }

                editInput.addEventListener('keydown', function(event) {
                    if (event.key === 'Enter') saveEdit();
                    if (event.key === 'Escape') {
                        editInput.removeEventListener('blur', saveEdit);
                        showTasks(filter);
                    }
                });

                editInput.addEventListener('blur', saveEdit);
            });

            taskDetails.appendChild(taskText);

            if (task.completed) {
                const doneDot = document.createElement('span');
                doneDot.className = 'status-dot done-dot';
                doneDot.setAttribute('aria-label', 'Completed');
                doneDot.title = 'Completed';
                listItem.appendChild(doneDot);
            }

            // Mark completed button
            const doneButton = document.createElement('button');
            doneButton.textContent = task.completed ? 'Mark as active' : 'Mark as done';
            doneButton.className = 'done-button';
            doneButton.addEventListener('click', function() {
                task.completed = !task.completed;
                task.completedAt = task.completed ? new Date().toISOString() : null;
                saveTasks();
                showTasks(filter);
            });

            // Delete task button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete-button';
            deleteButton.setAttribute('aria-label', `Delete task ${task.text}`);
            deleteButton.addEventListener('click', function() {
                tasks = tasks.filter(t => t !== task);
                saveTasks();
                showTasks(filter);
            });

            actionContainer.appendChild(doneButton);
            actionContainer.appendChild(deleteButton);

            listItem.appendChild(priorityDot);
            listItem.appendChild(taskDetails);
            listItem.appendChild(actionContainer);

            list.appendChild(listItem);
        });
    });

    if (historyMode) {
        drawPriorityChart();
        drawWeeklyChart();
    }

    updateDashboardStats();
    updateBackupCountBadge();
}

/**
 * Groups tasks by year and month.
 */
function groupTasksByMonth(taskList) {
    const groups = new Map();

    taskList.forEach(function(task) {
        const taskDate = task.dueDate ? new Date(`${task.dueDate}T12:00:00`) : null;
        const monthLabel = taskDate
            ? taskDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
            : 'No due date';
        const sortKey = task.dueDate ? task.dueDate.slice(0, 7) : '9999-99';

        if (!groups.has(sortKey)) {
            groups.set(sortKey, { monthLabel: monthLabel, tasks: [] });
        }

        groups.get(sortKey).tasks.push(task);
    });

    return Array.from(groups.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(entry => ({
            monthLabel: entry[1].monthLabel,
            tasks: sortTasks(entry[1].tasks, currentSort)
        }));
}

/**
 * Re-renders tasks when the local calendar day changes while the page is open.
 */
function refreshTasksAfterDateChange() {
    if (getTodayDate() === lastRenderDate) return;
    showTasks(historyMode ? currentFilter : 'active');
}

// Event Listeners
form.addEventListener('submit', function(event) {
    event.preventDefault();
    const taskText = input.value.trim();

    if (taskText === '') return;

    const task = {
        text: taskText,
        dueDate: dateInput.value || getTodayDate(),
        priority: priorityInput.value,
        completed: false,
        completedAt: null
    };

    tasks.push(task);
    saveTasks();
    showTasks(historyMode ? currentFilter : 'active');

    // Tactile button feedback on add
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.classList.add('btn-pressed');
        setTimeout(() => submitBtn.classList.remove('btn-pressed'), 180);
    }

    input.value = '';
    input.focus();
});

filters.addEventListener('click', function(event) {
    if (event.target.tagName !== 'BUTTON') return;
    showTasks(event.target.dataset.filter);
});

statCards.forEach(function(card) {
    card.addEventListener('click', function() {
        showTasks(card.dataset.statFilter);
    });
});

if (searchInput) {
    searchInput.addEventListener('input', function() {
        searchQuery = searchInput.value.trim();
        if (searchClearButton) {
            searchClearButton.hidden = searchInput.value === '';
        }
        showTasks(historyMode ? currentFilter : 'active');
    });
}

if (searchClearButton) {
    searchClearButton.addEventListener('click', function() {
        searchInput.value = '';
        searchQuery = '';
        searchClearButton.hidden = true;
        searchInput.focus();
        showTasks(historyMode ? currentFilter : 'active');
    });
}

if (sortSelect) {
    sortSelect.addEventListener('change', function() {
        currentSort = sortSelect.value;
        showTasks(historyMode ? currentFilter : 'active');
    });
}

historyButton.addEventListener('click', function() {
    historyMode = !historyMode;
    historyButton.textContent = historyMode ? 'Back to tasks' : 'History';
    historyButton.setAttribute('aria-pressed', String(historyMode));
    filters.hidden = !historyMode;
    chartsSection.hidden = !historyMode;
    showTasks(historyMode ? currentFilter : 'active');
});

previousMonthButton.addEventListener('click', function() {
    chartMonth.setMonth(chartMonth.getMonth() - 1);
    drawWeeklyChart();
});

nextMonthButton.addEventListener('click', function() {
    const currentMonth = new Date();
    if (chartMonth.getFullYear() === currentMonth.getFullYear() && chartMonth.getMonth() === currentMonth.getMonth()) return;
    chartMonth.setMonth(chartMonth.getMonth() + 1);
    drawWeeklyChart();
});

// Charting Functions
function drawWeeklyChart() {
    if (weeklyChart) weeklyChart.destroy();

    const year = chartMonth.getFullYear();
    const month = chartMonth.getMonth();
    const monthName = chartMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const currentMonth = new Date();
    nextMonthButton.disabled = year === currentMonth.getFullYear() && month === currentMonth.getMonth();
    const weeks = [0, 0, 0, 0, 0];

    tasks.forEach(task => {
        if (!task.completed || !task.completedAt) return;
        const completedDate = new Date(task.completedAt);
        if (completedDate.getFullYear() === year && completedDate.getMonth() === month) {
            const weekIndex = Math.floor((completedDate.getDate() - 1) / 7);
            if (weekIndex < 5) weeks[weekIndex]++;
        }
    });

    const isLight = document.body.classList.contains('light-mode');
    const barColor = isLight ? '#0071e3' : '#0a84ff';

    weeklyChart = new Chart(weeklyChartCanvas, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
            datasets: [{
                label: `Tasks completed - ${monthName}`,
                data: weeks,
                backgroundColor: barColor,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

function drawPriorityChart() {
    if (priorityChart) priorityChart.destroy();

    const high = tasks.filter(task => task.priority === 'high').length;
    const medium = tasks.filter(task => task.priority === 'medium').length;
    const low = tasks.filter(task => task.priority === 'low').length;

    const isLight = document.body.classList.contains('light-mode');
    const colors = isLight
        ? ['#ff3b30', '#ff9500', '#0071e3']
        : ['#ff453a', '#ffd60a', '#0a84ff'];

    priorityChart = new Chart(priorityChartCanvas, {
        type: 'doughnut',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                data: [high, medium, low],
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true
        }
    });
}

window.setInterval(refreshTasksAfterDateChange, 60 * 1000);
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) refreshTasksAfterDateChange();
});

/* ==========================================================================
   Task Backup, Export, and Import Engine
   ========================================================================== */

/**
 * Initiates a browser download for given content and MIME type.
 */
function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Escapes a cell value for standard RFC 4180 CSV compliance.
 */
function escapeCSVCell(value) {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return `"${stringValue}"`;
}

/**
 * Exports tasks to a formatted JSON string.
 */
function exportTasksToJSON(taskList) {
    return JSON.stringify(taskList, null, 2);
}

/**
 * Exports tasks to a standard CSV string.
 */
function exportTasksToCSV(taskList) {
    const headers = ['text', 'dueDate', 'priority', 'completed', 'completedAt'];
    const rows = taskList.map(task => [
        escapeCSVCell(task.text),
        escapeCSVCell(task.dueDate || ''),
        escapeCSVCell(task.priority || 'medium'),
        task.completed ? 'true' : 'false',
        escapeCSVCell(task.completedAt || '')
    ].join(','));
    return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Robust CSV parser handling quotes, double quotes (""), commas, and newlines.
 */
function parseCSV(content) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentField += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentField);
            currentField = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
            currentRow.push(currentField);
            currentField = '';
            if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== '')) {
                rows.push(currentRow);
            }
            currentRow = [];
        } else {
            currentField += char;
        }
    }

    if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField);
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== '')) {
            rows.push(currentRow);
        }
    }

    return rows;
}

/**
 * Validates a single task object according to task specifications.
 */
function validateTaskRecord(task, index) {
    const rowNum = index + 1;
    if (!task || typeof task !== 'object' || Array.isArray(task)) {
        return { valid: false, error: `Task #${rowNum} is not a valid object.` };
    }
    if (typeof task.text !== 'string' || task.text.trim() === '') {
        return { valid: false, error: `Task #${rowNum} is missing a required non-empty 'text' field.` };
    }
    if (task.dueDate !== undefined && task.dueDate !== null && typeof task.dueDate !== 'string') {
        return { valid: false, error: `Task #${rowNum} has an invalid 'dueDate' (must be a string).` };
    }
    const priority = String(task.priority || '').trim().toLowerCase();
    if (!['low', 'medium', 'high'].includes(priority)) {
        return { valid: false, error: `Task #${rowNum} has invalid priority "${task.priority}". Must be 'low', 'medium', or 'high'.` };
    }
    if (typeof task.completed !== 'boolean') {
        return { valid: false, error: `Task #${rowNum} has an invalid 'completed' status (must be true or false).` };
    }
    if (task.completedAt !== null && task.completedAt !== undefined && task.completedAt !== '') {
        if (typeof task.completedAt !== 'string' || Number.isNaN(Date.parse(task.completedAt))) {
            return { valid: false, error: `Task #${rowNum} has an invalid 'completedAt' timestamp.` };
        }
    }
    return { valid: true };
}

/**
 * Parses and validates CSV backup content into clean task objects.
 */
function parseAndValidateCSV(csvContent) {
    if (typeof csvContent !== 'string' || csvContent.trim() === '') {
        return { success: false, error: 'The CSV file is empty.' };
    }

    const rows = parseCSV(csvContent);
    if (rows.length < 2) {
        return { success: false, error: 'CSV file contains no task records (only header or empty).' };
    }

    const headers = rows[0].map(h => h.trim().toLowerCase());
    const headerMap = {};
    headers.forEach((h, idx) => {
        headerMap[h] = idx;
    });

    if (headerMap['text'] === undefined) {
        return { success: false, error: "CSV header is missing the required 'text' column." };
    }

    const validatedTasks = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 1 && row[0].trim() === '') continue;

        const textRaw = row[headerMap['text']] || '';
        const dueDateRaw = headerMap['duedate'] !== undefined ? (row[headerMap['duedate']] || '') : '';
        const priorityRaw = headerMap['priority'] !== undefined ? (row[headerMap['priority']] || 'medium') : 'medium';
        const completedRaw = headerMap['completed'] !== undefined ? (row[headerMap['completed']] || 'false') : 'false';
        const completedAtRaw = headerMap['completedat'] !== undefined ? (row[headerMap['completedat']] || '') : '';

        const priorityLower = String(priorityRaw).trim().toLowerCase();
        const completedLower = String(completedRaw).trim().toLowerCase();
        let isCompleted = false;
        if (completedLower === 'true' || completedLower === '1' || completedLower === 'yes') {
            isCompleted = true;
        } else if (completedLower === 'false' || completedLower === '0' || completedLower === 'no' || completedLower === '') {
            isCompleted = false;
        } else {
            return { success: false, error: `Task #${i} has an invalid 'completed' status ("${completedRaw}"). Must be true or false.` };
        }

        let completedAt = null;
        if (completedAtRaw && completedAtRaw.trim() !== '' && completedAtRaw.trim().toLowerCase() !== 'null') {
            completedAt = completedAtRaw.trim();
        }

        const candidate = {
            text: textRaw.trim(),
            dueDate: dueDateRaw.trim(),
            priority: priorityLower || 'medium',
            completed: isCompleted,
            completedAt: completedAt
        };

        const val = validateTaskRecord(candidate, i - 1);
        if (!val.valid) {
            return { success: false, error: val.error };
        }

        validatedTasks.push(candidate);
    }

    if (validatedTasks.length === 0) {
        return { success: false, error: 'No valid task records found in CSV file.' };
    }

    return { success: true, tasks: validatedTasks };
}

/**
 * Parses and validates JSON backup content into clean task objects.
 */
function parseAndValidateJSON(jsonString) {
    if (typeof jsonString !== 'string' || jsonString.trim() === '') {
        return { success: false, error: 'The JSON file is empty.' };
    }

    let parsed;
    try {
        parsed = JSON.parse(jsonString);
    } catch (err) {
        return { success: false, error: `Invalid JSON syntax: ${err.message}` };
    }

    let candidateList = parsed;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.tasks)) {
        candidateList = parsed.tasks;
    }

    if (!Array.isArray(candidateList)) {
        return { success: false, error: 'Imported JSON must contain a top-level array of tasks.' };
    }

    if (candidateList.length === 0) {
        return { success: false, error: 'The imported JSON file contains no tasks.' };
    }

    const validatedTasks = [];
    for (let i = 0; i < candidateList.length; i++) {
        const item = candidateList[i];
        const val = validateTaskRecord(item, i);
        if (!val.valid) {
            return { success: false, error: val.error };
        }

        let completedAt = null;
        if (item.completedAt && typeof item.completedAt === 'string') {
            completedAt = item.completedAt;
        }

        validatedTasks.push({
            text: item.text.trim(),
            dueDate: typeof item.dueDate === 'string' ? item.dueDate.trim() : '',
            priority: String(item.priority || 'medium').trim().toLowerCase(),
            completed: Boolean(item.completed),
            completedAt: completedAt
        });
    }

    return { success: true, tasks: validatedTasks };
}

/**
 * Merges imported tasks with existing tasks, avoiding duplicate entries.
 */
function mergeTasks(existingList, importedList) {
    const merged = [...existingList];
    let addedCount = 0;
    let skippedCount = 0;

    importedList.forEach(newTask => {
        const isDuplicate = merged.some(existing => (
            existing.text.trim().toLowerCase() === newTask.text.trim().toLowerCase() &&
            (existing.dueDate || '') === (newTask.dueDate || '') &&
            existing.priority === newTask.priority &&
            existing.completed === newTask.completed
        ));

        if (isDuplicate) {
            skippedCount++;
        } else {
            merged.push(newTask);
            addedCount++;
        }
    });

    return { merged, addedCount, skippedCount };
}

/**
 * Shows user-facing feedback banner inside the Backup modal.
 */
function showBackupStatus(message, type = 'info') {
    if (!backupStatus) return;
    backupStatus.textContent = message;
    backupStatus.className = `backup-status status-${type}`;
    backupStatus.hidden = false;
}

/**
 * Resets the import file selection and staging state.
 */
function resetImportStaging() {
    stagedImportTasks = null;
    if (importFileInput) importFileInput.value = '';
    if (confirmImportBtn) confirmImportBtn.disabled = true;
    if (dropTextMain) dropTextMain.textContent = 'Click or drop a JSON or CSV file here';
    if (dropTextSub) dropTextSub.textContent = 'Supports .json or .csv backup files';
}

/**
 * Updates the task count badge in the backup modal.
 */
function updateBackupCountBadge() {
    if (exportCountBadge) {
        exportCountBadge.textContent = `${tasks.length} task${tasks.length === 1 ? '' : 's'}`;
    }
}

/**
 * Processes a chosen backup file (JSON or CSV).
 */
function handleBackupFile(file) {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isJSON = fileName.endsWith('.json') || file.type === 'application/json';
    const isCSV = fileName.endsWith('.csv') || file.type === 'text/csv';

    if (!isJSON && !isCSV) {
        showBackupStatus(`Unsupported file format "${file.name}". Please upload a .json or .csv file.`, 'error');
        resetImportStaging();
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const result = isJSON ? parseAndValidateJSON(content) : parseAndValidateCSV(content);

        if (!result.success) {
            stagedImportTasks = null;
            if (confirmImportBtn) confirmImportBtn.disabled = true;
            if (dropTextMain) dropTextMain.textContent = file.name;
            if (dropTextSub) dropTextSub.textContent = '⚠️ Invalid file structure';
            showBackupStatus(`Import validation failed: ${result.error} (Your current tasks were not changed).`, 'error');
            return;
        }

        stagedImportTasks = result.tasks;
        if (confirmImportBtn) confirmImportBtn.disabled = false;
        if (dropTextMain) dropTextMain.textContent = file.name;
        if (dropTextSub) dropTextSub.textContent = `✓ Ready: ${stagedImportTasks.length} valid task(s) found`;
        showBackupStatus(`Validated ${stagedImportTasks.length} task(s) from "${file.name}". Click "Import Tasks" to complete.`, 'success');
    };

    reader.onerror = function() {
        showBackupStatus(`Failed to read file "${file.name}".`, 'error');
        resetImportStaging();
    };

    reader.readAsText(file);
}

/**
 * Opens the backup and restore modal dialog.
 */
function openBackupModal() {
    if (!backupModal) return;
    updateBackupCountBadge();
    resetImportStaging();
    if (backupStatus) backupStatus.hidden = true;
    if (backupToggle) backupToggle.setAttribute('aria-expanded', 'true');

    if (typeof backupModal.showModal === 'function') {
        backupModal.showModal();
    } else {
        backupModal.setAttribute('open', '');
    }
}

/**
 * Closes the backup and restore modal dialog.
 */
function closeBackupModal() {
    if (!backupModal) return;
    if (backupToggle) {
        backupToggle.setAttribute('aria-expanded', 'false');
        backupToggle.focus();
    }

    if (typeof backupModal.close === 'function') {
        backupModal.close();
    } else {
        backupModal.removeAttribute('open');
    }
}

// Backup & Restore Event Listeners
if (backupToggle) {
    backupToggle.addEventListener('click', openBackupModal);
}

if (backupModalClose) {
    backupModalClose.addEventListener('click', closeBackupModal);
}

if (backupModal) {
    // Close on backdrop click
    backupModal.addEventListener('click', function(event) {
        const rect = backupModal.getBoundingClientRect();
        const isInDialog = (
            rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX && event.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
            closeBackupModal();
        }
    });

    backupModal.addEventListener('cancel', function() {
        if (backupToggle) backupToggle.setAttribute('aria-expanded', 'false');
    });
}

if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', function() {
        const jsonContent = exportTasksToJSON(tasks);
        const fileName = `tasks-backup-${getTodayDate()}.json`;
        downloadFile(jsonContent, fileName, 'application/json');
        showBackupStatus(`Successfully exported ${tasks.length} task(s) to ${fileName}.`, 'success');
    });
}

if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', function() {
        const csvContent = exportTasksToCSV(tasks);
        const fileName = `tasks-backup-${getTodayDate()}.csv`;
        downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
        showBackupStatus(`Successfully exported ${tasks.length} task(s) to ${fileName}.`, 'success');
    });
}

if (fileDropArea && importFileInput) {
    fileDropArea.addEventListener('click', function() {
        importFileInput.click();
    });

    fileDropArea.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            importFileInput.click();
        }
    });

    fileDropArea.addEventListener('dragover', function(event) {
        event.preventDefault();
        fileDropArea.classList.add('drag-over');
    });

    fileDropArea.addEventListener('dragleave', function() {
        fileDropArea.classList.remove('drag-over');
    });

    fileDropArea.addEventListener('drop', function(event) {
        event.preventDefault();
        fileDropArea.classList.remove('drag-over');
        if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
            handleBackupFile(event.dataTransfer.files[0]);
        }
    });

    importFileInput.addEventListener('change', function() {
        if (importFileInput.files && importFileInput.files[0]) {
            handleBackupFile(importFileInput.files[0]);
        }
    });
}

if (confirmImportBtn) {
    confirmImportBtn.addEventListener('click', function() {
        if (!stagedImportTasks || !Array.isArray(stagedImportTasks)) return;

        const modeInput = document.querySelector('input[name="import-mode"]:checked');
        const mode = modeInput ? modeInput.value : 'merge';

        if (mode === 'replace') {
            const previousCount = tasks.length;
            tasks = stagedImportTasks;
            saveTasks();
            showTasks(historyMode ? currentFilter : 'active');
            updateBackupCountBadge();
            showBackupStatus(`Successfully replaced ${previousCount} existing task(s) with ${stagedImportTasks.length} imported task(s).`, 'success');
        } else {
            const { merged, addedCount, skippedCount } = mergeTasks(tasks, stagedImportTasks);
            tasks = merged;
            saveTasks();
            showTasks(historyMode ? currentFilter : 'active');
            updateBackupCountBadge();
            const skipNotice = skippedCount > 0 ? ` (${skippedCount} duplicate task${skippedCount === 1 ? '' : 's'} skipped)` : '';
            showBackupStatus(`Successfully merged ${addedCount} task(s)${skipNotice}. Total tasks: ${tasks.length}.`, 'success');
        }

        resetImportStaging();
    });
}

// Initial render
showTasks();
