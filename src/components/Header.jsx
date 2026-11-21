import React from 'react';
import './header.css';

export default function Header({ isLight, onToggleTheme, onOpenBackup }) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-monogram" aria-hidden="true">&#10003;</div>
        <div className="brand-text">
          <h1>Task Manager</h1>
          <p className="app-subtitle">Productivity Dashboard</p>
        </div>
      </div>
      <nav className="header-actions" aria-label="App actions">
        <button
          id="backup-toggle"
          className="header-btn"
          type="button"
          onClick={onOpenBackup}
          aria-haspopup="dialog"
          aria-label="Backup and restore tasks"
          title="Backup and restore"
        >
          <span className="header-btn-icon" aria-hidden="true">&#8646;</span>
          <span className="header-btn-label">Backup &amp; Restore</span>
        </button>
        <button
          id="theme-toggle"
          className="theme-btn"
          type="button"
          onClick={onToggleTheme}
          aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
          aria-pressed={isLight}
          title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          <span className="header-btn-icon" aria-hidden="true">{isLight ? '\u263E' : '\u2600'}</span>
          <span className="header-btn-label">{isLight ? 'Dark mode' : 'Light mode'}</span>
        </button>
      </nav>
    </header>
  );
}
