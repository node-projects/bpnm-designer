export type BpmnContainerKind = 'process' | 'artifact' | 'lane' | 'collaboration';

export type BpmnEntry = {
  bpmnType: string;
  tag: string;
  kind: 'node' | 'edge';
  container: BpmnContainerKind;
  defaultIdPrefix: string;
  zIndex: string;
  nameSource?: 'name' | 'text';
};

export const bpmnEntries: BpmnEntry[] = [
  { bpmnType: 'startEvent', tag: 'bpmn-start-event', kind: 'node', container: 'process', defaultIdPrefix: 'StartEvent', zIndex: '10' },
  { bpmnType: 'intermediateCatchEvent', tag: 'bpmn-intermediate-catch-event', kind: 'node', container: 'process', defaultIdPrefix: 'IntermediateCatchEvent', zIndex: '10' },
  { bpmnType: 'intermediateThrowEvent', tag: 'bpmn-intermediate-throw-event', kind: 'node', container: 'process', defaultIdPrefix: 'IntermediateThrowEvent', zIndex: '10' },
  { bpmnType: 'boundaryEvent', tag: 'bpmn-boundary-event', kind: 'node', container: 'process', defaultIdPrefix: 'BoundaryEvent', zIndex: '11' },
  { bpmnType: 'endEvent', tag: 'bpmn-end-event', kind: 'node', container: 'process', defaultIdPrefix: 'EndEvent', zIndex: '10' },
  { bpmnType: 'task', tag: 'bpmn-task', kind: 'node', container: 'process', defaultIdPrefix: 'Task', zIndex: '10' },
  { bpmnType: 'userTask', tag: 'bpmn-user-task', kind: 'node', container: 'process', defaultIdPrefix: 'UserTask', zIndex: '10' },
  { bpmnType: 'serviceTask', tag: 'bpmn-service-task', kind: 'node', container: 'process', defaultIdPrefix: 'ServiceTask', zIndex: '10' },
  { bpmnType: 'scriptTask', tag: 'bpmn-script-task', kind: 'node', container: 'process', defaultIdPrefix: 'ScriptTask', zIndex: '10' },
  { bpmnType: 'manualTask', tag: 'bpmn-manual-task', kind: 'node', container: 'process', defaultIdPrefix: 'ManualTask', zIndex: '10' },
  { bpmnType: 'businessRuleTask', tag: 'bpmn-business-rule-task', kind: 'node', container: 'process', defaultIdPrefix: 'BusinessRuleTask', zIndex: '10' },
  { bpmnType: 'sendTask', tag: 'bpmn-send-task', kind: 'node', container: 'process', defaultIdPrefix: 'SendTask', zIndex: '10' },
  { bpmnType: 'receiveTask', tag: 'bpmn-receive-task', kind: 'node', container: 'process', defaultIdPrefix: 'ReceiveTask', zIndex: '10' },
  { bpmnType: 'callActivity', tag: 'bpmn-call-activity', kind: 'node', container: 'process', defaultIdPrefix: 'CallActivity', zIndex: '10' },
  { bpmnType: 'subProcess', tag: 'bpmn-sub-process', kind: 'node', container: 'process', defaultIdPrefix: 'SubProcess', zIndex: '10' },
  { bpmnType: 'exclusiveGateway', tag: 'bpmn-exclusive-gateway', kind: 'node', container: 'process', defaultIdPrefix: 'ExclusiveGateway', zIndex: '10' },
  { bpmnType: 'parallelGateway', tag: 'bpmn-parallel-gateway', kind: 'node', container: 'process', defaultIdPrefix: 'ParallelGateway', zIndex: '10' },
  { bpmnType: 'inclusiveGateway', tag: 'bpmn-inclusive-gateway', kind: 'node', container: 'process', defaultIdPrefix: 'InclusiveGateway', zIndex: '10' },
  { bpmnType: 'eventBasedGateway', tag: 'bpmn-event-based-gateway', kind: 'node', container: 'process', defaultIdPrefix: 'EventBasedGateway', zIndex: '10' },
  { bpmnType: 'dataObjectReference', tag: 'bpmn-data-object', kind: 'node', container: 'process', defaultIdPrefix: 'DataObject', zIndex: '8' },
  { bpmnType: 'dataStoreReference', tag: 'bpmn-data-store', kind: 'node', container: 'process', defaultIdPrefix: 'DataStore', zIndex: '8' },
  { bpmnType: 'textAnnotation', tag: 'bpmn-text-annotation', kind: 'node', container: 'artifact', defaultIdPrefix: 'TextAnnotation', zIndex: '6', nameSource: 'text' },
  { bpmnType: 'group', tag: 'bpmn-group', kind: 'node', container: 'artifact', defaultIdPrefix: 'Group', zIndex: '1' },
  { bpmnType: 'participant', tag: 'bpmn-participant', kind: 'node', container: 'collaboration', defaultIdPrefix: 'Participant', zIndex: '0' },
  { bpmnType: 'lane', tag: 'bpmn-lane', kind: 'node', container: 'lane', defaultIdPrefix: 'Lane', zIndex: '1' },
  { bpmnType: 'sequenceFlow', tag: 'bpmn-sequence-flow', kind: 'edge', container: 'process', defaultIdPrefix: 'Flow', zIndex: '4' },
  { bpmnType: 'messageFlow', tag: 'bpmn-message-flow', kind: 'edge', container: 'collaboration', defaultIdPrefix: 'MessageFlow', zIndex: '4' },
  { bpmnType: 'association', tag: 'bpmn-association', kind: 'edge', container: 'artifact', defaultIdPrefix: 'Association', zIndex: '4' },
  { bpmnType: 'dataInputAssociation', tag: 'bpmn-data-input-association', kind: 'edge', container: 'process', defaultIdPrefix: 'DataInputAssociation', zIndex: '4' },
  { bpmnType: 'dataOutputAssociation', tag: 'bpmn-data-output-association', kind: 'edge', container: 'process', defaultIdPrefix: 'DataOutputAssociation', zIndex: '4' }
];

export const bpmnTypeToEntry = new Map(bpmnEntries.map(entry => [entry.bpmnType, entry]));
export const tagToEntry = new Map(bpmnEntries.map(entry => [entry.tag, entry]));
export const edgeTags = new Set(bpmnEntries.filter(entry => entry.kind === 'edge').map(entry => entry.tag));
export const backgroundTags = new Set(['bpmn-participant', 'bpmn-lane', 'bpmn-group']);

export const flowNodeTags = new Set([
  'bpmn-start-event',
  'bpmn-intermediate-catch-event',
  'bpmn-intermediate-throw-event',
  'bpmn-boundary-event',
  'bpmn-end-event',
  'bpmn-task',
  'bpmn-user-task',
  'bpmn-service-task',
  'bpmn-script-task',
  'bpmn-manual-task',
  'bpmn-business-rule-task',
  'bpmn-send-task',
  'bpmn-receive-task',
  'bpmn-call-activity',
  'bpmn-sub-process',
  'bpmn-exclusive-gateway',
  'bpmn-parallel-gateway',
  'bpmn-inclusive-gateway',
  'bpmn-event-based-gateway'
]);

export const collaborationEndpointTags = new Set([...flowNodeTags, 'bpmn-participant']);
export const associationEndpointTags = new Set(bpmnEntries.filter(entry => entry.kind === 'node').map(entry => entry.tag));