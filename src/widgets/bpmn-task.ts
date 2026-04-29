import { BpmnNodeBase } from './BpmnNodeBase.js';
import { bpmnNodeProperties } from './bpmnProperties.js';

export class BpmnTask extends BpmnNodeBase {
  static readonly is = 'bpmn-task';
  static override readonly properties = bpmnNodeProperties;

  protected override getDefaultSize() {
    return { width: '138px', height: '102px' };
  }

  protected override getBorderRadius() {
    return '18px';
  }

  protected override getGlyphMarkup() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="10" height="14" rx="1.5"></rect><path d="M8 9.5h8M8 13h8M8 16.5h5"></path></svg>`;
  }
}

if (!customElements.get(BpmnTask.is)) {
  customElements.define(BpmnTask.is, BpmnTask);
}