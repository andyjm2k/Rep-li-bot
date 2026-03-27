import { useEffect, useState } from 'react';
import type {
  AiProjectAssistInput,
  AiProjectAssistResult,
  AiProviderSettings,
  CreateProjectInput,
  HarnessCapabilities,
  ProjectRecord,
  ProjectSummary,
  ReplibotAppInfo,
  UpdateProjectInput,
  WorkspaceInfo
} from '../shared/types';
import { defaultThemeId } from '../shared/themes';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SplashScreen } from './components/SplashScreen';
import { TopBar } from './components/TopBar';
import { LauncherScreen } from './components/LauncherScreen';
import { CreateWizard } from './components/CreateWizard';
import { BuilderScreen } from './components/BuilderScreen';
import { RunScreen } from './components/RunScreen';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AiSettingsPanel } from './components/AiSettingsPanel';
import {
  PROGRESS_INCREMENT,
  PROGRESS_INTERVAL_MS,
  PROGRESS_CAP_BEFORE_AI,
  PROGRESS_CREATE_SHELL,
  PROGRESS_GENERATE_AI,
  PROGRESS_COMPLETE,
  PROGRESS_RESET_DELAY_MS
} from './constants';

type AppScreen = 'launcher' | 'create' | 'builder' | 'run';

const defaultProjectInput: CreateProjectInput = {
  name: '',
  kind: 'app',
  themeId: defaultThemeId,
  description: '',
  template: 'blank-app',
  permissions: ['project.read', 'project.write']
};

function App() {
  const [appInfo, setAppInfo] = useState<ReplibotAppInfo | null>(null);
  const [capabilities, setCapabilities] = useState<HarnessCapabilities | null>(null);
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null);
  const [aiSettings, setAiSettings] = useState<AiProviderSettings | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);
  const [projectInput, setProjectInput] = useState<CreateProjectInput>(defaultProjectInput);
  const [editorState, setEditorState] = useState<UpdateProjectInput | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAiSettings, setIsSavingAiSettings] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [aiSettingsMessage, setAiSettingsMessage] = useState<string | null>(null);
  const [latestAiResult, setLatestAiResult] = useState<AiProjectAssistResult | null>(null);
  const [screen, setScreen] = useState<AppScreen>('launcher');
  const [showSplash, setShowSplash] = useState(true);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [aiRefinementPrompt, setAiRefinementPrompt] = useState('');
  const [creationProgress, setCreationProgress] = useState(0);
  const [creationStatus, setCreationStatus] = useState('');
  const [pendingDeleteProject, setPendingDeleteProject] = useState<ProjectSummary | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!window.replibot) {
        return;
      }

      try {
        const [info, harness, workspace, storedProjects, providerSettings] = await Promise.all([
          window.replibot.getAppInfo(),
          window.replibot.getHarnessCapabilities(),
          window.replibot.getWorkspaceInfo(),
          window.replibot.listProjects(),
          window.replibot.getAiSettings()
        ]);

        if (!cancelled) {
          setAppInfo(info);
          setCapabilities(harness);
          setWorkspaceInfo(workspace);
          setProjects(storedProjects);
          setAiSettings(providerSettings);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load workspace');
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshProjects = async () => {
    const storedProjects = await window.replibot.listProjects();
    setProjects(storedProjects);
  };

  const loadProjectById = async (projectId: string) => {
    const project = await window.replibot.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    return project;
  };

  const syncProjectState = (project: ProjectRecord) => {
    setSelectedProject(project);
    hydrateEditor(project);
  };

  const hydrateEditor = (project: ProjectRecord | null) => {
    if (!project) {
      setEditorState(null);
      setLatestAiResult(null);
      return;
    }
    const sourceFile = project.files.find((file) => file.path === 'src/main.ts');
    setEditorState({
      projectId: project.manifest.id,
      name: project.manifest.name,
      themeId: project.manifest.themeId,
      description: project.manifest.description,
      goal: project.spec.goal,
      audience: project.spec.audience,
      problem: project.spec.problem,
      outcome: project.spec.outcome,
      primaryAction: project.spec.primaryAction,
      dataNotes: project.spec.dataNotes,
      permissions: project.manifest.permissions,
      source: sourceFile?.content ?? ''
    });
    setLatestAiResult(null);
  };

  const openProjectScreen = async (projectId: string, nextScreen: AppScreen) => {
    try {
      const shouldReuseCurrent =
        selectedProject?.manifest.id === projectId && editorState?.projectId === projectId;
      if (!shouldReuseCurrent) {
        const project = await loadProjectById(projectId);
        syncProjectState(project);
      }
      setLoadError(null);
      setSaveMessage(null);
      setScreen(nextScreen);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load project');
    }
  };

  const handleOpenCreate = () => {
    setProjectInput(defaultProjectInput);
    setCreateStep(0);
    setSelectedProject(null);
    hydrateEditor(null);
    setLoadError(null);
    setSaveMessage(null);
    setAiSettingsMessage(null);
    setScreen('create');
  };

  const handleBackToLauncher = () => {
    setLoadError(null);
    setSaveMessage(null);
    setAiSettingsMessage(null);
    setScreen('launcher');
  };

  const handleDeleteProject = async () => {
    if (!pendingDeleteProject) {
      return;
    }

    setIsDeletingProject(true);
    setLoadError(null);
    setSaveMessage(null);

    try {
      await window.replibot.deleteProject(pendingDeleteProject.id);
      await refreshProjects();

      if (selectedProject?.manifest.id === pendingDeleteProject.id) {
        setSelectedProject(null);
        hydrateEditor(null);
      }

      setPendingDeleteProject(null);
      setScreen('launcher');
      setSaveMessage(`Deleted "${pendingDeleteProject.name}".`);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to delete project');
    } finally {
      setIsDeletingProject(false);
    }
  };

  const buildAiInputFromProject = (
    project: ProjectRecord,
    source: string,
    refinementPrompt?: string
  ): AiProjectAssistInput => ({
    projectId: project.manifest.id,
    kind: project.manifest.kind,
    themeId: project.manifest.themeId,
    name: project.manifest.name,
    description: project.manifest.description,
    permissions: project.manifest.permissions,
    spec: project.spec,
    currentSource: source,
    refinementPrompt
  });

  const handleCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectInput.name.trim()) {
      setLoadError('Project name is required.');
      return;
    }

    setIsCreating(true);
    setLoadError(null);
    setSaveMessage(null);
    setCreationProgress(PROGRESS_INCREMENT);
    setCreationStatus('Creating your project shell...');

    const progressInterval = window.setInterval(() => {
      setCreationProgress((current) => (current < PROGRESS_CAP_BEFORE_AI ? current + PROGRESS_INCREMENT : current));
    }, PROGRESS_INTERVAL_MS);

    try {
      const nextInput: CreateProjectInput = {
        ...projectInput,
        name: projectInput.name.trim(),
        description: projectInput.description.trim(),
        themeId: projectInput.themeId,
        template: projectInput.kind === 'widget' ? 'blank-widget' : 'blank-app'
      };
      const project = await window.replibot.createProject(nextInput);
      syncProjectState(project);
      setCreationProgress(PROGRESS_CREATE_SHELL);
      setCreationStatus('Generating the first working version with AI...');

      const sourceFile = project.files.find((file) => file.path === 'src/main.ts');
      const result = await window.replibot.generateProjectWithAi(
        buildAiInputFromProject(project, sourceFile?.content ?? '')
      );

      setCreationProgress(PROGRESS_GENERATE_AI);
      setCreationStatus('Saving the generated version...');

      const savedProject = await window.replibot.updateProject({
        projectId: project.manifest.id,
        name: project.manifest.name,
        themeId: project.manifest.themeId,
        description: project.manifest.description,
        goal: project.spec.goal,
        audience: project.spec.audience,
        problem: project.spec.problem,
        outcome: project.spec.outcome,
        primaryAction: project.spec.primaryAction,
        dataNotes: project.spec.dataNotes,
        permissions: project.manifest.permissions,
        source: result.source,
        versionLabel: 'Initial AI build',
        versionPrompt: project.manifest.description,
        versionSummary: result.summary
      });

      setCreationProgress(PROGRESS_COMPLETE);
      setCreationStatus('Opening your app...');
      syncProjectState(savedProject);
      setLatestAiResult(result);
      await refreshProjects();
      setProjectInput({
        ...defaultProjectInput,
        kind: nextInput.kind,
        template: nextInput.kind === 'widget' ? 'blank-widget' : 'blank-app'
      });
      setCreateStep(0);
      setSaveMessage('New project created and generated.');
      setScreen('run');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      window.clearInterval(progressInterval);
      window.setTimeout(() => {
        setCreationProgress(0);
        setCreationStatus('');
      }, PROGRESS_RESET_DELAY_MS);
      setIsCreating(false);
    }
  };

  const handleSaveProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editorState) {
      return;
    }

    setIsSaving(true);
    setLoadError(null);
    setSaveMessage(null);

    try {
      const project = await window.replibot.updateProject({
        ...editorState,
        name: editorState.name.trim(),
        themeId: editorState.themeId,
        description: editorState.description.trim(),
        goal: editorState.goal.trim()
      });
      syncProjectState(project);
      await refreshProjects();
      setSaveMessage('Project saved locally.');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAiSettings = async () => {
    if (!aiSettings) {
      return;
    }

    setIsSavingAiSettings(true);
    setLoadError(null);

    try {
      const saved = await window.replibot.saveAiSettings(aiSettings);
      setAiSettings(saved);
      setAiSettingsMessage('AI provider settings saved on this device.');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to save AI settings');
    } finally {
      setIsSavingAiSettings(false);
    }
  };

  const handleGenerateFromRefinement = async () => {
    if (!aiRefinementPrompt.trim()) {
      setLoadError('Add a refinement prompt before sending it to AI.');
      return;
    }

    if (!selectedProject || !editorState) {
      return;
    }

    setIsGeneratingAi(true);
    setLoadError(null);
    setLatestAiResult(null);

    try {
      const result = await window.replibot.generateProjectWithAi(
        buildAiInputFromProject(selectedProject, editorState.source, aiRefinementPrompt.trim())
      );

      const savedProject = await window.replibot.updateProject({
        ...editorState,
        name: editorState.name.trim(),
        themeId: editorState.themeId,
        description: editorState.description.trim(),
        goal: editorState.goal.trim(),
        source: result.source,
        versionLabel: 'AI refinement',
        versionPrompt: aiRefinementPrompt.trim(),
        versionSummary: result.summary
      });

      syncProjectState(savedProject);
      setLatestAiResult(result);
      await refreshProjects();
      setSaveMessage('AI applied the refinement prompt and saved a new version.');
      setAiRefinementPrompt('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'AI refinement failed');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleUndoVersion = async () => {
    if (!selectedProject) {
      return;
    }

    try {
      const project = await window.replibot.undoProjectVersion(selectedProject.manifest.id);
      syncProjectState(project);
      await refreshProjects();
      setSaveMessage('Moved back to the previous saved version.');
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Undo failed');
    }
  };

  const handleRedoVersion = async () => {
    if (!selectedProject) {
      return;
    }

    try {
      const project = await window.replibot.redoProjectVersion(selectedProject.manifest.id);
      syncProjectState(project);
      await refreshProjects();
      setSaveMessage('Restored the next saved version.');
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Redo failed');
    }
  };

  const isLauncherScreen = screen === 'launcher';
  const isCreateScreen = screen === 'create';
  const isBuilderScreen = screen === 'builder';
  const isRunScreen = screen === 'run';

  const screenTitle = isLauncherScreen
    ? 'Your tools'
    : isCreateScreen
      ? 'New tool'
      : selectedProject?.manifest.name ?? 'Editor';

  return (
    <ErrorBoundary>
      <main className={`shell${isRunScreen ? ' shell-run' : ''}`}>
        {showSplash && (
          <SplashScreen
            appInfo={appInfo}
            workspaceInfo={workspaceInfo}
            projectCount={projects.length}
            onEnter={() => setShowSplash(false)}
          />
        )}

        {!isRunScreen && (
          <TopBar
            title={screenTitle}
            showHome={!isLauncherScreen}
            showNew={!isCreateScreen && !isLauncherScreen}
            showSettings={isLauncherScreen}
            onHome={handleBackToLauncher}
            onNew={handleOpenCreate}
            onSettings={() => setShowAiSettings(true)}
          />
        )}

        {isLauncherScreen && (
          <LauncherScreen
            projects={projects}
            onOpenProject={openProjectScreen}
            onDeleteProject={setPendingDeleteProject}
            onCreateNew={handleOpenCreate}
          />
        )}

        {isCreateScreen && (
          <CreateWizard
            projectInput={projectInput}
            createStep={createStep}
            isCreating={isCreating}
            creationProgress={creationProgress}
            creationStatus={creationStatus}
            loadError={loadError}
            onUpdateInput={setProjectInput}
            onStepChange={setCreateStep}
            onSubmit={handleCreateProject}
          />
        )}

        {loadError && <p className="error-banner global-banner">{loadError}</p>}
        {saveMessage && <p className="save-banner global-banner">{saveMessage}</p>}

        {isBuilderScreen && selectedProject && editorState && (
          <BuilderScreen
            selectedProject={selectedProject}
            editorState={editorState}
            aiRefinementPrompt={aiRefinementPrompt}
            latestAiResult={latestAiResult}
            isGeneratingAi={isGeneratingAi}
            isSaving={isSaving}
            isSavingAiSettings={isSavingAiSettings}
            aiSettings={aiSettings}
            aiSettingsMessage={aiSettingsMessage}
            capabilities={capabilities}
            loadError={loadError}
            saveMessage={saveMessage}
            onEditorStateChange={setEditorState}
            onRefinementPromptChange={setAiRefinementPrompt}
            onGenerate={handleGenerateFromRefinement}
            onUndo={handleUndoVersion}
            onRedo={handleRedoVersion}
            onSave={handleSaveProject}
            onAiSettingsChange={setAiSettings}
            onSaveAiSettings={handleSaveAiSettings}
            onOpenRunMode={() => void openProjectScreen(selectedProject.manifest.id, 'run')}
          />
        )}

        {isRunScreen && selectedProject && editorState && (
          <RunScreen
            project={selectedProject}
            editorState={editorState}
            onBack={handleBackToLauncher}
          />
        )}

        <ConfirmDialog
          project={pendingDeleteProject}
          isDeleting={isDeletingProject}
          onConfirm={() => void handleDeleteProject()}
          onCancel={() => setPendingDeleteProject(null)}
        />

        {showAiSettings && aiSettings && (
          <AiSettingsPanel
            aiSettings={aiSettings}
            isSavingAiSettings={isSavingAiSettings}
            aiSettingsMessage={aiSettingsMessage}
            onAiSettingsChange={setAiSettings}
            onSaveAiSettings={handleSaveAiSettings}
            onClose={() => setShowAiSettings(false)}
          />
        )}
      </main>
    </ErrorBoundary>
  );
}

export default App;
