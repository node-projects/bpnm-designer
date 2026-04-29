import { AbstractExtension, DesignItem, type IDesignItem, type IDesignerCanvas, type IExtensionManager } from '@node-projects/web-component-designer';
import { boundsFromWaypoints, decodeWaypoints, getElementConnectionBounds, routeBetweenBounds } from '../services/bpmnGeometry.js';
import { edgeTags, tagToEntry } from '../services/bpmnRegistry.js';

type ReplacementOption = {
  tag: string;
  label: string;
};

const eventReplacementOptions: ReplacementOption[] = [
  { tag: 'bpmn-start-event', label: 'Start event' },
  { tag: 'bpmn-intermediate-catch-event', label: 'Intermediate catch' },
  { tag: 'bpmn-intermediate-throw-event', label: 'Intermediate throw' },
  { tag: 'bpmn-end-event', label: 'End event' }
];

const boundaryEventReplacementOptions: ReplacementOption[] = [
  { tag: 'bpmn-boundary-event', label: 'Boundary event' },
  ...eventReplacementOptions.filter(option => option.tag !== 'bpmn-start-event')
];

const taskReplacementOptions: ReplacementOption[] = [
  { tag: 'bpmn-task', label: 'Task' },
  { tag: 'bpmn-user-task', label: 'User task' },
  { tag: 'bpmn-service-task', label: 'Service task' },
  { tag: 'bpmn-script-task', label: 'Script task' },
  { tag: 'bpmn-manual-task', label: 'Manual task' },
  { tag: 'bpmn-business-rule-task', label: 'Business rule task' },
  { tag: 'bpmn-send-task', label: 'Send task' },
  { tag: 'bpmn-receive-task', label: 'Receive task' },
  { tag: 'bpmn-call-activity', label: 'Call activity' },
  { tag: 'bpmn-sub-process', label: 'Sub process' }
];

const gatewayReplacementOptions: ReplacementOption[] = [
  { tag: 'bpmn-exclusive-gateway', label: 'Exclusive gateway' },
  { tag: 'bpmn-parallel-gateway', label: 'Parallel gateway' },
  { tag: 'bpmn-inclusive-gateway', label: 'Inclusive gateway' },
  { tag: 'bpmn-event-based-gateway', label: 'Event based gateway' }
];

const dataReplacementOptions: ReplacementOption[] = [
  { tag: 'bpmn-data-object', label: 'Data object' },
  { tag: 'bpmn-data-store', label: 'Data store' }
];

const edgeReplacementOptions: ReplacementOption[] = [
  { tag: 'bpmn-sequence-flow', label: 'Sequence flow' },
  { tag: 'bpmn-message-flow', label: 'Message flow' },
  { tag: 'bpmn-association', label: 'Association' },
  { tag: 'bpmn-data-input-association', label: 'Data input association' },
  { tag: 'bpmn-data-output-association', label: 'Data output association' }
];

function createTemplate() {
  const template = document.createElement('template');
  template.innerHTML = `
    <div class="pad-shell" style="background: transparent; box-shadow: none;">
      <style>
        .pad-shell {
          width: max-content;
          padding: 0 0 0 16px;
          overflow: visible;
          pointer-events: auto;
          user-select: none;
        }

        .pad-shell,
        .pad-shell * {
          pointer-events: auto;
        }

        .pad {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px;
          border-radius: 14px;
          border: 1px solid rgba(23, 49, 45, 0.14);
          background: linear-gradient(180deg, rgba(252, 255, 253, 0.98) 0%, rgba(238, 248, 245, 0.97) 100%);
          box-shadow: 0 14px 28px rgba(15, 38, 34, 0.16);
          color: #142523;
          font: 12px/1.2 "Segoe UI Variable Text", "Segoe UI", sans-serif;
          backdrop-filter: blur(10px);
        }

        .pad::before {
          content: '';
          position: absolute;
          left: -12px;
          top: 17px;
          width: 12px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(50, 103, 92, 0.6) 0%, rgba(203, 225, 218, 0.95) 100%);
        }

        .pad::after {
          content: '';
          position: absolute;
          left: -18px;
          top: 11px;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          border: 2px solid #2a6559;
          background: #f9fffc;
          box-shadow: 0 0 0 3px rgba(232, 245, 240, 0.95);
        }

        .button {
          width: 28px;
          height: 28px;
          border: 1px solid rgba(24, 40, 38, 0.16);
          border-radius: 9px;
          background: linear-gradient(180deg, #ffffff 0%, #f2f8f6 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
        }

        .button:hover {
          border-color: rgba(33, 73, 66, 0.3);
          background: linear-gradient(180deg, #ffffff 0%, #e8f5f1 100%);
          transform: translateY(-1px);
        }

        .button:active {
          transform: translateY(0);
        }

        .button svg {
          width: 14px;
          height: 14px;
          stroke: #1b3632;
          fill: none;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .color-button {
          position: relative;
          overflow: hidden;
        }

        .swatch {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          border: 2px solid rgba(23, 49, 45, 0.16);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.64);
        }

        .swatch.stroke {
          background: transparent;
        }

        .color-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          border: 0;
          padding: 0;
          background: transparent;
          cursor: pointer;
        }

        .replace {
          min-width: 122px;
          height: 28px;
          border-radius: 9px;
          border: 1px solid rgba(24, 40, 38, 0.12);
          background: rgba(255, 255, 255, 0.94);
          padding: 0 28px 0 10px;
          color: #142523;
          font-size: 12px;
          appearance: none;
          background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(241, 248, 245, 0.98) 100%), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23245149' d='M0 0h10L5 6z'/%3E%3C/svg%3E");
          background-repeat: no-repeat, no-repeat;
          background-position: 0 0, calc(100% - 10px) 50%;
          cursor: pointer;
        }
      </style>
      <div class="pad">
        <button id="annotation" class="button" type="button" title="Add text annotation">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4v16"></path><path d="M8 6h10"></path><path d="M8 10h8"></path><path d="M8 14h10"></path></svg>
        </button>
        <button id="delete" class="button" type="button" title="Delete">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="M7 7l1 13h8l1-13"></path></svg>
        </button>
        <label id="fill-field" class="button color-button" title="Fill color">
          <span id="fill-swatch" class="swatch"></span>
          <input id="fill-color" class="color-input" type="color" value="#ffffff" />
        </label>
        <label id="stroke-field" class="button color-button" title="Stroke color">
          <span id="stroke-swatch" class="swatch stroke"></span>
          <input id="stroke-color" class="color-input" type="color" value="#182826" />
        </label>
        <select id="replace" class="replace" title="Change element type">
          <option value="">Change</option>
        </select>
      </div>
    </div>
  `;
  return template;
}

function isEdgeDesignItem(designItem: IDesignItem) {
  return edgeTags.has(designItem.element.localName);
}

function isEventTag(tagName: string) {
  return eventReplacementOptions.some(option => option.tag === tagName) || tagName === 'bpmn-boundary-event';
}

function getReplacementOptions(tagName: string) {
  if (tagName === 'bpmn-boundary-event') {
    return boundaryEventReplacementOptions;
  }
  if (eventReplacementOptions.some(option => option.tag === tagName)) {
    return eventReplacementOptions;
  }
  if (taskReplacementOptions.some(option => option.tag === tagName)) {
    return taskReplacementOptions;
  }
  if (gatewayReplacementOptions.some(option => option.tag === tagName)) {
    return gatewayReplacementOptions;
  }
  if (dataReplacementOptions.some(option => option.tag === tagName)) {
    return dataReplacementOptions;
  }
  if (edgeReplacementOptions.some(option => option.tag === tagName)) {
    return edgeReplacementOptions;
  }
  return [] as ReplacementOption[];
}

function normalizeColorHex(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) {
    return normalized;
  }
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    return `#${normalized.slice(1).split('').map(part => `${part}${part}`).join('')}`;
  }

  const rgbMatch = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return `#${rgbMatch.slice(1, 4).map(part => Number.parseInt(part, 10).toString(16).padStart(2, '0')).join('')}`;
  }

  return fallback;
}

function getVisualColor(designItem: IDesignItem, kind: 'fill' | 'stroke') {
  const element = designItem.element as HTMLElement;
  if (kind === 'fill') {
    const explicitFill = element.getAttribute('fill-color');
    if (explicitFill) {
      return normalizeColorHex(explicitFill, '#ffffff');
    }
    const shape = element.shadowRoot?.getElementById('shape');
    const backgroundColor = shape ? getComputedStyle(shape).backgroundColor : '';
    return normalizeColorHex(backgroundColor, '#ffffff');
  }

  const explicitStroke = element.getAttribute('stroke-color');
  if (explicitStroke) {
    return normalizeColorHex(explicitStroke, isEdgeDesignItem(designItem) ? '#263431' : '#182826');
  }

  const strokeSource = isEdgeDesignItem(designItem)
    ? element.shadowRoot?.getElementById('path')
    : element.shadowRoot?.getElementById('shape');
  const propertyName = isEdgeDesignItem(designItem) ? 'stroke' : 'borderColor';
  const strokeColor = strokeSource ? getComputedStyle(strokeSource)[propertyName as keyof CSSStyleDeclaration] as string : '';
  return normalizeColorHex(strokeColor, isEdgeDesignItem(designItem) ? '#263431' : '#182826');
}

function setAttributeValue(designItem: IDesignItem, name: string, value: string | null | undefined) {
  if (value) {
    designItem.setAttribute(name, value);
  } else {
    designItem.removeAttribute(name);
  }
}

function updateBpmnColors(designItem: IDesignItem, updates: { fillColor?: string; strokeColor?: string }) {
  const group = designItem.openGroup('update BPMN colors');
  let changed = false;

  if (updates.fillColor !== undefined && designItem.getAttribute('fill-color') !== updates.fillColor) {
    setAttributeValue(designItem, 'fill-color', updates.fillColor);
    changed = true;
  }

  if (updates.strokeColor !== undefined && designItem.getAttribute('stroke-color') !== updates.strokeColor) {
    setAttributeValue(designItem, 'stroke-color', updates.strokeColor);
    changed = true;
  }

  if (changed) {
    group.commit();
  } else {
    group.abort();
  }
}

function getDesignItemBounds(designItem: IDesignItem) {
  if (isEdgeDesignItem(designItem)) {
    const waypoints = decodeWaypoints(designItem.element.getAttribute('waypoints'));
    if (waypoints.length >= 2) {
      return boundsFromWaypoints(waypoints);
    }
  }
  return getElementConnectionBounds(designItem.instanceServiceContainer.designerCanvas, designItem.element);
}

function updateSwatch(swatch: HTMLElement, value: string, kind: 'fill' | 'stroke') {
  swatch.style.background = kind === 'fill' ? value : 'transparent';
  swatch.style.borderColor = value;
}

function setAbsoluteBounds(element: HTMLElement, bounds: { x: number; y: number; width: number; height: number }) {
  element.style.position = 'absolute';
  element.style.left = `${Math.round(bounds.x)}px`;
  element.style.top = `${Math.round(bounds.y)}px`;
  element.style.width = `${Math.round(bounds.width)}px`;
  element.style.height = `${Math.round(bounds.height)}px`;
}

function createGeneratedId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function appendTextAnnotation(designItem: IDesignItem) {
  const annotationEntry = tagToEntry.get('bpmn-text-annotation')!;
  const sourceBounds = getDesignItemBounds(designItem);
  const annotationBounds = {
    x: sourceBounds.x + sourceBounds.width + 52,
    y: sourceBounds.y + Math.max(12, sourceBounds.height / 2 - 58),
    width: 170,
    height: 116
  };

  const annotationElement = document.createElement('bpmn-text-annotation') as HTMLElement;
  annotationElement.style.zIndex = annotationEntry.zIndex;
  annotationElement.setAttribute('bpmn-id', createGeneratedId('TextAnnotation'));
  annotationElement.setAttribute('text', '');
  setAbsoluteBounds(annotationElement, annotationBounds);

  const selectedTag = designItem.element.localName;
  const processRef = selectedTag !== 'bpmn-participant' && selectedTag !== 'bpmn-message-flow'
    ? designItem.element.getAttribute('process-ref')
    : null;
  if (processRef) {
    annotationElement.setAttribute('process-ref', processRef);
  }

  const participantRef = designItem.element.getAttribute('participant-ref')
    ?? (selectedTag === 'bpmn-participant' ? designItem.element.getAttribute('bpmn-id') : null);
  if (participantRef) {
    annotationElement.setAttribute('participant-ref', participantRef);
  }

  const annotationItem = DesignItem.createDesignItemFromInstance(annotationElement, designItem.serviceContainer, designItem.instanceServiceContainer);
  const rootDesignItem = designItem.instanceServiceContainer.designerCanvas.rootDesignItem;
  const group = designItem.openGroup('add BPMN text annotation');
  rootDesignItem.insertChild(annotationItem);

  if (!isEdgeDesignItem(designItem)) {
    const associationElement = document.createElement('bpmn-association') as HTMLElement;
    associationElement.style.position = 'absolute';
    associationElement.style.zIndex = tagToEntry.get('bpmn-association')!.zIndex;
    associationElement.setAttribute('bpmn-id', createGeneratedId('Association'));
    associationElement.setAttribute('source-ref', designItem.element.getAttribute('bpmn-id') ?? '');
    associationElement.setAttribute('target-ref', annotationElement.getAttribute('bpmn-id') ?? '');
    associationElement.setAttribute('waypoints', routeBetweenBounds(sourceBounds, annotationBounds).map(point => `${Math.round(point.x)},${Math.round(point.y)}`).join(' '));
    associationElement.setAttribute('data-linked-annotation-offset-x', `${Math.round(annotationBounds.x - sourceBounds.x)}`);
    associationElement.setAttribute('data-linked-annotation-offset-y', `${Math.round(annotationBounds.y - sourceBounds.y)}`);
    if (processRef) {
      associationElement.setAttribute('process-ref', processRef);
    }
    const associationItem = DesignItem.createDesignItemFromInstance(associationElement, designItem.serviceContainer, designItem.instanceServiceContainer);
    rootDesignItem.insertChild(associationItem);
  }

  group.commit();
  designItem.instanceServiceContainer.selectionService.setSelectedElements([annotationItem]);
}

function sanitizeReplacementAttributes(element: HTMLElement, newTagName: string) {
  if (edgeTags.has(newTagName)) {
    element.removeAttribute('fill-color');
    element.removeAttribute('text');
    element.removeAttribute('attached-to-ref');
  } else {
    element.removeAttribute('source-ref');
    element.removeAttribute('target-ref');
    element.removeAttribute('waypoints');
  }

  if (newTagName !== 'bpmn-boundary-event') {
    element.removeAttribute('attached-to-ref');
  }

  if (!isEventTag(newTagName)) {
    element.removeAttribute('event-definition');
  }

  if (newTagName === 'bpmn-text-annotation') {
    const text = element.getAttribute('text') ?? element.getAttribute('name') ?? '';
    if (text) {
      element.setAttribute('text', text);
    } else {
      element.removeAttribute('text');
    }
    element.removeAttribute('name');
  }
}

function replaceBpmnElement(designItem: IDesignItem, newTagName: string) {
  if (!newTagName || designItem.element.localName === newTagName) {
    return;
  }

  const replacementEntry = tagToEntry.get(newTagName);
  if (!replacementEntry) {
    return;
  }

  const replacementElement = document.createElement(newTagName) as HTMLElement;
  for (const [name, value] of designItem.attributes()) {
    replacementElement.setAttribute(name, value);
  }
  const inlineStyle = designItem.element.getAttribute('style');
  if (inlineStyle) {
    replacementElement.setAttribute('style', inlineStyle);
  }
  replacementElement.style.zIndex = replacementEntry.zIndex;
  sanitizeReplacementAttributes(replacementElement, newTagName);

  const replacementItem = DesignItem.createDesignItemFromInstance(replacementElement, designItem.serviceContainer, designItem.instanceServiceContainer);
  const group = designItem.openGroup('replace BPMN element');
  designItem.insertAdjacentElement(replacementItem, 'beforebegin');
  designItem.remove();
  group.commit();
  designItem.instanceServiceContainer.selectionService.setSelectedElements([replacementItem]);
}

export class BpmnContextPadExtension extends AbstractExtension {
  private _toolbar?: ReturnType<AbstractExtension['createToolbar']>;

  constructor(extensionManager: IExtensionManager, designerCanvas: IDesignerCanvas, designItem: IDesignItem) {
    super(extensionManager, designerCanvas, designItem);
  }

  extend() {
    this._toolbar = this.createToolbar(createTemplate(), 254, 42);
    this._toolbar.style.pointerEvents = 'auto';
    const toolbarRoot = this._toolbar.children.item(0) as HTMLElement | null;
    if (toolbarRoot) {
      toolbarRoot.style.pointerEvents = 'auto';
      toolbarRoot.addEventListener('pointerdown', event => event.stopPropagation());
      toolbarRoot.addEventListener('click', event => event.stopPropagation());
      toolbarRoot.addEventListener('dblclick', event => event.stopPropagation());
      toolbarRoot.addEventListener('pointerup', event => event.stopPropagation());
      toolbarRoot.addEventListener('contextmenu', event => event.stopPropagation());
    }

    const deleteButton = this._toolbar.getById<HTMLButtonElement>('delete');
    deleteButton.onclick = () => {
      this.extendedItem.serviceContainer.deletionService.removeItems([this.extendedItem]);
    };

    const annotationButton = this._toolbar.getById<HTMLButtonElement>('annotation');
    annotationButton.style.display = this.extendedItem.element.localName === 'bpmn-text-annotation' ? 'none' : 'inline-flex';
    annotationButton.onclick = () => {
      appendTextAnnotation(this.extendedItem);
    };

    const fillField = this._toolbar.getById<HTMLLabelElement>('fill-field');
    const fillInput = this._toolbar.getById<HTMLInputElement>('fill-color');
    const fillSwatch = this._toolbar.getById<HTMLSpanElement>('fill-swatch');
    if (isEdgeDesignItem(this.extendedItem)) {
      fillField.style.display = 'none';
    } else {
      fillInput.value = getVisualColor(this.extendedItem, 'fill');
      updateSwatch(fillSwatch, fillInput.value, 'fill');
      fillInput.oninput = () => {
        updateSwatch(fillSwatch, fillInput.value, 'fill');
        updateBpmnColors(this.extendedItem, { fillColor: fillInput.value });
      };
    }

    const strokeField = this._toolbar.getById<HTMLLabelElement>('stroke-field');
    const strokeInput = this._toolbar.getById<HTMLInputElement>('stroke-color');
    const strokeSwatch = this._toolbar.getById<HTMLSpanElement>('stroke-swatch');
    strokeInput.value = getVisualColor(this.extendedItem, 'stroke');
    updateSwatch(strokeSwatch, strokeInput.value, 'stroke');
    if (isEdgeDesignItem(this.extendedItem)) {
      strokeField.title = 'Line color';
    }
    strokeInput.oninput = () => {
      updateSwatch(strokeSwatch, strokeInput.value, 'stroke');
      updateBpmnColors(this.extendedItem, { strokeColor: strokeInput.value });
    };

    const replaceSelect = this._toolbar.getById<HTMLSelectElement>('replace');
    const options = getReplacementOptions(this.extendedItem.element.localName);
    if (!options.length) {
      replaceSelect.style.display = 'none';
    } else {
      for (const option of options) {
        const optionElement = document.createElement('option');
        optionElement.value = option.tag;
        optionElement.textContent = option.label;
        optionElement.selected = option.tag === this.extendedItem.element.localName;
        replaceSelect.appendChild(optionElement);
      }
      replaceSelect.onchange = () => {
        replaceBpmnElement(this.extendedItem, replaceSelect.value);
      };
    }

    this.refresh();
  }

  refresh() {
    if (!this._toolbar) {
      return;
    }

    const bounds = getDesignItemBounds(this.extendedItem);
    this._toolbar.updatePosition({
      x: bounds.x + bounds.width + 10 / this.designerCanvas.zoomFactor,
      y: bounds.y - 8 / this.designerCanvas.zoomFactor
    });
  }

  dispose() {
    this._removeAllOverlays();
  }
}

export class BpmnContextPadExtensionProvider {
  shouldExtend(_extensionManager: IExtensionManager, designerCanvas: IDesignerCanvas, designItem: IDesignItem) {
    return !designerCanvas.readOnly && !designItem.isRootItem && tagToEntry.has(designItem.element.localName);
  }

  getExtension(extensionManager: IExtensionManager, designerCanvas: IDesignerCanvas, designItem: IDesignItem) {
    return new BpmnContextPadExtension(extensionManager, designerCanvas, designItem);
  }
}