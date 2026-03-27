import path from 'node:path';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
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
  ReplibotAppInfo,
  UpdateProjectInput,
  WorkspaceInfo
} from '../shared/types';
import {
  createProject,
  deleteProject,
  getProject,
  getProjectRuntimeState,
  getWorkspaceInfo,
  listProjects,
  redoProjectVersion,
  saveProjectRuntimeState,
  undoProjectVersion,
  updateProject
} from './projectStore';
import { getAiSettings, saveAiSettings } from './aiStore';
import { generateProjectWithOpenAI, runProjectAiRequestWithOpenAI } from './openaiService';

const isDev = !app.isPackaged;

const harnessCapabilities: HarnessCapabilities = {
  storage: ['project.read', 'project.write', 'asset.read', 'asset.write'],
  ui: ['dialog.open', 'window.widget'],
  network: ['ai.provider'],
  automation: []
};

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#0c1014',
    title: 'Replibot',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    void window.loadURL('http://127.0.0.1:5173');
  } else {
    void window.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }

  return window;
}

ipcMain.handle('app:get-info', (): ReplibotAppInfo => {
  return {
    name: 'Replibot',
    version: app.getVersion(),
    mode: isDev ? 'development' : 'production',
    platform: process.platform
  };
});

ipcMain.handle('harness:get-capabilities', (): HarnessCapabilities => {
  return harnessCapabilities;
});

ipcMain.handle('workspace:get-info', (): WorkspaceInfo => {
  return getWorkspaceInfo(app.getPath('userData'));
});

ipcMain.handle('projects:list', async (): Promise<ProjectSummary[]> => {
  return listProjects(app.getPath('userData'));
});

ipcMain.handle(
  'projects:create',
  async (_event, input: CreateProjectInput): Promise<ProjectRecord> => {
    return createProject(app.getPath('userData'), input);
  }
);

ipcMain.handle(
  'projects:get',
  async (_event, projectId: string): Promise<ProjectRecord | null> => {
    return getProject(app.getPath('userData'), projectId);
  }
);

ipcMain.handle(
  'projects:update',
  async (_event, input: UpdateProjectInput): Promise<ProjectRecord> => {
    return updateProject(app.getPath('userData'), input);
  }
);

ipcMain.handle('projects:delete', async (_event, projectId: string): Promise<void> => {
  return deleteProject(app.getPath('userData'), projectId);
});

ipcMain.handle(
  'projects:undo-version',
  async (_event, projectId: string): Promise<ProjectRecord> => {
    return undoProjectVersion(app.getPath('userData'), projectId);
  }
);

ipcMain.handle(
  'projects:redo-version',
  async (_event, projectId: string): Promise<ProjectRecord> => {
    return redoProjectVersion(app.getPath('userData'), projectId);
  }
);

ipcMain.handle(
  'projects:runtime-state:get',
  async (_event, projectId: string): Promise<ProjectRuntimeState> => {
    return getProjectRuntimeState(app.getPath('userData'), projectId);
  }
);

ipcMain.handle(
  'projects:runtime-state:save',
  async (
    _event,
    projectId: string,
    state: ProjectRuntimeState
  ): Promise<ProjectRuntimeState> => {
    return saveProjectRuntimeState(app.getPath('userData'), projectId, state);
  }
);

ipcMain.handle('ai:settings:get', async (): Promise<AiProviderSettings> => {
  return getAiSettings(app.getPath('userData'));
});

ipcMain.handle(
  'ai:settings:save',
  async (_event, settings: AiProviderSettings): Promise<AiProviderSettings> => {
    return saveAiSettings(app.getPath('userData'), settings);
  }
);

ipcMain.handle(
  'ai:project:generate',
  async (_event, input: AiProjectAssistInput): Promise<AiProjectAssistResult> => {
    const settings = await getAiSettings(app.getPath('userData'));
    console.log(`[Replibot] [${new Date().toISOString()}] AI generation request for project: ${input.name}`);
    console.log(`[Replibot] Settings - baseUrl: ${settings.baseUrl}, model: ${settings.model}, apiFormat: ${settings.apiFormat}, apiKey set: ${!!settings.apiKey}`);
    try {
      const result = await generateProjectWithOpenAI(settings, input);
      console.log(`[Replibot] [${new Date().toISOString()}] AI generation completed successfully, source length: ${result.source.length}`);
      return result;
    } catch (err) {
      console.error(`[Replibot] [${new Date().toISOString()}] AI generation failed:`, err instanceof Error ? err.message : String(err));
      throw err;
    }
  }
);

ipcMain.handle(
  'ai:project:run',
  async (_event, input: ProjectAiRequest): Promise<ProjectAiResponse> => {
    const settings = await getAiSettings(app.getPath('userData'));
    return runProjectAiRequestWithOpenAI(settings, input);
  }
);

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
