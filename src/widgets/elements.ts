import type { IElementsJson } from '@node-projects/web-component-designer';

const attrs = (values: Record<string, string>) => values;

export const bpmnElements: IElementsJson = {
  elements: [
    {
      name: 'start event',
      tag: 'bpmn-start-event',
      type: 'polymer',
      defaultWidth: '52px',
      defaultHeight: '76px',
      defaultAttributes: attrs({ name: 'Start' })
    },
    {
      name: 'intermediate catch event',
      tag: 'bpmn-intermediate-catch-event',
      type: 'polymer',
      defaultWidth: '56px',
      defaultHeight: '80px',
      defaultAttributes: attrs({ name: 'Wait' })
    },
    {
      name: 'intermediate throw event',
      tag: 'bpmn-intermediate-throw-event',
      type: 'polymer',
      defaultWidth: '56px',
      defaultHeight: '80px',
      defaultAttributes: attrs({ name: 'Throw' })
    },
    {
      name: 'boundary event',
      tag: 'bpmn-boundary-event',
      type: 'polymer',
      defaultWidth: '56px',
      defaultHeight: '80px',
      defaultAttributes: attrs({ name: 'Boundary' })
    },
    {
      name: 'task',
      tag: 'bpmn-task',
      type: 'polymer',
      defaultWidth: '138px',
      defaultHeight: '102px',
      defaultAttributes: attrs({ name: 'Task' })
    },
    {
      name: 'user task',
      tag: 'bpmn-user-task',
      type: 'polymer',
      defaultWidth: '138px',
      defaultHeight: '102px',
      defaultAttributes: attrs({ name: 'User task' })
    },
    {
      name: 'service task',
      tag: 'bpmn-service-task',
      type: 'polymer',
      defaultWidth: '138px',
      defaultHeight: '102px',
      defaultAttributes: attrs({ name: 'Service task' })
    },
    {
      name: 'script task',
      tag: 'bpmn-script-task',
      type: 'polymer',
      defaultWidth: '138px',
      defaultHeight: '102px',
      defaultAttributes: attrs({ name: 'Script task' })
    },
    {
      name: 'manual task',
      tag: 'bpmn-manual-task',
      type: 'polymer',
      defaultWidth: '138px',
      defaultHeight: '102px',
      defaultAttributes: attrs({ name: 'Manual task' })
    },
    {
      name: 'business rule task',
      tag: 'bpmn-business-rule-task',
      type: 'polymer',
      defaultWidth: '138px',
      defaultHeight: '102px',
      defaultAttributes: attrs({ name: 'Business rule task' })
    },
    {
      name: 'send task',
      tag: 'bpmn-send-task',
      type: 'polymer',
      defaultWidth: '138px',
      defaultHeight: '102px',
      defaultAttributes: attrs({ name: 'Send task' })
    },
    {
      name: 'receive task',
      tag: 'bpmn-receive-task',
      type: 'polymer',
      defaultWidth: '138px',
      defaultHeight: '102px',
      defaultAttributes: attrs({ name: 'Receive task' })
    },
    {
      name: 'call activity',
      tag: 'bpmn-call-activity',
      type: 'polymer',
      defaultWidth: '148px',
      defaultHeight: '108px',
      defaultAttributes: attrs({ name: 'Call activity' })
    },
    {
      name: 'sub process',
      tag: 'bpmn-sub-process',
      type: 'polymer',
      defaultWidth: '148px',
      defaultHeight: '108px',
      defaultAttributes: attrs({ name: 'Sub process' })
    },
    {
      name: 'exclusive gateway',
      tag: 'bpmn-exclusive-gateway',
      type: 'polymer',
      defaultWidth: '92px',
      defaultHeight: '120px',
      defaultAttributes: attrs({ name: 'Exclusive gateway' })
    },
    {
      name: 'parallel gateway',
      tag: 'bpmn-parallel-gateway',
      type: 'polymer',
      defaultWidth: '92px',
      defaultHeight: '120px',
      defaultAttributes: attrs({ name: 'Parallel gateway' })
    },
    {
      name: 'inclusive gateway',
      tag: 'bpmn-inclusive-gateway',
      type: 'polymer',
      defaultWidth: '92px',
      defaultHeight: '120px',
      defaultAttributes: attrs({ name: 'Inclusive gateway' })
    },
    {
      name: 'event based gateway',
      tag: 'bpmn-event-based-gateway',
      type: 'polymer',
      defaultWidth: '92px',
      defaultHeight: '120px',
      defaultAttributes: attrs({ name: 'Event based gateway' })
    },
    {
      name: 'data object',
      tag: 'bpmn-data-object',
      type: 'polymer',
      defaultWidth: '98px',
      defaultHeight: '112px',
      defaultAttributes: attrs({ name: 'Data object' })
    },
    {
      name: 'data store',
      tag: 'bpmn-data-store',
      type: 'polymer',
      defaultWidth: '112px',
      defaultHeight: '112px',
      defaultAttributes: attrs({ name: 'Data store' })
    },
    {
      name: 'text annotation',
      tag: 'bpmn-text-annotation',
      type: 'polymer',
      defaultWidth: '170px',
      defaultHeight: '116px',
      defaultAttributes: attrs({ text: 'Annotation' })
    },
    {
      name: 'group',
      tag: 'bpmn-group',
      type: 'polymer',
      defaultWidth: '220px',
      defaultHeight: '142px',
      defaultAttributes: attrs({ name: 'Group' })
    },
    {
      name: 'participant',
      tag: 'bpmn-participant',
      type: 'polymer',
      defaultWidth: '420px',
      defaultHeight: '170px',
      defaultAttributes: attrs({ name: 'Participant' })
    },
    {
      name: 'lane',
      tag: 'bpmn-lane',
      type: 'polymer',
      defaultWidth: '360px',
      defaultHeight: '126px',
      defaultAttributes: attrs({ name: 'Lane' })
    },
    {
      name: 'end event',
      tag: 'bpmn-end-event',
      type: 'polymer',
      defaultWidth: '52px',
      defaultHeight: '76px',
      defaultAttributes: attrs({ name: 'End' })
    }
  ]
};