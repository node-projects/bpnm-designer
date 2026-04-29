import { DesignItem, EventNames, IDesignerCanvas, ITool, InsertAction, OverlayLayer, ServiceContainer } from '@node-projects/web-component-designer';
import { tagToEntry } from '../services/bpmnRegistry.js';
import { encodeWaypoints, getAnchor, getElementConnectionBounds, pathDataFromWaypoints, routeBetweenBounds, routeBetweenPoints } from '../services/bpmnGeometry.js';

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ConnectNodesToolOptions = {
  tagName: string;
  allowedTags: Set<string>;
  strokeColor: string;
  strokeDashArray?: string;
  strokeWidth?: string;
};

function createIcon(markup: string) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${markup}</svg>`)}`;
}

function fromCurrentElement(currentElement: Element | null | undefined, allowedTags: Set<string>) {
  if (currentElement instanceof HTMLElement && allowedTags.has(currentElement.localName)) {
    return currentElement;
  }
  if (currentElement?.parentElement && allowedTags.has(currentElement.parentElement.localName)) {
    return currentElement.parentElement;
  }
  return null;
}

function findConnectableTarget(event: PointerEvent, currentElement: Element | null | undefined, allowedTags: Set<string>) {
  const directTarget = fromCurrentElement(currentElement, allowedTags);
  if (directTarget) {
    return directTarget;
  }
  for (const part of event.composedPath()) {
    if (part instanceof HTMLElement && allowedTags.has(part.localName)) {
      return part;
    }
  }
  return null;
}

function createStableId(element: HTMLElement) {
  const existing = element.getAttribute('bpmn-id');
  if (existing) {
    return existing;
  }
  const prefix = tagToEntry.get(element.localName)?.defaultIdPrefix ?? 'Element';
  const generated = `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
  element.setAttribute('bpmn-id', generated);
  return generated;
}

export const sequenceFlowIcon = createIcon('<path d="M4 12h12"/><path d="M12 8l4 4-4 4"/>');
export const messageFlowIcon = createIcon('<circle cx="5.5" cy="12" r="2"/><path d="M8.5 12H16" stroke-dasharray="3 3"/><path d="M12.5 8.5 16 12l-3.5 3.5"/>');
export const associationIcon = createIcon('<path d="M4 12h12" stroke-dasharray="3 3"/>');
export const dataInputAssociationIcon = createIcon('<path d="M4 12h12" stroke-dasharray="3 3"/><path d="M12.5 8.5 16 12l-3.5 3.5"/>');
export const dataOutputAssociationIcon = createIcon('<path d="M4 12h12" stroke-dasharray="3 3"/><path d="M12.5 8.5 16 12l-3.5 3.5"/><path d="M4 6v12"/>');

export class ConnectNodesTool implements ITool {
  readonly cursor = 'crosshair';

  private _captureElement?: Element;
  private _pointerId?: number;
  private _previewPath?: SVGPathElement;
  private _sourceElement?: HTMLElement;
  private _sourceBounds?: Rect;

  constructor(private readonly options: ConnectNodesToolOptions) {
  }

  activated(_serviceContainer: ServiceContainer) {
  }

  dispose() {
  }

  pointerEventHandler(designerCanvas: IDesignerCanvas, event: PointerEvent, currentElement: Element) {
    switch (event.type) {
      case EventNames.PointerDown:
        this._begin(designerCanvas, event, currentElement);
        break;
      case EventNames.PointerMove:
        this._update(designerCanvas, event, currentElement);
        break;
      case EventNames.PointerUp:
        this._finish(designerCanvas, event, currentElement);
        break;
    }
  }

  keyboardEventHandler(designerCanvas: IDesignerCanvas, event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this._cleanup(designerCanvas, true);
    }
  }

  private _begin(designerCanvas: IDesignerCanvas, event: PointerEvent, currentElement: Element) {
    const source = findConnectableTarget(event, currentElement, this.options.allowedTags);
    if (!source) {
      return;
    }

    this._sourceElement = source;
    this._sourceBounds = getElementConnectionBounds(designerCanvas, source);
    this._captureElement = event.target as Element;
    this._pointerId = event.pointerId;
    this._captureElement?.setPointerCapture?.(this._pointerId);
    designerCanvas.captureActiveTool(this);

    this._previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this._previewPath.setAttribute('fill', 'none');
    this._previewPath.setAttribute('stroke', this.options.strokeColor);
    this._previewPath.setAttribute('stroke-width', this.options.strokeWidth ?? '2.5');
    if (this.options.strokeDashArray) {
      this._previewPath.setAttribute('stroke-dasharray', this.options.strokeDashArray);
    }
    designerCanvas.overlayLayer.addOverlay(this.constructor.name, this._previewPath, OverlayLayer.Foreground);
    this._update(designerCanvas, event, currentElement);
    event.preventDefault();
    event.stopPropagation();
  }

  private _update(designerCanvas: IDesignerCanvas, event: PointerEvent, currentElement: Element) {
    if (!this._sourceBounds || !this._previewPath) {
      return;
    }

    const pointer = designerCanvas.getNormalizedEventCoordinates(event);
    const target = findConnectableTarget(event, currentElement, this.options.allowedTags);
    const waypoints = target && target !== this._sourceElement
      ? routeBetweenBounds(this._sourceBounds, getElementConnectionBounds(designerCanvas, target))
      : routeBetweenPoints(getAnchor(this._sourceBounds, pointer), pointer);

    this._previewPath.setAttribute('d', pathDataFromWaypoints(waypoints));
    event.preventDefault();
    event.stopPropagation();
  }

  private _finish(designerCanvas: IDesignerCanvas, event: PointerEvent, currentElement: Element) {
    if (!this._sourceElement || !this._sourceBounds) {
      return;
    }

    const target = findConnectableTarget(event, currentElement, this.options.allowedTags);
    if (!target || target === this._sourceElement) {
      this._cleanup(designerCanvas, true);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const waypoints = routeBetweenBounds(this._sourceBounds, getElementConnectionBounds(designerCanvas, target));
    const edge = document.createElement(this.options.tagName) as HTMLElement;
    edge.style.position = 'absolute';
    edge.style.zIndex = '4';
    edge.setAttribute('bpmn-id', `Connection_${Math.random().toString(36).slice(2, 8)}`);
    edge.setAttribute('source-ref', createStableId(this._sourceElement));
    edge.setAttribute('target-ref', createStableId(target));
    edge.setAttribute('waypoints', encodeWaypoints(waypoints));
    if (this.options.tagName !== 'bpmn-message-flow') {
      const processRef = this._sourceElement.getAttribute('process-ref') ?? target.getAttribute('process-ref');
      if (processRef) {
        edge.setAttribute('process-ref', processRef);
      }
    }

    const designItem = DesignItem.createDesignItemFromInstance(edge, designerCanvas.serviceContainer, designerCanvas.instanceServiceContainer);
    designerCanvas.instanceServiceContainer.undoService.execute(
      new InsertAction(designerCanvas.rootDesignItem, designerCanvas.rootDesignItem.childCount, designItem)
    );
    this._cleanup(designerCanvas, true);
    event.preventDefault();
    event.stopPropagation();
  }

  private _cleanup(designerCanvas: IDesignerCanvas, finished: boolean) {
    if (this._previewPath) {
      designerCanvas.overlayLayer.removeOverlay(this._previewPath);
      this._previewPath = undefined;
    }
    if (this._captureElement && this._pointerId !== undefined) {
      this._captureElement.releasePointerCapture?.(this._pointerId);
    }
    this._captureElement = undefined;
    this._pointerId = undefined;
    this._sourceElement = undefined;
    this._sourceBounds = undefined;
    designerCanvas.releaseActiveTool();
    if (finished) {
      designerCanvas.serviceContainer.globalContext.finishedWithTool(this);
    }
  }
}