import type { ReplibotAppInfo, WorkspaceInfo } from '../../shared/types';

interface Props {
  appInfo: ReplibotAppInfo | null;
  workspaceInfo: WorkspaceInfo | null;
  projectCount: number;
  onEnter: () => void;
}

const quickSteps = [
  'Describe the tool you need in plain language.',
  'Choose what it can read or save locally.',
  'Generate, preview, and keep the version you like.'
];

export function SplashScreen({ appInfo, workspaceInfo, projectCount, onEnter }: Props) {
  const projectLabel = `${projectCount} project${projectCount === 1 ? '' : 's'}`;

  return (
    <section className="splash-screen" aria-label="Welcome splash">
      <div className="splash-card">
        <div className="splash-copy">
          <p className="eyebrow">Replibot</p>
          <h2>Launch a local app or widget.</h2>
          <p className="summary">
            Open any saved tool from the library, or use the plus tile to create a new one.
          </p>
        </div>

        <div className="splash-meta">
          <div className="status-row">
            <span className="status-pill">{projectLabel}</span>
            <span className="status-pill subtle">{appInfo?.platform ?? 'loading'}</span>
          </div>
          <dl className="status-list">
            <div>
              <dt>Version</dt>
              <dd>{appInfo?.version ?? 'loading'}</dd>
            </div>
            <div>
              <dt>Workspace</dt>
              <dd>{workspaceInfo?.projectsPath ?? 'loading'}</dd>
            </div>
          </dl>
          <ol className="step-list">
            {quickSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <button className="primary-action splash-action" type="button" onClick={onEnter}>
          Enter library
        </button>
      </div>
    </section>
  );
}
