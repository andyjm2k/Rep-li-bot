import type { ProjectSummary } from '../../shared/types';
import { getProjectTheme } from '../../shared/themes';

interface Props {
  projects: ProjectSummary[];
  onOpenProject: (projectId: string, screen: 'builder' | 'run') => void;
  onDeleteProject: (project: ProjectSummary) => void;
  onCreateNew: () => void;
}

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

export function LauncherScreen({ projects, onOpenProject, onDeleteProject, onCreateNew }: Props) {
  const projectCountLabel = `${projects.length} project${projects.length === 1 ? '' : 's'}`;

  return (
    <section className="workspace single-column">
      <article className="workspace-panel">
        <div className="panel-head-inline launcher-panel-head">
          <h2>Library</h2>
          <span className="launcher-count">{projectCountLabel}</span>
        </div>

        <div className="launcher-grid">
          {projects.map((project) => (
            <article key={project.id} className="launcher-tile">
              <div className="launcher-tile-head">
                <div className="tile-badge-row">
                  <span className="tile-kind-pill">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      {project.kind === 'app' ? (
                        <path
                          d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM7 8h10M7 12h6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      ) : (
                        <path
                          d="M6 7.5A1.5 1.5 0 0 1 7.5 6h9A1.5 1.5 0 0 1 18 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 16.5zM9 9h6v6H9z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>
                    <span>{project.kind === 'app' ? 'App' : 'Widget'}</span>
                  </span>
                  <span className="tile-theme-pill">{getProjectTheme(project.themeId).label}</span>
                </div>

                <div className="tile-icon-actions">
                  <button
                    className="tile-icon-button"
                    type="button"
                    onClick={() => void onOpenProject(project.id, 'builder')}
                    aria-label={`Edit ${project.name}`}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M5 16.5V19h2.5L17 9.5 14.5 7zM13.5 8l2.5 2.5M15.2 6.3l1-1a1.8 1.8 0 0 1 2.5 2.5l-1 1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="sr-only">Edit</span>
                  </button>
                  <button
                    className="tile-icon-button tile-icon-button-delete"
                    type="button"
                    onClick={() => onDeleteProject(project)}
                    aria-label={`Delete ${project.name}`}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M8 7h8m-7 3.5V16m4-5.5V16M9.5 7l.5-1.5h4L14.5 7M7 7l.7 10.1A1 1 0 0 0 8.7 18h6.6a1 1 0 0 0 1-.9L17 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="sr-only">Delete</span>
                  </button>
                </div>
              </div>

              <button
                className="launcher-open"
                type="button"
                onClick={() => void onOpenProject(project.id, 'run')}
              >
                <strong>{project.name}</strong>
                <p>{project.description || 'No short description yet.'}</p>
                <div className="tile-meta-line">
                  <span className="tile-date">{formatProjectDate(project.updatedAt)}</span>
                  <span className="tile-open-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M8 16l8-8M10 8h6v6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              </button>
            </article>
          ))}

          <button
            className="launcher-tile launcher-tile-create"
            type="button"
            onClick={onCreateNew}
            aria-label="Create new"
          >
            <span className="create-plus">+</span>
          </button>
        </div>

        {projects.length === 0 && (
          <p className="empty-state launcher-empty">
            No tools yet. Use the plus tile to create the first one.
          </p>
        )}
      </article>
    </section>
  );
}
