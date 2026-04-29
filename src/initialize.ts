import { CommandType, DocumentContainer, PaletteView, PropertyGridWithHeader } from '@node-projects/web-component-designer';
import { CodeViewMonaco } from '@node-projects/web-component-designer-codeview-monaco';
import { defaultBpmnDocument } from './defaultBpmnDocument.js';
import { primeBpmnConnectionRouting } from './services/BpmnConnectionRouting.js';
import { createBpmnDesignerServiceContainer } from './setupBpmnDesignerServiceContainer.js';

type RecentDocument = {
  name: string;
  content: string;
  updatedAt: number;
};

type SaveFilePickerHandle = {
  name?: string;
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type WindowWithFilePicker = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFilePickerHandle>;
};

const recentDocumentsStorageKey = 'bpnm-editor.recent-documents';
const maxRecentDocuments = 6;

const paletteView = document.getElementById('palette-view') as PaletteView;
const propertyGrid = document.getElementById('property-grid') as PropertyGridWithHeader;
const documentHost = document.getElementById('document-host') as HTMLDivElement;
const canvasPanel = document.getElementById('canvas-panel') as HTMLElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const fileName = document.getElementById('file-name') as HTMLDivElement;
const recentDocumentsContainer = document.getElementById('recent-documents') as HTMLDivElement;
const dropHint = document.getElementById('drop-hint') as HTMLDivElement;
const openButton = document.getElementById('open-button') as HTMLButtonElement;
const saveButton = document.getElementById('save-button') as HTMLButtonElement;
const saveAsButton = document.getElementById('save-as-button') as HTMLButtonElement;
const sampleButton = document.getElementById('sample-button') as HTMLButtonElement;
const undoButton = document.getElementById('undo-button') as HTMLButtonElement;
const redoButton = document.getElementById('redo-button') as HTMLButtonElement;
const copyButton = document.getElementById('copy-button') as HTMLButtonElement;
const pasteButton = document.getElementById('paste-button') as HTMLButtonElement;
const selectAllButton = document.getElementById('select-all-button') as HTMLButtonElement;
const deleteButton = document.getElementById('delete-button') as HTMLButtonElement;

const serviceContainer = createBpmnDesignerServiceContainer();
serviceContainer.config.codeViewWidget = CodeViewMonaco;

const documentContainer = new DocumentContainer(serviceContainer);
documentContainer.style.width = '100%';
documentContainer.style.height = '100%';
documentHost.appendChild(documentContainer);

const codeView = documentContainer.codeView as CodeViewMonaco;
codeView.language = 'xml';
codeView.theme = 'vs';

paletteView.loadControls(serviceContainer, serviceContainer.getServices('elementsService'));
propertyGrid.serviceContainer = serviceContainer;
propertyGrid.instanceServiceContainer = documentContainer.instanceServiceContainer;

const loadRecentDocuments = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(recentDocumentsStorageKey) ?? '[]') as RecentDocument[];
    return parsed.filter(document => !!document?.name && typeof document.content === 'string').slice(0, maxRecentDocuments);
  } catch {
    return [] as RecentDocument[];
  }
};

let recentDocuments = loadRecentDocuments();
let currentDocumentName = recentDocuments[0]?.name ?? 'sample.bpmn';
let suppressRecentSync = false;
let recentSyncTimer = 0;
let dragDepth = 0;

const persistRecentDocuments = () => {
  localStorage.setItem(recentDocumentsStorageKey, JSON.stringify(recentDocuments));
};

const renderRecentDocuments = () => {
  recentDocumentsContainer.replaceChildren();

  if (!recentDocuments.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'recent-empty';
    emptyState.textContent = 'Opened diagrams are stored here for quick reloads.';
    recentDocumentsContainer.appendChild(emptyState);
    return;
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  recentDocuments.forEach((documentEntry, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recent-document';
    button.dataset.recentIndex = `${index}`;

    const name = document.createElement('span');
    name.textContent = documentEntry.name;

    const timestamp = document.createElement('time');
    timestamp.textContent = formatter.format(documentEntry.updatedAt);

    button.append(name, timestamp);
    recentDocumentsContainer.appendChild(button);
  });
};

const rememberDocument = (name: string, content: string) => {
  const normalizedName = name.trim() || 'diagram.bpmn';
  recentDocuments = [
    { name: normalizedName, content, updatedAt: Date.now() },
    ...recentDocuments.filter(document => document.name !== normalizedName)
  ].slice(0, maxRecentDocuments);
  persistRecentDocuments();
  renderRecentDocuments();
};

const downloadXml = (name: string, xml: string) => {
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const setDropActive = (active: boolean) => {
  canvasPanel.classList.toggle('drop-active', active);
  dropHint.hidden = !active;
};

const setFileName = (name: string) => {
  currentDocumentName = name;
  fileName.textContent = name;
};

const setContent = async (xml: string, name: string, remember = true) => {
  suppressRecentSync = true;
  setFileName(name);
  await documentContainer.setContentAsync(xml);
  primeBpmnConnectionRouting(documentContainer.instanceServiceContainer);
  suppressRecentSync = false;
  if (remember) {
    rememberDocument(currentDocumentName, documentContainer.content);
  }
};

const commandButtons = [
  { button: undoButton, command: CommandType.undo },
  { button: redoButton, command: CommandType.redo },
  { button: copyButton, command: CommandType.copy },
  { button: pasteButton, command: CommandType.paste },
  { button: selectAllButton, command: CommandType.selectAll },
  { button: deleteButton, command: CommandType.delete }
] as const;

const runCommand = (command: CommandType) => {
  hideHistoryMenu();
  if (!documentContainer.canExecuteCommand({ type: command })) {
    return;
  }
  documentContainer.executeCommand({ type: command });
  queueMicrotask(syncCommandButtonState);
};

type HistoryDirection = 'undo' | 'redo';

const historyHoldDelayMs = 420;
const historyMaxItems = 18;
let historyDirection: HistoryDirection | null = null;
let historyAnchorButton: HTMLButtonElement | null = null;
let historyHoldTimer = 0;
let historyHoldTriggered = false;

const historyMenu = document.createElement('div');
historyMenu.className = 'history-menu';
historyMenu.hidden = true;
historyMenu.innerHTML = '<div class="history-menu-title"></div><div class="history-menu-items"></div>';
document.body.appendChild(historyMenu);

const historyStyle = document.createElement('style');
historyStyle.textContent = `
  .history-menu {
    position: fixed;
    z-index: 2000;
    min-width: 280px;
    max-width: min(420px, calc(100vw - 24px));
    max-height: min(52vh, 420px);
    overflow: auto;
    border-radius: 14px;
    border: 1px solid rgba(17, 33, 31, 0.18);
    background: #fffef9;
    box-shadow: 0 20px 44px rgba(16, 33, 31, 0.24);
    padding: 10px;
  }
  .history-menu-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #415754;
    padding: 4px 6px 8px;
  }
  .history-menu-items {
    display: grid;
    gap: 4px;
  }
  .history-menu-item {
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: #132423;
    padding: 8px 10px;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 10px;
    text-align: left;
    width: 100%;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
  }
  .history-menu-item:hover {
    background: rgba(11, 122, 117, 0.11);
  }
  .history-menu-item-count {
    font-size: 11px;
    font-weight: 700;
    color: #0b7a75;
  }
  .history-menu-empty {
    color: #5f7370;
    font-size: 13px;
    padding: 8px 10px;
  }
`;
document.head.appendChild(historyStyle);

const executeHistorySteps = (direction: HistoryDirection, steps: number) => {
  const command = direction === 'undo' ? CommandType.undo : CommandType.redo;
  for (let i = 0; i < steps; i += 1) {
    if (!documentContainer.canExecuteCommand({ type: command })) {
      break;
    }
    documentContainer.executeCommand({ type: command });
  }
  queueMicrotask(syncCommandButtonState);
};

const getHistoryEntries = (direction: HistoryDirection) => {
  const undoService = documentContainer.instanceServiceContainer.undoService;
  const entries = direction === 'undo'
    ? Array.from(undoService.getUndoEntries(historyMaxItems))
    : Array.from(undoService.getRedoEntries(historyMaxItems));
  return entries.map((entry, index) => ({
    title: entry.title?.trim() || 'Change',
    steps: index + 1
  }));
};

function hideHistoryMenu() {
  historyMenu.hidden = true;
  historyDirection = null;
  historyAnchorButton = null;
}

const renderHistoryMenu = (direction: HistoryDirection, anchorButton: HTMLButtonElement) => {
  const title = historyMenu.querySelector('.history-menu-title') as HTMLDivElement;
  const itemsContainer = historyMenu.querySelector('.history-menu-items') as HTMLDivElement;
  const entries = getHistoryEntries(direction);

  title.textContent = direction === 'undo' ? 'Undo History' : 'Redo History';
  itemsContainer.replaceChildren();

  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'history-menu-empty';
    empty.textContent = direction === 'undo' ? 'Nothing to undo.' : 'Nothing to redo.';
    itemsContainer.appendChild(empty);
  } else {
    for (const entry of entries) {
      const itemButton = document.createElement('button');
      itemButton.type = 'button';
      itemButton.className = 'history-menu-item';

      const count = document.createElement('span');
      count.className = 'history-menu-item-count';
      count.textContent = `${entry.steps}`;

      const label = document.createElement('span');
      label.textContent = entry.title;

      itemButton.append(count, label);
      itemButton.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        executeHistorySteps(direction, entry.steps);
        hideHistoryMenu();
      });

      itemsContainer.appendChild(itemButton);
    }
  }

  historyMenu.hidden = false;
  historyDirection = direction;
  historyAnchorButton = anchorButton;

  const rect = anchorButton.getBoundingClientRect();
  const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - 320));
  historyMenu.style.left = `${left}px`;
  historyMenu.style.top = `${Math.min(window.innerHeight - 16, rect.bottom + 8)}px`;
};

const attachHistoryHoldBehavior = (button: HTMLButtonElement, direction: HistoryDirection, command: CommandType) => {
  button.addEventListener('pointerdown', event => {
    if (button.disabled || event.button !== 0) {
      return;
    }

    historyHoldTriggered = false;
    window.clearTimeout(historyHoldTimer);
    historyHoldTimer = window.setTimeout(() => {
      historyHoldTriggered = true;
      renderHistoryMenu(direction, button);
    }, historyHoldDelayMs);
  });

  button.addEventListener('pointerup', event => {
    if (event.button !== 0) {
      return;
    }

    window.clearTimeout(historyHoldTimer);
    if (!historyHoldTriggered) {
      runCommand(command);
    }
  });

  button.addEventListener('pointercancel', () => {
    window.clearTimeout(historyHoldTimer);
  });

  button.addEventListener('pointerleave', event => {
    if ((event.buttons & 1) !== 1) {
      window.clearTimeout(historyHoldTimer);
    }
  });

  // Keep keyboard activation behavior (Enter/Space) when detail is 0.
  button.addEventListener('click', event => {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.detail === 0) {
      runCommand(command);
    }
  });
};

function syncCommandButtonState() {
  for (const { button, command } of commandButtons) {
    button.disabled = !documentContainer.canExecuteCommand({ type: command });
  }
}

const loadFile = async (file: File) => {
  const text = await file.text();
  await setContent(text, file.name);
  fileInput.value = '';
};

const saveCurrentDocumentAs = async () => {
  const xml = documentContainer.content;
  const pickerWindow = window as WindowWithFilePicker;
  if (pickerWindow.showSaveFilePicker) {
    try {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName: currentDocumentName,
        types: [{
          description: 'BPMN XML',
          accept: { 'application/xml': ['.bpmn', '.xml'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(xml);
      await writable.close();
      if (handle.name) {
        setFileName(handle.name);
      }
      rememberDocument(currentDocumentName, xml);
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error(error);
    }
  }

  const fileNameSuggestion = window.prompt('Save BPMN XML as', currentDocumentName)?.trim();
  if (!fileNameSuggestion) {
    return;
  }
  setFileName(fileNameSuggestion);
  rememberDocument(fileNameSuggestion, xml);
  downloadXml(fileNameSuggestion, xml);
};

openButton.onclick = () => fileInput.click();
sampleButton.onclick = () => {
  void setContent(defaultBpmnDocument, 'sample.bpmn');
};
saveButton.onclick = () => {
  const xml = documentContainer.content;
  rememberDocument(currentDocumentName, xml);
  downloadXml(currentDocumentName, xml);
};
saveAsButton.onclick = () => {
  void saveCurrentDocumentAs();
};
attachHistoryHoldBehavior(undoButton, 'undo', CommandType.undo);
attachHistoryHoldBehavior(redoButton, 'redo', CommandType.redo);
copyButton.onclick = () => runCommand(CommandType.copy);
pasteButton.onclick = () => runCommand(CommandType.paste);
selectAllButton.onclick = () => runCommand(CommandType.selectAll);
deleteButton.onclick = () => runCommand(CommandType.delete);
fileInput.onchange = async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    return;
  }
  await loadFile(file);
};

recentDocumentsContainer.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest('[data-recent-index]') as HTMLButtonElement | null;
  if (!target) {
    return;
  }

  const index = Number.parseInt(target.dataset.recentIndex ?? '', 10);
  const recentDocument = recentDocuments[index];
  if (recentDocument) {
    void setContent(recentDocument.content, recentDocument.name);
  }
});

document.addEventListener('dragenter', event => {
  if (!event.dataTransfer?.types.includes('Files')) {
    return;
  }
  event.preventDefault();
  dragDepth += 1;
  setDropActive(true);
});

document.addEventListener('dragover', event => {
  if (!event.dataTransfer?.types.includes('Files')) {
    return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  setDropActive(true);
});

document.addEventListener('dragleave', event => {
  if (!event.dataTransfer?.types.includes('Files')) {
    return;
  }
  event.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) {
    setDropActive(false);
  }
});

document.addEventListener('drop', event => {
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (!files.length) {
    return;
  }

  event.preventDefault();
  dragDepth = 0;
  setDropActive(false);
  const [file] = files.filter(candidate => /\.(bpmn|xml)$/i.test(candidate.name) || candidate.type.includes('xml'));
  if (file) {
    void loadFile(file);
  }
});

document.addEventListener('pointerdown', event => {
  if (historyMenu.hidden) {
    return;
  }

  const target = event.target as Node | null;
  if (!target) {
    hideHistoryMenu();
    return;
  }

  if (historyMenu.contains(target)) {
    return;
  }

  if (undoButton.contains(target) || redoButton.contains(target)) {
    return;
  }

  hideHistoryMenu();
});

window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !historyMenu.hidden) {
    hideHistoryMenu();
  }
});

window.addEventListener('resize', () => {
  if (!historyMenu.hidden && historyDirection && historyAnchorButton) {
    renderHistoryMenu(historyDirection, historyAnchorButton);
  }
});

documentContainer.instanceServiceContainer.onContentChanged.on(() => {
  if (suppressRecentSync) {
    return;
  }
  window.clearTimeout(recentSyncTimer);
  recentSyncTimer = window.setTimeout(() => rememberDocument(currentDocumentName, documentContainer.content), 250);
});

documentContainer.onContentChanged.on(event => {
  if (event.source === 'code') {
    primeBpmnConnectionRouting(documentContainer.instanceServiceContainer);
  }
  syncCommandButtonState();
});

documentContainer.instanceServiceContainer.selectionService.onSelectionChanged.on(() => {
  syncCommandButtonState();
});

documentContainer.instanceServiceContainer.undoService.onTransaction.on(() => {
  syncCommandButtonState();
  if (!historyMenu.hidden && historyDirection && historyAnchorButton) {
    renderHistoryMenu(historyDirection, historyAnchorButton);
  }
});

window.addEventListener('focus', () => {
  syncCommandButtonState();
});

renderRecentDocuments();

const initialRecentDocument = recentDocuments[0];
await setContent(initialRecentDocument?.content ?? defaultBpmnDocument, initialRecentDocument?.name ?? 'sample.bpmn');
syncCommandButtonState();