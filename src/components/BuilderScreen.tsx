import type {
  AiProjectAssistResult,
  AiProviderSettings,
  HarnessCapabilities,
  ProjectRecord,
  UpdateProjectInput
} from '../../shared/types';
import { getProjectTheme, projectThemes } from '../../shared/themes';

interface Props {
  selectedProject: ProjectRecord;
  editorState: UpdateProjectInput;
  aiRefinementPrompt: string;
  latestAiResult: AiProjectAssistResult | null;
  isGeneratingAi: boolean;
  isSaving: boolean;
  isSavingAiSettings: boolean;
  aiSettings: AiProviderSettings | null;
  aiSettingsMessage: string | null;
  capabilities: HarnessCapabilities | null;
  loadError: string | null;
  saveMessage: string | null;
  onEditorStateChange: (state: UpdateProjectInput | null) => void;
  onRefinementPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onAiSettingsChange: (settings: AiProviderSettings | null) => void;
  onSaveAiSettings: () => void;
  onOpenRunMode: () => void;
}

const permissionOptions = [
  {
    id: 'project.read',
    title: 'Read saved data',
    description: 'Lets the tool load notes or records it saved earlier.'
  },
  {
    id: 'project.write',
    title: 'Save local data',
    description: 'Lets the tool store private information on this device.'
  },
  {
    id: 'asset.read',
    title: 'Read local assets',
    description: 'Useful later for files, templates, or bundled resources.'
  },
  {
    id: 'asset.write',
    title: 'Write local assets',
    description: 'Useful later if the tool should create or update local files.'
  },
  {
    id: 'ai.provider',
    title: 'Use embedded AI',
    description: 'Lets the tool send prompts through the configured AI provider from inside runtime.'
  }
];

// Business-friendly quick prompts
const quickPrompts = [
  'Add a search bar to find things faster',
  'Make the buttons bigger and easier to tap',
  'Add a way to export or print the data',
  'Change the colors to look more professional',
  'Add a filter or sort option',
  'Make the layout work better on tablets',
  'Add a confirmation message after saving',
  'Simplify the form fields'
];

function formatProjectDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function AiResultCard({ result }: { result: AiProjectAssistResult }) {
  return (
    <div className="ai-result-card">
      <div className="ai-result-header">
        <span className="ai-result-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        <strong>Your tool has been updated</strong>
      </div>

      <p className="ai-result-summary">{result.summary}</p>

      {result.notes && result.notes !== 'No attempt notes were returned.' && (
        <div className="ai-result-section">
          <strong>What changed:</strong>
          <p>{result.notes}</p>
        </div>
      )}

      {result.userFlow.length > 0 && (
        <div className="ai-result-section">
          <strong>How to use it:</strong>
          <ul className="ai-result-steps">
            {result.userFlow.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      {result.finalIssues.length > 0 && (
        <div className="ai-result-warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{result.finalIssues.length} suggestion(s) for next time — but your tool is ready to use.</span>
        </div>
      )}

      <div className="ai-result-footer">
        <span className="ai-result-attempt">
          {result.acceptedOnAttempt > 1
            ? `Refined in ${result.acceptedOnAttempt} attempts`
            : 'Updated successfully'}
        </span>
      </div>
    </div>
  );
}

function VersionSnapshot({
  entry,
  isActive,
  onRestore
}: {
  entry: { id: string; label: string; summary?: string; prompt?: string; createdAt: string };
  isActive: boolean;
  onRestore: () => void;
}) {
  return (
    <div className={`snapshot-card${isActive ? ' snapshot-active' : ''}`}>
      <div className="snapshot-header">
        <strong>{entry.label}</strong>
        <span className="snapshot-date">{formatProjectDate(entry.createdAt)}</span>
      </div>
      <p className="snapshot-summary">{entry.summary || 'No description.'}</p>
      {entry.prompt && (
        <span className="snapshot-prompt">"{entry.prompt.slice(0, 60)}{entry.prompt.length > 60 ? '...' : ''}"</span>
      )}
      {!isActive && (
        <button className="snapshot-restore" type="button" onClick={onRestore}>
          Restore this version
        </button>
      )}
      {isActive && (
        <span className="snapshot-current-badge">Current</span>
      )}
    </div>
  );
}

export function BuilderScreen({
  selectedProject,
  editorState,
  aiRefinementPrompt,
  latestAiResult,
  isGeneratingAi,
  isSaving,
  isSavingAiSettings,
  aiSettings,
  aiSettingsMessage,
  capabilities,
  onEditorStateChange,
  onRefinementPromptChange,
  onGenerate,
  onUndo,
  onRedo,
  onSave,
  onAiSettingsChange,
  onSaveAiSettings,
  onOpenRunMode
}: Props) {
  const togglePermission = (permission: string) => {
    if (!editorState) return;
    const exists = editorState.permissions.includes(permission);
    onEditorStateChange({
      ...editorState,
      permissions: exists
        ? editorState.permissions.filter((p) => p !== permission)
        : [...editorState.permissions, permission]
    });
  };

  const activeTheme = getProjectTheme(editorState?.themeId ?? selectedProject.manifest.themeId);
  const currentVersionIndex = selectedProject.versionHistory.currentIndex;
  const currentVersionCount = selectedProject.versionHistory.entries.length;
  const canUndoVersion = currentVersionIndex > 0;
  const canRedoVersion = currentVersionIndex < currentVersionCount - 1;

  return (
    <section className="workspace builder-workspace">
      {/* Left panel — Main AI interaction */}
      <article className="workspace-panel builder-main">
        <div className="panel-head-inline builder-header">
          <div>
            <p className="panel-kicker">Improve your tool</p>
            <h2>What would you like to change?</h2>
          </div>

          <button className="primary-action run-mode-btn" type="button" onClick={onOpenRunMode}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Try it out
          </button>
        </div>

        {/* Quick suggestion chips */}
        <div className="quick-prompts">
          <p className="quick-prompts-label">Try one of these:</p>
          <div className="quick-prompts-row">
            {quickPrompts.slice(0, 4).map((prompt) => (
              <button
                key={prompt}
                className="quick-prompt-chip"
                type="button"
                onClick={() => onRefinementPromptChange(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Main prompt area */}
        <div className="prompt-area">
          <label className="prompt-label" htmlFor="ai-prompt">
            Describe what you want to change
          </label>
          <textarea
            id="ai-prompt"
            className="prompt-textarea"
            value={aiRefinementPrompt}
            onChange={(event) => onRefinementPromptChange(event.target.value)}
            placeholder="Example: Add a button to export my customer list to a file, or make the form fields bigger so they're easier to tap on a tablet."
            rows={5}
          />

          <div className="prompt-actions">
            <button
              className="primary-action update-btn"
              type="button"
              onClick={() => void onGenerate()}
              disabled={isGeneratingAi || !aiRefinementPrompt.trim()}
            >
              {isGeneratingAi ? (
                <>
                  <span className="btn-spinner" />
                  Updating your tool...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Update my tool
                </>
              )}
            </button>

            {(canUndoVersion || canRedoVersion) && (
              <div className="version-nav">
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => void onUndo()}
                  disabled={!canUndoVersion || isGeneratingAi}
                  title="Go to previous version"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                  </svg>
                  Previous
                </button>
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => void onRedo()}
                  disabled={!canRedoVersion || isGeneratingAi}
                  title="Go to next version"
                >
                  Next
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <p className="prompt-hint">
            Version {currentVersionIndex + 1} of {currentVersionCount || 1} · Your changes are saved automatically
          </p>
        </div>

        {/* AI Result */}
        {latestAiResult && (
          <AiResultCard result={latestAiResult} />
        )}
      </article>

      {/* Right panel — Settings */}
      <article className="workspace-panel builder-settings">
        <div className="panel-head">
          <p className="panel-kicker">Tool settings</p>
          <h2>{editorState?.name ?? selectedProject.manifest.name}</h2>
          <p className="tool-description">
            {selectedProject.manifest.kind === 'app' ? 'Full app' : 'Widget'} · {activeTheme.label} theme
          </p>
        </div>

        {/* Quick settings */}
        <form className="settings-form" onSubmit={onSave}>
          <label className="setting-label">
            <span>Tool name</span>
            <input
              value={editorState?.name ?? ''}
              onChange={(event) =>
                onEditorStateChange?.({ ...editorState!, name: event.target.value })
              }
              placeholder="My tool"
            />
          </label>

          <label className="setting-label">
            <span>Short description</span>
            <input
              value={editorState?.description ?? ''}
              onChange={(event) =>
                onEditorStateChange?.({ ...editorState!, description: event.target.value })
              }
              placeholder="What this tool does..."
            />
          </label>

          <div className="setting-group">
            <span className="setting-label">Look and feel</span>
            <div className="theme-grid compact">
              {projectThemes.map((theme) => (
                <button
                  key={theme.id}
                  className={`theme-card-compact${editorState?.themeId === theme.id ? ' active' : ''}`}
                  type="button"
                  onClick={() =>
                    onEditorStateChange?.({ ...editorState!, themeId: theme.id })
                  }
                >
                  <div className="theme-swatches">
                    {theme.preview.map((color) => (
                      <span
                        key={`${theme.id}-${color}`}
                        className="theme-swatch"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="theme-name">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button className="secondary-action save-settings-btn" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </form>

        {/* Saved versions accordion */}
        <details className="settings-accordion" open>
          <summary>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Saved versions ({currentVersionCount})
          </summary>
          <div className="snapshots-list">
            {selectedProject.versionHistory.entries
              .slice()
              .reverse()
              .slice(0, 5)
              .map((entry, reverseIndex) => {
                const actualIndex = selectedProject.versionHistory.entries.length - reverseIndex - 1;
                return (
                  <VersionSnapshot
                    key={entry.id}
                    entry={entry}
                    isActive={actualIndex === currentVersionIndex}
                    onRestore={() => {
                      if (actualIndex < currentVersionIndex) {
                        for (let i = 0; i < currentVersionIndex - actualIndex; i++) {
                          onUndo();
                        }
                      }
                    }}
                  />
                );
              })}
            {currentVersionCount > 5 && (
              <p className="snapshots-more">+{currentVersionCount - 5} more versions</p>
            )}
          </div>
        </details>

        {/* Advanced settings accordion */}
        <details className="settings-accordion">
          <summary>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Advanced settings
          </summary>

          <div className="advanced-settings-content">
            <div className="permission-grid compact">
              {permissionOptions.map((permission) => (
                <label key={permission.id} className="permission-card compact">
                  <input
                    type="checkbox"
                    checked={editorState?.permissions.includes(permission.id) ?? false}
                    onChange={() => togglePermission(permission.id)}
                  />
                  <div>
                    <strong>{permission.title}</strong>
                    <span>{permission.description}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="ai-settings-section">
              <h4>AI provider</h4>
              {aiSettings ? (
                <div className="ai-settings-form">
                  <label className="setting-label">
                    <span>Base URL</span>
                    <input
                      value={aiSettings.baseUrl}
                      onChange={(event) =>
                        onAiSettingsChange?.({ ...aiSettings, baseUrl: event.target.value })
                      }
                      placeholder="https://openrouter.ai/api/v1"
                    />
                  </label>
                  <label className="setting-label">
                    <span>Provider name</span>
                    <input
                      value={aiSettings.providerLabel}
                      onChange={(event) =>
                        onAiSettingsChange?.({ ...aiSettings, providerLabel: event.target.value })
                      }
                    />
                  </label>
                  <label className="setting-label">
                    <span>Model</span>
                    <input
                      value={aiSettings.model}
                      onChange={(event) =>
                        onAiSettingsChange?.({ ...aiSettings, model: event.target.value })
                      }
                    />
                  </label>
                  <label className="setting-label">
                    <span>API key</span>
                    <input
                      type="password"
                      value={aiSettings.apiKey}
                      onChange={(event) =>
                        onAiSettingsChange?.({ ...aiSettings, apiKey: event.target.value })
                      }
                      placeholder="sk-..."
                    />
                  </label>
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => void onSaveAiSettings()}
                    disabled={isSavingAiSettings}
                  >
                    {isSavingAiSettings ? 'Saving...' : 'Save AI settings'}
                  </button>
                  {aiSettingsMessage && (
                    <p className="ai-settings-message">{aiSettingsMessage}</p>
                  )}
                </div>
              ) : (
                <p className="form-hint">AI settings are not available.</p>
              )}
            </div>
          </div>
        </details>
      </article>
    </section>
  );
}
