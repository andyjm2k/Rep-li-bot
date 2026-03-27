import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const templatePath = path.join(root, 'config', 'installer.defaults.json');
const outputPath = path.join(root, 'config', 'installer.generated.json');

const template = JSON.parse(await fs.readFile(templatePath, 'utf8'));

const generated = {
  ...template,
  provider: 'openai-compatible',
  authMode: 'api_key',
  providerLabel: process.env.REPLIBOT_AI_PROVIDER_LABEL || template.providerLabel,
  apiFormat: process.env.REPLIBOT_AI_FORMAT || template.apiFormat,
  apiKey: process.env.REPLIBOT_AI_API_KEY || template.apiKey,
  baseUrl: process.env.REPLIBOT_AI_BASE_URL || template.baseUrl,
  model: process.env.REPLIBOT_AI_MODEL || template.model
};

await fs.writeFile(outputPath, JSON.stringify(generated, null, 2), 'utf8');
