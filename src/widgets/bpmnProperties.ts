export const bpmnNodeProperties = {
  bpmnId: { type: String, group: 'identity', description: 'BPMN element identifier used in XML.' },
  name: { type: String, group: 'content', description: 'Visible BPMN label for the element.' },
  text: { type: String, group: 'content', description: 'Annotation text content.' },
  documentation: { type: String, group: 'content', description: 'BPMN documentation text.' },
  fillColor: { type: String, group: 'appearance', description: 'BPMN shape fill color written to BPMN DI.' },
  strokeColor: { type: String, group: 'appearance', description: 'BPMN shape stroke color written to BPMN DI.' },
  eventDefinition: { type: String, group: 'semantics', description: 'Event definition type such as message, timer, signal, error, conditional, escalation, link or terminate.' },
  attachedToRef: { type: String, group: 'semantics', description: 'Boundary event host element id.' },
  processRef: { type: String, group: 'semantics', description: 'Owning BPMN process id.' },
  laneRef: { type: String, group: 'semantics', description: 'Owning lane id for flow nodes.' },
  participantRef: { type: String, group: 'semantics', description: 'Owning participant id when inside a collaboration.' }
};

const toAttributeName = (propertyName: string) => propertyName.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);

export const bpmnNodeObservedAttributes = Object.keys(bpmnNodeProperties).map(toAttributeName);

export const bpmnConnectionProperties = {
  bpmnId: { type: String, group: 'identity', description: 'BPMN edge identifier used in XML.' },
  name: { type: String, group: 'content', description: 'Visible label for the BPMN edge.' },
  documentation: { type: String, group: 'content', description: 'BPMN documentation text.' },
  strokeColor: { type: String, group: 'appearance', description: 'BPMN edge stroke color written to BPMN DI.' },
  sourceRef: { type: String, group: 'semantics', description: 'Source BPMN element id.' },
  targetRef: { type: String, group: 'semantics', description: 'Target BPMN element id.' },
  processRef: { type: String, group: 'semantics', description: 'Owning BPMN process id for non-collaboration edges.' },
  waypoints: { type: String, group: 'geometry', description: 'Serialized BPMN DI waypoints.', readonly: true }
};

export const bpmnConnectionObservedAttributes = Object.keys(bpmnConnectionProperties).map(toAttributeName);