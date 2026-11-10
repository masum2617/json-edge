import type { ClientMessage, HostMessage } from '../protocol';
import type {
  FieldDescriptor,
  GeneratedCase,
  MutationKind,
} from '../core/types';

declare function acquireVsCodeApi(): {
  postMessage(message: ClientMessage): void;
};

// VS Code's API stays inside this closure. No payload goes into persistent state.
(() => {
  const vscode = acquireVsCodeApi();
  function element<T extends HTMLElement>(id: string): T {
    const item = document.getElementById(id);
    if (!item) throw new Error(`Missing UI element: ${id}`);
    return item as T;
  }
  const input = element<HTMLTextAreaElement>('json-input');
  const formatButton = element<HTMLButtonElement>('format-input');
  const dummyButton = element<HTMLButtonElement>('dummy-input');
  const search = element<HTMLInputElement>('field-search');
  const generate = element<HTMLButtonElement>('generate');
  const copy = element<HTMLButtonElement>('copy');
  const exportButton = element<HTMLButtonElement>('export');
  let revision = 0;
  let fields: FieldDescriptor[] = [];
  let selectedFields = new Set<string>();
  let cases: GeneratedCase[] = [];
  let selectedCases = new Set<string>();
  let activeCase: string | undefined;
  let fresh = false;
  let valid = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pendingGeneration = false;
  let pendingPreparation = false;

  function send(message: ClientMessage): void {
    vscode.postMessage(message);
  }
  function status(message: string, error = false): void {
    const target = element('status');
    target.textContent = message;
    target.dataset.error = String(error);
  }
  function methods(): MutationKind[] {
    return [
      ...document.querySelectorAll<HTMLInputElement>(
        '#mutations input:checked',
      ),
    ].map((item) => item.value as MutationKind);
  }
  function controls(): void {
    generate.disabled =
      !valid ||
      !selectedFields.size ||
      !methods().length ||
      pendingGeneration ||
      pendingPreparation;
    formatButton.disabled = pendingPreparation || !input.value.trim();
    dummyButton.disabled = pendingPreparation || !input.value.trim();
    element<HTMLButtonElement>('load-editor').disabled = pendingPreparation;
    copy.disabled = !fresh || !activeCase;
    exportButton.disabled = !fresh || !selectedCases.size;
    element<HTMLButtonElement>('select-fields').disabled = !fields.length;
    element('select-fields').textContent =
      fields.length && selectedFields.size === fields.length
        ? 'Deselect all'
        : 'Select all';
    element<HTMLButtonElement>('select-cases').disabled =
      !fresh || !cases.length;
    element('select-cases').textContent =
      cases.length && selectedCases.size === cases.length
        ? 'Deselect all'
        : 'Select all';
  }
  function invalidate(): void {
    element('copy-feedback').textContent = '';
    pendingPreparation = false;
    revision++;
    fresh = false;
    pendingGeneration = false;
    send({ type: 'invalidate', revision });
    if (cases.length) {
      element('result-state').textContent = 'Outdated — generate again';
      status('Generated files are outdated. Generate again to copy or save.');
    }
    controls();
  }
  function analyze(): void {
    clearTimeout(timer);
    if (new TextEncoder().encode(input.value).length > 1024 * 1024) {
      valid = false;
      element('input-error').textContent =
        'Input exceeds the 1 MiB limit. Use a smaller example.';
      controls();
      return;
    }
    send({ type: 'analyze', revision, text: input.value });
  }
  function inputChanged(): void {
    pendingPreparation = false;
    element('input-note').textContent = '';
    invalidate();
    valid = false;
    fields = [];
    selectedFields.clear();
    renderFields();
    controls();
    element('input-error').textContent = '';
    timer = setTimeout(analyze, 250);
  }
  function renderFields(): void {
    const list = element('fields');
    list.replaceChildren();
    element('field-count').textContent =
      `${selectedFields.size}/${fields.length}`;
    const query = search.value.toLowerCase();
    const visible = fields.filter((field) =>
      field.pointer.toLowerCase().includes(query),
    );
    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = fields.length
        ? 'No matching fields.'
        : 'Paste a JSON object to list its fields.';
      list.append(empty);
      return;
    }
    // Large inputs render at most 200 rows; searching narrows the available list.
    for (const field of visible.slice(0, 200)) {
      const row = document.createElement('div');
      row.className = 'field-row';
      const label = document.createElement('label');
      label.className = 'choice';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selectedFields.has(field.pointer);
      const text = document.createElement('span');
      text.textContent = field.pointer;
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedFields.add(field.pointer);
        else selectedFields.delete(field.pointer);
        invalidate();
        element('field-count').textContent =
          `${selectedFields.size}/${fields.length}`;
      });
      label.append(checkbox, text);
      const type = document.createElement('span');
      type.className = 'type';
      type.textContent = field.type;
      row.append(label, type);
      list.append(row);
    }
    if (visible.length > 200) {
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'Showing 200 matches. Search to find more fields.';
      list.append(hint);
    }
  }
  function preview(id: string): void {
    element('copy-feedback').textContent = '';
    activeCase = id;
    const item = cases.find((entry) => entry.id === id);
    if (!item) return;
    element('preview-title').textContent = item.filename;
    element('explanation').textContent = item.explanation;
    element('preview-json').textContent = item.json;
    for (const row of document.querySelectorAll<HTMLElement>('.case-row'))
      row.dataset.active = String(row.dataset.id === id);
    for (const button of document.querySelectorAll<HTMLElement>(
      '.case-row button',
    )) {
      const active = button.dataset.id === id;
      button.setAttribute('aria-pressed', String(active));
      button.tabIndex = active ? 0 : -1;
    }
    controls();
  }
  function renderCases(): void {
    const list = element('cases');
    list.replaceChildren();
    for (const [index, item] of cases.entries()) {
      const row = document.createElement('li');
      row.className = 'case-row';
      row.dataset.id = item.id;
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selectedCases.has(item.id);
      checkbox.setAttribute('aria-label', `Export ${item.title}`);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedCases.add(item.id);
        else selectedCases.delete(item.id);
        controls();
      });
      const button = document.createElement('button');
      const icon = document.createElement('span');
      icon.className = 'file-icon';
      icon.textContent = '{ }';
      icon.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'file-label';
      const name = document.createElement('strong');
      name.textContent = item.filename;
      const description = document.createElement('small');
      description.textContent = item.title;
      label.append(name, description);
      button.append(icon, label);
      button.setAttribute('aria-label', `${item.filename} — ${item.title}`);
      button.dataset.id = item.id;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => preview(item.id));
      // Roving focus gives keyboard users one Tab stop for up to 250 files.
      button.addEventListener('keydown', (event: KeyboardEvent) => {
        let next: number;
        if (event.key === 'ArrowDown')
          next = Math.min(index + 1, cases.length - 1);
        else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0);
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = cases.length - 1;
        else return;
        event.preventDefault();
        const target = cases[next];
        if (!target) return;
        preview(target.id);
        list
          .querySelectorAll<HTMLButtonElement>('.case-row button')
          [next]?.focus();
      });
      row.append(checkbox, button);
      list.append(row);
    }
    if (!cases.length) {
      const message = document.createElement('li');
      message.className = 'empty';
      message.textContent =
        'No applicable cases. Choose different fields or variations.';
      list.append(message);
    }
    const selected = cases.find((item) => item.id === activeCase) ?? cases[0];
    if (selected) preview(selected.id);
    else {
      activeCase = undefined;
      element('preview-json').textContent = '{ }';
      element('preview-title').textContent = 'JSON preview';
      element('explanation').textContent = 'No case selected.';
    }
    controls();
  }
  // Indent the unfinished document locally; reserializing it on every keystroke
  // would move the caret and destroy incomplete properties while the user types.
  input.addEventListener('keydown', (event: KeyboardEvent) => {
    if (
      event.key !== 'Enter' ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const before = input.value.slice(0, start);
    const line = before.slice(before.lastIndexOf('\n') + 1);
    const indent = line.match(/^[\t ]*/)?.[0] ?? '';
    // Ignore braces inside strings when deciding whether this opens a new block.
    let quoted = false;
    let escaped = false;
    for (const char of before) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\' && quoted) {
        escaped = true;
        continue;
      }
      if (char === '"') quoted = !quoted;
    }
    const opens = !quoted && /[\[{]\s*$/.test(line);
    const inner = indent + (opens ? '  ' : '');
    const closing = opens && /^[\t ]*[}\]]/.test(input.value.slice(end));
    const insertion = '\n' + inner + (closing ? '\n' + indent : '');
    input.setRangeText(insertion, start, end, 'end');
    input.setSelectionRange(start + 1 + inner.length, start + 1 + inner.length);
    inputChanged();
  });
  input.addEventListener('input', inputChanged);
  input.addEventListener('blur', () => {
    if (!valid) analyze();
  });
  search.addEventListener('input', renderFields);
  function prepare(type: 'loadEditor' | 'format' | 'dummy'): void {
    clearTimeout(timer);
    invalidate();
    pendingPreparation = true;
    controls();
    status(
      type === 'loadEditor' ? 'Loading editor selection…' : 'Preparing JSON…',
    );
    if (type === 'loadEditor') send({ type, revision });
    else send({ type, revision, text: input.value });
  }
  element('load-editor').addEventListener('click', () => prepare('loadEditor'));
  formatButton.addEventListener('click', () => prepare('format'));
  dummyButton.addEventListener('click', () => prepare('dummy'));
  element('sample').addEventListener('click', () => {
    input.value = JSON.stringify(
      {
        name: 'Alex',
        email: 'alex@example.com',
        age: 25,
        address: { city: 'Dhaka' },
        tags: ['customer'],
      },
      null,
      2,
    );
    inputChanged();
  });
  element('mutations').addEventListener('change', () => {
    invalidate();
    // An option change can overtake an in-flight field-analysis response.
    // Request the same input under the new revision so the field list can recover.
    if (!valid) analyze();
  });
  element('select-fields').addEventListener('click', () => {
    selectedFields =
      selectedFields.size === fields.length
        ? new Set()
        : new Set(fields.map((field) => field.pointer));
    invalidate();
    renderFields();
  });
  generate.addEventListener('click', () => {
    fresh = false;
    pendingGeneration = true;
    controls();
    status('Generating candidate inputs…');
    send({
      type: 'generate',
      revision,
      text: input.value,
      fields: [...selectedFields],
      mutations: methods(),
    });
  });
  copy.addEventListener('click', () => {
    element('copy-feedback').textContent = '';
    if (fresh && activeCase)
      send({ type: 'copy', revision, ids: [activeCase] });
  });
  exportButton.addEventListener('click', () => {
    if (fresh) send({ type: 'export', revision, ids: [...selectedCases] });
  });
  element('export-options').addEventListener('toggle', () => {
    element('results-section').dataset.saving = String(
      element<HTMLDetailsElement>('export-options').open,
    );
  });
  element('select-cases').addEventListener('click', () => {
    selectedCases =
      selectedCases.size === cases.length
        ? new Set()
        : new Set(cases.map((item) => item.id));
    renderCases();
  });
  window.addEventListener('message', (event: MessageEvent<HostMessage>) => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (
      'revision' in message &&
      message.revision !== undefined &&
      message.revision !== revision
    )
      return;
    switch (message.type) {
      case 'source':
        input.value = message.text;
        inputChanged();
        element('input-note').textContent = message.note ?? '';
        break;
      case 'fields':
        fields = message.fields;
        valid = true;
        selectedFields = new Set(
          [...selectedFields].filter((pointer) =>
            fields.some((field) => field.pointer === pointer),
          ),
        );
        element('input-error').textContent = '';
        element('input-summary').textContent =
          `${fields.length} fields · arrays stay whole`;
        renderFields();
        controls();
        if (!cases.length)
          status(
            fields.length
              ? 'Choose fields and variations, then generate.'
              : 'This object has no fields. Add a property to begin.',
          );
        break;
      case 'results':
        cases = message.cases;
        fresh = true;
        pendingGeneration = false;
        selectedCases = new Set(cases.map((item) => item.id));
        activeCase = cases[0]?.id;
        element('result-count').textContent = `${cases.length} files`;
        element('result-state').textContent = 'In-memory previews';
        element('result-summary').textContent =
          `${message.skipped} unchanged, duplicate, or inapplicable variations skipped. Click a file to preview its JSON, then Copy JSON.`;
        renderCases();
        status(
          `${cases.length} JSON files ready to preview and copy. Files stay in this panel until you choose to save them.`,
        );
        // Put the primary result workflow in view immediately after Generate.
        element('results-section').scrollIntoView({
          block: 'start',
          behavior: 'auto',
        });
        element('cases')
          .querySelector<HTMLButtonElement>('.case-row button')
          ?.focus({ preventScroll: true });
        break;
      case 'error':
        pendingPreparation = false;
        pendingGeneration = false;
        if (!valid) element('input-error').textContent = message.message;
        status(message.message, true);
        controls();
        break;
      case 'notice':
        // Keep copy feedback visible even when the page-level status is above the viewport.
        if (message.message === 'JSON copied to clipboard.')
          element('copy-feedback').textContent = 'Copied';
        status(message.message);
        break;
    }
  });
  controls();
  send({ type: 'ready' });
})();
