import type { ProjectSummary } from '../../shared/types';

interface Props {
  project: ProjectSummary | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ project, isDeleting, onConfirm, onCancel }: Props) {
  if (!project) return null;

  return (
    <section className="confirm-overlay" aria-label="Delete project confirmation" role="dialog" aria-modal="true">
      <div className="confirm-card">
        <p className="panel-kicker">Delete project</p>
        <h2>Remove {project.name}?</h2>
        <p className="summary">
          This deletes the local app or widget, its saved runtime data, and its version history
          from this device.
        </p>
        <div className="form-actions">
          <button
            className="secondary-action"
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="primary-action destructive-action"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete app'}
          </button>
        </div>
      </div>
    </section>
  );
}
