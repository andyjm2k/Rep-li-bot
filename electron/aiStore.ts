import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AiProviderSettings } from '../shared/types';
import { getWorkspaceInfo } from './projectStore';

const AI_SETTINGS_FILE = 'ai-settings.json';

const defaultAiSettings: AiProviderSettings = {
  provider: 'openai-compatible',
  authMode: 'api_key',
  providerLabel: 'OpenAI-compatible provider',
  apiFormat: 'chat_completions',
  apiKey: '',
  baseUrl: '',
  model: ''
};

async function readInstallerDefaults(): Promise<Partial<AiProviderSettings>> {
  const candidatePaths = [
    path.join(process.resourcesPath, 'config', 'installer.runtime.json'),
    path.join(process.resourcesPath, 'config', 'installer.generated.json'),
    path.join(process.resourcesPath, 'config', 'installer.defaults.json'),
    path.join(__dirname, '..', '..', 'config', 'installer.runtime.json'),
    path.join(__dirname, '..', '..', 'config', 'installer.generated.json'),
    path.join(__dirname, '..', '..', 'config', 'installer.defaults.json')
  ];

  for (const filePath of candidatePaths) {
    try {
      const raw = await readFile(filePath, 'utf8');
      return JSON.parse(raw) as Partial<AiProviderSettings>;
    } catch {
      continue;
    }
  }

  return {};
}

export async function getAiSettings(userDataPath: string): Promise<AiProviderSettings> {
  const workspace = getWorkspaceInfo(userDataPath);
  await mkdir(workspace.rootPath, { recursive: true });
  const installerDefaults = await readInstallerDefaults();

  try {
    const raw = await readFile(path.join(workspace.rootPath, AI_SETTINGS_FILE), 'utf8');
    return {
      ...defaultAiSettings,
      ...installerDefaults,
      ...(JSON.parse(raw) as Partial<AiProviderSettings>)
    };
  } catch {
    return { ...defaultAiSettings, ...installerDefaults };
  }
}

export async function saveAiSettings(
  userDataPath: string,
  settings: AiProviderSettings
): Promise<AiProviderSettings> {
  const workspace = getWorkspaceInfo(userDataPath);
  await mkdir(workspace.rootPath, { recursive: true });

  const nextSettings: AiProviderSettings = {
    provider: 'openai-compatible',
    authMode: 'api_key',
    providerLabel: settings.providerLabel.trim() || defaultAiSettings.providerLabel,
    apiFormat: settings.apiFormat,
    apiKey: settings.apiKey.trim(),
    baseUrl: settings.baseUrl.trim(),
    model: settings.model.trim()
  };

  await writeFile(
    path.join(workspace.rootPath, AI_SETTINGS_FILE),
    JSON.stringify(nextSettings, null, 2),
    'utf8'
  );

  return nextSettings;
}
