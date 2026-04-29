import { BpmnNodeBase } from './BpmnNodeBase.js';
import { getEventDefinitionGlyph } from '../services/bpmnEventDefinitions.js';
import { bpmnNodeProperties } from './bpmnProperties.js';

export class BpmnStartEvent extends BpmnNodeBase {
  static readonly is = 'bpmn-start-event';
  static override readonly properties = bpmnNodeProperties;

  protected override getDefaultSize() {
    return { width: '52px', height: '76px' };
  }

  protected override getBorderRadius() {
    return '999px';
  }

  protected override getGlyphMarkup() {
    return getEventDefinitionGlyph(this.eventDefinition);
  }
}

if (!customElements.get(BpmnStartEvent.is)) {
  customElements.define(BpmnStartEvent.is, BpmnStartEvent);
}