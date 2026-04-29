import { BaseCustomWebComponentConstructorAppend, css, html } from '@node-projects/base-custom-webcomponent';
import { boundsFromWaypoints, decodeWaypoints, pathDataFromWaypoints } from '../services/bpmnGeometry.js';
import { bpmnConnectionObservedAttributes, bpmnConnectionProperties } from './bpmnProperties.js';

export abstract class BpmnConnectionBase extends BaseCustomWebComponentConstructorAppend {
  static readonly properties = bpmnConnectionProperties;
  static readonly observedAttributes = bpmnConnectionObservedAttributes;

  static override readonly style = css`
    :host {
      display: block;
      position: absolute;
      overflow: visible;
      pointer-events: auto;
      z-index: 4;
    }

    * {
      box-sizing: border-box;
      pointer-events: none;
    }

    svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    path {
      fill: none;
      stroke: var(--connection-color, #263431);
      stroke-width: var(--connection-width, 2.5);
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }

    text {
      font-family: "Segoe UI Variable Text", "Segoe UI", sans-serif;
      font-size: 12px;
      fill: #304340;
    }
  `;

  static override readonly template = html`
    <svg id="svg" viewBox="0 0 10 10" preserveAspectRatio="none">
      <defs>
        <marker id="marker-start" viewBox="0 0 12 12" markerWidth="7" markerHeight="7" refX="3" refY="6" orient="auto" markerUnits="userSpaceOnUse">
          <circle id="start-marker-shape" cx="6" cy="6" r="2.6"></circle>
        </marker>
        <marker id="marker" viewBox="0 0 12 12" markerWidth="10" markerHeight="10" refX="10.5" refY="6" orient="auto" markerUnits="userSpaceOnUse">
          <path id="marker-shape" d="M 1 1 L 10.5 6 L 1 11 z"></path>
        </marker>
      </defs>
      <path id="path"></path>
      <text id="label"></text>
    </svg>
  `;

  public bpmnId = '';
  public name = '';
  public documentation = '';
  public processRef = '';
  public sourceRef = '';
  public strokeColor = '';
  public targetRef = '';
  public waypoints = '';

  private _svg: SVGSVGElement;
  private _path: SVGPathElement;
  private _markerShape: SVGPathElement;
  private _startMarkerShape: SVGCircleElement;
  private _label: SVGTextElement;
  private _previewWaypoints: ReturnType<typeof decodeWaypoints> | null = null;
  private _isReady = false;

  constructor() {
    super();
    this._restoreCachedInititalValues();
    this._svg = this._getDomElement<SVGSVGElement>('svg');
    this._path = this._getDomElement<SVGPathElement>('path');
    this._markerShape = this._getDomElement<SVGPathElement>('marker-shape');
    this._startMarkerShape = this._getDomElement<SVGCircleElement>('start-marker-shape');
    this._label = this._getDomElement<SVGTextElement>('label');
  }

  async ready() {
    this._parseAttributesToProperties();
    this._isReady = true;
    this.renderConnection();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (!this._isReady || oldValue === newValue) {
      return;
    }
    this._parseAttributesToProperties();
    this.renderConnection();
  }

  public setPreviewWaypoints(waypoints: string | null) {
    this._previewWaypoints = waypoints ? decodeWaypoints(waypoints) : null;
    if (this._isReady) {
      this.renderConnection();
    }
  }

  protected renderConnection() {
    const waypoints = this._previewWaypoints ?? decodeWaypoints(this.waypoints);
    if (waypoints.length < 2) {
      this.style.display = 'none';
      return;
    }

    const padding = 16;
    const bounds = boundsFromWaypoints(waypoints);

    this.style.display = 'block';
    this.style.left = `${Math.round(bounds.x - padding)}px`;
    this.style.top = `${Math.round(bounds.y - padding)}px`;
    this.style.width = `${Math.max(1, Math.round(bounds.width + padding * 2))}px`;
    this.style.height = `${Math.max(1, Math.round(bounds.height + padding * 2))}px`;

    const shifted = waypoints.map(point => ({ x: point.x - bounds.x + padding, y: point.y - bounds.y + padding }));
    this._path.setAttribute('d', pathDataFromWaypoints(shifted));
    this._path.setAttribute('marker-end', this.useArrowHead() ? 'url(#marker)' : '');
    this._path.setAttribute('marker-start', this.useStartCircleMarker() ? 'url(#marker-start)' : '');
    this._path.style.strokeDasharray = this.getStrokeDashArray();
    this._path.style.strokeWidth = this.getStrokeWidth();
    this._path.style.stroke = this.getStrokeColor();
    this._markerShape.setAttribute('d', this.getMarkerPath());
    this._markerShape.setAttribute('fill', this.getMarkerFill());
    this._markerShape.setAttribute('stroke', this.getMarkerStroke());
    this._startMarkerShape.setAttribute('fill', this.getStartMarkerFill());
    this._startMarkerShape.setAttribute('stroke', this.getStartMarkerStroke());
    this._label.textContent = this.name ?? '';
    this._label.style.display = this.name ? 'block' : 'none';

    const middle = shifted[Math.floor(shifted.length / 2)];
    this._label.setAttribute('x', middle.x.toString());
    this._label.setAttribute('y', (middle.y - 8).toString());
    this._svg.setAttribute('viewBox', `0 0 ${Math.max(1, Math.round(bounds.width + padding * 2))} ${Math.max(1, Math.round(bounds.height + padding * 2))}`);
    this.afterRender();
  }

  protected getMarkerPath() {
    return 'M 1 1 L 10.5 6 L 1 11 z';
  }

  protected getMarkerFill() {
    return this.getStrokeColor();
  }

  protected getMarkerStroke() {
    return this.getStrokeColor();
  }

  protected getStrokeColor() {
    return this.strokeColor || '#263431';
  }

  protected getStrokeDashArray() {
    return '';
  }

  protected getStrokeWidth() {
    return '2.5';
  }

  protected getStartMarkerFill() {
    return '#ffffff';
  }

  protected getStartMarkerStroke() {
    return this.getStrokeColor();
  }

  protected useArrowHead() {
    return true;
  }

  protected useStartCircleMarker() {
    return false;
  }

  protected afterRender() {
  }
}