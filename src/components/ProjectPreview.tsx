import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  PreviewEventMessage,
  ProjectThemeId,
  ProjectRuntimeState
} from '../../shared/types';
import { buildProjectThemeCss } from '../../shared/themes';

interface ProjectPreviewProps {
  projectId: string;
  source: string;
  permissions: string[];
  themeId: ProjectThemeId;
}

interface PreviewLogEntry {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

function normalizeSource(source: string): string {
  return source.replace(/\bexport\s+/g, '');
}

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildPreviewDocument(
  source: string,
  permissions: string[],
  runtimeState: ProjectRuntimeState,
  themeId: ProjectThemeId
): string {
  const normalizedSource = normalizeSource(source);
  const stateJson = serializeForInlineScript(runtimeState);
  const permissionJson = serializeForInlineScript(permissions);
  const sourceJson = serializeForInlineScript(normalizedSource);
  const themeCss = buildProjectThemeCss(themeId);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Replibot Preview</title>
    <style>
${themeCss}
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script>
      (function () {
        const appRoot = document.getElementById('app');
        const allowedPermissions = ${permissionJson};
        const state = ${stateJson};

        function post(message) {
          window.parent.postMessage(message, '*');
        }

        function can(permission) {
          return allowedPermissions.includes(permission);
        }

        const aiRequests = new Map();
        let nextRequestId = 0;

        window.addEventListener('message', (event) => {
          const data = event.data;
          if (!data || typeof data !== 'object' || data.type !== 'REPLIBOT_AI_RESPONSE') {
            return;
          }

          const pending = data.requestId ? aiRequests.get(data.requestId) : null;
          if (!pending) {
            return;
          }

          aiRequests.delete(data.requestId);
          if (data.error) {
            pending.reject(new Error(String(data.error)));
            return;
          }

          pending.resolve(String(data.text || ''));
        });

        const replibot = {
          permissions: allowedPermissions,
          runtime: {
            can,
            log(message) {
              post({ type: 'REPLIBOT_LOG', level: 'info', message: String(message) });
            }
          },
          ui: {
            render(html) {
              appRoot.innerHTML = html;
            },
            setTitle(title) {
              document.title = String(title);
            },
            notify(message) {
              post({ type: 'REPLIBOT_NOTIFY', message: String(message) });
            }
          },
          ai: {
            complete(prompt, options) {
              if (!can('ai.provider')) {
                return Promise.reject(new Error('Permission denied: ai.provider'));
              }

              const requestId = 'ai-' + Date.now() + '-' + nextRequestId++;
              post({
                type: 'REPLIBOT_AI_REQUEST',
                requestId,
                prompt: String(prompt || ''),
                systemPrompt:
                  options && typeof options === 'object' && 'systemPrompt' in options
                    ? String(options.systemPrompt || '')
                    : undefined
              });

              return new Promise((resolve, reject) => {
                aiRequests.set(requestId, { resolve, reject });
              });
            }
          },
          storage: {
            get(key) {
              if (!can('project.read')) return null;
              return state[key];
            },
            set(key, value) {
              if (!can('project.write')) {
                throw new Error('Permission denied: project.write');
              }
              state[key] = value;
              post({ type: 'REPLIBOT_STORAGE_SYNC', state });
              return value;
            },
            delete(key) {
              if (!can('project.write')) {
                throw new Error('Permission denied: project.write');
              }
              delete state[key];
              post({ type: 'REPLIBOT_STORAGE_SYNC', state });
            },
            clear() {
              if (!can('project.write')) {
                throw new Error('Permission denied: project.write');
              }
              Object.keys(state).forEach((key) => delete state[key]);
              post({ type: 'REPLIBOT_STORAGE_SYNC', state });
            },
            all() {
              if (!can('project.read')) return {};
              return { ...state };
            }
          }
        };

        const consoleLog = console.log.bind(console);
        const consoleWarn = console.warn.bind(console);
        const consoleError = console.error.bind(console);

        console.log = function () {
          post({ type: 'REPLIBOT_LOG', level: 'info', message: Array.from(arguments).join(' ') });
          consoleLog.apply(console, arguments);
        };

        console.warn = function () {
          post({ type: 'REPLIBOT_LOG', level: 'warn', message: Array.from(arguments).join(' ') });
          consoleWarn.apply(console, arguments);
        };

        console.error = function () {
          post({ type: 'REPLIBOT_LOG', level: 'error', message: Array.from(arguments).join(' ') });
          consoleError.apply(console, arguments);
        };

        window.addEventListener('error', (event) => {
          const message =
            event.error instanceof Error
              ? event.error.stack || event.error.message
              : String(event.message || 'Unknown runtime error');
          post({ type: 'REPLIBOT_RUNTIME_ERROR', message });
        });

        window.addEventListener('unhandledrejection', (event) => {
          const reason = event.reason;
          const message =
            reason instanceof Error ? reason.stack || reason.message : String(reason || 'Unhandled promise rejection');
          post({ type: 'REPLIBOT_RUNTIME_ERROR', message });
        });

        window.replibot = replibot;
        post({ type: 'REPLIBOT_READY' });

        try {
          const userSource = ${sourceJson};
          const runner = new Function(
            'window',
            \`\${userSource}
if (typeof start === 'function') {
  start(window.replibot);
}\`
          );
          runner(window);
        } catch (error) {
          const message = error instanceof Error ? error.stack || error.message : String(error);
          post({ type: 'REPLIBOT_RUNTIME_ERROR', message });
        }
      })();
    </script>
  </body>
</html>`;
}

function ProjectPreview({ projectId, source, permissions, themeId }: ProjectPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [runtimeState, setRuntimeState] = useState<ProjectRuntimeState>({});
  const [logs, setLogs] = useState<PreviewLogEntry[]>([]);
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);
  const [runNonce, setRunNonce] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsStateLoaded(false);
    setRuntimeState({});

    const loadState = async () => {
      try {
        const nextState = await window.replibot.getProjectRuntimeState(projectId);
        if (!cancelled) {
          setRuntimeState(nextState);
        }
      } catch (error) {
        if (!cancelled) {
          setLogs((current) => [
            {
              id: `${Date.now()}-state-load-error`,
              level: 'error',
              message:
                error instanceof Error ? error.message : 'Failed to load saved runtime state.'
            },
            ...current
          ]);
        }
      } finally {
        if (!cancelled) {
          setIsStateLoaded(true);
        }
      }
    };

    void loadState();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<PreviewEventMessage>) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }

      if (data.type === 'REPLIBOT_READY') {
        setIsReady(true);
        return;
      }

      if (data.type === 'REPLIBOT_NOTIFY' && data.message) {
        setNotifyMessage(data.message);
        return;
      }

      if (data.type === 'REPLIBOT_LOG' && data.message && data.level) {
        const level = data.level;
        const message = data.message;
        setLogs((current) => [
          {
            id: `${Date.now()}-${current.length}`,
            level,
            message
          },
          ...current
        ]);
        return;
      }

      if (data.type === 'REPLIBOT_RUNTIME_ERROR' && data.message) {
        const message = data.message;
        setRuntimeError(message);
        setLogs((current) => [
          {
            id: `${Date.now()}-runtime-error`,
            level: 'error',
            message
          },
          ...current
        ]);
        return;
      }

      if (data.type === 'REPLIBOT_STORAGE_SYNC' && data.state) {
        setRuntimeState(data.state);
        void window.replibot.saveProjectRuntimeState(projectId, data.state);
        return;
      }

      if (data.type === 'REPLIBOT_AI_REQUEST' && data.requestId && data.prompt) {
        void window.replibot
          .runProjectAiRequest({
            projectId,
            prompt: data.prompt,
            systemPrompt: data.systemPrompt
          })
          .then((result) => {
            iframeRef.current?.contentWindow?.postMessage(
              {
                type: 'REPLIBOT_AI_RESPONSE',
                requestId: data.requestId,
                text: result.text
              },
              '*'
            );
          })
          .catch((error) => {
            iframeRef.current?.contentWindow?.postMessage(
              {
                type: 'REPLIBOT_AI_RESPONSE',
                requestId: data.requestId,
                error: error instanceof Error ? error.message : 'AI request failed'
              },
              '*'
            );
          });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [projectId]);

  const previewDocument = useMemo(() => {
    return buildPreviewDocument(source, permissions, runtimeState, themeId);
  }, [permissions, runtimeState, source, runNonce, themeId]);

  useEffect(() => {
    setLogs([]);
    setNotifyMessage(null);
    setIsReady(false);
    setRuntimeError(null);
  }, [previewDocument]);

  return (
    <section className="runtime-preview-shell">
      {!isStateLoaded ? (
        <div className="runtime-loading">
          <p className="panel-kicker">Runtime</p>
          <h3>Loading saved state</h3>
          <p className="form-hint">Booting the app with its persisted local data.</p>
        </div>
      ) : (
        <iframe
          key={`${projectId}-${runNonce}`}
          ref={iframeRef}
          title="Replibot Harness Preview"
          className="runtime-preview-frame"
          sandbox="allow-scripts allow-modals allow-forms"
          srcDoc={previewDocument}
        />
      )}

      {runtimeError && <p className="error-banner global-banner">Runtime error: {runtimeError}</p>}

      <details className="runtime-debug">
        <summary>
          Runtime tools
          <span className={`preview-status ${isReady ? 'ready' : 'booting'}`}>
            {isReady ? 'Ready' : 'Booting'}
          </span>
        </summary>
        <div className="runtime-debug-actions">
          <button
            className="secondary-action"
            type="button"
            onClick={() => setRunNonce((current) => current + 1)}
          >
            Restart runtime
          </button>
        </div>
        <div className="preview-meta">
          <div className="preview-state">
            <p className="panel-kicker">Project state</p>
            <pre>{JSON.stringify(runtimeState, null, 2)}</pre>
          </div>

          <div className="preview-log-panel">
            <p className="panel-kicker">Runtime log</p>
            {notifyMessage && <p className="save-banner">Notification: {notifyMessage}</p>}
            <ul className="preview-log-list">
              {logs.map((entry) => (
                <li key={entry.id} className={`log-${entry.level}`}>
                  <strong>{entry.level}</strong>
                  <span>{entry.message}</span>
                </li>
              ))}
              {logs.length === 0 && <li className="empty-state">No runtime events yet.</li>}
            </ul>
          </div>
        </div>
      </details>
    </section>
  );
}

export default ProjectPreview;
