import { css } from '@node-projects/base-custom-webcomponent';
import { AbstractExtension, IDesignItem, IDesignerCanvas, IDesignerExtension, IDesignerExtensionProvider, IExtensionManager } from '@node-projects/web-component-designer';
import { BpmnConnectionBase } from '../widgets/BpmnConnectionBase.js';
import { decodeWaypoints, encodeWaypoints } from '../services/bpmnGeometry.js';
import { edgeTags } from '../services/bpmnRegistry.js';

type WaypointPoint = { x: number; y: number };

class BpmnConnectionEditExtension extends AbstractExtension implements IDesignerExtension {
  private _waypointCircles: SVGCircleElement[] = [];
  private _midpointCircles: SVGCircleElement[] = [];

  // Drag state
  private _dragIndex: number | null = null;
  private _dragIsMidpoint = false;
  private _waypoints: WaypointPoint[] = [];

  constructor(extensionManager: IExtensionManager, designerView: IDesignerCanvas, extendedItem: IDesignItem) {
    super(extensionManager, designerView, extendedItem);
  }

  extend(cache: Record<string | symbol, any>, event?: Event): void {
    this.refresh(cache, event);
  }

  refresh(_cache: Record<string | symbol, any>, _event?: Event): void {
    const connection = this.extendedItem.element as HTMLElement;
    const waypoints = decodeWaypoints(connection.getAttribute('waypoints'));
    if (waypoints.length < 2) {
      this._removeAllOverlays();
      this._waypointCircles = [];
      this._midpointCircles = [];
      return;
    }

    const zoom = this.designerCanvas.zoomFactor;
    const r = 5 / zoom;

    // Create or reuse waypoint circles
    while (this._waypointCircles.length < waypoints.length) {
      const idx = this._waypointCircles.length;
      const circle = this._drawCircle(0, 0, r, 'bpmn-waypoint-handle');
      circle.style.strokeWidth = (1.5 / zoom).toString();
      circle.style.cursor = 'move';
      circle.style.pointerEvents = 'auto';
      circle.addEventListener('pointerdown', (e) => this._onWaypointDown(e, idx));
      circle.addEventListener('pointermove', (e) => this._onPointerMove(e));
      circle.addEventListener('pointerup', (e) => this._onPointerUp(e));
      this._waypointCircles.push(circle);
    }
    while (this._waypointCircles.length > waypoints.length) {
      const removed = this._waypointCircles.pop()!;
      removed.remove();
      this.overlays.splice(this.overlays.indexOf(removed), 1);
    }

    // Create or reuse midpoint circles (one per segment)
    const segCount = waypoints.length - 1;
    while (this._midpointCircles.length < segCount) {
      const idx = this._midpointCircles.length;
      const circle = this._drawCircle(0, 0, r * 0.75, 'bpmn-midpoint-handle');
      circle.style.strokeWidth = (1 / zoom).toString();
      circle.style.cursor = 'move';
      circle.style.pointerEvents = 'auto';
      circle.addEventListener('pointerdown', (e) => this._onMidpointDown(e, idx));
      circle.addEventListener('pointermove', (e) => this._onPointerMove(e));
      circle.addEventListener('pointerup', (e) => this._onPointerUp(e));
      this._midpointCircles.push(circle);
    }
    while (this._midpointCircles.length > segCount) {
      const removed = this._midpointCircles.pop()!;
      removed.remove();
      this.overlays.splice(this.overlays.indexOf(removed), 1);
    }

    // Position waypoint circles
    for (let i = 0; i < waypoints.length; i++) {
      const cx = waypoints[i].x * zoom;
      const cy = waypoints[i].y * zoom;
      const circle = this._waypointCircles[i];
      circle.setAttribute('cx', cx.toString());
      circle.setAttribute('cy', cy.toString());
      circle.setAttribute('r', r.toString());
      circle.style.strokeWidth = (1.5 / zoom).toString();
    }

    // Position midpoint circles
    for (let i = 0; i < segCount; i++) {
      const mx = (waypoints[i].x + waypoints[i + 1].x) / 2 * zoom;
      const my = (waypoints[i].y + waypoints[i + 1].y) / 2 * zoom;
      const circle = this._midpointCircles[i];
      circle.setAttribute('cx', mx.toString());
      circle.setAttribute('cy', my.toString());
      circle.setAttribute('r', (r * 0.75).toString());
      circle.style.strokeWidth = (1 / zoom).toString();
    }
  }

  private _onWaypointDown(event: PointerEvent, index: number): void {
    event.stopPropagation();
    event.preventDefault();
    this._waypoints = decodeWaypoints(this.extendedItem.element.getAttribute('waypoints'));
    this._dragIndex = index;
    this._dragIsMidpoint = false;
    (event.target as Element).setPointerCapture(event.pointerId);
  }

  private _onMidpointDown(event: PointerEvent, segmentIndex: number): void {
    event.stopPropagation();
    event.preventDefault();
    const existing = decodeWaypoints(this.extendedItem.element.getAttribute('waypoints'));
    const mid: WaypointPoint = {
      x: (existing[segmentIndex].x + existing[segmentIndex + 1].x) / 2,
      y: (existing[segmentIndex].y + existing[segmentIndex + 1].y) / 2
    };
    // Insert new waypoint at midpoint position
    existing.splice(segmentIndex + 1, 0, mid);
    this._waypoints = existing;
    this._dragIndex = segmentIndex + 1;
    this._dragIsMidpoint = true;
    // Preview immediately
    const conn = this.extendedItem.element as BpmnConnectionBase;
    conn.setPreviewWaypoints(encodeWaypoints(this._waypoints));
    (event.target as Element).setPointerCapture(event.pointerId);
  }

  private _onPointerMove(event: PointerEvent): void {
    if (this._dragIndex === null) return;
    event.stopPropagation();
    event.preventDefault();
    const pos = this.designerCanvas.getNormalizedEventCoordinates(event);
    this._waypoints[this._dragIndex] = { x: pos.x, y: pos.y };
    const conn = this.extendedItem.element as BpmnConnectionBase;
    conn.setPreviewWaypoints(encodeWaypoints(this._waypoints));
  }

  private _onPointerUp(event: PointerEvent): void {
    if (this._dragIndex === null) return;
    event.stopPropagation();
    event.preventDefault();
    (event.target as Element).releasePointerCapture(event.pointerId);

    const pos = this.designerCanvas.getNormalizedEventCoordinates(event);
    this._waypoints[this._dragIndex] = { x: pos.x, y: pos.y };

    // Clear preview
    const conn = this.extendedItem.element as BpmnConnectionBase;
    conn.setPreviewWaypoints(null);

    // Commit with undo
    const encoded = encodeWaypoints(this._waypoints);
    const cg = this.extendedItem.openGroup('Move waypoint');
    try {
      this.extendedItem.setAttribute('waypoints', encoded);
      cg.commit();
    } catch (err) {
      cg.abort();
      console.error(err);
    }

    this._dragIndex = null;
    this._dragIsMidpoint = false;
    this.refresh({});
  }

  dispose(): void {
    this._removeAllOverlays();
    this._waypointCircles = [];
    this._midpointCircles = [];
  }
}

export class BpmnConnectionEditExtensionProvider implements IDesignerExtensionProvider {
  shouldExtend(_extensionManager: IExtensionManager, _designerView: IDesignerCanvas, designItem: IDesignItem): boolean {
    return edgeTags.has(designItem.element.localName);
  }

  getExtension(extensionManager: IExtensionManager, designerView: IDesignerCanvas, designItem: IDesignItem): IDesignerExtension {
    return new BpmnConnectionEditExtension(extensionManager, designerView, designItem);
  }

  static readonly style = css`
    .bpmn-waypoint-handle {
      stroke: #3899ec;
      fill: white;
      pointer-events: auto;
    }
    .bpmn-midpoint-handle {
      stroke: #3899ec;
      fill: #c8dffa;
      opacity: 0.8;
      pointer-events: auto;
    }
  `;
}
