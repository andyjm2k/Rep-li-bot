export interface ReplibotAppInfo {
  name: string;
  version: string;
  mode: 'development' | 'production';
  platform: string;
}

export interface HarnessCapabilities {
  storage: string[];
  ui: string[];
  network: string[];
  automation: string[];
}

export type ProjectKind = 'app' | 'widget';
export type ProjectTemplate = 'blank-app' | 'blank-widget';
export type ProjectThemeId = 'meadow' | 'terminal' | 'paper' | 'sunset';

export interface ReplibotApi {
  getAppInfo(): Promise<ReplibotAppInfo>;
  getHarnessCapabilities(): Promise<HarnessCapabilities>;
  getWorkspaceInfo(): Promise<WorkspaceInfo>;
  listProjects(): Promise<ProjectSummary[]>;
  createProject(input: CreateProjectInput): Promise<ProjectRecord>;
  getProject(projectId: string): Promise<ProjectRecord | null>;
  updateProject(input: UpdateProjectInput): Promise<ProjectRecord>;
  deleteProject(projectId: string): Promise<void>;
  undoProjectVersion(projectId: string): Promise<ProjectRecord>;
  redoProjectVersion(projectId: string): Promise<ProjectRecord>;
  getProjectRuntimeState(projectId: string): Promise<ProjectRuntimeState>;
  saveProjectRuntimeState(
    projectId: string,
    state: ProjectRuntimeState
  ): Promise<ProjectRuntimeState>;
  getAiSettings(): Promise<AiProviderSettings>;
  saveAiSettings(settings: AiProviderSettings): Promise<AiProviderSettings>;
  generateProjectWithAi(input: AiProjectAssistInput): Promise<AiProjectAssistResult>;
  runProjectAiRequest(input: ProjectAiRequest): Promise<ProjectAiResponse>;
}

export interface ProjectManifest {
  id: string;
  name: string;
  kind: ProjectKind;
  themeId: ProjectThemeId;
  description: string;
  permissions: string[];
  entrypoint: string;
  template: ProjectTemplate;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSpec {
  goal: string;
  audience: 'individual' | 'business';
  status: 'draft';
  problem: string;
  outcome: string;
  primaryAction: string;
  dataNotes: string;
}

export interface ProjectFileRecord {
  path: string;
  label: string;
  content: string;
}

export interface ProjectVersionRecord {
  id: string;
  label: string;
  prompt: string;
  summary: string;
  source: string;
  createdAt: string;
}

export interface ProjectVersionHistory {
  entries: ProjectVersionRecord[];
  currentIndex: number;
}

export interface ProjectRecord {
  manifest: ProjectManifest;
  spec: ProjectSpec;
  files: ProjectFileRecord[];
  versionHistory: ProjectVersionHistory;
}

export interface ProjectSummary {
  id: string;
  name: string;
  kind: ProjectKind;
  themeId: ProjectThemeId;
  description: string;
  template: ProjectTemplate;
  permissions: string[];
  updatedAt: string;
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  kind: ProjectKind;
  themeId: ProjectThemeId;
  description: string;
  template: ProjectTemplate;
  permissions: string[];
}

export interface UpdateProjectInput {
  projectId: string;
  name: string;
  themeId: ProjectThemeId;
  description: string;
  goal: string;
  audience: 'individual' | 'business';
  problem: string;
  outcome: string;
  primaryAction: string;
  dataNotes: string;
  permissions: string[];
  source: string;
  versionLabel?: string;
  versionPrompt?: string;
  versionSummary?: string;
  skipVersion?: boolean;
}

export interface WorkspaceInfo {
  rootPath: string;
  projectsPath: string;
}

export type ProjectRuntimeState = Record<string, unknown>;

export interface PreviewEventMessage {
  type:
    | 'REPLIBOT_READY'
    | 'REPLIBOT_NOTIFY'
    | 'REPLIBOT_LOG'
    | 'REPLIBOT_STORAGE_SYNC'
    | 'REPLIBOT_RUNTIME_ERROR'
    | 'REPLIBOT_AI_REQUEST'
    | 'REPLIBOT_AI_RESPONSE';
  level?: 'info' | 'warn' | 'error';
  message?: string;
  state?: ProjectRuntimeState;
  requestId?: string;
  prompt?: string;
  systemPrompt?: string;
  text?: string;
  error?: string;
}

export interface AiProviderSettings {
  provider: 'openai-compatible';
  authMode: 'api_key';
  providerLabel: string;
  apiFormat: 'responses' | 'chat_completions';
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AiProjectAssistInput {
  projectId: string;
  kind: ProjectKind;
  themeId: ProjectThemeId;
  name: string;
  description: string;
  permissions: string[];
  spec: ProjectSpec;
  currentSource: string;
  refinementPrompt?: string;
}

export interface ProjectAiRequest {
  projectId: string;
  prompt: string;
  systemPrompt?: string;
}

export interface ProjectAiResponse {
  text: string;
}

export interface AiGenerationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

export interface AiGenerationAttempt {
  label: string;
  notes: string;
  issues: AiGenerationIssue[];
}

export interface AiProjectAssistResult {
  source: string;
  notes: string;
  rawText: string;
  summary: string;
  userFlow: string[];
  storagePlan: string[];
  attempts: AiGenerationAttempt[];
  finalIssues: AiGenerationIssue[];
  acceptedOnAttempt: number;
}
