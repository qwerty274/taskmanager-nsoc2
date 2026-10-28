import React, { useState, useRef, useEffect } from 'react';
import {
  exportTasksToJSON,
  exportTasksToCSV,
  downloadFile,
  parseAndValidateJSON,
  parseAndValidateCSV,
  mergeTasks
} from '../utils/exportImportUtils';
import { getTodayDate } from '../utils/taskUtils';

export default function BackupModal({ isOpen, onClose, tasks, onTasksUpdate }) {
  const [importMode, setImportMode] = useState('merge');
  const [stagedTasks, setStagedTasks] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileSubText, setFileSubText] = useState('Supports .json or .csv backup files');
  const [status, setStatus] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);

  // Manage native dialog open / close and accessibility focus
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      }
      resetStaging();
      setStatus(null);
    } else {
      if (dialog.open) {
        if (typeof dialog.close === 'function') {
          dialog.close();
        } else {
          dialog.removeAttribute('open');
        }
      }
    }
  }, [isOpen]);

  const resetStaging = () => {
    setStagedTasks(null);
    setFileName('');
    setFileSubText('Supports .json or .csv backup files');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportJSON = () => {
    if (!tasks || tasks.length === 0) {
      setStatus({ type: 'status-error', message: 'No tasks available to export. Add some tasks first!' });
      return;
    }
    const json = exportTasksToJSON(tasks);
    const downloadName = `tasks-backup-${getTodayDate()}.json`;
    downloadFile(json, downloadName, 'application/json');
    setStatus({
      type: 'status-success',
      message: `Successfully exported ${tasks.length} task(s) to ${downloadName}.`
    });
  };

  const handleExportCSV = () => {
    if (!tasks || tasks.length === 0) {
      setStatus({ type: 'status-error', message: 'No tasks available to export. Add some tasks first!' });
      return;
    }
    const csv = '\uFEFF' + exportTasksToCSV(tasks);
    const downloadName = `tasks-backup-${getTodayDate()}.csv`;
    downloadFile(csv, downloadName, 'text/csv;charset=utf-8;');
    setStatus({
      type: 'status-success',
      message: `Successfully exported ${tasks.length} task(s) to ${downloadName}.`
    });
  };

  const processFile = (file) => {
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isJSON = lowerName.endsWith('.json') || file.type === 'application/json';
    const isCSV = lowerName.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';

    if (!isJSON && !isCSV) {
      setStatus({
        type: 'status-error',
        message: `Unsupported file format "${file.name}". Please upload a .json or .csv file.`
      });
      resetStaging();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const result = isJSON ? parseAndValidateJSON(content) : parseAndValidateCSV(content);

      if (!result.success) {
        setStagedTasks(null);
        setFileName(file.name);
        setFileSubText('⚠️ Invalid file structure');
        setStatus({
          type: 'status-error',
          message: `Import validation failed: ${result.error} (Your current tasks were not changed).`
        });
        return;
      }

      setStagedTasks(result.tasks);
      setFileName(file.name);
      setFileSubText(`✓ Ready: ${result.tasks.length} valid task(s) found`);
      setStatus({
        type: 'status-success',
        message: `Validated ${result.tasks.length} task(s) from "${file.name}". Click "Import Tasks" to complete.`
      });
    };

    reader.onerror = () => {
      setStatus({ type: 'status-error', message: `Failed to read file "${file.name}".` });
      resetStaging();
    };

    reader.readAsText(file);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleConfirmImport = () => {
    if (!stagedTasks || stagedTasks.length === 0) return;

    if (importMode === 'replace') {
      const prevCount = tasks.length;
      onTasksUpdate(stagedTasks);
      setStatus({
        type: 'status-success',
        message: `Successfully replaced ${prevCount} existing task(s) with ${stagedTasks.length} imported task(s).`
      });
    } else {
      const { merged, addedCount, skippedCount } = mergeTasks(tasks, stagedTasks);
      onTasksUpdate(merged);
      const skipNotice = skippedCount > 0 ? ` (${skippedCount} duplicate task${skippedCount === 1 ? '' : 's'} skipped)` : '';
      setStatus({
        type: 'status-success',
        message: `Successfully merged ${addedCount} task(s)${skipNotice}. Total tasks: ${merged.length}.`
      });
    }

    resetStaging();
  };

  // Close when clicking dialog backdrop
  const handleDialogClick = (e) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      id="backup-modal"
      className="backup-modal"
      aria-labelledby="backup-modal-title"
      onClick={handleDialogClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-wrapper">
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 id="backup-modal-title">Backup &amp; Restore Tasks</h2>
            <p className="modal-subtitle">Export your tasks for safekeeping or restore from a backup file.</p>
          </div>
          <button
            id="backup-modal-close"
            className="modal-close-btn"
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Export Section */}
          <section className="backup-card" aria-labelledby="export-heading">
            <div className="section-header">
              <h3 id="export-heading">Export Tasks</h3>
              <span className="badge-count" id="export-count-badge">
                {tasks.length} task{tasks.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="section-desc">Download all your tasks to a JSON or CSV file.</p>
            <div className="modal-actions-row">
              <button
                id="export-json-btn"
                className="modal-btn"
                type="button"
                onClick={handleExportJSON}
              >
                <span className="btn-icon" aria-hidden="true">&#8681;</span> Export JSON
              </button>
              <button
                id="export-csv-btn"
                className="modal-btn"
                type="button"
                onClick={handleExportCSV}
              >
                <span className="btn-icon" aria-hidden="true">&#8681;</span> Export CSV
              </button>
            </div>
          </section>

          {/* Import Section */}
          <section className="backup-card" aria-labelledby="import-heading">
            <div className="section-header">
              <h3 id="import-heading">Import Tasks</h3>
            </div>
            <p className="section-desc">Restore tasks from a JSON or CSV backup file.</p>

            {/* Mode Selection */}
            <div className="import-mode-group" role="radiogroup" aria-label="Import strategy">
              <span className="import-mode-title">Import Mode:</span>
              <div className="radio-options">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="import-mode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                  />
                  <span className="radio-text">
                    <strong>Merge</strong> (keep current tasks, skip exact duplicates)
                  </span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="import-mode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                  />
                  <span className="radio-text">
                    <strong>Replace</strong> (clear existing tasks and set imported)
                  </span>
                </label>
              </div>
            </div>

            {/* Dropzone */}
            <input
              ref={fileInputRef}
              id="import-file-input"
              type="file"
              accept=".json,.csv,application/json,text/csv,application/vnd.ms-excel"
              className="visually-hidden"
              aria-label="Select backup file"
              onChange={handleFileChange}
            />
            <div
              id="file-drop-area"
              className={`file-drop-area ${isDragOver ? 'drag-over' : ''}`}
              tabIndex={0}
              role="button"
              aria-label="Choose a JSON or CSV file to import"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current && fileInputRef.current.click();
                }
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <span className="drop-icon" aria-hidden="true">&#128196;</span>
              <div className="drop-text-group">
                <span id="drop-text-main" className="drop-text-main">
                  {fileName || 'Click or drop a JSON or CSV file here'}
                </span>
                <span id="drop-text-sub" className="drop-text-sub">
                  {fileSubText}
                </span>
              </div>
            </div>

            <div className="modal-actions-row import-action-row">
              <button
                id="confirm-import-btn"
                className="modal-btn modal-btn-primary"
                type="button"
                disabled={!stagedTasks || stagedTasks.length === 0}
                onClick={handleConfirmImport}
              >
                Import Tasks
              </button>
            </div>
          </section>

          {/* Status feedback */}
          {status && (
            <div
              id="backup-status"
              className={`backup-status ${status.type}`}
              role="status"
              aria-live="polite"
            >
              {status.message}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
