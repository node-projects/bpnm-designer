import { BaseCustomWebComponentConstructorAppend, css, html } from '@node-projects/base-custom-webcomponent';
import { bpmnNodeObservedAttributes, bpmnNodeProperties } from './bpmnProperties.js';

type Size = {
  width: string;
  height: string;
};

export abstract class BpmnNodeBase extends BaseCustomWebComponentConstructorAppend {
  static readonly properties = bpmnNodeProperties;
  static readonly observedAttributes = bpmnNodeObservedAttributes;

  static override readonly style = css`
    :host {
      display: inline-flex;
      position: absolute;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #142523;
      font-family: "Segoe UI Variable Text", "Segoe UI", sans-serif;
      user-select: none;
      --bpmn-border-color: #182826;
      --bpmn-border-width: 2px;
      --bpmn-background: #ffffff;
      --bpmn-radius: 20px;
      --bpmn-glyph-size: 22px;
    }

    * {
      box-sizing: border-box;
      pointer-events: none;
    }

    #shape {
      width: 100%;
      height: calc(100% - 28px);
      min-height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: var(--bpmn-border-width) solid var(--bpmn-border-color);
      border-radius: var(--bpmn-radius);
      background: var(--bpmn-background);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.65), 0 8px 16px rgba(20, 37, 35, 0.08);
      overflow: hidden;
    }

    #glyph {
      width: var(--bpmn-glyph-size);
      height: var(--bpmn-glyph-size);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--bpmn-border-color);
    }

    #glyph svg {
      width: 100%;
      height: 100%;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    #label {
      width: 100%;
      min-height: 20px;
      text-align: center;
      font-size: 13px;
      line-height: 1.2;
      color: #304340;
      padding: 0 4px 2px;
      overflow-wrap: anywhere;
    }
  `;

  static override readonly template = html`
    <div id="shape">
      <div id="glyph"></div>
    </div>
    <div id="label"></div>
  `;

  public bpmnId = '';
  public name = '';
  public documentation = '';
  public attachedToRef = '';
  public eventDefinition = '';
  public fillColor = '';
  public processRef = '';
  public laneRef = '';
  public participantRef = '';
  public strokeColor = '';
  public text = '';

  private _shape: HTMLDivElement;
  private _glyph: HTMLDivElement;
  private _label: HTMLDivElement;
  private _isReady = false;

  constructor() {
    super();
    this._restoreCachedInititalValues();
    this._shape = this._getDomElement<HTMLDivElement>('shape');
    this._glyph = this._getDomElement<HTMLDivElement>('glyph');
    this._label = this._getDomElement<HTMLDivElement>('label');
  }

  async ready() {
    this._parseAttributesToProperties();
    this._isReady = true;
    this.renderNode();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (!this._isReady || oldValue === newValue) {
      return;
    }
    this._parseAttributesToProperties();
    this.renderNode();
  }

  protected renderNode() {
    const defaultSize = this.getDefaultSize();
    if (!this.style.width) {
      this.style.width = defaultSize.width;
    }
    if (!this.style.height) {
      this.style.height = defaultSize.height;
    }

    this._shape.removeAttribute('style');
    this._glyph.removeAttribute('style');
    this._label.removeAttribute('style');

    this._shape.style.borderRadius = this.getBorderRadius();
    this._shape.style.borderWidth = this.getBorderWidth();
    this._shape.style.background = this.getBackground();
    this._shape.style.borderColor = this.getStrokeColor();
    this._shape.style.height = this.getShapeHeight();
    this._glyph.style.width = this.getGlyphSize();
    this._glyph.style.height = this.getGlyphSize();
    const glyphMarkup = this.getGlyphMarkup();
    this._glyph.innerHTML = glyphMarkup;
    this._glyph.style.display = glyphMarkup ? 'flex' : 'none';
    this._glyph.style.color = this.getGlyphColor();
    const labelText = this.getLabelText();
    this._label.textContent = labelText;
    this._label.style.display = labelText ? 'block' : 'none';
    this.afterRender();
  }

  protected get shapeElement() {
    return this._shape;
  }

  protected get glyphElement() {
    return this._glyph;
  }

  protected get labelElement() {
    return this._label;
  }

  protected getBackground() {
    return this.fillColor || '#ffffff';
  }

  protected getBorderRadius() {
    return '20px';
  }

  protected getBorderWidth() {
    return '2px';
  }

  protected getGlyphColor() {
    return this.getStrokeColor();
  }

  protected getGlyphSize() {
    return '22px';
  }

  protected getLabelText() {
    return this.text || this.name || '';
  }

  protected getShapeHeight() {
    return 'calc(100% - 28px)';
  }

  protected getStrokeColor() {
    return this.strokeColor || '#182826';
  }

  protected afterRender() {
  }

  protected abstract getDefaultSize(): Size;
  protected abstract getGlyphMarkup(): string;
}