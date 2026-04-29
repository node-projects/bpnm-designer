import { BpmnNodeBase } from './BpmnNodeBase.js';
import { getEventDefinitionGlyph } from '../services/bpmnEventDefinitions.js';
import { bpmnNodeProperties } from './bpmnProperties.js';

export class BpmnEndEvent extends BpmnNodeBase {
  static readonly is = 'bpmn-end-event';
  static override readonly properties = bpmnNodeProperties;

  protected override getDefaultSize() {
    return { width: '52px', height: '76px' };
  }

  protected override getBorderRadius() {
    return '999px';
  }

  protected override getBorderWidth() {
    return '4px';
  }

  protected override getGlyphMarkup() {
    return getEventDefinitionGlyph(this.eventDefinition);
  }
}

if (!customElements.get(BpmnEndEvent.is)) {
  customElements.define(BpmnEndEvent.is, BpmnEndEvent);
}