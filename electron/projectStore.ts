import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  CreateProjectInput,
  ProjectManifest,
  ProjectRecord,
  ProjectRuntimeState,
  ProjectSpec,
  ProjectSummary,
  ProjectVersionHistory,
  ProjectVersionRecord,
  UpdateProjectInput,
  WorkspaceInfo
} from '../shared/types';
import { defaultThemeId } from '../shared/themes';
import { generateProjectSource } from '../shared/builder';

const PROJECTS_DIR = 'projects';
const MANIFEST_FILE = 'manifest.json';
const SPEC_FILE = 'spec.json';
const STATE_FILE = 'runtime-state.json';
const VERSION_HISTORY_FILE = 'version-history.json';

function slugifyName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function buildProjectId(name: string): string {
  const slug = slugifyName(name) || 'project';
  return `${slug}-${randomUUID().slice(0, 8)}`;
}

export function getWorkspaceInfo(userDataPath: string): WorkspaceInfo {
  const rootPath = path.join(userDataPath, 'workspace');

  return {
    rootPath,
    projectsPath: path.join(rootPath, PROJECTS_DIR)
  };
}

async function ensureWorkspaceDirs(workspace: WorkspaceInfo): Promise<void> {
  await mkdir(workspace.projectsPath, { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}

async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

function createVersionEntry(input: {
  label: string;
  prompt: string;
  summary: string;
  source: string;
  createdAt?: string;
}): ProjectVersionRecord {
  return {
    id: randomUUID().slice(0, 8),
    label: input.label,
    prompt: input.prompt,
    summary: input.summary,
    source: input.source,
    createdAt: input.createdAt ?? new Date().toISOString()
  };
}

function buildVersionHistory(source: string, prompt = ''): ProjectVersionHistory {
  return {
    entries: [
      createVersionEntry({
        label: 'Initial draft',
        prompt,
        summary: 'Starter project created.',
        source
      })
    ],
    currentIndex: 0
  };
}

function normalizeVersionHistory(
  history: ProjectVersionHistory | null | undefined,
  source: string
): ProjectVersionHistory {
  if (!history || !Array.isArray(history.entries) || history.entries.length === 0) {
    return buildVersionHistory(source);
  }

  const entries = history.entries.map((entry) => ({
    ...entry,
    prompt: entry.prompt ?? '',
    summary: entry.summary ?? '',
    source: entry.source ?? source
  }));
  const currentIndex = Math.min(Math.max(history.currentIndex ?? entries.length - 1, 0), entries.length - 1);

  return {
    entries,
    currentIndex
  };
}

async function readVersionHistory(projectPath: string, source: string): Promise<ProjectVersionHistory> {
  try {
    const history = await readJsonFile<ProjectVersionHistory>(path.join(projectPath, VERSION_HISTORY_FILE));
    return normalizeVersionHistory(history, source);
  } catch {
    return buildVersionHistory(source);
  }
}

async function writeVersionHistory(projectPath: string, history: ProjectVersionHistory): Promise<void> {
  await writeFile(
    path.join(projectPath, VERSION_HISTORY_FILE),
    JSON.stringify(history, null, 2),
    'utf8'
  );
}

function buildProjectRecord(
  manifest: ProjectManifest,
  spec: ProjectSpec,
  source: string,
  versionHistory: ProjectVersionHistory
): ProjectRecord {
  return {
    manifest,
    spec,
    versionHistory,
    files: [
      {
        path: MANIFEST_FILE,
        label: 'Manifest',
        content: JSON.stringify(manifest, null, 2)
      },
      {
        path: SPEC_FILE,
        label: 'Builder spec',
        content: JSON.stringify(spec, null, 2)
      },
      { path: 'src/main.ts', label: 'Entrypoint', content: source }
    ]
  };
}

function toSummary(manifest: ProjectManifest): ProjectSummary {
  return {
    id: manifest.id,
    name: manifest.name,
    kind: manifest.kind,
    themeId: manifest.themeId,
    description: manifest.description,
    template: manifest.template,
    permissions: manifest.permissions,
    createdAt: manifest.createdAt,
    updatedAt: manifest.updatedAt
  };
}

function normalizeManifest(manifest: ProjectManifest): ProjectManifest {
  return {
    ...manifest,
    themeId: manifest.themeId ?? defaultThemeId
  };
}

export async function listProjects(userDataPath: string): Promise<ProjectSummary[]> {
  const workspace = getWorkspaceInfo(userDataPath);
  await ensureWorkspaceDirs(workspace);

  const entries = await readdir(workspace.projectsPath, { withFileTypes: true });
  const manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const manifestPath = path.join(workspace.projectsPath, entry.name, MANIFEST_FILE);
        return readJsonFile<ProjectManifest>(manifestPath);
      })
  );

  return manifests
    .map(normalizeManifest)
    .map(toSummary)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createProject(
  userDataPath: string,
  input: CreateProjectInput
): Promise<ProjectRecord> {
  const workspace = getWorkspaceInfo(userDataPath);
  await ensureWorkspaceDirs(workspace);

  const now = new Date().toISOString();
  const id = buildProjectId(input.name);
  const projectPath = path.join(workspace.projectsPath, id);
  const manifest: ProjectManifest = {
    id,
    name: input.name.trim(),
    kind: input.kind,
    themeId: input.themeId ?? defaultThemeId,
    description: input.description.trim(),
    permissions: input.permissions,
    entrypoint: 'src/main.ts',
    template: input.template,
    createdAt: now,
    updatedAt: now
  };
  const spec: ProjectSpec = {
    goal: input.description.trim() || `New ${input.kind} project`,
    audience: 'individual',
    status: 'draft',
    problem: '',
    outcome: '',
    primaryAction: '',
    dataNotes: ''
  };
  const source = generateProjectSource(manifest.name, manifest.kind, spec);
  const versionHistory = buildVersionHistory(source, input.description.trim());
  const record = buildProjectRecord(manifest, spec, source, versionHistory);

  await mkdir(path.join(projectPath, 'src'), { recursive: true });
  await writeFile(
    path.join(projectPath, MANIFEST_FILE),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  await writeFile(path.join(projectPath, SPEC_FILE), JSON.stringify(spec, null, 2), 'utf8');
  await writeFile(path.join(projectPath, 'src', 'main.ts'), source, 'utf8');
  await writeFile(path.join(projectPath, STATE_FILE), JSON.stringify({}, null, 2), 'utf8');
  await writeVersionHistory(projectPath, versionHistory);

  return record;
}

export async function getProject(
  userDataPath: string,
  projectId: string
): Promise<ProjectRecord | null> {
  const workspace = getWorkspaceInfo(userDataPath);
  await ensureWorkspaceDirs(workspace);

  const projectPath = path.join(workspace.projectsPath, projectId);

  try {
    const [rawManifest, spec, source] = await Promise.all([
      readJsonFile<ProjectManifest>(path.join(projectPath, MANIFEST_FILE)),
      readJsonFile<ProjectSpec>(path.join(projectPath, SPEC_FILE)),
      readTextFile(path.join(projectPath, 'src', 'main.ts'))
    ]);
    const manifest = normalizeManifest(rawManifest);
    const versionHistory = await readVersionHistory(projectPath, source);

    return buildProjectRecord(manifest, spec, source, versionHistory);
  } catch {
    return null;
  }
}

export async function updateProject(
  userDataPath: string,
  input: UpdateProjectInput
): Promise<ProjectRecord> {
  const existing = await getProject(userDataPath, input.projectId);

  if (!existing) {
    throw new Error('Project not found');
  }

  const workspace = getWorkspaceInfo(userDataPath);
  const projectPath = path.join(workspace.projectsPath, input.projectId);
  const now = new Date().toISOString();
  const manifest: ProjectManifest = {
    ...normalizeManifest(existing.manifest),
    name: input.name.trim(),
    themeId: input.themeId,
    description: input.description.trim(),
    permissions: input.permissions,
    updatedAt: now
  };
  const spec: ProjectSpec = {
    ...existing.spec,
    goal: input.goal.trim() || existing.spec.goal,
    audience: input.audience,
    problem: input.problem.trim(),
    outcome: input.outcome.trim(),
    primaryAction: input.primaryAction.trim(),
    dataNotes: input.dataNotes.trim()
  };
  const source = input.source;
  const sourceChanged = source !== existing.files.find((file) => file.path === 'src/main.ts')?.content;
  let versionHistory = normalizeVersionHistory(existing.versionHistory, source);

  if (!input.skipVersion && sourceChanged) {
    const nextEntry = createVersionEntry({
      label: input.versionLabel?.trim() || 'Saved version',
      prompt: input.versionPrompt?.trim() || '',
      summary: input.versionSummary?.trim() || 'Updated project source.',
      source,
      createdAt: now
    });

    versionHistory = {
      entries: [...versionHistory.entries.slice(0, versionHistory.currentIndex + 1), nextEntry],
      currentIndex: versionHistory.currentIndex + 1
    };
  }

  await writeFile(
    path.join(projectPath, MANIFEST_FILE),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  await writeFile(path.join(projectPath, SPEC_FILE), JSON.stringify(spec, null, 2), 'utf8');
  await writeFile(path.join(projectPath, 'src', 'main.ts'), source, 'utf8');
  await writeVersionHistory(projectPath, versionHistory);

  return buildProjectRecord(manifest, spec, source, versionHistory);
}

export async function deleteProject(userDataPath: string, projectId: string): Promise<void> {
  const workspace = getWorkspaceInfo(userDataPath);
  await ensureWorkspaceDirs(workspace);

  const projectPath = path.join(workspace.projectsPath, projectId);
  await rm(projectPath, { recursive: true, force: true });
}

async function restoreProjectVersion(
  userDataPath: string,
  projectId: string,
  direction: -1 | 1
): Promise<ProjectRecord> {
  const existing = await getProject(userDataPath, projectId);

  if (!existing) {
    throw new Error('Project not found');
  }

  const workspace = getWorkspaceInfo(userDataPath);
  const projectPath = path.join(workspace.projectsPath, projectId);
  const nextIndex = existing.versionHistory.currentIndex + direction;

  if (nextIndex < 0 || nextIndex >= existing.versionHistory.entries.length) {
    throw new Error(direction < 0 ? 'No earlier version available.' : 'No later version available.');
  }

  const nextHistory: ProjectVersionHistory = {
    ...existing.versionHistory,
    currentIndex: nextIndex
  };
  const source = nextHistory.entries[nextIndex].source;
  const manifest: ProjectManifest = {
    ...existing.manifest,
    updatedAt: new Date().toISOString()
  };

  await writeFile(
    path.join(projectPath, MANIFEST_FILE),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  await writeFile(path.join(projectPath, 'src', 'main.ts'), source, 'utf8');
  await writeVersionHistory(projectPath, nextHistory);

  return buildProjectRecord(manifest, existing.spec, source, nextHistory);
}

export async function undoProjectVersion(
  userDataPath: string,
  projectId: string
): Promise<ProjectRecord> {
  return restoreProjectVersion(userDataPath, projectId, -1);
}

export async function redoProjectVersion(
  userDataPath: string,
  projectId: string
): Promise<ProjectRecord> {
  return restoreProjectVersion(userDataPath, projectId, 1);
}

export async function getProjectRuntimeState(
  userDataPath: string,
  projectId: string
): Promise<ProjectRuntimeState> {
  const workspace = getWorkspaceInfo(userDataPath);
  await ensureWorkspaceDirs(workspace);

  try {
    return await readJsonFile<ProjectRuntimeState>(
      path.join(workspace.projectsPath, projectId, STATE_FILE)
    );
  } catch {
    return {};
  }
}

export async function saveProjectRuntimeState(
  userDataPath: string,
  projectId: string,
  state: ProjectRuntimeState
): Promise<ProjectRuntimeState> {
  const workspace = getWorkspaceInfo(userDataPath);
  await ensureWorkspaceDirs(workspace);

  const projectPath = path.join(workspace.projectsPath, projectId);
  await mkdir(projectPath, { recursive: true });
  await writeFile(path.join(projectPath, STATE_FILE), JSON.stringify(state, null, 2), 'utf8');
  return state;
}
