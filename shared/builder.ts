import type { ProjectKind, ProjectSpec } from './types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateProjectSource(
  projectName: string,
  kind: ProjectKind,
  spec: ProjectSpec
): string {
  const safeName = escapeHtml(projectName || 'Untitled Project');
  const safeGoal = escapeHtml(spec.goal || 'Define the project goal.');
  const safeProblem = escapeHtml(spec.problem || 'No problem statement defined yet.');
  const safeOutcome = escapeHtml(spec.outcome || 'No outcome defined yet.');
  const safePrimaryAction = escapeHtml(
    spec.primaryAction || 'Record the next useful action for the user.'
  );
  const safeDataNotes = escapeHtml(spec.dataNotes || 'No data notes recorded yet.');
  const safeAudience = escapeHtml(spec.audience);
  const safeKind = escapeHtml(kind);

  return [
    `function start(replibot) {`,
    `  const notes = replibot.storage.get('notes') || [];`,
    `  replibot.ui.setTitle(${JSON.stringify(projectName)});`,
    `  replibot.runtime.log('Rendering starter project shell.');`,
    `  replibot.ui.render(\``,
    `    <div class="app-shell">`,
    `      <h1>${safeName}</h1>`,
    `      <p class="rb-text-muted">This ${safeKind} is running inside the Replibot harness.</p>`,
    ``,
    `      <section class="rb-surface">`,
    `        <h3 class="rb-mt-0">Project brief</h3>`,
    `        <dl class="rb-stack">`,
    `          <div><dt class="rb-text-sm rb-text-muted">Goal</dt><dd>${safeGoal}</dd></div>`,
    `          <div><dt class="rb-text-sm rb-text-muted">Audience</dt><dd>${safeAudience}</dd></div>`,
    `          <div><dt class="rb-text-sm rb-text-muted">Problem</dt><dd>${safeProblem}</dd></div>`,
    `          <div><dt class="rb-text-sm rb-text-muted">Outcome</dt><dd>${safeOutcome}</dd></div>`,
    `          <div><dt class="rb-text-sm rb-text-muted">Primary action</dt><dd>${safePrimaryAction}</dd></div>`,
    `          <div><dt class="rb-text-sm rb-text-muted">Data notes</dt><dd>${safeDataNotes}</dd></div>`,
    `        </dl>`,
    `      </section>`,
    ``,
    `      <section class="rb-surface">`,
    `        <h3 class="rb-mt-0 rb-mb-4">Capture a note</h3>`,
    `        <div class="rb-inline rb-gap-2">`,
    `          <input id="note-input" class="rb-input" placeholder="Type your private note here..." aria-label="Private note" />`,
    `          <button id="save-note">Save</button>`,
    `        </div>`,
    `      </section>`,
    ``,
    `      <section class="rb-surface">`,
    `        <h3 class="rb-mt-0 rb-mb-4">Saved notes</h3>`,
    `        <div id="note-list"></div>`,
    `      </section>`,
    `    </div>`,
    `  \`);`,
    ``,
    `  function renderNotes() {`,
    `    const list = document.getElementById('note-list');`,
    `    if (!list) return;`,
    `    if (!Array.isArray(notes) || notes.length === 0) {`,
    `      list.innerHTML = '<div class="rb-empty"><p class="rb-empty-title">No notes yet</p><p class="rb-text-sm">Capture your first note above.</p></div>';`,
    `      return;`,
    `    }`,
    `    let html = '';`,
    `    for (let i = 0; i < notes.length; i++) {`,
    `      html += '<div class="rb-surface rb-inline rb-justify-between rb-items-center rb-mb-2"><span>' + (i + 1) + '. ' + notes[i] + '</span></div>';`,
    `    }`,
    `    list.innerHTML = html;`,
    `  }`,
    ``,
    `  document.getElementById('save-note')?.addEventListener('click', () => {`,
    `    const input = document.getElementById('note-input');`,
    `    const value = input && 'value' in input ? String(input.value || '').trim() : '';`,
    `    if (!value) {`,
    `      replibot.ui.notify('Enter a note before saving.');`,
    `      return;`,
    `    }`,
    `    notes.push(value);`,
    `    replibot.storage.set('notes', notes);`,
    `    replibot.ui.notify('Saved a private note.');`,
    `    if (input && 'value' in input) input.value = '';`,
    `    renderNotes();`,
    `  });`,
    ``,
    `  renderNotes();`,
    `}`,
    ``
  ].join('\n');
}
