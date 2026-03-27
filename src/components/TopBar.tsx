interface Props {
  title: string;
  showHome?: boolean;
  showNew?: boolean;
  showSettings?: boolean;
  onHome: () => void;
  onNew: () => void;
  onSettings: () => void;
}

export function TopBar({ title, showHome, showNew, showSettings, onHome, onNew, onSettings }: Props) {
  return (
    <section className="topbar">
      <div>
        <p className="eyebrow">Replibot</p>
        <h1 className="app-title">{title}</h1>
      </div>

      <div className="topbar-actions">
        {showSettings && (
          <button className="secondary-action" type="button" onClick={onSettings} title="AI Settings">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            AI Settings
          </button>
        )}
        {showHome && (
          <button className="secondary-action" type="button" onClick={onHome}>
            Home
          </button>
        )}
        {showNew && (
          <button className="primary-action" type="button" onClick={onNew}>
            New
          </button>
        )}
      </div>
    </section>
  );
}
