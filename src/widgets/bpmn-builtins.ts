import { BpmnConnectionBase } from './BpmnConnectionBase.js';
import { BpmnNodeBase } from './BpmnNodeBase.js';
import { getEventDefinitionGlyph } from '../services/bpmnEventDefinitions.js';
import { bpmnConnectionProperties, bpmnNodeProperties } from './bpmnProperties.js';

type NodeConfig = {
  tag: string;
  width: string;
  height: string;
  glyph: string | ((host: BpmnNodeBase) => string);
  radius?: string;
  borderWidth?: string;
  stroke?: string;
  background?: string;
  glyphColor?: string;
  shapeHeight?: string;
  afterRender?: (shape: HTMLDivElement, glyph: HTMLDivElement, label: HTMLDivElement, host: HTMLElement) => void;
};

type ConnectionConfig = {
  tag: string;
  stroke: string;
  strokeWidth?: string;
  dashArray?: string;
  markerPath?: string;
  markerFill?: string;
  markerStroke?: string;
  arrowHead?: boolean;
  startCircle?: boolean;
};

function defineNode(config: NodeConfig) {
  class ConfiguredNode extends BpmnNodeBase {
    static readonly is = config.tag;
    static readonly properties = bpmnNodeProperties;

    protected override getDefaultSize() {
      return { width: config.width, height: config.height };
    }

    protected override getGlyphMarkup() {
      return typeof config.glyph === 'function' ? config.glyph(this) : config.glyph;
    }

    protected override getBackground() {
      return config.background ?? '#ffffff';
    }

    protected override getBorderRadius() {
      return config.radius ?? '18px';
    }

    protected override getBorderWidth() {
      return config.borderWidth ?? '2px';
    }

    protected override getGlyphColor() {
      return config.glyphColor ?? this.getStrokeColor();
    }

    protected override getShapeHeight() {
      return config.shapeHeight ?? super.getShapeHeight();
    }

    protected override getStrokeColor() {
      return config.stroke ?? '#182826';
    }

    protected override afterRender() {
      config.afterRender?.(this.shapeElement, this.glyphElement, this.labelElement, this);
    }
  }

  if (!customElements.get(config.tag)) {
    customElements.define(config.tag, ConfiguredNode);
  }
}

function defineConnection(config: ConnectionConfig) {
  class ConfiguredConnection extends BpmnConnectionBase {
    static readonly is = config.tag;
    static readonly properties = bpmnConnectionProperties;

    protected override getMarkerFill() {
      return config.markerFill ?? config.stroke;
    }

    protected override getMarkerPath() {
      return config.markerPath ?? super.getMarkerPath();
    }

    protected override getMarkerStroke() {
      return config.markerStroke ?? config.stroke;
    }

    protected override getStrokeColor() {
      return config.stroke;
    }

    protected override getStrokeDashArray() {
      return config.dashArray ?? '';
    }

    protected override getStrokeWidth() {
      return config.strokeWidth ?? '2.5';
    }

    protected override useArrowHead() {
      return config.arrowHead ?? true;
    }

    protected override useStartCircleMarker() {
      return config.startCircle ?? false;
    }
  }

  if (!customElements.get(config.tag)) {
    customElements.define(config.tag, ConfiguredConnection);
  }
}

const userGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M6.5 19c1.6-3 3.7-4.5 5.5-4.5 1.8 0 3.9 1.5 5.5 4.5"></path></svg>`;
const gearGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2.8"></circle><path d="M12 4.5v2.1M12 17.4v2.1M4.5 12h2.1M17.4 12h2.1M6.7 6.7l1.5 1.5M15.8 15.8l1.5 1.5M17.3 6.7l-1.5 1.5M8.2 15.8l-1.5 1.5"></path></svg>`;
const scriptGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.5h7.5L19 8v11.5H8z"></path><path d="M15.5 4.5V8H19M10 11.5h6M10 14.5h6M10 17.5h4"></path></svg>`;
const manualGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12V7.5a1.3 1.3 0 0 1 2.6 0V11"></path><path d="M10.6 11V6.4a1.3 1.3 0 0 1 2.6 0V11"></path><path d="M13.2 11V7.3a1.3 1.3 0 0 1 2.6 0V12"></path><path d="M8 12h8l1.2 1.6c.5.7.8 1.5.8 2.4V19H10l-2-2.3V12z"></path></svg>`;
const ruleGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="6" width="14" height="12" rx="1.5"></rect><path d="M5 10h14M10 10v8"></path></svg>`;
const sendGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="6.5" width="15" height="11" rx="1.5"></rect><path d="M5.5 8l6.5 5 6.5-5"></path><path d="M18 5l2 2-2 2"></path></svg>`;
const receiveGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="6.5" width="15" height="11" rx="1.5"></rect><path d="M5.5 8l6.5 5 6.5-5"></path></svg>`;
const plusGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"></rect><path d="M12 8.5v7M8.5 12h7"></path></svg>`;
const callGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7.5v9l8-4.5z" fill="currentColor" stroke="none"></path></svg>`;
const exclusiveGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8l8 8M16 8l-8 8"></path></svg>`;
const parallelGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12"></path></svg>`;
const inclusiveGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6"></circle></svg>`;
const eventBasedGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"></circle><path d="M12 7.6l2.1 2.9 3.4 1.1-2.1 2.8v3.5L12 16.2l-3.4 1.7v-3.5l-2.1-2.8 3.4-1.1z"></path></svg>`;
const catchGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"></circle><path d="M12 8v4.2l2.6 2.6"></path></svg>`;
const throwGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12h9"></path><path d="M12.5 7l5 5-5 5"></path></svg>`;
const dataObjectGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h8l3 3V19H7z"></path><path d="M15 4.5V8h3M9 12h6M9 15h6"></path></svg>`;
const dataStoreGlyph = `<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="6.5" rx="6" ry="2.5"></ellipse><path d="M6 6.5v10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-10"></path><path d="M6 11c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5"></path></svg>`;

defineNode({
  tag: 'bpmn-intermediate-catch-event',
  width: '56px',
  height: '80px',
  glyph: host => getEventDefinitionGlyph(host.eventDefinition, catchGlyph),
  radius: '999px',
  afterRender(shape) {
    shape.style.boxShadow = 'inset 0 0 0 4px white, inset 0 0 0 6px #182826, 0 8px 16px rgba(20, 37, 35, 0.08)';
  }
});

defineNode({
  tag: 'bpmn-intermediate-throw-event',
  width: '56px',
  height: '80px',
  glyph: host => getEventDefinitionGlyph(host.eventDefinition, throwGlyph),
  radius: '999px',
  afterRender(shape) {
    shape.style.boxShadow = 'inset 0 0 0 4px white, inset 0 0 0 6px #182826, 0 8px 16px rgba(20, 37, 35, 0.08)';
  }
});

defineNode({
  tag: 'bpmn-boundary-event',
  width: '56px',
  height: '80px',
  glyph: host => getEventDefinitionGlyph(host.eventDefinition, catchGlyph),
  radius: '999px',
  afterRender(shape) {
    shape.style.boxShadow = 'inset 0 0 0 4px white, inset 0 0 0 6px #182826, 0 8px 16px rgba(20, 37, 35, 0.08)';
    shape.style.borderStyle = 'dashed';
  }
});

defineNode({ tag: 'bpmn-user-task', width: '138px', height: '102px', glyph: userGlyph });
defineNode({ tag: 'bpmn-service-task', width: '138px', height: '102px', glyph: gearGlyph });
defineNode({ tag: 'bpmn-script-task', width: '138px', height: '102px', glyph: scriptGlyph });
defineNode({ tag: 'bpmn-manual-task', width: '138px', height: '102px', glyph: manualGlyph });
defineNode({ tag: 'bpmn-business-rule-task', width: '138px', height: '102px', glyph: ruleGlyph });
defineNode({ tag: 'bpmn-send-task', width: '138px', height: '102px', glyph: sendGlyph });
defineNode({ tag: 'bpmn-receive-task', width: '138px', height: '102px', glyph: receiveGlyph });
defineNode({ tag: 'bpmn-call-activity', width: '148px', height: '108px', glyph: callGlyph, borderWidth: '4px' });
defineNode({ tag: 'bpmn-sub-process', width: '148px', height: '108px', glyph: plusGlyph });

defineNode({
  tag: 'bpmn-exclusive-gateway',
  width: '92px',
  height: '120px',
  glyph: exclusiveGlyph,
  radius: '8px',
  shapeHeight: '72px',
  afterRender(shape, glyph) {
    shape.style.width = '72px';
    shape.style.height = '72px';
    shape.style.marginTop = '2px';
    shape.style.transform = 'rotate(45deg)';
    glyph.style.transform = 'rotate(-45deg)';
  }
});

defineNode({
  tag: 'bpmn-parallel-gateway',
  width: '92px',
  height: '120px',
  glyph: parallelGlyph,
  radius: '8px',
  shapeHeight: '72px',
  afterRender(shape, glyph) {
    shape.style.width = '72px';
    shape.style.height = '72px';
    shape.style.marginTop = '2px';
    shape.style.transform = 'rotate(45deg)';
    glyph.style.transform = 'rotate(-45deg)';
  }
});

defineNode({
  tag: 'bpmn-inclusive-gateway',
  width: '92px',
  height: '120px',
  glyph: inclusiveGlyph,
  radius: '8px',
  shapeHeight: '72px',
  afterRender(shape, glyph) {
    shape.style.width = '72px';
    shape.style.height = '72px';
    shape.style.marginTop = '2px';
    shape.style.transform = 'rotate(45deg)';
    glyph.style.transform = 'rotate(-45deg)';
  }
});

defineNode({
  tag: 'bpmn-event-based-gateway',
  width: '92px',
  height: '120px',
  glyph: eventBasedGlyph,
  radius: '8px',
  shapeHeight: '72px',
  afterRender(shape, glyph) {
    shape.style.width = '72px';
    shape.style.height = '72px';
    shape.style.marginTop = '2px';
    shape.style.transform = 'rotate(45deg)';
    glyph.style.transform = 'rotate(-45deg)';
  }
});

defineNode({
  tag: 'bpmn-data-object',
  width: '98px',
  height: '112px',
  glyph: dataObjectGlyph,
  radius: '6px',
  afterRender(shape) {
    shape.style.clipPath = 'polygon(0 0, 76% 0, 100% 20%, 100% 100%, 0 100%)';
  }
});

defineNode({ tag: 'bpmn-data-store', width: '112px', height: '112px', glyph: dataStoreGlyph, radius: '22px' });

defineNode({
  tag: 'bpmn-text-annotation',
  width: '170px',
  height: '116px',
  glyph: '',
  radius: '0px',
  background: 'rgba(255, 255, 255, 0.72)',
  shapeHeight: '100%',
  afterRender(shape, glyph, label) {
    glyph.style.display = 'none';
    shape.style.borderRight = '0';
    shape.style.borderRadius = '0';
    label.style.position = 'absolute';
    label.style.left = '18px';
    label.style.top = '18px';
    label.style.width = 'calc(100% - 32px)';
    label.style.textAlign = 'left';
  }
});

defineNode({
  tag: 'bpmn-group',
  width: '220px',
  height: '142px',
  glyph: '',
  radius: '18px',
  background: 'rgba(255, 255, 255, 0.12)',
  shapeHeight: '100%',
  afterRender(shape, glyph, label) {
    glyph.style.display = 'none';
    shape.style.borderStyle = 'dashed';
    shape.style.background = 'rgba(11, 122, 117, 0.04)';
    label.style.position = 'absolute';
    label.style.left = '14px';
    label.style.top = '12px';
    label.style.width = 'calc(100% - 28px)';
    label.style.textAlign = 'left';
  }
});

defineNode({
  tag: 'bpmn-participant',
  width: '420px',
  height: '170px',
  glyph: '',
  radius: '14px',
  background: 'rgba(255, 255, 255, 0.38)',
  shapeHeight: '100%',
  afterRender(shape, glyph, label) {
    glyph.style.display = 'none';
    shape.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.84), rgba(217,232,223,0.55))';
    label.style.position = 'absolute';
    label.style.left = '16px';
    label.style.top = '16px';
    label.style.width = 'calc(100% - 32px)';
    label.style.textAlign = 'left';
    label.style.fontWeight = '600';
  }
});

defineNode({
  tag: 'bpmn-lane',
  width: '360px',
  height: '126px',
  glyph: '',
  radius: '10px',
  background: 'rgba(255, 255, 255, 0.24)',
  shapeHeight: '100%',
  afterRender(shape, glyph, label) {
    glyph.style.display = 'none';
    shape.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.58), rgba(221,231,223,0.42))';
    label.style.position = 'absolute';
    label.style.left = '14px';
    label.style.top = '12px';
    label.style.width = 'calc(100% - 28px)';
    label.style.textAlign = 'left';
  }
});

defineConnection({ tag: 'bpmn-message-flow', stroke: '#376d82', dashArray: '10 6', markerPath: 'M 1 1 L 9 5 L 1 9', markerFill: 'none', markerStroke: '#376d82', startCircle: true });
defineConnection({ tag: 'bpmn-association', stroke: '#5a6c67', dashArray: '7 5', arrowHead: false });
defineConnection({ tag: 'bpmn-data-input-association', stroke: '#8a5b12', dashArray: '7 5', markerPath: 'M 1 1 L 9 5 L 1 9', markerFill: 'none', markerStroke: '#8a5b12' });
defineConnection({ tag: 'bpmn-data-output-association', stroke: '#8a5b12', dashArray: '7 5', markerPath: 'M 1 1 L 9 5 L 1 9', markerFill: 'none', markerStroke: '#8a5b12' });