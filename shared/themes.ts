import type { ProjectThemeId } from './types';

export interface ProjectThemeDefinition {
  id: ProjectThemeId;
  label: string;
  description: string;
  mood: string;
  preview: [string, string, string];
  colorScheme: 'light' | 'dark';
  palette: {
    background: string;
    panel: string;
    panelMuted: string;
    text: string;
    textMuted: string;
    accent: string;
    accentStrong: string;
    accentSoft: string;
    border: string;
    input: string;
    shadow: string;
    error: string;
    errorBg: string;
    success: string;
    successBg: string;
    warning: string;
    warningBg: string;
  };
}

export const defaultThemeId: ProjectThemeId = 'meadow';

export const projectThemes: ProjectThemeDefinition[] = [
  {
    id: 'meadow',
    label: 'Meadow',
    description: 'Soft glass panels and calm green-blue accents for general desktop tools.',
    mood: 'calm',
    colorScheme: 'light',
    preview: ['#f5f3eb', '#7ac8ab', '#7eaec8'],
    palette: {
      background: '#f5f3eb',
      panel: 'rgba(255, 255, 255, 0.9)',
      panelMuted: '#eef5f0',
      text: '#203039',
      textMuted: '#5a6d76',
      accent: '#7ac8ab',
      accentStrong: '#3e7f68',
      accentSoft: 'rgba(122, 200, 171, 0.18)',
      border: '#d8e3db',
      input: '#fcfdfb',
      shadow: 'rgba(96, 119, 109, 0.16)',
      error: '#c44b3f',
      errorBg: 'rgba(196, 75, 63, 0.1)',
      success: '#3e7f68',
      successBg: 'rgba(62, 127, 104, 0.1)',
      warning: '#9a6428',
      warningBg: 'rgba(154, 100, 40, 0.1)'
    }
  },
  {
    id: 'terminal',
    label: 'Terminal',
    description: 'Dark console-inspired surfaces with high-contrast mint accents.',
    mood: 'focused',
    colorScheme: 'dark',
    preview: ['#11161a', '#1f2a21', '#7ef0b8'],
    palette: {
      background: '#11161a',
      panel: 'rgba(20, 28, 24, 0.92)',
      panelMuted: '#18211c',
      text: '#e9f4ed',
      textMuted: '#93afa1',
      accent: '#7ef0b8',
      accentStrong: '#35d489',
      accentSoft: 'rgba(126, 240, 184, 0.15)',
      border: '#254033',
      input: '#121a16',
      shadow: 'rgba(0, 0, 0, 0.4)',
      error: '#ff6b5b',
      errorBg: 'rgba(255, 107, 91, 0.12)',
      success: '#7ef0b8',
      successBg: 'rgba(126, 240, 184, 0.1)',
      warning: '#ffb86b',
      warningBg: 'rgba(255, 184, 107, 0.1)'
    }
  },
  {
    id: 'paper',
    label: 'Paper',
    description: 'Editorial cards with warm neutrals for note-heavy or document-like tools.',
    mood: 'quiet',
    colorScheme: 'light',
    preview: ['#f7f1e7', '#e8dcc7', '#8e6847'],
    palette: {
      background: '#f7f1e7',
      panel: 'rgba(255, 250, 244, 0.94)',
      panelMuted: '#efe4d3',
      text: '#382b20',
      textMuted: '#7a6451',
      accent: '#b48b61',
      accentStrong: '#5a422e',
      accentSoft: 'rgba(180, 139, 97, 0.15)',
      border: '#e1d3bf',
      input: '#fffdf8',
      shadow: 'rgba(120, 92, 63, 0.16)',
      error: '#b54a32',
      errorBg: 'rgba(181, 74, 50, 0.1)',
      success: '#5a422e',
      successBg: 'rgba(90, 66, 46, 0.08)',
      warning: '#8a5a28',
      warningBg: 'rgba(138, 90, 40, 0.1)'
    }
  },
  {
    id: 'sunset',
    label: 'Sunset',
    description: 'Punchier coral and plum accents for tools that should feel more lively.',
    mood: 'bold',
    colorScheme: 'light',
    preview: ['#fff1eb', '#ff8e72', '#7a536d'],
    palette: {
      background: '#fff1eb',
      panel: 'rgba(255, 250, 247, 0.93)',
      panelMuted: '#ffe2d7',
      text: '#332532',
      textMuted: '#745b69',
      accent: '#ff8e72',
      accentStrong: '#7a3755',
      accentSoft: 'rgba(255, 142, 114, 0.18)',
      border: '#f2cfc6',
      input: '#fffdfb',
      shadow: 'rgba(147, 89, 85, 0.18)',
      error: '#c43d4a',
      errorBg: 'rgba(196, 61, 74, 0.1)',
      success: '#7a3755',
      successBg: 'rgba(122, 55, 85, 0.08)',
      warning: '#c46b28',
      warningBg: 'rgba(196, 107, 40, 0.1)'
    }
  }
];

export function getProjectTheme(themeId?: ProjectThemeId | string): ProjectThemeDefinition {
  return projectThemes.find((theme) => theme.id === themeId) ?? projectThemes[0];
}

export function buildProjectThemeCss(themeId?: ProjectThemeId | string): string {
  const theme = getProjectTheme(themeId);
  const { palette, colorScheme } = theme;

  return `
    :root {
      color-scheme: ${colorScheme};
      font-family: "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, sans-serif;
      font-size: 16px;
      --rb-bg: ${palette.background};
      --rb-panel: ${palette.panel};
      --rb-panel-muted: ${palette.panelMuted};
      --rb-text: ${palette.text};
      --rb-text-muted: ${palette.textMuted};
      --rb-accent: ${palette.accent};
      --rb-accent-strong: ${palette.accentStrong};
      --rb-accent-soft: ${palette.accentSoft};
      --rb-border: ${palette.border};
      --rb-input: ${palette.input};
      --rb-shadow: ${palette.shadow};
      --rb-error: ${palette.error};
      --rb-error-bg: ${palette.errorBg};
      --rb-success: ${palette.success};
      --rb-success-bg: ${palette.successBg};
      --rb-warning: ${palette.warning};
      --rb-warning-bg: ${palette.warningBg};
      /* Typography scale */
      --rb-text-xs: 0.72rem;
      --rb-text-sm: 0.875rem;
      --rb-text-base: 1rem;
      --rb-text-lg: 1.125rem;
      --rb-text-xl: 1.25rem;
      --rb-text-2xl: 1.5rem;
      --rb-text-3xl: 1.875rem;
      --rb-text-4xl: 2.25rem;
      /* Spacing scale */
      --rb-space-1: 4px;
      --rb-space-2: 8px;
      --rb-space-3: 12px;
      --rb-space-4: 16px;
      --rb-space-5: 20px;
      --rb-space-6: 24px;
      --rb-space-8: 32px;
      --rb-space-10: 40px;
      --rb-space-12: 48px;
      /* Radii */
      --rb-radius-sm: 8px;
      --rb-radius-md: 14px;
      --rb-radius-lg: 18px;
      --rb-radius-xl: 24px;
      --rb-radius-full: 9999px;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      background:
        radial-gradient(circle at top left, color-mix(in srgb, var(--rb-accent) 22%, transparent), transparent 40%),
        linear-gradient(180deg, var(--rb-bg) 0%, color-mix(in srgb, var(--rb-panel-muted) 55%, white) 100%);
      background-attachment: fixed;
      color: var(--rb-text);
      font-family: inherit;
      font-size: var(--rb-text-base);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    #app {
      min-height: 100vh;
      padding: var(--rb-space-5);
      color: var(--rb-text);
    }
    #app .app-shell,
    #app .rb-shell {
      max-width: 820px;
      margin: 0 auto;
      display: grid;
      gap: var(--rb-space-4);
      padding: var(--rb-space-6);
      border-radius: var(--rb-radius-xl);
      border: 1px solid var(--rb-border);
      background: var(--rb-panel);
      box-shadow: 0 20px 48px var(--rb-shadow);
    }
    /* Typography */
    #app h1 { font-size: var(--rb-text-3xl); font-weight: 700; line-height: 1.2; margin: 0 0 var(--rb-space-3); letter-spacing: -0.02em; }
    #app h2 { font-size: var(--rb-text-2xl); font-weight: 700; line-height: 1.25; margin: 0 0 var(--rb-space-3); letter-spacing: -0.015em; }
    #app h3 { font-size: var(--rb-text-xl); font-weight: 600; line-height: 1.3; margin: 0 0 var(--rb-space-2); }
    #app h4 { font-size: var(--rb-text-lg); font-weight: 600; margin: 0 0 var(--rb-space-2); }
    #app p { margin: 0 0 var(--rb-space-3); }
    #app small { font-size: var(--rb-text-sm); color: var(--rb-text-muted); }
    #app strong { font-weight: 600; }
    #app a { color: var(--rb-accent-strong); text-decoration: underline; text-underline-offset: 2px; }
    #app a:hover { color: var(--rb-accent); }
    /* Lists */
    #app ul, #app ol { margin: 0 0 var(--rb-space-3); padding-left: var(--rb-space-6); }
    #app li { margin-bottom: var(--rb-space-2); color: var(--rb-text-muted); }
    /* Surface / Card */
    #app .rb-surface,
    #app .builder-panel,
    #app .rb-section,
    #app .rb-card,
    #app dl {
      padding: var(--rb-space-4);
      border-radius: var(--rb-radius-lg);
      border: 1px solid var(--rb-border);
      background: var(--rb-panel-muted);
    }
    /* Stack / Grid */
    #app .rb-stack {
      display: grid;
      gap: var(--rb-space-3);
    }
    #app .rb-stack-2 { grid-template-columns: repeat(2, 1fr); }
    #app .rb-stack-3 { grid-template-columns: repeat(3, 1fr); }
    #app .rb-stack-4 { grid-template-columns: repeat(4, 1fr); }
    @media (max-width: 600px) {
      #app .rb-stack-2,
      #app .rb-stack-3,
      #app .rb-stack-4 { grid-template-columns: 1fr; }
    }
    /* Inline / Flex row */
    #app .rb-inline {
      display: flex;
      gap: var(--rb-space-3);
      flex-wrap: wrap;
      align-items: center;
    }
    #app .rb-inline-stretch { justify-content: stretch; }
    #app .rb-gap-sm { gap: var(--rb-space-2); }
    #app .rb-gap-lg { gap: var(--rb-space-5); }
    /* Buttons */
    #app button,
    #app .rb-btn {
      font: inherit;
      font-size: var(--rb-text-sm);
      font-weight: 600;
      border: none;
      border-radius: var(--rb-radius-full);
      padding: 10px var(--rb-space-4);
      background: linear-gradient(135deg, var(--rb-accent), color-mix(in srgb, var(--rb-accent) 50%, white));
      color: var(--rb-accent-strong);
      cursor: pointer;
      transition: transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
      box-shadow: 0 2px 8px var(--rb-shadow);
    }
    #app button:hover:not(:disabled),
    #app .rb-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px var(--rb-shadow);
    }
    #app button:active:not(:disabled),
    #app .rb-btn:active:not(:disabled) {
      transform: translateY(0);
    }
    #app button:focus-visible,
    #app .rb-btn:focus-visible {
      outline: 2px solid var(--rb-accent);
      outline-offset: 2px;
    }
    #app button:disabled,
    #app .rb-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
    }
    /* Secondary button variant */
    #app .rb-btn-secondary,
    #app button.rb-btn-secondary {
      background: var(--rb-panel-muted);
      color: var(--rb-text);
      border: 1px solid var(--rb-border);
      box-shadow: none;
    }
    #app .rb-btn-secondary:hover:not(:disabled) {
      background: var(--rb-border);
      box-shadow: none;
    }
    /* Ghost button variant */
    #app .rb-btn-ghost,
    #app button.rb-btn-ghost {
      background: transparent;
      color: var(--rb-text-muted);
      border: none;
      box-shadow: none;
    }
    #app .rb-btn-ghost:hover:not(:disabled) {
      background: var(--rb-accent-soft);
      color: var(--rb-accent-strong);
      box-shadow: none;
    }
    /* Danger button variant */
    #app .rb-btn-danger,
    #app button.rb-btn-danger {
      background: var(--rb-error-bg);
      color: var(--rb-error);
      border: 1px solid color-mix(in srgb, var(--rb-error) 30%, transparent);
      box-shadow: none;
    }
    #app .rb-btn-danger:hover:not(:disabled) {
      background: var(--rb-error);
      color: white;
      box-shadow: none;
    }
    /* Form controls */
    #app input,
    #app textarea,
    #app select,
    #app .rb-input {
      width: 100%;
      border: 1px solid var(--rb-border);
      border-radius: var(--rb-radius-md);
      padding: 11px var(--rb-space-3);
      background: var(--rb-input);
      color: var(--rb-text);
      font: inherit;
      font-size: var(--rb-text-base);
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }
    #app input::placeholder,
    #app textarea::placeholder {
      color: var(--rb-text-muted);
      opacity: 0.7;
    }
    #app input:hover,
    #app textarea:hover,
    #app select:hover {
      border-color: var(--rb-accent);
    }
    #app input:focus,
    #app textarea:focus,
    #app select:focus {
      outline: none;
      border-color: var(--rb-accent);
      box-shadow: 0 0 0 3px var(--rb-accent-soft);
    }
    #app input:focus-visible,
    #app textarea:focus-visible,
    #app select:focus-visible {
      outline: none;
    }
    #app textarea {
      resize: vertical;
      min-height: 80px;
    }
    /* Error state */
    #app input.rb-input-error,
    #app input[aria-invalid="true"],
    #app textarea.rb-input-error,
    #app textarea[aria-invalid="true"] {
      border-color: var(--rb-error);
      background: var(--rb-error-bg);
    }
    #app input.rb-input-error:focus,
    #app input[aria-invalid="true"]:focus {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--rb-error) 20%, transparent);
    }
    /* Success state */
    #app input.rb-input-success,
    #app input[aria-valid="true"],
    #app textarea.rb-input-success,
    #app textarea[aria-valid="true"] {
      border-color: var(--rb-success);
    }
    /* Labels */
    #app label,
    #app .rb-label {
      display: block;
      font-size: var(--rb-text-sm);
      font-weight: 600;
      color: var(--rb-text);
      margin-bottom: var(--rb-space-2);
    }
    /* Badge */
    #app .rb-badge,
    #app [class*="badge"] {
      display: inline-flex;
      align-items: center;
      gap: var(--rb-space-1);
      font-size: var(--rb-text-xs);
      font-weight: 600;
      padding: 3px 10px;
      border-radius: var(--rb-radius-full);
      background: var(--rb-accent-soft);
      color: var(--rb-accent-strong);
      border: 1px solid color-mix(in srgb, var(--rb-accent) 25%, transparent);
      white-space: nowrap;
    }
    #app .rb-badge-success {
      background: var(--rb-success-bg);
      color: var(--rb-success);
      border-color: color-mix(in srgb, var(--rb-success) 25%, transparent);
    }
    #app .rb-badge-warning {
      background: var(--rb-warning-bg);
      color: var(--rb-warning);
      border-color: color-mix(in srgb, var(--rb-warning) 25%, transparent);
    }
    #app .rb-badge-error,
    #app .rb-badge-danger {
      background: var(--rb-error-bg);
      color: var(--rb-error);
      border-color: color-mix(in srgb, var(--rb-error) 25%, transparent);
    }
    #app .rb-badge-muted {
      background: color-mix(in srgb, var(--rb-text-muted) 10%, transparent);
      color: var(--rb-text-muted);
      border-color: color-mix(in srgb, var(--rb-text-muted) 20%, transparent);
    }
    /* Alert */
    #app .rb-alert {
      display: flex;
      align-items: flex-start;
      gap: var(--rb-space-3);
      padding: var(--rb-space-3) var(--rb-space-4);
      border-radius: var(--rb-radius-md);
      border: 1px solid;
      font-size: var(--rb-text-sm);
    }
    #app .rb-alert-error {
      background: var(--rb-error-bg);
      border-color: color-mix(in srgb, var(--rb-error) 30%, transparent);
      color: var(--rb-error);
    }
    #app .rb-alert-success {
      background: var(--rb-success-bg);
      border-color: color-mix(in srgb, var(--rb-success) 30%, transparent);
      color: var(--rb-success);
    }
    #app .rb-alert-warning {
      background: var(--rb-warning-bg);
      border-color: color-mix(in srgb, var(--rb-warning) 30%, transparent);
      color: var(--rb-warning);
    }
    #app .rb-alert-info {
      background: var(--rb-accent-soft);
      border-color: color-mix(in srgb, var(--rb-accent) 30%, transparent);
      color: var(--rb-accent-strong);
    }
    #app .rb-alert-icon {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
    }
    #app .rb-alert-message { flex: 1; }
    #app .rb-alert-title {
      font-weight: 600;
      margin-bottom: 2px;
    }
    /* Avatar */
    #app .rb-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--rb-accent), color-mix(in srgb, var(--rb-accent) 50%, white));
      color: var(--rb-accent-strong);
      font-size: var(--rb-text-sm);
      font-weight: 700;
      flex-shrink: 0;
    }
    #app .rb-avatar-sm { width: 28px; height: 28px; font-size: var(--rb-text-xs); }
    #app .rb-avatar-lg { width: 48px; height: 48px; font-size: var(--rb-text-lg); }
    #app .rb-avatar-xl { width: 64px; height: 64px; font-size: var(--rb-text-xl); }
    /* Divider */
    #app .rb-divider {
      border: none;
      border-top: 1px solid var(--rb-border);
      margin: var(--rb-space-4) 0;
    }
    /* Progress bar */
    #app .rb-progress {
      width: 100%;
      height: 8px;
      border-radius: var(--rb-radius-full);
      background: var(--rb-panel-muted);
      border: 1px solid var(--rb-border);
      overflow: hidden;
    }
    #app .rb-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--rb-accent), color-mix(in srgb, var(--rb-accent) 70%, var(--rb-accent-strong)));
      border-radius: var(--rb-radius-full);
      transition: width 300ms ease;
    }
    /* Spinner */
    #app .rb-spinner {
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2px solid var(--rb-accent-soft);
      border-top-color: var(--rb-accent);
      border-radius: 50%;
      animation: rb-spin 600ms linear infinite;
    }
    @keyframes rb-spin {
      to { transform: rotate(360deg); }
    }
    /* Tabs */
    #app .rb-tabs {
      display: flex;
      gap: var(--rb-space-1);
      border-bottom: 2px solid var(--rb-border);
      padding-bottom: 0;
    }
    #app .rb-tab {
      padding: var(--rb-space-2) var(--rb-space-4);
      border: none;
      border-radius: var(--rb-radius-md) var(--rb-radius-md) 0 0;
      background: transparent;
      color: var(--rb-text-muted);
      font: inherit;
      font-size: var(--rb-text-sm);
      font-weight: 500;
      cursor: pointer;
      position: relative;
      transition: color 150ms ease, background 150ms ease;
      margin-bottom: -2px;
    }
    #app .rb-tab:hover {
      color: var(--rb-text);
      background: var(--rb-accent-soft);
    }
    #app .rb-tab.rb-tab-active {
      color: var(--rb-accent-strong);
      font-weight: 600;
    }
    #app .rb-tab.rb-tab-active::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--rb-accent);
      border-radius: 2px 2px 0 0;
    }
    #app .rb-tab:focus-visible {
      outline: 2px solid var(--rb-accent);
      outline-offset: -2px;
    }
    /* Tooltip */
    #app [data-rb-tooltip] {
      position: relative;
      cursor: help;
    }
    #app [data-rb-tooltip]::after {
      content: attr(data-rb-tooltip);
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      padding: 5px 10px;
      background: var(--rb-text);
      color: var(--rb-bg);
      font-size: var(--rb-text-xs);
      font-weight: 500;
      border-radius: var(--rb-radius-sm);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 150ms ease;
      z-index: 100;
    }
    #app [data-rb-tooltip]:hover::after {
      opacity: 1;
    }
    /* Empty state */
    #app .rb-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--rb-space-10) var(--rb-space-6);
      text-align: center;
      color: var(--rb-text-muted);
    }
    #app .rb-empty-icon {
      width: 48px;
      height: 48px;
      margin-bottom: var(--rb-space-4);
      opacity: 0.4;
    }
    #app .rb-empty-title {
      font-size: var(--rb-text-lg);
      font-weight: 600;
      color: var(--rb-text);
      margin-bottom: var(--rb-space-2);
    }
    /* Utility classes */
    #app .rb-mt-0 { margin-top: 0; }
    #app .rb-mt-2 { margin-top: var(--rb-space-2); }
    #app .rb-mt-4 { margin-top: var(--rb-space-4); }
    #app .rb-mt-6 { margin-top: var(--rb-space-6); }
    #app .rb-mb-0 { margin-bottom: 0; }
    #app .rb-mb-2 { margin-bottom: var(--rb-space-2); }
    #app .rb-mb-4 { margin-bottom: var(--rb-space-4); }
    #app .rb-mb-6 { margin-bottom: var(--rb-space-6); }
    #app .rb-pt-4 { padding-top: var(--rb-space-4); }
    #app .rb-pb-4 { padding-bottom: var(--rb-space-4); }
    #app .rb-text-center { text-align: center; }
    #app .rb-text-muted { color: var(--rb-text-muted); }
    #app .rb-text-accent { color: var(--rb-accent-strong); }
    #app .rb-text-error { color: var(--rb-error); }
    #app .rb-text-success { color: var(--rb-success); }
    #app .rb-text-sm { font-size: var(--rb-text-sm); }
    #app .rb-text-xs { font-size: var(--rb-text-xs); }
    #app .rb-font-bold { font-weight: 700; }
    #app .rb-font-semibold { font-weight: 600; }
    #app .rb-w-full { width: 100%; }
    #app .rb-flex { display: flex; }
    #app .rb-flex-col { flex-direction: column; }
    #app .rb-items-center { align-items: center; }
    #app .rb-justify-between { justify-content: space-between; }
    #app .rb-justify-center { justify-content: center; }
    #app .rb-gap-2 { gap: var(--rb-space-2); }
    #app .rb-gap-3 { gap: var(--rb-space-3); }
    #app .rb-gap-4 { gap: var(--rb-space-4); }
    #app .rb-flex-1 { flex: 1; }
    #app .rb-overflow-hidden { overflow: hidden; }
    #app .rb-overflow-auto { overflow: auto; }
    #app .rb-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
    /* Responsive helpers */
    @media (max-width: 600px) {
      #app { padding: var(--rb-space-3); }
      #app .app-shell,
      #app .rb-shell { padding: var(--rb-space-4); border-radius: var(--rb-radius-lg); }
      #app h1 { font-size: var(--rb-text-2xl); }
      #app h2 { font-size: var(--rb-text-xl); }
      #app .rb-stack-2,
      #app .rb-stack-3,
      #app .rb-stack-4 { grid-template-columns: 1fr; }
    }
  `;
}
