import type {
  AiGenerationIssue,
  AiProjectAssistInput,
  AiProjectAssistResult,
  AiProviderSettings,
  ProjectAiRequest,
  ProjectAiResponse
} from '../shared/types';
import { getProjectTheme } from '../shared/themes';

interface ParsedAiPayload {
  source: string;
  notes?: string;
  summary?: string;
  userFlow?: string[];
  storagePlan?: string[];
}

function normalizeResponsesUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/g, '');
  return trimmed.endsWith('/responses') ? trimmed : `${trimmed}/responses`;
}

function normalizeChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/g, '');
  return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`;
}

function stripThinkingTokens(text: string): string {
  // Remove thinking/reasoning tokens that some models include in the output
  // Common patterns: <think>...</think> (MiniMax, Claude), <think>...</think>, etc.
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*?思考结束/gi, '')
    .trim();
}

function extractJsonPayload(text: string): ParsedAiPayload {
  let trimmed = text.trim();

  logApi(`extractJsonPayload: text starts with: ${trimmed.slice(0, 100).replace(/\n/g, '\\n')}`);

  // Strip thinking tokens if present (MiniMax and similar models include these)
  const thinkingStripped = stripThinkingTokens(trimmed);
  if (thinkingStripped !== trimmed) {
    logApi(`extractJsonPayload: stripped thinking tokens, new length: ${thinkingStripped.length}`);
    trimmed = thinkingStripped;
    logApi(`extractJsonPayload: after strip, starts with: ${trimmed.slice(0, 200).replace(/\n/g, '\\n')}`);
  }

  // Try direct JSON parse first (in case no fences)
  try {
    const parsed = JSON.parse(trimmed) as Partial<ParsedAiPayload>;
    if (parsed.source) return normalizePayload(parsed);
  } catch {
    // Not direct JSON, continue with fence extraction
  }

  // Find the first opening fence: ``` or ```json
  const fenceStart = trimmed.search(/```(?:json)?/i);
  logApi(`extractJsonPayload: fenceStart=${fenceStart}`);
  if (fenceStart === -1) {
    // No fenced block — look for the start of the JSON object containing "source"
    // Search for {"source": pattern anywhere in the text
    const jsonMatch = trimmed.match(/\{\s*"source"/);
    if (jsonMatch) {
      const jsonStart = jsonMatch.index ?? 0;
      logApi(`extractJsonPayload: found JSON object starting at position ${jsonStart}`);
      try {
        const parsed = JSON.parse(trimmed.slice(jsonStart)) as Partial<ParsedAiPayload>;
        if (parsed.source) {
          logApi(`extractJsonPayload: JSON parse succeeded, source length: ${parsed.source.length}`);
          return normalizePayload(parsed);
        }
      } catch (err) {
        logApi(`extractJsonPayload: JSON parse failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    // No fenced block — try regex extraction as fallback
    logApi(`extractJsonPayload: no JSON object found, calling extractByRegex`);
    return extractByRegex(trimmed);
  }

  // Extract content after the opening fence
  const afterFence = trimmed.slice(fenceStart + 3).replace(/json\s*/i, '').trim();
  const lines = afterFence.split('\n');

  // Find the last line that is just "```" (closing fence)
  let endIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === '```') {
      endIdx = i;
      break;
    }
  }

  let candidate: string;
  if (endIdx === -1) {
    // No closing fence found — use everything
    candidate = afterFence.trim();
  } else {
    // Join only lines before the closing fence
    candidate = lines.slice(0, endIdx).join('\n').trim();
  }

  try {
    const parsed = JSON.parse(candidate) as Partial<ParsedAiPayload>;
    if (!parsed.source) {
      throw new Error('AI response did not include a source field.');
    }
    return normalizePayload(parsed);
  } catch (err) {
    // Try regex fallback before giving up
    const extracted = extractByRegex(candidate);
    if (extracted.source) return extracted;

    // Surface a clearer error for debugging
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`AI returned malformed JSON: ${msg}. Response preview: ${candidate.slice(0, 200)}...`);
  }
}

function extractByRegex(text: string): ParsedAiPayload {
  // Fallback: extract source field via a state machine when JSON.parse fails
  // This handles cases where the source string contains content that confuses the JSON parser
  // (e.g., backticks, unescaped characters, extra closing fences inside template literals)

  logApi(`extractByRegex: text length=${text.length}, preview: ${text.slice(0, 300)}`);

  const sourceStart = text.indexOf('"source"');
  if (sourceStart === -1) {
    logApi(`extractByRegex: "source" not found in text. First 300 chars: ${text.slice(0, 300)}`);
    throw new Error('No source field found in response.');
  }

  logApi(`extractByRegex: found "source" at position ${sourceStart}`);

  // Find the opening quote of the source value (skip past "source": and any whitespace)
  let i = sourceStart + 7;
  while (i < text.length && (text[i] === ':' || text[i] === ' ' || text[i] === '\n' || text[i] === '\r' || text[i] === '\t')) {
    i++;
  }
  if (text[i] !== '"') {
    throw new Error(`Expected opening quote for source value at position ${i}, found: ${text[i]}`);
  }

  // Extract the source string manually, handling JSON escapes
  i++; // skip opening quote
  let source = '';
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"') {
      // End of string
      break;
    } else if (ch === '\\' && i + 1 < text.length) {
      // Escape sequence
      const next = text[i + 1];
      if (next === '"') source += '"';
      else if (next === 'n') source += '\n';
      else if (next === 'r') source += '\r';
      else if (next === 't') source += '\t';
      else if (next === '\\') source += '\\';
      else if (next === '`') source += '`'; // Handle escaped backticks
      else if (next === '$') source += '$'; // Handle escaped $ for template literals
      else source += next;
      i += 2;
    } else if (ch === '`') {
      // Literal backtick inside string - shouldn't happen in valid JSON but handle it
      source += '`';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      // Newline in string - unexpected in valid JSON but handle gracefully
      source += ch;
      i++;
    } else {
      source += ch;
      i++;
    }
  }

  if (!source) {
    throw new Error('Source field was empty or not found.');
  }

  return { source, notes: undefined, summary: undefined };
}

function normalizePayload(parsed: Partial<ParsedAiPayload>): ParsedAiPayload {
  return {
    source: parsed.source || '',
    notes: parsed.notes,
    summary: parsed.summary,
    userFlow: Array.isArray(parsed.userFlow) ? parsed.userFlow.filter(Boolean) : undefined,
    storagePlan: Array.isArray(parsed.storagePlan)
      ? parsed.storagePlan.filter(Boolean)
      : undefined
  };
}

function formatIssues(issues: AiGenerationIssue[]): string {
  return issues
    .map((issue, index) => `${index + 1}. [${issue.severity}/${issue.code}] ${issue.message}`)
    .join('\n');
}

function splitIssues(issues: AiGenerationIssue[]): {
  errors: AiGenerationIssue[];
  warnings: AiGenerationIssue[];
} {
  return {
    errors: issues.filter((issue) => issue.severity === 'error'),
    warnings: issues.filter((issue) => issue.severity === 'warning')
  };
}

// ─── 1. COMPONENT REQUIREMENT VALIDATION ─────────────────────────────────────

/**
 * Extracts text content between HTML tags for a given tag name.
 */
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

/**
 * Counts usage of harness CSS class patterns in source.
 */
function countComponentUsage(source: string): Record<string, number> {
  return {
    badges: (source.match(/\brb-badge[\s">]/gi) || []).length,
    alerts: (source.match(/\brb-alert-/gi) || []).length,
    tabs: (source.match(/\brb-tab/gi) || []).length,
    progress: (source.match(/\brb-progress/gi) || []).length,
    spinner: (source.match(/\brb-spinner/gi) || []).length,
    avatar: (source.match(/\brb-avatar/gi) || []).length,
    divider: (source.match(/\brb-divider/gi) || []).length,
    empty: (source.match(/\brb-empty/gi) || []).length,
    surface: (source.match(/\brb-surface/gi) || []).length,
    stack: (source.match(/\brb-stack/gi) || []).length,
    inline: (source.match(/\brb-inline/gi) || []).length,
    buttons: (source.match(/<button/gi) || []).length,
    inputs: (source.match(/<input/gi) || []).length,
    labels: (source.match(/<label/gi) || []).length
  };
}

/**
 * Detects if input elements have associated labels (either for/id attributes or wrapping).
 */
function validateFormAccessibility(source: string): AiGenerationIssue[] {
  const issues: AiGenerationIssue[] = [];

  const inputCount = (source.match(/<input/gi) || []).length;
  const labelCount = (source.match(/<label/gi) || []).length;
  const labelledInputs = (source.match(/<input[^>]*\baria-label=/gi) || []).length +
    (source.match(/<input[^>]*\bid=["'][^"']+["'][^>]*>/gi) || []).length;

  // Only check if there are inputs and no wrapping labels
  if (inputCount > 0 && labelCount === 0 && labelledInputs === 0) {
    issues.push({
      severity: 'warning',
      code: 'missing-form-labels',
      message: 'The UI has input elements but no <label> elements. Wrap each input in a <label>, or add aria-label to the input.'
    });
  }

  return issues;
}

/**
 * Validates that buttons have non-empty text content.
 */
function validateButtonText(source: string): AiGenerationIssue[] {
  const issues: AiGenerationIssue[] = [];
  const buttonRegex = /<button([^>]*)>([^<]*)<\/button>/gi;
  let match;

  while ((match = buttonRegex.exec(source)) !== null) {
    const attrs = match[1] || '';
    const text = (match[2] || '').trim();
    const hasAriaLabel = /aria-label\s*=/.test(attrs);

    if (!text && !hasAriaLabel) {
      issues.push({
        severity: 'warning',
        code: 'empty-button',
        message: 'A <button> element has no text content or aria-label. Every button needs visible text or an aria-label.'
      });
    }
  }

  return issues;
}

/**
 * Checks whether alert-style content uses proper .rb-alert-* classes.
 */
function validateAlertSemantics(source: string): AiGenerationIssue[] {
  const issues: AiGenerationIssue[] = [];

  // Detect inline error/warning/success text patterns that should be alerts
  const hasInlineErrorPattern = /\b(error|warning|success|notice|info)\b.*[:\s]/i.test(source) &&
    !/\brb-alert/.test(source);

  // If there are inputs with aria-invalid, they should use .rb-input-error class
  const hasInvalidInputs = /aria-invalid\s*=\s*["']true["']/.test(source);
  const hasInputErrorClass = /\brb-input-error\b/.test(source);
  if (hasInvalidInputs && !hasInputErrorClass) {
    issues.push({
      severity: 'warning',
      code: 'missing-alert-class',
      message: 'An input has aria-invalid="true" but does not use the .rb-input-error class. Use .rb-input-error to style validation errors.'
    });
  }

  return issues;
}

// ─── 2. IMPROVED THEME BYPASS DETECTION ─────────────────────────────────────

/**
 * Detects hard-coded colors, inline styles, and theme bypass attempts.
 */
function validateThemeCompliance(source: string): AiGenerationIssue[] {
  const issues: AiGenerationIssue[] = [];

  // Blocked style patterns (more comprehensive)
  const styleBypassPatterns = [
    { pattern: /<style[\s>]/i, code: 'theme-bypass-style-tag', message: 'Do not use <style> tags. Use harness CSS classes instead.' },
    { pattern: /\bstyle\s*=\s*["']/i, code: 'theme-bypass-inline-style', message: 'Do not use inline style attributes. Use harness CSS classes instead.' },
    // Hex colors (but not CSS variables)
    { pattern: /:#[0-9a-f]{3,8}\b/i, code: 'theme-bypass-hex-color', message: 'Do not use hardcoded hex color values. Use theme variables like var(--rb-accent) or CSS class names.' },
    // rgb() without var() — catches rgb(255, 0, 0), rgba(0,0,0,0.5) etc.
    { pattern: /\brgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+/i, code: 'theme-bypass-rgb-color', message: 'Do not use rgb()/rgba() with literal numbers. Use theme variables like var(--rb-accent) or CSS class names.' },
    // hsl() with literal values
    { pattern: /\bhsl\s*\(\s*\d+/i, code: 'theme-bypass-hsl-color', message: 'Do not use hsl() with literal values. Use theme variables.' },
    // Named CSS colors
    { pattern: /\b(red|green|blue|yellow|orange|purple|pink|white|black|brown|navy|teal|olive|marchnt|aqua|maroon|gray|grey|lime|fuchsia|silver|white)\b(?![-])/i, code: 'theme-bypass-named-color', message: 'Do not use named CSS colors like "red", "blue". Use theme variables or CSS class names.' },
    // currentColor usage
    { pattern: /\bcurrentColor\b/, code: 'theme-bypass-currentcolor', message: 'Do not use currentColor. Use theme variables or harness CSS class names.' },
    // CSS custom properties that bypass the theme (defining --rb-* within the source)
    { pattern: /--rb-(bg|panel|text|accent|border|shadow|error|success|warning)\s*:/i, code: 'theme-bypass-css-var-override', message: 'Do not redefine CSS custom properties (--rb-*). The theme system owns these.' },
  ];

  for (const rule of styleBypassPatterns) {
    if (rule.pattern.test(source)) {
      issues.push({
        severity: 'warning',
        code: rule.code,
        message: rule.message
      });
    }
  }

  return issues;
}

// ─── 3. STRUCTURAL VALIDATION ───────────────────────────────────────────────

/**
 * Validates structural requirements: heading hierarchy, empty states, semantic elements.
 */
function validateStructuralRequirements(source: string, spec: AiProjectAssistInput['spec']): AiGenerationIssue[] {
  const issues: AiGenerationIssue[] = [];

  // Check heading hierarchy — should have an h1 if there's meaningful content
  const hasH1 = /<h1[\s>]/i.test(source);
  const hasH2OrH3 = /<h[23][\s>]/i.test(source);
  if (hasH2OrH3 && !hasH1) {
    issues.push({
      severity: 'warning',
      code: 'missing-h1',
      message: 'Use <h1> for the main title before using <h2> or <h3> headings.'
    });
  }

  // Check for empty state when there's a list-like structure
  const hasListPattern = /note-list|item-list|entry-list|task-list|contact-list|record-list|list/i.test(source);
  const hasEmptyState = /rb-empty/.test(source);
  if (hasListPattern && !hasEmptyState) {
    issues.push({
      severity: 'warning',
      code: 'missing-empty-state',
      message: 'The UI appears to display a list but has no empty state. Use .rb-empty to inform users when there are no items.'
    });
  }

  // Check that storage operations have corresponding permission
  const hasStorageSet = /replibot\.storage\.set\s*\(/.test(source);
  const hasStorageGet = /replibot\.storage\.get\s*\(/.test(source) || /replibot\.storage\.all\s*\(/.test(source);

  if (hasStorageSet && !spec.primaryAction.trim() && !spec.outcome.trim()) {
    // If saving data but nothing describes what gets saved, warn
    issues.push({
      severity: 'warning',
      code: 'orphan-storage-set',
      message: 'The UI calls replibot.storage.set() but the brief does not clearly describe what data is being stored or why.'
    });
  }

  // Check for progress indicators when ai.complete is used
  const hasAiCall = /replibot\.ai\.complete\s*\(/.test(source);
  const hasSpinnerOrProgress = /rb-spinner|rb-progress/.test(source);
  if (hasAiCall && !hasSpinnerOrProgress) {
    issues.push({
      severity: 'warning',
      code: 'missing-loading-indicator',
      message: 'The UI calls replibot.ai.complete() but does not show a loading state. Use .rb-spinner or .rb-progress to indicate activity during the AI call.'
    });
  }

  // Warn if using <div onclick> instead of <button>
  const divWithClick = (source.match(/<div[^>]*\bonclick\s*=/gi) || []).length;
  const buttons = (source.match(/<button/gi) || []).length;
  if (divWithClick > 0 && buttons === 0) {
    issues.push({
      severity: 'warning',
      code: 'div-instead-of-button',
      message: 'Use <button> elements for clickable actions, not <div onclick>. Buttons have proper accessibility and focus management.'
    });
  }

  return issues;
}

// ─── 4. ENGAGEMENT / QUALITY SCORING ────────────────────────────────────────

/**
 * Scores the UI for richness and engagement, returning advisory warnings
 * (not errors — these don't block acceptance).
 */
function scoreUiEngagement(source: string): AiGenerationIssue[] {
  const issues: AiGenerationIssue[] = [];
  const components = countComponentUsage(source);

  // Penalize excessive div soup — count bare divs vs semantic elements
  const bareDivs = (source.match(/<div(?![^>]*\bclass\s*=\s*["'])/gi) || []).length;
  const semanticElements = (source.match(/<(button|input|textarea|select|label|h[1-6]|section|article|nav|header|footer|form|ul|ol|dl|table)\b/gi) || []).length;
  if (bareDivs > semanticElements * 2 && bareDivs > 5) {
    issues.push({
      severity: 'warning',
      code: 'excessive-div-soup',
      message: 'The UI uses many bare <div> elements without classes. Prefer semantic HTML elements (section, article, button) with harness CSS classes.'
    });
  }

  // Encourage using badges for metadata/counts
  const hasCountOrStatus = /\b(count|total|status|priority|tag|label|category|type)\b/i.test(source);
  if (hasCountOrStatus && components.badges === 0) {
    issues.push({
      severity: 'warning',
      code: 'missing-semantic-components',
      message: 'The UI mentions counts, status, or labels but does not use .rb-badge. Use badges to present metadata in a scannable way.'
    });
  }

  // Encourage tabs for multi-section content
  const hasMultipleSections = (source.match(/<section/gi) || []).length;
  if (hasMultipleSections >= 3 && components.tabs === 0) {
    issues.push({
      severity: 'warning',
      code: 'tabs-recommended',
      message: 'The UI has 3 or more sections. Consider using .rb-tabs / .rb-tab to organize content into a navigable tab interface.'
    });
  }

  // Warn about very long render functions without grouping
  const renderMatch = source.match(/replibot\.ui\.render\s*\(\s*`([^`]+)`/);
  if (renderMatch) {
    const htmlContent = renderMatch[1];
    const topLevelDivs = (htmlContent.match(/<div\b/g) || []).length;
    if (topLevelDivs > 10 && components.surface === 0) {
      issues.push({
        severity: 'warning',
        code: 'flat-structure',
        message: 'The UI has many nested elements without using .rb-surface cards to group them. Group related content into .rb-surface cards for better visual hierarchy.'
      });
    }
  }

  return issues;
}

// ─── MAIN VALIDATION FUNCTION ─────────────────────────────────────────────────

function validateGeneratedSource(
  input: AiProjectAssistInput,
  source: string
): AiGenerationIssue[] {
  const issues: AiGenerationIssue[] = [];

  // ── Required harness contract ──────────────────────────────────────────────
  if (!/\bfunction\s+start\s*\(\s*replibot\s*\)/.test(source)) {
    issues.push({ severity: 'error', code: 'missing-start', message: 'Source must define function start(replibot).' });
  }

  if (!/\breplibot\.ui\.render\s*\(/.test(source)) {
    issues.push({ severity: 'error', code: 'missing-render', message: 'Source must render through replibot.ui.render().' });
  }

  // ── Blocked APIs ──────────────────────────────────────────────────────────
  const blockedPatterns = [
    { pattern: /\bfetch\s*\(/, code: 'blocked-fetch', message: 'Direct fetch is blocked.' },
    { pattern: /\bXMLHttpRequest\b/, code: 'blocked-xhr', message: 'XMLHttpRequest is blocked.' },
    { pattern: /\brequire\s*\(/, code: 'blocked-require', message: 'require() is blocked.' },
    { pattern: /\bimport\s+/, code: 'blocked-import', message: 'import statements are blocked.' },
    { pattern: /\bprocess\./, code: 'blocked-process', message: 'process access is blocked.' },
    { pattern: /\belectron\b/i, code: 'blocked-electron', message: 'Electron APIs are blocked.' },
    { pattern: /\bipcRenderer\b/, code: 'blocked-ipc', message: 'ipcRenderer access is blocked.' },
    { pattern: /\bchild_process\b/, code: 'blocked-child-process', message: 'child_process access is blocked.' }
  ];

  for (const rule of blockedPatterns) {
    if (rule.pattern.test(source)) {
      issues.push({ severity: 'error', code: rule.code, message: rule.message });
    }
  }

  // ── Permission checks ──────────────────────────────────────────────────────
  if (/\breplibot\.ai\.complete\s*\(/.test(source) && !input.permissions.includes('ai.provider')) {
    issues.push({ severity: 'error', code: 'missing-ai-permission', message: 'Source uses replibot.ai.complete(), but ai.provider permission is not enabled.' });
  }

  if (input.permissions.includes('project.write') && !/\breplibot\.storage\.set\s*\(/.test(source)) {
    issues.push({ severity: 'warning', code: 'missing-write-path', message: 'The project can write local state, but the generated source never persists any data.' });
  }

  if (input.permissions.includes('project.read') && !/\breplibot\.storage\.(get|all)\s*\(/.test(source)) {
    issues.push({ severity: 'warning', code: 'missing-read-path', message: 'The project can read local state, but the generated source never loads any stored data.' });
  }

  // ── Essential harness usage ────────────────────────────────────────────────
  if (!/\breplibot\.ui\.setTitle\s*\(/.test(source)) {
    issues.push({ severity: 'warning', code: 'missing-title', message: 'Call replibot.ui.setTitle() to set a clear window title.' });
  }

  if (!/\breplibot\.runtime\.log\s*\(/.test(source)) {
    issues.push({ severity: 'warning', code: 'missing-log', message: 'Add replibot.runtime.log() calls so runtime behavior is inspectable.' });
  }

  // ── Content completeness ───────────────────────────────────────────────────
  const hasInteractiveControl = /<(button|input|textarea|select)\b/i.test(source) || /addEventListener\s*\(/.test(source);
  if ((input.spec.primaryAction.trim() || input.spec.outcome.trim()) && !hasInteractiveControl) {
    issues.push({ severity: 'warning', code: 'missing-action-ui', message: 'The brief describes an action or outcome, but the source lacks interactive controls (buttons, inputs, etc.).' });
  }

  if (source.trim().length < 240) {
    issues.push({ severity: 'warning', code: 'thin-output', message: 'The generated source is very small and may not fully implement the brief.' });
  }

  // ── 1. Component requirement validation ───────────────────────────────────
  issues.push(...validateFormAccessibility(source));
  issues.push(...validateButtonText(source));
  issues.push(...validateAlertSemantics(source));

  // ── 2. Theme bypass detection (comprehensive) ──────────────────────────────
  issues.push(...validateThemeCompliance(source));

  // ── 3. Structural validation ─────────────────────────────────────────────
  issues.push(...validateStructuralRequirements(source, input.spec));

  // ── 4. Engagement scoring ─────────────────────────────────────────────────
  issues.push(...scoreUiEngagement(source));

  return issues;
}

// ─── POSITIVE GUIDANCE HELPERS ───────────────────────────────────────────────

function buildPositiveGuidance(issues: AiGenerationIssue[]): string {
  const warnings = issues.filter(i => i.severity === 'warning');
  if (warnings.length === 0) return '';

  const lines: string[] = ['', 'To address these warnings, consider:'];

  for (const issue of warnings) {
    switch (issue.code) {
      case 'missing-form-labels':
        lines.push('- Wrap each <input> in a <label>, or add aria-label="..." to the <input> element');
        break;
      case 'empty-button':
        lines.push('- Add text content or aria-label="..." to every <button>');
        break;
      case 'missing-alert-class':
        lines.push('- Add class="rb-input-error" to invalid inputs and class="rb-alert-error" to error messages');
        break;
      case 'missing-empty-state':
        lines.push('- Add a <div class="rb-empty"> with a message when the list is empty');
        break;
      case 'missing-loading-indicator':
        lines.push('- Add a <span class="rb-spinner"></span> or <div class="rb-progress"><div class="rb-progress-bar" style="width:60%"></div></div> before the AI call');
        break;
      case 'div-instead-of-button':
        lines.push('- Replace <div onclick="..."> with <button>...</button> for clickable actions');
        break;
      case 'excessive-div-soup':
        lines.push('- Replace bare <div> elements with semantic elements (section, article, main) with CSS classes');
        break;
      case 'missing-semantic-components':
        lines.push('- Use <span class="rb-badge"> for counts, tags, and status indicators');
        break;
      case 'tabs-recommended':
        lines.push('- Use .rb-tabs container with .rb-tab elements to organize sections');
        break;
      case 'flat-structure':
        lines.push('- Wrap groups of related content in <section class="rb-surface"> cards');
        break;
      case 'missing-h1':
        lines.push('- Add <h1> as the main page title');
        break;
      case 'orphan-storage-set':
        lines.push('- Ensure the brief clearly describes what data is saved and when (update spec.primaryAction)');
        break;
      case 'theme-bypass-style-tag':
      case 'theme-bypass-inline-style':
      case 'theme-bypass-hex-color':
      case 'theme-bypass-rgb-color':
      case 'theme-bypass-hsl-color':
      case 'theme-bypass-named-color':
      case 'theme-bypass-currentcolor':
      case 'theme-bypass-css-var-override':
        lines.push(`- ${issue.message} Replace with harness CSS class names or theme variables`);
        break;
    }
  }

  return lines.join('\n');
}

// ─── SYSTEM PROMPT ───────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return [
    'You generate JavaScript source for a local Electron-hosted app builder runtime.',
    'CRITICAL: You must return ONLY a single JSON object. No markdown fences, no explanations, no other text.',
    'The JSON must have exactly this shape:',
    '{"source":"<javascript code as string>","notes":"<optional notes>","summary":"<brief summary>","userFlow":["step1","step2"],"storagePlan":["plan1","plan2"]}',
    '',
    'The "source" field MUST be a valid JavaScript function named "start" that takes a replibot parameter:',
    'function start(replibot) {',
    '  replibot.ui.setTitle("My App");',
    '  replibot.ui.render(`<div class="rb-shell"><h1>Hello</h1></div>`);',
    '}',
    '',
    'Do NOT return source code outside of JSON. Do NOT use markdown code fences (no triple backticks).',
    'Use only this harness surface: replibot.ui.render, replibot.ui.setTitle, replibot.ui.notify, replibot.storage.get, replibot.storage.set, replibot.storage.delete, replibot.storage.clear, replibot.storage.all, replibot.runtime.log, replibot.runtime.can, replibot.ai.complete.',
    'Do not use fetch, imports, Node APIs, or Electron APIs.',
    'Build for a non-coder end user, so the generated app should be simple, explicit, and useful.',
    '',
    'STYLING: Use CSS class names on elements. Available classes:',
    '  Layout: .rb-shell (main container), .rb-surface (card), .rb-stack (vertical stack), .rb-inline (flex row)',
    '  Text: h1-h4 (headings), p, small, .rb-text-muted, .rb-text-sm, .rb-text-xs',
    '  Buttons: button (primary), .rb-btn-secondary, .rb-btn-ghost, .rb-btn-danger',
    '  Forms: input, textarea, select, label, .rb-input-error (for invalid inputs)',
    '  Components: .rb-badge (label), .rb-alert-info/success/warning/error (alert box), .rb-tabs/.rb-tab (nav), .rb-progress/.rb-progress-bar, .rb-spinner, .rb-empty (empty state message), .rb-divider',
    '  Utilities: .rb-mt-0..6 / .rb-mb-0..6 (margins), .rb-w-full, .rb-flex, .rb-items-center, .rb-justify-between, .rb-flex-1, .rb-sr-only',
    '  Theme colors: var(--rb-bg), var(--rb-panel), var(--rb-text), var(--rb-text-muted), var(--rb-accent), var(--rb-accent-strong), var(--rb-border), var(--rb-error), var(--rb-success), var(--rb-warning)',
    '',
    'REQUIRED:',
    '  - The source MUST contain: function start(replibot) { ... }',
    '  - The source MUST call: replibot.ui.setTitle("...")',
    '  - The source MUST call: replibot.ui.render(`...`)',
    '  - Every <input> needs a <label> or aria-label',
    '  - Every <button> needs text or aria-label',
    '  - Lists (tasks, notes, contacts) need a .rb-empty state when empty',
    '  - AI calls need .rb-spinner during loading',
    '  - Use <button> not <div onclick>',
    '',
    'NEVER DO:',
    '  - <style> tags, inline style="...", or hardcoded colors (#fff, rgb(), red, etc.)',
    '  - fetch, require, import, process, electron, ipcRenderer, child_process',
    '  - ai.complete() without ai.provider permission enabled',
    '  - CSS variable overrides (--rb-*)',
    '  - Triple backticks or markdown fences around the JSON response'
  ].join('\n');
}

// ─── USER PROMPTS ─────────────────────────────────────────────────────────────

function buildInitialPrompt(input: AiProjectAssistInput): string {
  const theme = getProjectTheme(input.themeId);

  return `Project context:
name: ${input.name}
kind: ${input.kind}
theme: ${theme.label} (${theme.mood}) - ${theme.description}
description: ${input.description}
permissions: ${input.permissions.join(', ') || 'none'}
goal: ${input.spec.goal}
audience: ${input.spec.audience}
problem: ${input.spec.problem}
outcome: ${input.spec.outcome}
primaryAction: ${input.spec.primaryAction}
dataNotes: ${input.spec.dataNotes}

Current source:
${input.currentSource || '(empty — generate from scratch)'}

Generate a complete, polished, harness-compatible source for this project.
Follow all accessibility rules, use the harness CSS class system, and ensure the UI is engaging and well-structured.
${input.refinementPrompt ? `\nRefinement request:\n${input.refinementPrompt}\n` : ''}`;
}

function buildRepairPrompt(
  input: AiProjectAssistInput,
  previousSource: string,
  issues: AiGenerationIssue[]
): string {
  const theme = getProjectTheme(input.themeId);
  const { errors, warnings } = splitIssues(issues);
  const positiveGuidance = buildPositiveGuidance(warnings);

  return `You are repairing a previously generated Replibot project.

Project context:
name: ${input.name}
kind: ${input.kind}
theme: ${theme.label} (${theme.mood}) - ${theme.description}
description: ${input.description}
permissions: ${input.permissions.join(', ') || 'none'}
goal: ${input.spec.goal}
audience: ${input.spec.audience}
problem: ${input.spec.problem}
outcome: ${input.spec.outcome}
primaryAction: ${input.spec.primaryAction}
dataNotes: ${input.spec.dataNotes}

Previous source:
${previousSource}

Review findings (${errors.length} errors, ${warnings.length} warnings):
${formatIssues(issues)}

CRITICAL: Fix ALL ${errors.length} error(s) above — these block acceptance.
${positiveGuidance}

Regenerate the complete source fixing every error. Address as many warnings as possible.
Never use <style> tags, inline styles, or hardcoded colors. Use harness CSS classes.

IMPORTANT: Your response must be ONLY valid JSON. No markdown fences, no explanations.
The JSON must have this exact shape:
{"source":"function start(replibot) { replibot.ui.setTitle('...'); replibot.ui.render(\`<div>...</div>\`); }","notes":"...","summary":"...","userFlow":["..."],"storagePlan":["..."]}
The source string must contain function start(replibot) and must call replibot.ui.render().`;
}

// ─── API CALL ─────────────────────────────────────────────────────────────────

const AI_TIMEOUT_MS = 1800000; // 30 minutes per attempt

function logApi(...args: unknown[]): void {
  console.log(`[Replibot AI] [${new Date().toISOString()}]`, ...args);
}

async function callCompatibleApi(
  settings: AiProviderSettings,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  logApi(`Starting API call to ${settings.baseUrl}, model: ${settings.model}, format: ${settings.apiFormat}`);

  try {
    if (settings.apiFormat === 'chat_completions') {
      const url = normalizeChatCompletionsUrl(settings.baseUrl);
      const apiKeyPrefix = settings.apiKey ? `${settings.apiKey.slice(0, 4)}...${settings.apiKey.slice(-4)}` : '(empty)';
      logApi(`chat_completions URL: ${url}, API key: ${apiKeyPrefix}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: true
        }),
        signal: controller.signal
      });

      logApi(`chat_completions response status: ${response.status}, ok: ${response.ok}`);

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`AI request failed: ${response.status} ${body}`);
      }

      if (!response.body) {
        throw new Error('AI provider did not return a streamable response body.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let finished = false;
      let chunkCount = 0;
      let bytesReceived = 0;

      logApi('Starting stream read loop');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          logApi(`Stream done. chunks=${chunkCount}, bytes=${bytesReceived}, contentLen=${fullContent.length}`);
          // Flush any remaining bytes held back by stream:true decoding
          const remaining = decoder.decode();
          if (remaining) {
            logApi('Flushing decoder buffer');
            const lines = remaining.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]' || data === '') continue;
                try {
                  const parsed = JSON.parse(data) as {
                    choices?: Array<{
                      delta?: { content?: string };
                      finish_reason?: string;
                    }>;
                  };
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) fullContent += content;
                } catch {
                  // Skip malformed JSON on final flush
                }
              }
            }
          }
          break;
        }
        if (finished) {
          logApi('Stream finished flag set, breaking');
          break;
        }

        bytesReceived += value.byteLength;
        chunkCount += 1;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              logApi('Received [DONE] marker');
              continue;
            }
            try {
              const parsed = JSON.parse(data) as {
                choices?: Array<{
                  delta?: { content?: string };
                  finish_reason?: string;
                }>;
              };
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullContent += content;
              if (parsed.choices?.[0]?.finish_reason) {
                logApi(`finish_reason received: ${parsed.choices[0].finish_reason}, content so far: ${fullContent.length} chars`);
                finished = true;
                break;
              }
            } catch {
              // Skip malformed JSON lines in stream
            }
          }
        }
      }

      logApi(`Returning content, length: ${fullContent.length} chars`);
      return fullContent;
    }

    logApi(`Using responses API format: ${normalizeResponsesUrl(settings.baseUrl)}`);
    const response = await fetch(normalizeResponsesUrl(settings.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        instructions: systemPrompt,
        input: userPrompt
      }),
      signal: controller.signal
    });

    logApi(`responses API status: ${response.status}`);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AI request failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        type?: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };

    logApi(`responses API parsed, output_text length: ${data.output_text?.length ?? 0}`);

  return (
    data.output_text ||
    data.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === 'output_text' && item.text)
      .map((item) => item.text)
      .join('\n') ||
    ''
  );
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`AI request timed out after ${AI_TIMEOUT_MS / 1000} seconds. The AI provider may be slow or unavailable. Try again or check your API settings.`);
    }
    logApi('API call error:', err instanceof Error ? err.message : String(err));
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── MAIN GENERATION FUNCTION ────────────────────────────────────────────────

export async function generateProjectWithOpenAI(
  settings: AiProviderSettings,
  input: AiProjectAssistInput
): Promise<AiProjectAssistResult> {
  if (!settings.apiKey) {
    throw new Error('OpenAI API key is required before AI generation can run.');
  }
  if (!settings.baseUrl) {
    throw new Error('AI base URL must be configured before AI generation can run.');
  }
  if (!settings.model) {
    throw new Error('AI model must be configured before AI generation can run.');
  }

  logApi(`Starting generation for project "${input.name}" (${input.kind}), theme: ${input.themeId}`);
  logApi(`Permissions: ${input.permissions.join(', ') || 'none'}`);
  logApi(`Spec - goal: "${input.spec.goal}", audience: ${input.spec.audience}, primaryAction: "${input.spec.primaryAction}"`);

  const systemPrompt = buildSystemPrompt();
  const attempts: AiProjectAssistResult['attempts'] = [];
  let prompt = buildInitialPrompt(input);
  let label = 'Draft';
  let latestText = '';
  let latestPayload: ParsedAiPayload | null = null;
  let latestIssues: AiGenerationIssue[] = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    logApi(`--- Attempt ${attempt} ---`);
    latestText = await callCompatibleApi(settings, systemPrompt, prompt);
    logApi(`Attempt ${attempt} returned ${latestText.length} chars`);

    if (!latestText) {
      throw new Error('OpenAI returned no text output.');
    }

    logApi(`Extracting JSON payload from response (${latestText.length} chars)`);
    logApi(`Raw response preview (first 500 chars): ${latestText.slice(0, 500)}`);
    latestPayload = extractJsonPayload(latestText);
    logApi(`Payload extracted - source length: ${latestPayload.source.length} chars, has notes: ${!!latestPayload.notes}`);

    latestIssues = validateGeneratedSource(input, latestPayload.source);
    logApi(`Validation complete - ${latestIssues.filter(i => i.severity === 'error').length} errors, ${latestIssues.filter(i => i.severity === 'warning').length} warnings`);

    attempts.push({
      label,
      notes: latestPayload.notes || 'No attempt notes were returned.',
      issues: latestIssues
    });

    const { errors, warnings } = splitIssues(latestIssues);
    const canAccept = errors.length === 0;
    const shouldRepair = (errors.length > 0 || warnings.length > 0) && attempt < 3;

    if (canAccept && !shouldRepair) {
      logApi(`Attempt ${attempt} accepted - ${warnings.length} warnings remain`);
      return {
        source: latestPayload.source,
        notes: latestPayload.notes || 'AI generation completed.',
        rawText: latestText,
        summary: latestPayload.summary || `Accepted on attempt ${attempt} with ${warnings.length} remaining warning(s).`,
        userFlow: latestPayload.userFlow?.length ? latestPayload.userFlow : ['Open the tool', 'Use the main action', 'Review the saved local state'],
        storagePlan: latestPayload.storagePlan?.length ? latestPayload.storagePlan : ['Project-scoped local storage only'],
        attempts,
        finalIssues: latestIssues,
        acceptedOnAttempt: attempt
      };
    }

    if (!shouldRepair) {
      logApi(`No repair needed, breaking`);
      break;
    }

    logApi(`Repair needed - ${errors.length} errors, ${warnings.length} warnings, building repair prompt`);
    prompt = buildRepairPrompt(input, latestPayload.source, latestIssues);
    label = errors.length > 0 ? `Repair ${attempt}` : `Polish ${attempt}`;
  }

  if (!latestPayload) {
    throw new Error('AI generation did not return a usable payload.');
  }

  const { errors, warnings } = splitIssues(latestIssues);
  if (errors.length > 0) {
    throw new Error(`AI validation failed after ${attempts.length} attempts: ${formatIssues(errors)}`);
  }

  return {
    source: latestPayload.source,
    notes: latestPayload.notes || 'AI generation completed with remaining warnings.',
    rawText: latestText,
    summary: latestPayload.summary || `Accepted on attempt ${attempts.length} with ${warnings.length} remaining warning(s).`,
    userFlow: latestPayload.userFlow?.length ? latestPayload.userFlow : ['Open the tool', 'Use the main action', 'Review the saved local state'],
    storagePlan: latestPayload.storagePlan?.length ? latestPayload.storagePlan : ['Project-scoped local storage only'],
    attempts,
    finalIssues: latestIssues,
    acceptedOnAttempt: attempts.length
  };
}

export async function runProjectAiRequestWithOpenAI(
  settings: AiProviderSettings,
  input: ProjectAiRequest
): Promise<ProjectAiResponse> {
  if (!settings.apiKey) {
    throw new Error('OpenAI API key is required before project AI can run.');
  }
  if (!settings.baseUrl) {
    throw new Error('AI base URL must be configured before AI generation can run.');
  }
  if (!settings.model) {
    throw new Error('AI model must be configured before AI generation can run.');
  }

  const systemPrompt =
    input.systemPrompt?.trim() ||
    'You are assisting inside a local desktop app. Respond with concise, directly usable text.';
  const text = await callCompatibleApi(settings, systemPrompt, input.prompt);

  if (!text.trim()) {
    throw new Error('The AI provider returned no text.');
  }

  return { text: text.trim() };
}
