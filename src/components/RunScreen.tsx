import type { ProjectRecord, UpdateProjectInput } from '../../shared/types';
import ProjectPreview from './ProjectPreview';

interface Props {
  project: ProjectRecord;
  editorState: UpdateProjectInput;
  onBack: () => void;
}

export function RunScreen({ project, editorState, onBack }: Props) {
  return (
    <>
      <nav className="breadcrumb-bar" aria-label="Breadcrumb">
        <button className="breadcrumb-link" type="button" onClick={onBack}>
          Home
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{project.manifest.name}</span>
      </nav>

      <ProjectPreview
        projectId={project.manifest.id}
        source={editorState.source}
        permissions={editorState.permissions}
        themeId={editorState.themeId}
      />
    </>
  );
}
