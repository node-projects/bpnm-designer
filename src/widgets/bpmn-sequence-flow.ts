import { BpmnConnectionBase } from './BpmnConnectionBase.js';
import { bpmnConnectionProperties } from './bpmnProperties.js';

export class BpmnSequenceFlow extends BpmnConnectionBase {
  static readonly is = 'bpmn-sequence-flow';
  static override readonly properties = bpmnConnectionProperties;
}

if (!customElements.get(BpmnSequenceFlow.is)) {
  customElements.define(BpmnSequenceFlow.is, BpmnSequenceFlow);
}