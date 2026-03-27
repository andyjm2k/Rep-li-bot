import { contextBridge, ipcRenderer } from 'electron';
import type {
  AiProjectAssistInput,
  AiProjectAssistResult,
  AiProviderSettings,
  CreateProjectInput,
  HarnessCapabilities,
  ProjectAiRequest,
  ProjectAiResponse,
  ProjectRecord,
  ProjectRuntimeState,
  ProjectSummary,
  ReplibotApi,
  ReplibotAppInfo,
  UpdateProjectInput,
  WorkspaceInfo
} from '../shared/types';

const api: ReplibotApi = {
  getAppInfo: () => ipcRenderer.invoke('app:get-info') as Promise<ReplibotAppInfo>,
  getHarnessCapabilities: () =>
    ipcRenderer.invoke('harness:get-capabilities') as Promise<HarnessCapabilities>,
  getWorkspaceInfo: () =>
    ipcRenderer.invoke('workspace:get-info') as Promise<WorkspaceInfo>,
  listProjects: () => ipcRenderer.invoke('projects:list') as Promise<ProjectSummary[]>,
  createProject: (input: CreateProjectInput) =>
    ipcRenderer.invoke('projects:create', input) as Promise<ProjectRecord>,
  getProject: (projectId: string) =>
    ipcRenderer.invoke('projects:get', projectId) as Promise<ProjectRecord | null>,
  updateProject: (input: UpdateProjectInput) =>
    ipcRenderer.invoke('projects:update', input) as Promise<ProjectRecord>,
  deleteProject: (projectId: string) =>
    ipcRenderer.invoke('projects:delete', projectId) as Promise<void>,
  undoProjectVersion: (projectId: string) =>
    ipcRenderer.invoke('projects:undo-version', projectId) as Promise<ProjectRecord>,
  redoProjectVersion: (projectId: string) =>
    ipcRenderer.invoke('projects:redo-version', projectId) as Promise<ProjectRecord>,
  getProjectRuntimeState: (projectId: string) =>
    ipcRenderer.invoke('projects:runtime-state:get', projectId) as Promise<ProjectRuntimeState>,
  saveProjectRuntimeState: (projectId: string, state: ProjectRuntimeState) =>
    ipcRenderer.invoke('projects:runtime-state:save', projectId, state) as Promise<ProjectRuntimeState>,
  getAiSettings: () =>
    ipcRenderer.invoke('ai:settings:get') as Promise<AiProviderSettings>,
  saveAiSettings: (settings: AiProviderSettings) =>
    ipcRenderer.invoke('ai:settings:save', settings) as Promise<AiProviderSettings>,
  generateProjectWithAi: (input: AiProjectAssistInput) =>
    ipcRenderer.invoke('ai:project:generate', input) as Promise<AiProjectAssistResult>,
  runProjectAiRequest: (input: ProjectAiRequest) =>
    ipcRenderer.invoke('ai:project:run', input) as Promise<ProjectAiResponse>
};

contextBridge.exposeInMainWorld('replibot', api);
