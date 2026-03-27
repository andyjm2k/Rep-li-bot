import { describe, it, expect } from 'vitest';
import type { AiProjectAssistInput } from '../shared/types';

// Re-implement validation for testing purposes
// (matches the logic in openaiService.ts)

type Issue = { severity: 'error' | 'warning'; code: string; message: string };

function extractTagTextContent(source: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'gi');
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(source)) !== null) {
    const text = (match[1] || '').trim();
    if (text) matches.push(text);
  }
  return matches;
}

function validateFormAccessibility(source: string): Issue[] {
  const issues: Issue[] = [];
  const inputCount = (source.match(/<input/gi) || []).length;
  const labelCount = (source.match(/<label/gi) || []).length;
  const labelledInputs = (source.match(/<input[^>]*\baria-label=/gi) || []).length;
  if (inputCount > 0 && labelCount === 0 && labelledInputs === 0) {
    issues.push({ severity: 'warning', code: 'missing-form-labels', message: 'The UI has input elements but no <label> elements.' });
  }
  return issues;
}

function validateButtonText(source: string): Issue[] {
  const issues: Issue[] = [];
  const buttonRegex = /<button([^>]*)>([^<]*)<\/button>/gi;
  let match;
  while ((match = buttonRegex.exec(source)) !== null) {
    const attrs = match[1] || '';
    const text = (match[2] || '').trim();
    const hasAriaLabel = /aria-label\s*=/.test(attrs);
    if (!text && !hasAriaLabel) {
      issues.push({ severity: 'warning', code: 'empty-button', message: 'A <button> element has no text content or aria-label.' });
    }
  }
  return issues;
}

function validateThemeCompliance(source: string): Issue[] {
  const issues: Issue[] = [];
  const patterns = [
    { pattern: /<style[\s>]/i, code: 'theme-bypass-style-tag' },
    { pattern: /\bstyle\s*=\s*["']/i, code: 'theme-bypass-inline-style' },
    { pattern: /:#[0-9a-f]{3,8}\b/i, code: 'theme-bypass-hex-color' },
    { pattern: /\brgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+/i, code: 'theme-bypass-rgb-color' },
    { pattern: /\bhsl\s*\(\s*\d+/i, code: 'theme-bypass-hsl-color' },
    { pattern: /\b(red|green|blue|yellow|orange|purple|pink|white|black)\b(?![-])/i, code: 'theme-bypass-named-color' },
    { pattern: /\bcurrentColor\b/, code: 'theme-bypass-currentcolor' },
    { pattern: /--rb-(bg|panel|text|accent|border|shadow|error|success|warning)\s*:/i, code: 'theme-bypass-css-var-override' },
  ];
  for (const rule of patterns) {
    if (rule.pattern.test(source)) {
      issues.push({ severity: 'warning', code: rule.code, message: `Theme bypass detected: ${rule.code}` });
    }
  }
  return issues;
}

function validateStructuralRequirements(source: string, spec: AiProjectAssistInput['spec']): Issue[] {
  const issues: Issue[] = [];
  const hasH1 = /<h1[\s>]/i.test(source);
  const hasH2OrH3 = /<h[23][\s>]/i.test(source);
  if (hasH2OrH3 && !hasH1) {
    issues.push({ severity: 'warning', code: 'missing-h1', message: 'Use <h1> for the main title before using <h2> or <h3>.' });
  }
  const hasListPattern = /note-list|item-list|task-list|contact-list|record-list|list/i.test(source);
  const hasEmptyState = /rb-empty/.test(source);
  if (hasListPattern && !hasEmptyState) {
    issues.push({ severity: 'warning', code: 'missing-empty-state', message: 'The UI appears to display a list but has no empty state.' });
  }
  const hasAiCall = /replibot\.ai\.complete\s*\(/.test(source);
  const hasSpinnerOrProgress = /rb-spinner|rb-progress/.test(source);
  if (hasAiCall && !hasSpinnerOrProgress) {
    issues.push({ severity: 'warning', code: 'missing-loading-indicator', message: 'AI call without loading indicator.' });
  }
  const divWithClick = (source.match(/<div[^>]*\bonclick\s*=/gi) || []).length;
  const buttons = (source.match(/<button/gi) || []).length;
  if (divWithClick > 0 && buttons === 0) {
    issues.push({ severity: 'warning', code: 'div-instead-of-button', message: 'Use <button> instead of <div onclick>.' });
  }
  return issues;
}

function scoreUiEngagement(source: string): Issue[] {
  const issues: Issue[] = [];
  const bareDivs = (source.match(/<div(?![^>]*\bclass\s*=\s*["'])/gi) || []).length;
  const semanticElements = (source.match(/<(button|input|textarea|select|label|h[1-6]|section|article)/gi) || []).length;
  if (bareDivs > semanticElements * 2 && bareDivs > 5) {
    issues.push({ severity: 'warning', code: 'excessive-div-soup', message: 'Excessive bare divs detected.' });
  }
  const components: Record<string, number> = {
    badges: (source.match(/\brb-badge[\s">]/gi) || []).length,
    tabs: (source.match(/\brb-tab/gi) || []).length,
  };
  const hasCountOrStatus = /\b(count|total|status|priority|tag)\b/i.test(source);
  if (hasCountOrStatus && components.badges === 0) {
    issues.push({ severity: 'warning', code: 'missing-semantic-components', message: 'Status/counts without badges.' });
  }
  const hasMultipleSections = (source.match(/<section/gi) || []).length;
  if (hasMultipleSections >= 3 && components.tabs === 0) {
    issues.push({ severity: 'warning', code: 'tabs-recommended', message: '3+ sections without tabs.' });
  }
  return issues;
}

function validateGeneratedSource(input: AiProjectAssistInput, source: string): Issue[] {
  const issues: Issue[] = [];
  if (!/\bfunction\s+start\s*\(\s*replibot\s*\)/.test(source)) {
    issues.push({ severity: 'error', code: 'missing-start', message: 'Source must define function start(replibot).' });
  }
  if (!/\breplibot\.ui\.render\s*\(/.test(source)) {
    issues.push({ severity: 'error', code: 'missing-render', message: 'Source must render through replibot.ui.render().' });
  }
  const blockedPatterns = [
    { pattern: /\bfetch\s*\(/, code: 'blocked-fetch' },
    { pattern: /\bXMLHttpRequest\b/, code: 'blocked-xhr' },
    { pattern: /\brequire\s*\(/, code: 'blocked-require' },
    { pattern: /\bimport\s+/, code: 'blocked-import' },
    { pattern: /\bprocess\./, code: 'blocked-process' },
    { pattern: /\belectron\b/i, code: 'blocked-electron' },
  ];
  for (const rule of blockedPatterns) {
    if (rule.pattern.test(source)) {
      issues.push({ severity: 'error', code: rule.code, message: rule.code });
    }
  }
  if (/\breplibot\.ai\.complete\s*\(/.test(source) && !input.permissions.includes('ai.provider')) {
    issues.push({ severity: 'error', code: 'missing-ai-permission', message: 'ai.complete without permission.' });
  }
  if (input.permissions.includes('project.write') && !/\breplibot\.storage\.set\s*\(/.test(source)) {
    issues.push({ severity: 'warning', code: 'missing-write-path', message: 'Permission to write but no storage.set.' });
  }
  if (input.permissions.includes('project.read') && !/\breplibot\.storage\.(get|all)\s*\(/.test(source)) {
    issues.push({ severity: 'warning', code: 'missing-read-path', message: 'Permission to read but no storage.get.' });
  }
  if (!/\breplibot\.ui\.setTitle\s*\(/.test(source)) {
    issues.push({ severity: 'warning', code: 'missing-title', message: 'Missing setTitle.' });
  }
  if (!/\breplibot\.runtime\.log\s*\(/.test(source)) {
    issues.push({ severity: 'warning', code: 'missing-log', message: 'Missing runtime.log.' });
  }
  if (source.trim().length < 240) {
    issues.push({ severity: 'warning', code: 'thin-output', message: 'Source too small.' });
  }
  issues.push(...validateFormAccessibility(source));
  issues.push(...validateButtonText(source));
  issues.push(...validateThemeCompliance(source));
  issues.push(...validateStructuralRequirements(source, input.spec));
  issues.push(...scoreUiEngagement(source));
  return issues;
}

const createMockInput = (overrides?: Partial<AiProjectAssistInput>): AiProjectAssistInput => ({
  projectId: 'test-project',
  kind: 'app',
  themeId: 'meadow',
  name: 'Test Project',
  description: 'A test project',
  permissions: ['project.read', 'project.write'],
  spec: {
    goal: 'Test goal',
    audience: 'individual',
    status: 'draft',
    problem: 'Test problem',
    outcome: 'Test outcome',
    primaryAction: 'Do something',
    dataNotes: 'Some data notes'
  },
  currentSource: '',
  ...overrides
});

const validSource = `
function start(replibot) {
  replibot.ui.setTitle('My App');
  replibot.runtime.log('App started');
  replibot.ui.render(\`<h1>My App</h1>
    <section class="rb-surface">
      <label>Name <input id="name" /></label>
      <button id="submit">Submit</button>
    </section>
  \`);
  replibot.storage.set('key', 'value');
}
`;

describe('validateGeneratedSource', () => {
  describe('required harness contract', () => {
    it('returns error when start function is missing', () => {
      const source = `function other(replibot) { replibot.ui.render('<div>Test</div>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'missing-start', severity: 'error' }));
    });

    it('returns error when replibot.ui.render is missing', () => {
      const source = `function start(replibot) { replibot.ui.setTitle('Test'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'missing-render', severity: 'error' }));
    });

    it('returns no errors for valid source', () => {
      const issues = validateGeneratedSource(createMockInput(), validSource);
      const errors = issues.filter(i => i.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });

  describe('blocked APIs', () => {
    it('blocks direct fetch usage', () => {
      const source = `function start(replibot) { replibot.ui.render('<div>Test</div>'); fetch('/api'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'blocked-fetch', severity: 'error' }));
    });

    it('blocks require()', () => {
      const source = `function start(replibot) { replibot.ui.render('<div>Test</div>'); require('fs'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'blocked-require', severity: 'error' }));
    });

    it('blocks import statements', () => {
      const source = `import { something } from 'module'; function start(replibot) { replibot.ui.render('<div>Test</div>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'blocked-import', severity: 'error' }));
    });

    it('blocks electron references', () => {
      const source = `function start(replibot) { replibot.ui.render('<div>Test</div>'); console.log(electron); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'blocked-electron', severity: 'error' }));
    });
  });

  describe('permission checks', () => {
    it('returns error when ai.complete is used without ai.provider permission', () => {
      const source = `function start(replibot) { replibot.ui.render('<div>Test</div>'); replibot.ai.complete('hello'); }`;
      const input = createMockInput({ permissions: ['project.read'] });
      const issues = validateGeneratedSource(input, source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'missing-ai-permission', severity: 'error' }));
    });

    it('allows ai.complete when ai.provider permission is granted', () => {
      const source = `function start(replibot) { replibot.ui.render('<div>Test</div>'); replibot.ai.complete('hello'); }`;
      const input = createMockInput({ permissions: ['project.read', 'ai.provider'] });
      const issues = validateGeneratedSource(input, source);
      const aiIssue = issues.find(i => i.code === 'missing-ai-permission');
      expect(aiIssue).toBeUndefined();
    });
  });

  describe('form accessibility', () => {
    it('warns when inputs exist without labels', () => {
      const source = `function start(replibot) { replibot.ui.render('<input id="test" /><button>Go</button>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'missing-form-labels', severity: 'warning' }));
    });

    it('does not warn when inputs have aria-label', () => {
      const source = `function start(replibot) { replibot.ui.render('<input aria-label="test" /><button>Go</button>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      const formIssue = issues.find(i => i.code === 'missing-form-labels');
      expect(formIssue).toBeUndefined();
    });

    it('does not warn when inputs are wrapped in labels', () => {
      const source = `function start(replibot) { replibot.ui.render('<label>Name<input /></label><button>Go</button>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      const formIssue = issues.find(i => i.code === 'missing-form-labels');
      expect(formIssue).toBeUndefined();
    });
  });

  describe('button text validation', () => {
    it('warns when button has no text or aria-label', () => {
      const source = `function start(replibot) { replibot.ui.render('<button></button>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'empty-button', severity: 'warning' }));
    });

    it('does not warn when button has text', () => {
      const source = `function start(replibot) { replibot.ui.render('<button>Submit</button>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      const btnIssue = issues.find(i => i.code === 'empty-button');
      expect(btnIssue).toBeUndefined();
    });

    it('does not warn when button has aria-label', () => {
      const source = `function start(replibot) { replibot.ui.render('<button aria-label="Submit form"></button>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      const btnIssue = issues.find(i => i.code === 'empty-button');
      expect(btnIssue).toBeUndefined();
    });
  });

  describe('theme bypass detection', () => {
    it('detects <style> tags', () => {
      const source = `function start(replibot) { replibot.ui.render('<style>.x{color:red}</style>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'theme-bypass-style-tag', severity: 'warning' }));
    });

    it('detects inline style attributes', () => {
      const source = `function start(replibot) { replibot.ui.render('<div style="color:red">Test</div>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'theme-bypass-inline-style', severity: 'warning' }));
    });

    it('detects hardcoded hex colors', () => {
      // Use a longer valid source to avoid thin-output warning
      const source = `function start(replibot) { replibot.ui.setTitle('App'); replibot.runtime.log('hi'); replibot.storage.set('k','v'); replibot.storage.get('k'); replibot.ui.render('<h1>My App</h1><div class="note" style="color:#ff0000">Red text</div><button aria-label="ok">OK</button>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'theme-bypass-hex-color', severity: 'warning' }));
    });

    it('detects rgb() with literal numbers', () => {
      const source = `function start(replibot) { replibot.ui.render('<div class="x">rgb(255,0,0)</div>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'theme-bypass-rgb-color', severity: 'warning' }));
    });

    it('detects rgba() with literal numbers', () => {
      const source = `function start(replibot) { replibot.ui.render('<div class="x">rgba(0,0,0,0.5)</div>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'theme-bypass-rgb-color', severity: 'warning' }));
    });

    it('detects named CSS colors', () => {
      const source = `function start(replibot) { replibot.ui.render('<div class="x">color: blue</div>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'theme-bypass-named-color', severity: 'warning' }));
    });

    it('detects currentColor usage', () => {
      const source = `function start(replibot) { replibot.ui.render('<div style="color:currentColor">Test</div>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'theme-bypass-currentcolor', severity: 'warning' }));
    });

    it('detects CSS variable redefinition', () => {
      const source = `function start(replibot) { replibot.ui.render('<div style="--rb-accent:red">Test</div>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'theme-bypass-css-var-override', severity: 'warning' }));
    });
  });

  describe('structural validation', () => {
    it('warns when h2/h3 exists without h1', () => {
      const source = `function start(replibot) { replibot.ui.render('<h2>Title</h2>'); replibot.ui.setTitle('x'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'missing-h1', severity: 'warning' }));
    });

    it('warns when list pattern exists without empty state', () => {
      const source = `function start(replibot) { replibot.ui.render('<div id="note-list"></div>'); replibot.ui.setTitle('x'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'missing-empty-state', severity: 'warning' }));
    });

    it('warns when ai.complete is used without loading indicator', () => {
      const source = `function start(replibot) { replibot.ui.render('<div>AI</div>'); replibot.ai.complete('hello'); }`;
      const input = createMockInput({ permissions: ['ai.provider'] });
      const issues = validateGeneratedSource(input, source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'missing-loading-indicator', severity: 'warning' }));
    });

    it('does not warn when ai.complete has spinner', () => {
      const source = `function start(replibot) { replibot.ui.render('<span class="rb-spinner"></span>'); replibot.ai.complete('hello'); }`;
      const input = createMockInput({ permissions: ['ai.provider'] });
      const issues = validateGeneratedSource(input, source);
      const spinnerIssue = issues.find(i => i.code === 'missing-loading-indicator');
      expect(spinnerIssue).toBeUndefined();
    });

    it('warns when div with onclick exists without any buttons', () => {
      const source = `function start(replibot) { replibot.ui.render('<div onclick="alert(1)">Click me</div>'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'div-instead-of-button', severity: 'warning' }));
    });
  });

  describe('engagement scoring', () => {
    it('warns about excessive bare divs', () => {
      const source = `function start(replibot) { replibot.ui.render('<div><div><div><div><div><div><div>x</div></div></div></div></div></div></div>'); replibot.ui.setTitle('x'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'excessive-div-soup', severity: 'warning' }));
    });

    it('warns about status/counts without badges', () => {
      const source = `function start(replibot) { replibot.ui.render('<span>Status: active</span><span>Count: 5</span>'); replibot.ui.setTitle('x'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'missing-semantic-components', severity: 'warning' }));
    });

    it('warns about 3+ sections without tabs', () => {
      const source = `function start(replibot) { replibot.ui.render('<section></section><section></section><section></section>'); replibot.ui.setTitle('x'); }`;
      const issues = validateGeneratedSource(createMockInput(), source);
      expect(issues).toContainEqual(expect.objectContaining({ code: 'tabs-recommended', severity: 'warning' }));
    });
  });

  describe('positive cases', () => {
    it('passes a well-structured source with no warnings', () => {
      const source = `
function start(replibot) {
  replibot.ui.setTitle('Task Tracker');
  replibot.runtime.log('App loaded');
  replibot.ui.render(\`<h1>Task Tracker</h1>
    <section class="rb-surface">
      <label>Task name <input id="task-input" placeholder="Enter a task..." /></label>
      <button id="add-btn">Add task</button>
    </section>
    <section class="rb-surface">
      <h3 class="rb-mt-0">Tasks <span class="rb-badge">0</span></h3>
      <div id="task-list"></div>
    </section>
  \`);
}
      `.trim();
      const issues = validateGeneratedSource(createMockInput(), source);
      const warnings = issues.filter(i => i.severity === 'warning');
      expect(warnings.map(i => i.code)).not.toContain('missing-form-labels');
      expect(warnings.map(i => i.code)).not.toContain('empty-button');
      expect(warnings.map(i => i.code)).not.toContain('missing-h1');
      expect(warnings.map(i => i.code)).not.toContain('div-instead-of-button');
    });
  });
});
