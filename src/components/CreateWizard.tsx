import type { CreateProjectInput, ProjectKind, ProjectThemeId } from '../../shared/types';
import { defaultThemeId, projectThemes } from '../../shared/themes';

interface Props {
  projectInput: CreateProjectInput;
  createStep: number;
  isCreating: boolean;
  creationProgress: number;
  creationStatus: string;
  loadError: string | null;
  onUpdateInput: (input: CreateProjectInput) => void;
  onStepChange: (step: number) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

const creationExamples = [
  {
    kind: 'app' as const,
    title: 'Task manager',
    name: 'Daily planner',
    description: 'A simple daily planner that captures tasks, due dates, and what to focus on next.'
  },
  {
    kind: 'app' as const,
    title: 'Client tracker',
    name: 'Client follow-up tracker',
    description: 'A private tracker for client notes, follow-up dates, and recent outreach history.'
  },
  {
    kind: 'app' as const,
    title: 'AI note helper',
    name: 'Meeting note assistant',
    description: 'A note workspace that stores drafts locally and uses embedded AI to rewrite or summarize them.'
  },
  {
    kind: 'widget' as const,
    title: 'Quick capture',
    name: 'Idea inbox',
    description: 'A small widget for capturing short ideas or reminders without opening a full app.'
  },
  {
    kind: 'widget' as const,
    title: 'Daily status',
    name: 'Focus widget',
    description: "A compact widget that shows the current focus item, a short checklist, and today's goal."
  }
];

export function CreateWizard({
  projectInput,
  createStep,
  isCreating,
  creationProgress,
  creationStatus,
  loadError,
  onUpdateInput,
  onStepChange,
  onSubmit
}: Props) {
  const applyCreationExample = (name: string, description: string) => {
    onUpdateInput({
      ...projectInput,
      name: projectInput.name || name,
      description
    });
  };

  const filteredCreationExamples = creationExamples.filter(
    (example) => example.kind === projectInput.kind
  );

  return (
    <section className="workspace single-column">
      <article className="workspace-panel">
        <div className="panel-head">
          <p className="panel-kicker">Guided creation</p>
          <h2>Start a new tool</h2>
        </div>
        <form className="editor-form" onSubmit={onSubmit}>
          <div className="wizard-steps">
            <span className={`wizard-step${createStep === 0 ? ' active' : ''}`}>1. Type</span>
            <span className={`wizard-step${createStep === 1 ? ' active' : ''}`}>2. Example</span>
            <span className={`wizard-step${createStep === 2 ? ' active' : ''}`}>3. Create</span>
          </div>

          {createStep === 0 && (
            <section className="builder-step">
              <div className="builder-step-head">
                <span className="step-number">1</span>
                <div>
                  <h3>What are you making?</h3>
                  <p>Choose the shape first. You can refine the details in the next step.</p>
                </div>
              </div>

              <div className="wizard-choice-grid">
                {(['app', 'widget'] as const).map((kind) => (
                  <button
                    key={kind}
                    className={`wizard-choice${projectInput.kind === kind ? ' active' : ''}`}
                    type="button"
                    onClick={() =>
                      onUpdateInput({
                        ...projectInput,
                        kind,
                        template: kind === 'widget' ? 'blank-widget' : 'blank-app'
                      })
                    }
                  >
                    <strong>{kind === 'app' ? 'Full app' : 'Widget'}</strong>
                    <p>
                      {kind === 'app'
                        ? 'Best for tools with multiple actions, lists, forms, or AI workflows.'
                        : 'Best for compact utilities, quick capture, and always-on helpers.'}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {createStep === 1 && (
            <section className="builder-step">
              <div className="builder-step-head">
                <span className="step-number">2</span>
                <div>
                  <h3>Pick an example and describe the job</h3>
                  <p>Start from something close. You can edit the wording below before creating it.</p>
                </div>
              </div>

              <div className="wizard-example-grid">
                {filteredCreationExamples.map((example) => (
                  <button
                    key={`${example.kind}-${example.title}`}
                    className="wizard-example-card"
                    type="button"
                    onClick={() => applyCreationExample(example.name, example.description)}
                  >
                    <strong>{example.title}</strong>
                    <span>{example.name}</span>
                    <p>{example.description}</p>
                  </button>
                ))}
              </div>

              <label>
                <span>What should this tool help with?</span>
                <textarea
                  value={projectInput.description}
                  onChange={(event) =>
                    onUpdateInput({ ...projectInput, description: event.target.value })
                  }
                  placeholder="Example: I want a private tool that stores customer notes, follow-up dates, and drafted replies."
                  rows={5}
                />
              </label>
            </section>
          )}

          {createStep === 2 && (
            <section className="builder-step">
              <div className="builder-step-head">
                <span className="step-number">3</span>
                <div>
                  <h3>Name it and pick a theme</h3>
                  <p>Keep it simple. You can change the name, permissions, and source later in the builder.</p>
                </div>
              </div>

              <div className="question-grid">
                <label>
                  <span>Name</span>
                  <input
                    value={projectInput.name}
                    onChange={(event) =>
                      onUpdateInput({ ...projectInput, name: event.target.value })
                    }
                    placeholder="Client follow-up tracker"
                  />
                </label>
                <div className="field-block">
                  <span>Type</span>
                  <div className="wizard-inline-value">
                    {projectInput.kind === 'app' ? 'Full app' : 'Widget'}
                  </div>
                </div>
              </div>

              <div className="field-block">
                <span>Theme guard rail</span>
                <div className="theme-grid">
                  {projectThemes.map((theme) => (
                    <button
                      key={theme.id}
                      className={`theme-card${projectInput.themeId === theme.id ? ' active' : ''}`}
                      type="button"
                      onClick={() =>
                        onUpdateInput({ ...projectInput, themeId: theme.id })
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
                      <strong>{theme.label}</strong>
                      <p>{theme.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <label className="permission-toggle">
                <input
                  type="checkbox"
                  checked={projectInput.permissions.includes('ai.provider')}
                  onChange={(event) =>
                    onUpdateInput({
                      ...projectInput,
                      permissions: event.target.checked
                        ? [...projectInput.permissions, 'ai.provider']
                        : projectInput.permissions.filter((p) => p !== 'ai.provider')
                    })
                  }
                />
                <div>
                  <strong>Let this tool use AI inside runtime</strong>
                  <span>
                    Turn this on if the finished app or widget should be able to draft, rewrite,
                    summarise, or answer questions using the configured provider.
                  </span>
                </div>
              </label>
            </section>
          )}

          {(isCreating || creationProgress > 0) && (
            <section className="builder-step progress-step">
              <div className="builder-step-head">
                <div className="progress-indicator">
                  <span className="ai-generating-spinner" />
                  <span className="progress-step-text">{creationStatus || 'Generating your app...'}</span>
                </div>
              </div>
              <div className="progress-bar">
                <span
                  className={creationProgress < 88 ? 'progress-bar-fill' : 'progress-bar-fill progress-bar-pulsing'}
                  style={{ width: `${creationProgress}%` }}
                />
              </div>
              <div className="progress-hints">
                {creationProgress < 28 && <p className="form-hint">Creating your project...</p>}
                {creationProgress >= 28 && creationProgress < 82 && (
                  <p className="form-hint ai-thinking-hint">
                    <span className="ai-thinking-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                    The AI is designing your app — this usually takes 30-90 seconds
                  </p>
                )}
                {creationProgress >= 82 && creationProgress < 100 && (
                  <p className="form-hint">Saving your app...</p>
                )}
                {creationProgress >= 100 && (
                  <p className="form-hint success-hint">Opening your app...</p>
                )}
              </div>
            </section>
          )}

          <div className="form-actions">
            <div className="action-strip">
              {createStep > 0 && (
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => onStepChange(createStep - 1)}
                >
                  Back
                </button>
              )}
              {createStep < 2 ? (
                <button
                  className="primary-action"
                  type="button"
                  onClick={() => {
                    if (createStep === 1 && !projectInput.description.trim()) {
                      return;
                    }
                    onStepChange(createStep + 1);
                  }}
                >
                  Next
                </button>
              ) : (
                <button className="primary-action" type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create tool'}
                </button>
              )}
            </div>
            <p className="form-hint">This creates a local project only on your device.</p>
          </div>
        </form>
      </article>
    </section>
  );
}
