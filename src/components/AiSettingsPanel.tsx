import type { AiProviderSettings } from '../../shared/types';

interface Props {
  aiSettings: AiProviderSettings;
  isSavingAiSettings: boolean;
  aiSettingsMessage: string | null;
  onAiSettingsChange: (settings: AiProviderSettings) => void;
  onSaveAiSettings: () => void;
  onClose: () => void;
}

export function AiSettingsPanel({
  aiSettings,
  isSavingAiSettings,
  aiSettingsMessage,
  onAiSettingsChange,
  onSaveAiSettings,
  onClose
}: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>AI Provider Settings</h3>
          <button className="tile-icon-button" type="button" onClick={onClose} aria-label="Close settings">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M18 6L6 18M6 6l12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className="ai-settings-form">
          <label className="setting-label">
            <span>Base URL</span>
            <input
              value={aiSettings.baseUrl}
              onChange={(event) => onAiSettingsChange({ ...aiSettings, baseUrl: event.target.value })}
              placeholder="https://openrouter.ai/api/v1"
            />
          </label>
          <label className="setting-label">
            <span>Provider name</span>
            <input
              value={aiSettings.providerLabel}
              onChange={(event) => onAiSettingsChange({ ...aiSettings, providerLabel: event.target.value })}
            />
          </label>
          <label className="setting-label">
            <span>Model</span>
            <input
              value={aiSettings.model}
              onChange={(event) => onAiSettingsChange({ ...aiSettings, model: event.target.value })}
              placeholder="e.g. anthropic/claude-3-5-sonnet"
            />
          </label>
          <label className="setting-label">
            <span>API key</span>
            <input
              type="password"
              value={aiSettings.apiKey}
              onChange={(event) => onAiSettingsChange({ ...aiSettings, apiKey: event.target.value })}
              placeholder="sk-..."
            />
          </label>
          <button
            className="primary-action"
            type="button"
            onClick={() => void onSaveAiSettings()}
            disabled={isSavingAiSettings}
          >
            {isSavingAiSettings ? 'Saving...' : 'Save AI Settings'}
          </button>
          {aiSettingsMessage && <p className="ai-settings-message">{aiSettingsMessage}</p>}
        </div>
      </div>
    </div>
  );
}
