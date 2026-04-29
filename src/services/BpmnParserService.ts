import type { IDesignItem, IHtmlParserService, IHtmlWriterOptions, IHtmlWriterService, ITextWriter, InstanceServiceContainer, ServiceContainer } from '@node-projects/web-component-designer';
import { DesignItem } from '@node-projects/web-component-designer';
import { boundsFromWaypoints, decodeWaypoints, encodeWaypoints, formatNumber, getBoundsCenter, getElementConnectionBoundsFromHostBounds, isPointInsideBounds, normalizeWaypoints, routeBetweenBounds } from './bpmnGeometry.js';
import { getEventDefinitionElementLocalName, normalizeEventDefinition } from './bpmnEventDefinitions.js';
import { bpmnTypeToEntry, flowNodeTags, tagToEntry } from './bpmnRegistry.js';

const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const BPMNDI_NS = 'http://www.omg.org/spec/BPMN/20100524/DI';
const DC_NS = 'http://www.omg.org/spec/DD/20100524/DC';
const DI_NS = 'http://www.omg.org/spec/DD/20100524/DI';
const BIOC_NS = 'http://bpmn.io/schema/bpmn/biocolor/1.0';

type BpmnProcessMeta = {
  id: string;
  laneSetId?: string;
};

type BpmnDocumentMeta = {
  definitionsId: string;
  processes: BpmnProcessMeta[];
  collaborationId?: string;
  diagramId: string;
  planeId: string;
  planeBpmnElement?: string;
  targetNamespace: string;
  participantProcessMap: Record<string, string>;
};

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function getFirstElementByNamespace(elements: Element[], namespace: string, localName: string) {
  return elements.find(element => element.namespaceURI === namespace && element.localName === localName) ?? null;
}

function getDirectChildren(element: Element, namespace: string, localName: string) {
  return Array.from(element.children).filter(child => child.namespaceURI === namespace && child.localName === localName);
}

function getDirectChildrenByLocalName(element: Element, localName: string) {
  return Array.from(element.children).filter(child => child.localName === localName);
}

function getDirectLaneSets(element: Element) {
  return Array.from(element.children).filter(child => child.namespaceURI === BPMN_NS && (child.localName === 'laneSet' || child.localName === 'childLaneSet'));
}

function parseNumber(value: string | null | undefined, fallback = 0) {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCssPixels(value: string | null | undefined, fallback = 0) {
  return parseNumber(value?.replace('px', ''), fallback);
}

function escapeXml(value: string | null | undefined) {
  return (value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function boundsToStyle(element: Element | undefined | null, bounds: Bounds) {
  if (!element) {
    return;
  }

  if (element instanceof HTMLElement || element instanceof SVGElement) {
    element.style.position = 'absolute';
    element.style.left = `${formatNumber(bounds.x)}px`;
    element.style.top = `${formatNumber(bounds.y)}px`;
    element.style.width = `${formatNumber(bounds.width)}px`;
    element.style.height = `${formatNumber(bounds.height)}px`;
    return;
  }

  element.setAttribute('style', `position:absolute;left:${formatNumber(bounds.x)}px;top:${formatNumber(bounds.y)}px;width:${formatNumber(bounds.width)}px;height:${formatNumber(bounds.height)}px;`);
}

function findWaypoints(edge: Element) {
  return getDirectChildren(edge, DI_NS, 'waypoint').map(waypoint => ({
    x: parseNumber(waypoint.getAttribute('x')),
    y: parseNumber(waypoint.getAttribute('y'))
  }));
}

function getDiagramColor(diElement: Element, localName: 'fill' | 'stroke') {
  return diElement.getAttributeNS(BIOC_NS, localName) ?? diElement.getAttribute(`bioc:${localName}`) ?? '';
}

function applyDiagramColors(target: HTMLElement, diElement: Element, includeFill: boolean) {
  const strokeColor = getDiagramColor(diElement, 'stroke');
  if (strokeColor) {
    target.setAttribute('stroke-color', strokeColor);
  }

  if (includeFill) {
    const fillColor = getDiagramColor(diElement, 'fill');
    if (fillColor) {
      target.setAttribute('fill-color', fillColor);
    }
  }
}

function getDiagramColorAttributes(element: HTMLElement, includeFill: boolean) {
  const attributes: string[] = [];
  const strokeColor = element.getAttribute('stroke-color');
  if (strokeColor) {
    attributes.push(`bioc:stroke="${escapeXml(strokeColor)}"`);
  }

  if (includeFill) {
    const fillColor = element.getAttribute('fill-color');
    if (fillColor) {
      attributes.push(`bioc:fill="${escapeXml(fillColor)}"`);
    }
  }

  return attributes;
}

function ensureId(element: Element, prefix: string, usedIds: Set<string>) {
  const existing = element.getAttribute('bpmn-id');
  if (existing) {
    usedIds.add(existing);
    return existing;
  }

  let index = usedIds.size + 1;
  let candidate = `${prefix}_${index}`;
  while (usedIds.has(candidate)) {
    index += 1;
    candidate = `${prefix}_${index}`;
  }
  element.setAttribute('bpmn-id', candidate);
  usedIds.add(candidate);
  return candidate;
}

function getBoundsForNode(item: IDesignItem): Bounds {
  const element = item.element as HTMLElement;
  const hostBounds = {
    x: parseCssPixels(element.style.left),
    y: parseCssPixels(element.style.top),
    width: parseCssPixels(element.style.width, element.offsetWidth),
    height: parseCssPixels(element.style.height, element.offsetHeight)
  };
  return getElementConnectionBoundsFromHostBounds(hostBounds, element);
}

function getMeta(instanceServiceContainer: InstanceServiceContainer): BpmnDocumentMeta {
  const documentContainer = instanceServiceContainer.documentContainer as {
    additionalData?: Partial<BpmnDocumentMeta> & { processId?: string; laneSetId?: string };
  } | undefined;
  const meta = documentContainer?.additionalData;
  const processes = meta?.processes?.length
    ? meta.processes
    : [{ id: meta?.processId ?? 'Process_1', laneSetId: meta?.laneSetId ?? 'LaneSet_1' }];

  return {
    definitionsId: meta?.definitionsId ?? 'Definitions_1',
    processes,
    collaborationId: meta?.collaborationId,
    diagramId: meta?.diagramId ?? 'BPMNDiagram_1',
    planeId: meta?.planeId ?? 'BPMNPlane_1',
    planeBpmnElement: meta?.planeBpmnElement,
    targetNamespace: meta?.targetNamespace ?? 'https://node-projects.github.io/bpmn-editor',
    participantProcessMap: meta?.participantProcessMap ?? {}
  };
}

function readCommonLabel(modelElement: Element) {
  const entry = bpmnTypeToEntry.get(modelElement.localName);
  if (entry?.nameSource === 'text') {
    return getDirectChildrenByLocalName(modelElement, 'text')[0]?.textContent ?? '';
  }
  return modelElement.getAttribute('name') ?? '';
}

function readDocumentation(modelElement: Element) {
  return getDirectChildrenByLocalName(modelElement, 'documentation')[0]?.textContent?.trim() ?? '';
}

function findEventDefinition(modelElement: Element) {
  return Array.from(modelElement.children).find(child => child.namespaceURI === BPMN_NS && child.localName.endsWith('EventDefinition')) ?? null;
}

function setCommonAttributes(target: HTMLElement, modelElement: Element) {
  const label = readCommonLabel(modelElement).trim();
  const entry = bpmnTypeToEntry.get(modelElement.localName);
  if (entry?.nameSource === 'text') {
    if (label) {
      target.setAttribute('text', label);
    }
  } else if (label) {
    target.setAttribute('name', label);
  }

  const documentation = readDocumentation(modelElement);
  if (documentation) {
    target.setAttribute('documentation', documentation);
  }

  if (modelElement.localName === 'boundaryEvent' && modelElement.getAttribute('attachedToRef')) {
    target.setAttribute('attached-to-ref', modelElement.getAttribute('attachedToRef')!);
  }

  const eventDefinition = normalizeEventDefinition(findEventDefinition(modelElement)?.localName);
  if (eventDefinition) {
    target.setAttribute('event-definition', eventDefinition);
  }
}

function getAncestorProcessId(element: Element | null) {
  let current = element;
  while (current) {
    if (current.namespaceURI === BPMN_NS && current.localName === 'process') {
      return current.getAttribute('id') ?? '';
    }
    current = current.parentElement;
  }
  return '';
}

function collectLaneInfo(processElements: Element[]) {
  const nodeToLane = new Map<string, string>();
  const laneProcessById = new Map<string, string>();
  const laneSetIdsByProcess = new Map<string, string>();

  const visitLaneSet = (laneSet: Element, processId: string, topLevel: boolean) => {
    if (topLevel && !laneSetIdsByProcess.has(processId)) {
      const laneSetId = laneSet.getAttribute('id');
      if (laneSetId) {
        laneSetIdsByProcess.set(processId, laneSetId);
      }
    }

    for (const lane of getDirectChildren(laneSet, BPMN_NS, 'lane')) {
      const laneId = lane.getAttribute('id');
      if (laneId) {
        laneProcessById.set(laneId, processId);
        for (const flowNodeRef of getDirectChildrenByLocalName(lane, 'flowNodeRef')) {
          const nodeId = flowNodeRef.textContent?.trim();
          if (nodeId) {
            nodeToLane.set(nodeId, laneId);
          }
        }
      }

      for (const childLaneSet of getDirectLaneSets(lane)) {
        visitLaneSet(childLaneSet, processId, false);
      }
    }
  };

  for (const processElement of processElements) {
    const processId = processElement.getAttribute('id');
    if (!processId) {
      continue;
    }

    for (const laneSet of getDirectChildren(processElement, BPMN_NS, 'laneSet')) {
      visitLaneSet(laneSet, processId, true);
    }
  }

  return { nodeToLane, laneProcessById, laneSetIdsByProcess };
}

function fallbackBounds(index: number, localName: string): Bounds {
  const isEvent = localName.endsWith('Event');
  const isGateway = localName.endsWith('Gateway');
  const isParticipant = localName === 'participant';
  const isLane = localName === 'lane';
  const width = isParticipant ? 420 : isLane ? 360 : isEvent ? 56 : isGateway ? 92 : 138;
  const height = isParticipant ? 170 : isLane ? 126 : isEvent ? 80 : isGateway ? 120 : 102;
  return {
    x: 96 + (index % 4) * 170,
    y: 96 + Math.floor(index / 4) * 150,
    width,
    height
  };
}

function createElementForModel(modelElement: Element) {
  const entry = bpmnTypeToEntry.get(modelElement.localName);
  if (!entry) {
    return null;
  }

  const element = globalThis.document.createElement(entry.tag) as HTMLElement;
  element.setAttribute('bpmn-id', modelElement.getAttribute('id') ?? '');
  setCommonAttributes(element, modelElement);
  element.style.zIndex = entry.zIndex;
  return element;
}

function createNodeLines(entryType: string, element: HTMLElement, id: string, indent: string, extraAttributes: string[] = []) {
  const entry = bpmnTypeToEntry.get(entryType)!;
  const attributes = [`id="${escapeXml(id)}"`, ...extraAttributes];
  const labelValue = entry.nameSource === 'text' ? element.getAttribute('text') : element.getAttribute('name');

  if (labelValue && entry.nameSource !== 'text') {
    attributes.push(`name="${escapeXml(labelValue)}"`);
  }

  if (entry.bpmnType === 'boundaryEvent') {
    const attachedToRef = element.getAttribute('attached-to-ref');
    if (attachedToRef) {
      attributes.push(`attachedToRef="${escapeXml(attachedToRef)}"`);
    }
  }

  const body: string[] = [];
  const documentation = element.getAttribute('documentation');
  if (documentation) {
    body.push(`${indent}  <bpmn:documentation>${escapeXml(documentation)}</bpmn:documentation>`);
  }

  const eventDefinitionLocalName = getEventDefinitionElementLocalName(element.getAttribute('event-definition'));
  if (eventDefinitionLocalName) {
    body.push(`${indent}  <bpmn:${eventDefinitionLocalName} />`);
  }

  if (entry.nameSource === 'text' && labelValue) {
    body.push(`${indent}  <bpmn:text>${escapeXml(labelValue)}</bpmn:text>`);
  }

  if (body.length === 0) {
    return [`${indent}<bpmn:${entry.bpmnType} ${attributes.join(' ')} />`];
  }

  return [
    `${indent}<bpmn:${entry.bpmnType} ${attributes.join(' ')}>`,
    ...body,
    `${indent}</bpmn:${entry.bpmnType}>`
  ];
}

function createLaneLines(element: HTMLElement, id: string, indent: string, flowNodeRefs: string[]) {
  const attributes = [`id="${escapeXml(id)}"`];
  const name = element.getAttribute('name');
  if (name) {
    attributes.push(`name="${escapeXml(name)}"`);
  }

  const body: string[] = [];
  const documentation = element.getAttribute('documentation');
  if (documentation) {
    body.push(`${indent}  <bpmn:documentation>${escapeXml(documentation)}</bpmn:documentation>`);
  }
  for (const flowNodeRef of flowNodeRefs) {
    body.push(`${indent}  <bpmn:flowNodeRef>${escapeXml(flowNodeRef)}</bpmn:flowNodeRef>`);
  }

  if (body.length === 0) {
    return [`${indent}<bpmn:lane ${attributes.join(' ')} />`];
  }

  return [
    `${indent}<bpmn:lane ${attributes.join(' ')}>` ,
    ...body,
    `${indent}</bpmn:lane>`
  ];
}

function createEdgeLines(entryType: string, element: HTMLElement, id: string, indent: string) {
  const entry = bpmnTypeToEntry.get(entryType)!;
  const sourceRef = element.getAttribute('source-ref');
  const targetRef = element.getAttribute('target-ref');
  if (!sourceRef || !targetRef) {
    return [] as string[];
  }

  const attributes = [
    `id="${escapeXml(id)}"`,
    `sourceRef="${escapeXml(sourceRef)}"`,
    `targetRef="${escapeXml(targetRef)}"`
  ];
  const name = element.getAttribute('name');
  if (name) {
    attributes.push(`name="${escapeXml(name)}"`);
  }

  const documentation = element.getAttribute('documentation');
  if (!documentation) {
    return [`${indent}<bpmn:${entry.bpmnType} ${attributes.join(' ')} />`];
  }

  return [
    `${indent}<bpmn:${entry.bpmnType} ${attributes.join(' ')}>` ,
    `${indent}  <bpmn:documentation>${escapeXml(documentation)}</bpmn:documentation>`,
    `${indent}</bpmn:${entry.bpmnType}>`
  ];
}

export class BpmnParserService implements IHtmlParserService, IHtmlWriterService {
  options: IHtmlWriterOptions = {};

  async parse(xml: string, serviceContainer: ServiceContainer, instanceServiceContainer: InstanceServiceContainer): Promise<IDesignItem[]> {
    const xmlDocument = new DOMParser().parseFromString(xml, 'application/xml');
    const parserError = xmlDocument.querySelector('parsererror');
    if (parserError) {
      throw new Error(parserError.textContent ?? 'The BPMN XML could not be parsed.');
    }

    const allElements = Array.from(xmlDocument.getElementsByTagName('*'));
    const definitions = getFirstElementByNamespace(allElements, BPMN_NS, 'definitions') ?? xmlDocument.documentElement;
    const processElements = allElements.filter(element => element.namespaceURI === BPMN_NS && element.localName === 'process');
    const collaboration = getFirstElementByNamespace(allElements, BPMN_NS, 'collaboration');
    const diagram = getFirstElementByNamespace(allElements, BPMNDI_NS, 'BPMNDiagram');
    const plane = getFirstElementByNamespace(allElements, BPMNDI_NS, 'BPMNPlane');
    const laneInfo = collectLaneInfo(processElements);

    const participantProcessMap: Record<string, string> = {};
    if (collaboration) {
      for (const participant of getDirectChildren(collaboration, BPMN_NS, 'participant')) {
        const participantId = participant.getAttribute('id');
        const processRef = participant.getAttribute('processRef');
        if (participantId && processRef) {
          participantProcessMap[participantId] = processRef;
        }
      }
    }

    const processToParticipantId = new Map<string, string>();
    for (const [participantId, processRef] of Object.entries(participantProcessMap)) {
      if (!processToParticipantId.has(processRef)) {
        processToParticipantId.set(processRef, participantId);
      }
    }

    const meta: BpmnDocumentMeta = {
      definitionsId: definitions.getAttribute('id') ?? 'Definitions_1',
      processes: processElements.length > 0
        ? processElements.map((processElement, index) => {
          const processId = processElement.getAttribute('id') ?? `Process_${index + 1}`;
          return {
            id: processId,
            laneSetId: laneInfo.laneSetIdsByProcess.get(processId)
          };
        })
        : [{ id: 'Process_1', laneSetId: 'LaneSet_1' }],
      collaborationId: collaboration?.getAttribute('id') ?? undefined,
      diagramId: diagram?.getAttribute('id') ?? 'BPMNDiagram_1',
      planeId: plane?.getAttribute('id') ?? 'BPMNPlane_1',
      planeBpmnElement: plane?.getAttribute('bpmnElement') ?? undefined,
      targetNamespace: definitions.getAttribute('targetNamespace') ?? 'https://node-projects.github.io/bpmn-editor',
      participantProcessMap
    };

    const documentContainer = instanceServiceContainer.documentContainer as { additionalData?: BpmnDocumentMeta } | undefined;
    if (documentContainer) {
      documentContainer.additionalData = meta;
    }

    const modelElements = new Map<string, Element>();
    for (const element of allElements) {
      if (element.namespaceURI === BPMN_NS) {
        const id = element.getAttribute('id');
        if (id) {
          modelElements.set(id, element);
        }
      }
    }

    const designItems: IDesignItem[] = [];
    const nodeProcessById = new Map<string, string>();
    const shapeElements = allElements.filter(element => element.namespaceURI === BPMNDI_NS && element.localName === 'BPMNShape');

    for (const shapeElement of shapeElements) {
      const bpmnElementId = shapeElement.getAttribute('bpmnElement');
      if (!bpmnElementId) {
        continue;
      }
      const modelElement = modelElements.get(bpmnElementId);
      if (!modelElement || bpmnTypeToEntry.get(modelElement.localName)?.kind !== 'node') {
        continue;
      }

      const node = createElementForModel(modelElement);
      if (!node) {
        continue;
      }

      const boundsElement = getDirectChildren(shapeElement, DC_NS, 'Bounds')[0];
      boundsToStyle(node, {
        x: parseNumber(boundsElement?.getAttribute('x')),
        y: parseNumber(boundsElement?.getAttribute('y')),
        width: parseNumber(boundsElement?.getAttribute('width'), 120),
        height: parseNumber(boundsElement?.getAttribute('height'), 80)
      });
      applyDiagramColors(node, shapeElement, true);

      const processRef = modelElement.localName === 'participant'
        ? modelElement.getAttribute('processRef') ?? ''
        : laneInfo.laneProcessById.get(bpmnElementId) ?? getAncestorProcessId(modelElement);
      if (processRef) {
        node.setAttribute('process-ref', processRef);
        nodeProcessById.set(bpmnElementId, processRef);
      }

      const laneRef = laneInfo.nodeToLane.get(bpmnElementId);
      if (laneRef) {
        node.setAttribute('lane-ref', laneRef);
      }

      const participantRef = processToParticipantId.get(processRef);
      if (participantRef && modelElement.localName !== 'participant') {
        node.setAttribute('participant-ref', participantRef);
      }

      designItems.push(DesignItem.createDesignItemFromInstance(node, serviceContainer, instanceServiceContainer));
    }

    if (shapeElements.length === 0) {
      const fallbackNodes = allElements.filter(element => bpmnTypeToEntry.get(element.localName)?.kind === 'node');
      fallbackNodes.forEach((modelElement, index) => {
        const node = createElementForModel(modelElement);
        if (!node) {
          return;
        }
        boundsToStyle(node, fallbackBounds(index, modelElement.localName));

        const modelId = modelElement.getAttribute('id') ?? '';
        const processRef = modelElement.localName === 'participant'
          ? modelElement.getAttribute('processRef') ?? ''
          : laneInfo.laneProcessById.get(modelId) ?? getAncestorProcessId(modelElement);
        if (processRef) {
          node.setAttribute('process-ref', processRef);
          nodeProcessById.set(modelId, processRef);
        }

        const laneRef = laneInfo.nodeToLane.get(modelId);
        if (laneRef) {
          node.setAttribute('lane-ref', laneRef);
        }

        const participantRef = processToParticipantId.get(processRef);
        if (participantRef && modelElement.localName !== 'participant') {
          node.setAttribute('participant-ref', participantRef);
        }

        designItems.push(DesignItem.createDesignItemFromInstance(node, serviceContainer, instanceServiceContainer));
      });
    }

    const boundsById = new Map<string, Bounds>();
    for (const designItem of designItems) {
      const id = designItem.element.getAttribute('bpmn-id');
      if (id) {
        boundsById.set(id, getBoundsForNode(designItem));
      }
    }

    const edgeElements = allElements.filter(element => element.namespaceURI === BPMNDI_NS && element.localName === 'BPMNEdge');
    for (const edgeElement of edgeElements) {
      const bpmnElementId = edgeElement.getAttribute('bpmnElement');
      if (!bpmnElementId) {
        continue;
      }

      const modelElement = modelElements.get(bpmnElementId);
      if (!modelElement) {
        continue;
      }

      const entry = bpmnTypeToEntry.get(modelElement.localName);
      if (!entry || entry.kind !== 'edge') {
        continue;
      }

      const sourceBounds = boundsById.get(modelElement.getAttribute('sourceRef') ?? '');
      const targetBounds = boundsById.get(modelElement.getAttribute('targetRef') ?? '');
      const parsedWaypoints = normalizeWaypoints(findWaypoints(edgeElement));
      const effectiveWaypoints = parsedWaypoints.length >= 2 || !sourceBounds || !targetBounds
        ? parsedWaypoints
        : routeBetweenBounds(sourceBounds, targetBounds);
      if (effectiveWaypoints.length < 2) {
        continue;
      }

      const edge = globalThis.document.createElement(entry.tag) as HTMLElement;
      edge.setAttribute('bpmn-id', bpmnElementId);
      edge.setAttribute('waypoints', encodeWaypoints(effectiveWaypoints));
      applyDiagramColors(edge, edgeElement, false);
      if (modelElement.getAttribute('name')) {
        edge.setAttribute('name', modelElement.getAttribute('name')!);
      }
      if (modelElement.getAttribute('sourceRef')) {
        edge.setAttribute('source-ref', modelElement.getAttribute('sourceRef')!);
      }
      if (modelElement.getAttribute('targetRef')) {
        edge.setAttribute('target-ref', modelElement.getAttribute('targetRef')!);
      }
      const documentation = readDocumentation(modelElement);
      if (documentation) {
        edge.setAttribute('documentation', documentation);
      }
      const processRef = entry.bpmnType === 'association'
        ? getAncestorProcessId(modelElement)
        : getAncestorProcessId(modelElement) || nodeProcessById.get(modelElement.getAttribute('sourceRef') ?? '') || nodeProcessById.get(modelElement.getAttribute('targetRef') ?? '');
      if (processRef && entry.container !== 'collaboration') {
        edge.setAttribute('process-ref', processRef);
      }
      boundsToStyle(edge, boundsFromWaypoints(effectiveWaypoints));
      edge.style.zIndex = entry.zIndex;
      designItems.push(DesignItem.createDesignItemFromInstance(edge, serviceContainer, instanceServiceContainer));
    }

    if (edgeElements.length === 0) {
      const fallbackEdges = allElements.filter(element => bpmnTypeToEntry.get(element.localName)?.kind === 'edge');
      for (const modelElement of fallbackEdges) {
        const entry = bpmnTypeToEntry.get(modelElement.localName)!;
        const sourceBounds = boundsById.get(modelElement.getAttribute('sourceRef') ?? '');
        const targetBounds = boundsById.get(modelElement.getAttribute('targetRef') ?? '');
        if (!sourceBounds || !targetBounds) {
          continue;
        }

        const waypoints = routeBetweenBounds(sourceBounds, targetBounds);
        const edge = globalThis.document.createElement(entry.tag) as HTMLElement;
        edge.setAttribute('bpmn-id', modelElement.getAttribute('id') ?? '');
        edge.setAttribute('waypoints', encodeWaypoints(waypoints));
        if (modelElement.getAttribute('name')) {
          edge.setAttribute('name', modelElement.getAttribute('name')!);
        }
        if (modelElement.getAttribute('sourceRef')) {
          edge.setAttribute('source-ref', modelElement.getAttribute('sourceRef')!);
        }
        if (modelElement.getAttribute('targetRef')) {
          edge.setAttribute('target-ref', modelElement.getAttribute('targetRef')!);
        }
        const documentation = readDocumentation(modelElement);
        if (documentation) {
          edge.setAttribute('documentation', documentation);
        }
        const processRef = entry.bpmnType === 'association'
          ? getAncestorProcessId(modelElement)
          : getAncestorProcessId(modelElement) || nodeProcessById.get(modelElement.getAttribute('sourceRef') ?? '') || nodeProcessById.get(modelElement.getAttribute('targetRef') ?? '');
        if (processRef && entry.container !== 'collaboration') {
          edge.setAttribute('process-ref', processRef);
        }
        boundsToStyle(edge, boundsFromWaypoints(waypoints));
        edge.style.zIndex = entry.zIndex;
        designItems.push(DesignItem.createDesignItemFromInstance(edge, serviceContainer, instanceServiceContainer));
      }
    }

    return designItems;
  }

  write(textWriter: ITextWriter, designItems: IDesignItem[], _rootContainerKeepInline: boolean, updatePositions?: boolean) {
    const instanceServiceContainer = designItems[0]?.instanceServiceContainer;
    const meta = instanceServiceContainer ? getMeta(instanceServiceContainer) : {
      definitionsId: 'Definitions_1',
      processes: [{ id: 'Process_1', laneSetId: 'LaneSet_1' }],
      collaborationId: undefined,
      diagramId: 'BPMNDiagram_1',
      planeId: 'BPMNPlane_1',
      planeBpmnElement: undefined,
      targetNamespace: 'https://node-projects.github.io/bpmn-editor',
      participantProcessMap: {}
    };

    const nodeItems = designItems.filter(item => tagToEntry.get(item.element.localName)?.kind === 'node');
    const edgeItems = designItems.filter(item => tagToEntry.get(item.element.localName)?.kind === 'edge');
    const validEdgeItems = edgeItems.filter(item => item.element.getAttribute('source-ref') && item.element.getAttribute('target-ref'));

    const usedIds = new Set<string>();
    const nodeIds = new Map<IDesignItem, string>();
    const edgeIds = new Map<IDesignItem, string>();

    for (const nodeItem of nodeItems) {
      const prefix = tagToEntry.get(nodeItem.element.localName)?.defaultIdPrefix ?? 'Node';
      nodeIds.set(nodeItem, ensureId(nodeItem.element, prefix, usedIds));
    }

    for (const edgeItem of edgeItems) {
      const prefix = tagToEntry.get(edgeItem.element.localName)?.defaultIdPrefix ?? 'Flow';
      edgeIds.set(edgeItem, ensureId(edgeItem.element, prefix, usedIds));
    }

    const nodeItemById = new Map<string, IDesignItem>();
    for (const nodeItem of nodeItems) {
      const id = nodeIds.get(nodeItem)!;
      nodeItemById.set(id, nodeItem);
    }

    type ItemWithBounds = { item: IDesignItem; id: string; bounds: Bounds };
    type NodeContext = { id: string; processRef?: string; laneRef?: string; participantRef?: string };

    const boundsArea = (bounds: Bounds) => bounds.width * bounds.height;
    const findContainingRecord = (bounds: Bounds, records: ItemWithBounds[], exceptId?: string) => {
      const center = getBoundsCenter(bounds);
      return records
        .filter(record => record.id !== exceptId && isPointInsideBounds(center, record.bounds, 2))
        .sort((left, right) => boundsArea(left.bounds) - boundsArea(right.bounds))[0] ?? null;
    };

    const processMetaById = new Map<string, BpmnProcessMeta>(meta.processes.map(processMeta => [processMeta.id, { ...processMeta }]));
    const usedProcessIds = new Set(processMetaById.keys());
    const reserveProcessId = (candidate?: string) => {
      if (candidate) {
        usedProcessIds.add(candidate);
        return candidate;
      }

      let index = usedProcessIds.size + 1;
      let generated = `Process_${index}`;
      while (usedProcessIds.has(generated)) {
        index += 1;
        generated = `Process_${index}`;
      }
      usedProcessIds.add(generated);
      return generated;
    };
    const ensureProcessMeta = (processId: string) => {
      let processMeta = processMetaById.get(processId);
      if (!processMeta) {
        processMeta = { id: processId };
        processMetaById.set(processId, processMeta);
      }
      return processMeta;
    };

    for (const item of [...nodeItems, ...validEdgeItems]) {
      if (item.element.localName === 'bpmn-participant') {
        continue;
      }
      const explicitProcessRef = item.element.getAttribute('process-ref');
      if (explicitProcessRef) {
        ensureProcessMeta(reserveProcessId(explicitProcessRef));
      }
    }

    const participantRecords = nodeItems
      .filter(item => item.element.localName === 'bpmn-participant')
      .map(item => ({ item, id: nodeIds.get(item)!, bounds: getBoundsForNode(item) }));
    const participantRecordById = new Map(participantRecords.map(record => [record.id, record] as const));

    const participantProcessById = new Map<string, string>();
    for (const participantRecord of participantRecords) {
      const storedProcessRef = participantRecord.item.element.getAttribute('process-ref') ?? meta.participantProcessMap[participantRecord.id];
      const processRef = reserveProcessId(storedProcessRef);
      participantProcessById.set(participantRecord.id, processRef);
      ensureProcessMeta(processRef);
    }

    const defaultProcessId = reserveProcessId(meta.processes[0]?.id ?? participantProcessById.values().next().value ?? 'Process_1');
    ensureProcessMeta(defaultProcessId);

    const processToParticipantId = new Map<string, string>();
    for (const [participantId, processRef] of participantProcessById) {
      if (!processToParticipantId.has(processRef)) {
        processToParticipantId.set(processRef, participantId);
      }
    }

    const laneRecords = nodeItems
      .filter(item => item.element.localName === 'bpmn-lane')
      .map(item => ({ item, id: nodeIds.get(item)!, bounds: getBoundsForNode(item) }));
    const laneContextById = new Map<string, NodeContext>();
    const nodeContextById = new Map<string, NodeContext>();

    for (const participantRecord of participantRecords) {
      nodeContextById.set(participantRecord.id, { id: participantRecord.id, processRef: participantProcessById.get(participantRecord.id) });
    }

    for (const laneRecord of laneRecords) {
      const explicitParticipantRef = laneRecord.item.element.getAttribute('participant-ref');
      const containingParticipant = explicitParticipantRef && participantRecordById.has(explicitParticipantRef)
        ? participantRecordById.get(explicitParticipantRef)!
        : findContainingRecord(laneRecord.bounds, participantRecords, laneRecord.id);
      const processRef = laneRecord.item.element.getAttribute('process-ref')
        ?? (containingParticipant ? participantProcessById.get(containingParticipant.id) : undefined)
        ?? defaultProcessId;
      ensureProcessMeta(processRef);
      const participantRef = explicitParticipantRef ?? containingParticipant?.id ?? processToParticipantId.get(processRef);
      const context: NodeContext = { id: laneRecord.id, processRef, participantRef };
      laneContextById.set(laneRecord.id, context);
      nodeContextById.set(laneRecord.id, context);
    }

    const regularNodeItems = nodeItems.filter(item => item.element.localName !== 'bpmn-participant' && item.element.localName !== 'bpmn-lane');
    const regularNodeRecords = regularNodeItems.map(item => ({ item, id: nodeIds.get(item)!, bounds: getBoundsForNode(item) }));

    for (const record of regularNodeRecords) {
      const entry = tagToEntry.get(record.item.element.localName)!;
      const explicitLaneRef = record.item.element.getAttribute('lane-ref');
      const laneRef = explicitLaneRef && laneContextById.has(explicitLaneRef)
        ? explicitLaneRef
        : flowNodeTags.has(record.item.element.localName)
          ? findContainingRecord(record.bounds, laneRecords)?.id
          : undefined;

      let participantRef = record.item.element.getAttribute('participant-ref') ?? undefined;
      if (!participantRef && laneRef) {
        participantRef = laneContextById.get(laneRef)?.participantRef;
      }
      if (!participantRef) {
        participantRef = findContainingRecord(record.bounds, participantRecords)?.id ?? undefined;
      }

      let processRef = record.item.element.getAttribute('process-ref') ?? undefined;
      if (!processRef && laneRef) {
        processRef = laneContextById.get(laneRef)?.processRef;
      }
      if (!processRef && participantRef) {
        processRef = participantProcessById.get(participantRef);
      }
      if (!processRef && entry.container === 'process') {
        processRef = defaultProcessId;
      }
      if (processRef) {
        ensureProcessMeta(processRef);
      }

      nodeContextById.set(record.id, { id: record.id, processRef, laneRef, participantRef });
    }

    for (const record of regularNodeRecords) {
      if (record.item.element.localName !== 'bpmn-boundary-event') {
        continue;
      }

      const context = nodeContextById.get(record.id)!;
      const attachedToRef = record.item.element.getAttribute('attached-to-ref');
      const attachedContext = attachedToRef ? nodeContextById.get(attachedToRef) : undefined;
      if (!attachedContext) {
        continue;
      }

      if (!context.processRef && attachedContext.processRef) {
        context.processRef = attachedContext.processRef;
        ensureProcessMeta(attachedContext.processRef);
      }
      if (!context.laneRef && attachedContext.laneRef) {
        context.laneRef = attachedContext.laneRef;
      }
      if (!context.participantRef && attachedContext.participantRef) {
        context.participantRef = attachedContext.participantRef;
      }
    }

    const edgeProcessById = new Map<string, string | undefined>();
    for (const edgeItem of validEdgeItems) {
      const edgeId = edgeIds.get(edgeItem)!;
      const entry = tagToEntry.get(edgeItem.element.localName)!;
      const sourceRef = edgeItem.element.getAttribute('source-ref')!;
      const targetRef = edgeItem.element.getAttribute('target-ref')!;
      const sourceContext = nodeContextById.get(sourceRef);
      const targetContext = nodeContextById.get(targetRef);
      let processRef = edgeItem.element.getAttribute('process-ref') ?? undefined;

      if (!processRef && entry.bpmnType !== 'messageFlow') {
        if (entry.bpmnType === 'association') {
          if (sourceContext?.processRef && sourceContext.processRef === targetContext?.processRef) {
            processRef = sourceContext.processRef;
          }
        } else {
          processRef = sourceContext?.processRef ?? targetContext?.processRef ?? defaultProcessId;
        }
      }

      if (processRef) {
        ensureProcessMeta(processRef);
      }
      edgeProcessById.set(edgeId, processRef);
    }

    const collaborationRequested = participantRecords.length > 0
      || validEdgeItems.some(item => tagToEntry.get(item.element.localName)?.bpmnType === 'messageFlow')
      || processMetaById.size > 1
      || !!meta.collaborationId;

    const orderedProcessIds = Array.from(processMetaById.keys());
    const processGroups = new Map<string, { id: string; laneSetId: string; lanes: IDesignItem[]; nodes: IDesignItem[]; artifacts: IDesignItem[]; edges: IDesignItem[] }>();
    const ensureProcessGroup = (processId: string) => {
      let processGroup = processGroups.get(processId);
      if (!processGroup) {
        const processMeta = ensureProcessMeta(processId);
        processGroup = {
          id: processId,
          laneSetId: processMeta.laneSetId ?? `LaneSet_${processGroups.size + 1}`,
          lanes: [],
          nodes: [],
          artifacts: [],
          edges: []
        };
        processGroups.set(processId, processGroup);
      }
      return processGroup;
    };

    for (const processId of orderedProcessIds) {
      ensureProcessGroup(processId);
    }

    const laneFlowNodeRefs = new Map<string, string[]>();
    for (const record of regularNodeRecords) {
      const context = nodeContextById.get(record.id);
      if (context?.laneRef && flowNodeTags.has(record.item.element.localName)) {
        const flowNodeRefs = laneFlowNodeRefs.get(context.laneRef) ?? [];
        flowNodeRefs.push(record.id);
        laneFlowNodeRefs.set(context.laneRef, flowNodeRefs);
      }
    }

    const collaborationArtifacts: IDesignItem[] = [];
    const collaborationAssociations: IDesignItem[] = [];
    const collaborationMessageFlows: IDesignItem[] = [];

    for (const laneRecord of laneRecords) {
      const context = laneContextById.get(laneRecord.id)!;
      ensureProcessGroup(context.processRef ?? defaultProcessId).lanes.push(laneRecord.item);
    }

    for (const record of regularNodeRecords) {
      const entry = tagToEntry.get(record.item.element.localName)!;
      const context = nodeContextById.get(record.id)!;
      if (entry.container === 'artifact') {
        if (context.processRef || !collaborationRequested) {
          ensureProcessGroup(context.processRef ?? defaultProcessId).artifacts.push(record.item);
        } else {
          collaborationArtifacts.push(record.item);
        }
        continue;
      }

      ensureProcessGroup(context.processRef ?? defaultProcessId).nodes.push(record.item);
    }

    for (const edgeItem of validEdgeItems) {
      const edgeId = edgeIds.get(edgeItem)!;
      const entry = tagToEntry.get(edgeItem.element.localName)!;
      const processRef = edgeProcessById.get(edgeId);
      if (entry.bpmnType === 'messageFlow') {
        collaborationMessageFlows.push(edgeItem);
      } else if (entry.bpmnType === 'association' && !processRef && collaborationRequested) {
        collaborationAssociations.push(edgeItem);
      } else {
        ensureProcessGroup(processRef ?? defaultProcessId).edges.push(edgeItem);
      }
    }

    const writeLine = (line: string) => textWriter.writeLine(line);
    const writeTrackedLines = (designItem: IDesignItem, lines: string[]) => {
      if (!lines.length) {
        return;
      }
      const start = textWriter.position;
      for (const line of lines) {
        writeLine(line);
      }
      if (updatePositions && designItem.instanceServiceContainer.designItemDocumentPositionService) {
        designItem.instanceServiceContainer.designItemDocumentPositionService.setPosition(designItem, {
          start,
          length: textWriter.position - start
        });
      }
    };

    writeLine('<?xml version="1.0" encoding="UTF-8"?>');
    writeLine('<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    writeLine('  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"');
    writeLine('  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"');
    writeLine('  xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0"');
    writeLine('  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"');
    writeLine('  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"');
    writeLine(`  id="${escapeXml(meta.definitionsId)}"`);
    writeLine(`  targetNamespace="${escapeXml(meta.targetNamespace)}">`);

    for (const processId of orderedProcessIds) {
      const processGroup = ensureProcessGroup(processId);
      writeLine(`  <bpmn:process id="${escapeXml(processId)}" isExecutable="false">`);

      if (processGroup.lanes.length > 0) {
        writeLine(`    <bpmn:laneSet id="${escapeXml(processGroup.laneSetId)}">`);
        for (const laneItem of processGroup.lanes) {
          const laneId = nodeIds.get(laneItem)!;
          const flowNodeRefs = laneFlowNodeRefs.get(laneId) ?? [];
          writeTrackedLines(laneItem, createLaneLines(laneItem.element as HTMLElement, laneId, '      ', flowNodeRefs));
        }
        writeLine('    </bpmn:laneSet>');
      }

      for (const nodeItem of processGroup.nodes) {
        const nodeId = nodeIds.get(nodeItem)!;
        const entry = tagToEntry.get(nodeItem.element.localName)!;
        writeTrackedLines(nodeItem, createNodeLines(entry.bpmnType, nodeItem.element as HTMLElement, nodeId, '    '));
      }

      for (const edgeItem of processGroup.edges) {
        const edgeId = edgeIds.get(edgeItem)!;
        const entry = tagToEntry.get(edgeItem.element.localName)!;
        writeTrackedLines(edgeItem, createEdgeLines(entry.bpmnType, edgeItem.element as HTMLElement, edgeId, '    '));
      }

      for (const artifactItem of processGroup.artifacts) {
        const artifactId = nodeIds.get(artifactItem)!;
        const entry = tagToEntry.get(artifactItem.element.localName)!;
        writeTrackedLines(artifactItem, createNodeLines(entry.bpmnType, artifactItem.element as HTMLElement, artifactId, '    '));
      }

      writeLine('  </bpmn:process>');
    }

    if (collaborationRequested) {
      const collaborationId = meta.collaborationId ?? 'Collaboration_1';
      writeLine(`  <bpmn:collaboration id="${escapeXml(collaborationId)}">`);
      for (const participantRecord of participantRecords) {
        const participantId = participantRecord.id;
        const processRef = participantProcessById.get(participantId) ?? defaultProcessId;
        writeTrackedLines(
          participantRecord.item,
          createNodeLines('participant', participantRecord.item.element as HTMLElement, participantId, '    ', [`processRef="${escapeXml(processRef)}"`])
        );
      }
      for (const messageFlow of collaborationMessageFlows) {
        const edgeId = edgeIds.get(messageFlow)!;
        const entry = tagToEntry.get(messageFlow.element.localName)!;
        writeTrackedLines(messageFlow, createEdgeLines(entry.bpmnType, messageFlow.element as HTMLElement, edgeId, '    '));
      }
      for (const artifactItem of collaborationArtifacts) {
        const artifactId = nodeIds.get(artifactItem)!;
        const entry = tagToEntry.get(artifactItem.element.localName)!;
        writeTrackedLines(artifactItem, createNodeLines(entry.bpmnType, artifactItem.element as HTMLElement, artifactId, '    '));
      }
      for (const associationItem of collaborationAssociations) {
        const edgeId = edgeIds.get(associationItem)!;
        const entry = tagToEntry.get(associationItem.element.localName)!;
        writeTrackedLines(associationItem, createEdgeLines(entry.bpmnType, associationItem.element as HTMLElement, edgeId, '    '));
      }
      writeLine('  </bpmn:collaboration>');
    }

    const planeBpmnElement = collaborationRequested ? (meta.collaborationId ?? 'Collaboration_1') : (meta.planeBpmnElement ?? orderedProcessIds[0] ?? defaultProcessId);
    writeLine(`  <bpmndi:BPMNDiagram id="${escapeXml(meta.diagramId)}">`);
    writeLine(`    <bpmndi:BPMNPlane id="${escapeXml(meta.planeId)}" bpmnElement="${escapeXml(planeBpmnElement)}">`);

    for (const nodeItem of nodeItems) {
      const bounds = getBoundsForNode(nodeItem);
      const id = nodeIds.get(nodeItem)!;
      const colorAttributes = getDiagramColorAttributes(nodeItem.element as HTMLElement, true);
      writeLine(`      <bpmndi:BPMNShape id="${escapeXml(id)}_di" bpmnElement="${escapeXml(id)}"${colorAttributes.length ? ` ${colorAttributes.join(' ')}` : ''}>`);
      writeLine(`        <dc:Bounds x="${formatNumber(bounds.x)}" y="${formatNumber(bounds.y)}" width="${formatNumber(bounds.width)}" height="${formatNumber(bounds.height)}" />`);
      writeLine('      </bpmndi:BPMNShape>');
    }

    for (const edgeItem of validEdgeItems) {
      const id = edgeIds.get(edgeItem)!;
      const sourceRef = edgeItem.element.getAttribute('source-ref');
      const targetRef = edgeItem.element.getAttribute('target-ref');
      let waypoints = normalizeWaypoints(decodeWaypoints(edgeItem.element.getAttribute('waypoints')));
      if (waypoints.length < 2 && sourceRef && targetRef) {
        const sourceItem = nodeItemById.get(sourceRef);
        const targetItem = nodeItemById.get(targetRef);
        if (sourceItem && targetItem) {
          waypoints = routeBetweenBounds(getBoundsForNode(sourceItem), getBoundsForNode(targetItem));
        }
      }
      const colorAttributes = getDiagramColorAttributes(edgeItem.element as HTMLElement, false);
      writeLine(`      <bpmndi:BPMNEdge id="${escapeXml(id)}_di" bpmnElement="${escapeXml(id)}"${colorAttributes.length ? ` ${colorAttributes.join(' ')}` : ''}>`);
      for (const waypoint of waypoints) {
        writeLine(`        <di:waypoint x="${formatNumber(waypoint.x)}" y="${formatNumber(waypoint.y)}" />`);
      }
      writeLine('      </bpmndi:BPMNEdge>');
    }

    writeLine('    </bpmndi:BPMNPlane>');
    writeLine('  </bpmndi:BPMNDiagram>');
    writeLine('</bpmn:definitions>');
  }
}